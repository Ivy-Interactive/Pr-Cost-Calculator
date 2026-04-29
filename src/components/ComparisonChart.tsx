import { useState, useEffect, useMemo } from "react";
import { CostChart } from "./CostChart";
import { StatsTable } from "./StatsTable";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import annotationPlugin from "chartjs-plugin-annotation";
import { PREFETCHED_REPOS, loadPrefetchedPRs, fetchAllPRs, categorizePR } from "../lib/github";
import {
  getRollingAverages,
  getMonthlyStats,
  computeTendrilPrediction,
  computeTendrilMonthlyPrediction,
  filterByContributor,
} from "../lib/calculations";
import type { PullRequest, RollingDataPoint } from "../lib/types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  annotationPlugin,
);

interface RepoSummary {
  label: string;
  totalPRs: number;
  merged: number;
  denied: number;
  denialRate: number;
  avgMergedPerDay: number;
}

function computeSummary(prs: PullRequest[], label: string): RepoSummary {
  const merged = prs.filter((pr) => categorizePR(pr) === "merged").length;
  const denied = prs.filter((pr) => categorizePR(pr) === "denied").length;
  const total = merged + denied;
  const denialRate = total > 0 ? (denied / total) * 100 : 0;

  // Compute day span from last 5 months only
  const fiveMonthsAgo = Date.now() - 150 * 24 * 60 * 60 * 1000;
  const recentPRs = prs.filter((pr) => new Date(pr.created_at).getTime() >= fiveMonthsAgo);
  const recentMerged = recentPRs.filter((pr) => categorizePR(pr) === "merged").length;

  const dates = recentPRs.map((pr) => new Date(pr.created_at).getTime()).filter((t) => !isNaN(t));
  const daySpan =
    dates.length > 1
      ? Math.max(1, (Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60 * 24))
      : 1;
  const avgMergedPerDay = recentMerged / daySpan;

  return { label, totalPRs: total, merged, denied, denialRate, avgMergedPerDay };
}

function SummaryCard({ stats, variant }: { stats: RepoSummary; variant: "primary" | "secondary" }) {
  return (
    <div className={`summary-card summary-card--${variant}`}>
      <h3 className="summary-card-title">{stats.label}</h3>
      <div className="summary-card-grid">
        <div className="stat-item">
          <span className="stat-value">{stats.totalPRs.toLocaleString()}</span>
          <span className="stat-label">Total PRs</span>
        </div>
        <div className="stat-item">
          <span className="stat-value merged">{stats.merged.toLocaleString()}</span>
          <span className="stat-label">Merged</span>
        </div>
        <div className="stat-item">
          <span className="stat-value denied">{stats.denied.toLocaleString()}</span>
          <span className="stat-label">Denied</span>
        </div>
        <div className="stat-item">
          <span
            className={`stat-value ${stats.denialRate < 10 ? "good" : stats.denialRate > 30 ? "bad" : ""}`}
          >
            {stats.denialRate.toFixed(1)}%
          </span>
          <span className="stat-label">Denial Rate</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.avgMergedPerDay.toFixed(1)}</span>
          <span className="stat-label">Merged / day</span>
        </div>
      </div>
    </div>
  );
}

export function ComparisonChart() {
  // Compare side — prefetched repos dropdown
  const [compareKey, setCompareKey] = useState(PREFETCHED_REPOS[0].key);
  const [comparePRs, setComparePRs] = useState<PullRequest[]>([]);

  // Against side — text input + fetch, or quick-select from prefetched
  const [againstInput, setAgainstInput] = useState("facebook/react");
  const [againstPRs, setAgainstPRs] = useState<PullRequest[]>([]);
  const [againstLabel, setAgainstLabel] = useState("facebook/react");

  const [isLoading, setIsLoading] = useState(true);
  const [againstLoading, setAgainstLoading] = useState(false);
  const [againstError, setAgainstError] = useState<string | null>(null);

  // Detailed analysis controls
  const [detailSalaryStr, setDetailSalaryStr] = useState("5000");
  const [detailTokensStr, setDetailTokensStr] = useState("200");
  const [detailContributor, setDetailContributor] = useState("all");
  const detailSalary = Number(detailSalaryStr) || 0;
  const detailTokens = Number(detailTokensStr) || 0;

  // Always keep Ivy-Framework data loaded for bottom charts
  const [ivyPRs, setIvyPRs] = useState<PullRequest[]>([]);
  useEffect(() => {
    loadPrefetchedPRs("Ivy-Interactive-Ivy-Framework")
      .then(setIvyPRs)
      .catch(() => setIvyPRs([]));
  }, []);

  // Load compare data
  useEffect(() => {
    setIsLoading(true);
    loadPrefetchedPRs(compareKey)
      .then(setComparePRs)
      .catch(() => setComparePRs([]))
      .finally(() => setIsLoading(false));

    // Check for duplicate after compare changes
    const newCompareLabel = PREFETCHED_REPOS.find((r) => r.key === compareKey)?.label ?? compareKey;
    if (newCompareLabel.toLowerCase() === againstLabel.toLowerCase()) {
      setAgainstError("Cannot compare a repository against itself.");
    } else {
      setAgainstError(null);
    }
  }, [compareKey, againstLabel]);

  // Load initial against data
  useEffect(() => {
    setAgainstLoading(true);
    loadPrefetchedPRs("facebook-react")
      .then((data) => {
        setAgainstPRs(data);
        setAgainstLabel("facebook/react");
      })
      .catch(() => setAgainstPRs([]))
      .finally(() => setAgainstLoading(false));
  }, []);

  const handleFetchAgainst = async () => {
    const input = againstInput.trim();
    if (!input.includes("/")) return;

    const compareLabel = PREFETCHED_REPOS.find((r) => r.key === compareKey)?.label ?? compareKey;

    if (input.toLowerCase() === compareLabel.toLowerCase()) {
      setAgainstError("Cannot compare a repository against itself.");
      return;
    }

    const [owner, repo] = input.split("/");
    setAgainstLoading(true);
    setAgainstError(null);

    try {
      const prs = await fetchAllPRs(owner, repo);
      setAgainstPRs(prs);
      setAgainstLabel(input);
    } catch (err) {
      setAgainstError(err instanceof Error ? err.message : "Failed to fetch PRs");
    } finally {
      setAgainstLoading(false);
    }
  };

  // Unique contributors from against repo
  const againstContributors = useMemo(() => {
    const logins = new Set(againstPRs.map((pr) => pr.user.login));
    return Array.from(logins).sort();
  }, [againstPRs]);

  // Filter against PRs by contributor
  const filteredAgainstPRs = useMemo(() => {
    if (detailContributor === "all") return againstPRs;
    return filterByContributor(againstPRs, detailContributor);
  }, [againstPRs, detailContributor]);

  const compareData = useMemo(
    () => getRollingAverages(comparePRs, detailSalary, detailTokens),
    [comparePRs, detailSalary, detailTokens],
  );
  const againstData = useMemo(
    () => getRollingAverages(filteredAgainstPRs, detailSalary, detailTokens),
    [filteredAgainstPRs, detailSalary, detailTokens],
  );

  const compareLabel = PREFETCHED_REPOS.find((r) => r.key === compareKey)?.label ?? compareKey;

  const isDuplicate = compareLabel.toLowerCase() === againstLabel.toLowerCase();

  const compareSummary = useMemo(
    () => computeSummary(comparePRs, compareLabel),
    [comparePRs, compareLabel],
  );
  const againstSummary = useMemo(
    () =>
      computeSummary(
        filteredAgainstPRs,
        againstLabel + (detailContributor !== "all" ? ` (${detailContributor})` : ""),
      ),
    [filteredAgainstPRs, againstLabel, detailContributor],
  );

  // Ivy rolling data (always available for bottom charts)
  const ivyRolling = useMemo(
    () => getRollingAverages(ivyPRs, detailSalary, detailTokens),
    [ivyPRs, detailSalary, detailTokens],
  );
  const ivyMonthlyStats = useMemo(
    () => getMonthlyStats(ivyPRs, detailSalary, detailTokens),
    [ivyPRs, detailSalary, detailTokens],
  );

  // Against monthly stats
  const againstMonthlyStats = useMemo(
    () => getMonthlyStats(filteredAgainstPRs, detailSalary, detailTokens),
    [filteredAgainstPRs, detailSalary, detailTokens],
  );

  // Tendril prediction: against data with Ivy's growth applied from Mar 02
  const predictionData = useMemo(
    () => computeTendrilPrediction(ivyRolling, againstData),
    [ivyRolling, againstData],
  );

  // Monthly prediction
  const predictionMonthlyStats = useMemo(
    () => computeTendrilMonthlyPrediction(ivyMonthlyStats, againstMonthlyStats),
    [ivyMonthlyStats, againstMonthlyStats],
  );

  const chartData = {
    labels: compareData.map((d: RollingDataPoint) => d.date),
    datasets: [
      {
        label: `${compareLabel} — Denial Rate`,
        data: compareData.map((d: RollingDataPoint) => d.denialRate),
        borderColor: "#ff7043",
        backgroundColor: "transparent",
        tension: 0.3,
        pointRadius: 2,
        yAxisID: "y",
      },
      {
        label: `${againstLabel} — Denial Rate`,
        data: againstData.map((d: RollingDataPoint) => d.denialRate),
        borderColor: "#ff7043",
        backgroundColor: "transparent",
        borderDash: [6, 3],
        tension: 0.3,
        pointRadius: 2,
        yAxisID: "y",
      },
      {
        label: `${compareLabel} — PRs Merged`,
        data: compareData.map((d: RollingDataPoint) => d.prsMerged),
        borderColor: "#4fc3f7",
        backgroundColor: "transparent",
        tension: 0.3,
        pointRadius: 2,
        yAxisID: "y1",
      },
      {
        label: `${againstLabel} — PRs Merged`,
        data: againstData.map((d: RollingDataPoint) => d.prsMerged),
        borderColor: "#4fc3f7",
        backgroundColor: "transparent",
        borderDash: [6, 3],
        tension: 0.3,
        pointRadius: 2,
        yAxisID: "y1",
      },
      ...(predictionData
        ? [
            {
              label: `${againstLabel} + Ivy-Tendril — Denial Rate`,
              data: predictionData.map((d: RollingDataPoint) => d.denialRate),
              borderColor: "#ce93d8",
              backgroundColor: "transparent",
              borderDash: [6, 3],
              tension: 0.3,
              pointRadius: 2,
              borderWidth: 2,
              yAxisID: "y",
            },
            {
              label: `${againstLabel} + Ivy-Tendril — PRs Merged`,
              data: predictionData.map((d: RollingDataPoint) => d.prsMerged),
              borderColor: "#66bb6a",
              backgroundColor: "transparent",
              borderDash: [6, 3],
              tension: 0.3,
              pointRadius: 2,
              borderWidth: 2,
              yAxisID: "y1",
            },
          ]
        : []),
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    plugins: {
      legend: {
        display: true,
        position: "bottom" as const,
        labels: { color: "#999", boxWidth: 20, font: { size: 11 } },
      },
      title: {
        display: true,
        text: "14-Day Rolling Averages",
        font: { size: 16, weight: "bold" as const },
        color: "#e0e0e0",
      },
      tooltip: {
        callbacks: {
          label: (context: { dataset: { label?: string }; parsed: { y: number | null } }) => {
            const label = context.dataset.label ?? "";
            const value = context.parsed.y ?? 0;
            if (label.includes("Denial Rate")) return `${label}: ${value.toFixed(1)}%`;
            return `${label}: ${Math.round(value)}`;
          },
        },
      },
      annotation: (() => {
        const cutoffIdx = compareData.findIndex((d: RollingDataPoint) => d.date >= "Mar 02");
        return {
          annotations: {
            tendrilLine: {
              type: "line" as const,
              xMin: cutoffIdx,
              xMax: cutoffIdx,
              borderColor: "#66bb6a80",
              borderWidth: 2,
              borderDash: [6, 4],
              label: {
                display: true,
                content: "Ivy-Tendril",
                position: "end" as const,
                backgroundColor: "#66bb6a20",
                color: "#66bb6a",
                font: { size: 13 },
                padding: 6,
                xAdjust: 45,
              },
            },
            cliLabel: {
              type: "line" as const,
              xMin: cutoffIdx,
              xMax: cutoffIdx,
              borderColor: "transparent",
              borderWidth: 0,
              label: {
                display: true,
                content: "Claude Code CLI",
                position: "end" as const,
                backgroundColor: "#4fc3f720",
                color: "#4fc3f7",
                font: { size: 13 },
                padding: 6,
                xAdjust: -65,
              },
            },
          },
        };
      })(),
    },
    scales: {
      y: {
        type: "linear" as const,
        position: "left" as const,
        beginAtZero: true,
        title: { display: true, text: "Denial Rate (%)", color: "#ff7043" },
        grid: { color: "#333" },
        ticks: { color: "#ff7043" },
      },
      y1: {
        type: "linear" as const,
        position: "right" as const,
        beginAtZero: true,
        title: { display: true, text: "PRs Merged", color: "#4fc3f7" },
        grid: { drawOnChartArea: false },
        ticks: { color: "#4fc3f7" },
      },
      x: {
        grid: { color: "#333" },
        ticks: { color: "#999" },
      },
    },
  };

  return (
    <section className="comparison-section">
      <div className="comparison-chart">
        <div className="comparison-selectors">
          <div className="selector-group">
            <label htmlFor="compare-select">Compare</label>
            <select
              id="compare-select"
              value={compareKey}
              onChange={(e) => setCompareKey(e.target.value)}
            >
              {PREFETCHED_REPOS.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="selector-group against-group">
            <label htmlFor="against-input">Against</label>
            <div className="against-input-row">
              <input
                id="against-input"
                type="text"
                value={againstInput}
                onChange={(e) => setAgainstInput(e.target.value)}
                placeholder="owner/repo"
                onKeyDown={(e) => e.key === "Enter" && handleFetchAgainst()}
              />
              <button
                onClick={handleFetchAgainst}
                disabled={againstLoading || !againstInput.includes("/")}
              >
                {againstLoading ? "Loading..." : "Fetch"}
              </button>
            </div>
          </div>
        </div>

        {againstError && <div className="error">{againstError}</div>}

        {!isDuplicate && (
          <div className="comparison-chart-container">
            {isLoading ? (
              <div className="loading-spinner"></div>
            ) : (
              <Line data={chartData} options={options} />
            )}
          </div>
        )}
      </div>

      {!isDuplicate && comparePRs.length > 0 && againstPRs.length > 0 && (
        <div className="summary-cards">
          <SummaryCard stats={compareSummary} variant="primary" />
          <SummaryCard stats={againstSummary} variant="secondary" />
        </div>
      )}

      {againstPRs.length > 0 && (
        <>
          <section className="summary">
            <h2>{againstLabel} — Detailed Analysis</h2>
            <p>
              3 datasets: Ivy-Framework (real) · {againstLabel} (real) · {againstLabel} +
              Ivy-Tendril (prediction from Mar 2)
            </p>
          </section>

          <section className="charts">
            <CostChart
              title="14-Day Avg PRs Created"
              dataKey="prsCreated"
              yAxisLabel="PRs"
              ivyData={ivyRolling}
              againstData={againstData}
              predictionData={predictionData}
              againstLabel={againstLabel}
            />
            <CostChart
              title="14-Day Avg Denial Rate (%)"
              dataKey="denialRate"
              yAxisLabel="%"
              ivyData={ivyRolling}
              againstData={againstData}
              predictionData={predictionData}
              againstLabel={againstLabel}
            />
            <CostChart
              title="Cost per PR ($)"
              dataKey="costPerPR"
              yAxisLabel="USD"
              ivyData={ivyRolling}
              againstData={againstData}
              predictionData={predictionData}
              againstLabel={againstLabel}
            />
          </section>

          <div className="detail-controls">
            <div className="form-group">
              <label>Contributor</label>
              <select
                value={detailContributor}
                onChange={(e) => setDetailContributor(e.target.value)}
              >
                <option value="all">All contributors</option>
                {againstContributors.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Monthly Salary (USD)</label>
              <input
                type="number"
                value={detailSalaryStr}
                onChange={(e) => setDetailSalaryStr(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Daily Token Spend (USD)</label>
              <input
                type="number"
                value={detailTokensStr}
                onChange={(e) => setDetailTokensStr(e.target.value)}
              />
            </div>
          </div>

          <section className="table-section">
            <h2>Monthly Breakdown — {againstLabel}</h2>
            <StatsTable
              stats={againstMonthlyStats}
              predictionStats={predictionMonthlyStats}
              againstLabel={againstLabel}
            />
          </section>
        </>
      )}
    </section>
  );
}

import { useState, useEffect, useMemo } from "react";
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
import { PREFETCHED_REPOS, loadPrefetchedPRs } from "../lib/github";
import { getRollingAverages } from "../lib/calculations";
import type { PullRequest, RollingDataPoint } from "../lib/types";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export function ComparisonChart() {
  const [compareKey, setCompareKey] = useState(PREFETCHED_REPOS[0].key);
  const [againstKey, setAgainstKey] = useState(PREFETCHED_REPOS[1].key);
  const [comparePRs, setComparePRs] = useState<PullRequest[]>([]);
  const [againstPRs, setAgainstPRs] = useState<PullRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const againstOptions = useMemo(
    () =>
      PREFETCHED_REPOS.filter(
        (r) => r.key !== "Ivy-Interactive-Ivy-Framework" && r.key !== compareKey,
      ),
    [compareKey],
  );

  useEffect(() => {
    if (againstOptions.length > 0 && !againstOptions.find((o) => o.key === againstKey)) {
      setAgainstKey(againstOptions[0].key);
    }
  }, [againstOptions, againstKey]);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([loadPrefetchedPRs(compareKey), loadPrefetchedPRs(againstKey)])
      .then(([compareData, againstData]) => {
        setComparePRs(compareData);
        setAgainstPRs(againstData);
      })
      .catch(() => {
        setComparePRs([]);
        setAgainstPRs([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [compareKey, againstKey]);

  const compareData = useMemo(() => getRollingAverages(comparePRs, 5000, 200), [comparePRs]);
  const againstData = useMemo(() => getRollingAverages(againstPRs, 5000, 200), [againstPRs]);

  const compareLabel = PREFETCHED_REPOS.find((r) => r.key === compareKey)?.label ?? compareKey;
  const againstLabel = PREFETCHED_REPOS.find((r) => r.key === againstKey)?.label ?? againstKey;

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
    <section className="comparison-chart">
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
        <div className="selector-group">
          <label htmlFor="against-select">Against</label>
          <select
            id="against-select"
            value={againstKey}
            onChange={(e) => setAgainstKey(e.target.value)}
          >
            {againstOptions.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="comparison-chart-container">
        {isLoading ? (
          <div className="loading-spinner"></div>
        ) : (
          <Line data={chartData} options={options} />
        )}
      </div>
    </section>
  );
}

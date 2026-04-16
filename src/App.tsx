import { useState, useMemo } from "react";
import { QuickCalculator } from "./components/QuickCalculator";
import { ComparisonChart } from "./components/ComparisonChart";
import { RepoForm } from "./components/RepoForm";
import { ContributorSelect } from "./components/ContributorSelect";
import { CostInputs } from "./components/CostInputs";
import { CostChart } from "./components/CostChart";
import { StatsTable } from "./components/StatsTable";
import { fetchAllPRs, getUniqueContributors } from "./lib/github";
import { filterByContributor, getMonthlyStats, getRollingAverages } from "./lib/calculations";
import type { PullRequest } from "./lib/types";
import "./styles/index.css";

function App() {
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [contributors, setContributors] = useState<string[]>([]);
  const [selectedContributor, setSelectedContributor] = useState("");
  const [monthlySalary, setMonthlySalary] = useState(5000);
  const [dailyTokenSpend, setDailyTokenSpend] = useState(200);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repoName, setRepoName] = useState("");

  const handleFetch = async (owner: string, repo: string) => {
    setLoading(true);
    setError(null);
    try {
      const allPRs = await fetchAllPRs(owner, repo);
      setPrs(allPRs);
      setContributors(getUniqueContributors(allPRs));
      setSelectedContributor("");
      setRepoName(`${owner}/${repo}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch PRs");
    } finally {
      setLoading(false);
    }
  };

  const filteredPRs = useMemo(
    () => (selectedContributor ? filterByContributor(prs, selectedContributor) : prs),
    [prs, selectedContributor],
  );

  const monthlyStats = useMemo(
    () => getMonthlyStats(filteredPRs, monthlySalary, dailyTokenSpend),
    [filteredPRs, monthlySalary, dailyTokenSpend],
  );

  const rollingData = useMemo(
    () => getRollingAverages(filteredPRs, monthlySalary, dailyTokenSpend),
    [filteredPRs, monthlySalary, dailyTokenSpend],
  );

  return (
    <div className="app">
      <header>
        <h1>PR Cost Calculator</h1>
        <p>Estimate development and AI token costs per pull request</p>
      </header>

      <div className="landing-grid">
        <QuickCalculator />
        <ComparisonChart />
      </div>

      <section className="controls">
        <RepoForm onSubmit={handleFetch} loading={loading} />
        {error && <div className="error">{error}</div>}

        {contributors.length > 0 && (
          <div className="filters">
            <ContributorSelect
              contributors={contributors}
              selected={selectedContributor}
              onChange={setSelectedContributor}
            />
            <CostInputs
              monthlySalary={monthlySalary}
              dailyTokenSpend={dailyTokenSpend}
              onSalaryChange={setMonthlySalary}
              onTokenSpendChange={setDailyTokenSpend}
            />
          </div>
        )}
      </section>

      {filteredPRs.length > 0 && (
        <>
          <section className="summary">
            <h2>
              {repoName}
              {selectedContributor && ` — ${selectedContributor}`}
            </h2>
            <p>
              {filteredPRs.length} PRs analyzed (last 5 months) &middot; $
              {monthlySalary.toLocaleString()}/mo salary &middot; ${dailyTokenSpend}/day tokens
            </p>
          </section>

          <section className="charts">
            <CostChart
              data={rollingData}
              title="14-Day Avg PRs Created"
              dataKey="prsCreated"
              color="#4fc3f7"
              yAxisLabel="PRs"
            />
            <CostChart
              data={rollingData}
              title="14-Day Avg Denial Rate (%)"
              dataKey="denialRate"
              color="#ff7043"
              yAxisLabel="%"
            />
            <CostChart
              data={rollingData}
              title="Cost per PR ($)"
              dataKey="costPerPR"
              color="#66bb6a"
              yAxisLabel="USD"
            />
          </section>

          <section className="table-section">
            <h2>Monthly Breakdown</h2>
            <StatsTable stats={monthlyStats} />
          </section>
        </>
      )}
    </div>
  );
}

export default App;

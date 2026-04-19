import type { MonthlyStats } from "../lib/types";

interface StatsTableProps {
  stats: MonthlyStats[];
  predictionStats?: MonthlyStats[];
  againstLabel?: string;
  cutoffMonth?: string;
}

export function StatsTable({
  stats,
  predictionStats,
  againstLabel = "Against",
  cutoffMonth = "2026-03",
}: StatsTableProps) {
  const hasPrediction = !!predictionStats;

  return (
    <div className="stats-table-wrapper">
      <table className="stats-table">
        <thead>
          <tr>
            <th rowSpan={2}>Month</th>
            <th colSpan={4} style={{ textAlign: "center" }}>{againstLabel}</th>
            {hasPrediction && (
              <th colSpan={4} className="prediction-header">
                {againstLabel} + Ivy-Tendril
              </th>
            )}
          </tr>
          <tr>
            <th>Merged</th>
            <th>Denied</th>
            <th>Denial Rate</th>
            <th>Cost/PR</th>
            {hasPrediction && (
              <>
                <th className="prediction-col">Merged</th>
                <th className="prediction-col">Denied</th>
                <th className="prediction-col">Denial Rate</th>
                <th className="prediction-col">Cost/PR</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {stats.map((s, i) => {
            const p = predictionStats?.[i];
            const isPredicted = s.month >= cutoffMonth;
            const totalCost = s.devCostPerPR + s.tokenCostPerPR;
            const predTotalCost = p ? p.devCostPerPR + p.tokenCostPerPR : 0;

            return (
              <tr key={s.month}>
                <td>{s.month}</td>
                <td className="merged">{s.merged}</td>
                <td className="denied">{s.denied}</td>
                <td>{s.denialRate.toFixed(1)}%</td>
                <td>${totalCost.toFixed(0)}</td>
                {hasPrediction && p && (
                  <>
                    <td className={`prediction-col ${isPredicted ? "good" : ""}`}>
                      {isPredicted ? p.merged : "—"}
                    </td>
                    <td className={`prediction-col ${isPredicted ? "good" : ""}`}>
                      {isPredicted ? p.denied : "—"}
                    </td>
                    <td className={`prediction-col ${isPredicted ? "good" : ""}`}>
                      {isPredicted ? `${p.denialRate.toFixed(1)}%` : "—"}
                    </td>
                    <td className={`prediction-col ${isPredicted ? "good" : ""}`}>
                      {isPredicted ? `$${predTotalCost.toFixed(0)}` : "—"}
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

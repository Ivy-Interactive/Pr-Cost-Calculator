import type { MonthlyStats } from "../lib/types";

interface StatsTableProps {
  stats: MonthlyStats[];
}

export function StatsTable({ stats }: StatsTableProps) {
  return (
    <div className="stats-table-wrapper">
      <table className="stats-table">
        <thead>
          <tr>
            <th>Month</th>
            <th>Merged</th>
            <th>Denied</th>
            <th>Total</th>
            <th>Denial Rate</th>
            <th>Dev Cost/PR</th>
            <th>Token Cost/PR</th>
            <th>Total Cost/PR</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s) => (
            <tr key={s.month}>
              <td>{s.month}</td>
              <td className="merged">{s.merged}</td>
              <td className="denied">{s.denied}</td>
              <td>{s.totalPRs}</td>
              <td>{s.denialRate.toFixed(1)}%</td>
              <td>${s.devCostPerPR.toFixed(0)}</td>
              <td>${s.tokenCostPerPR.toFixed(0)}</td>
              <td>${(s.devCostPerPR + s.tokenCostPerPR).toFixed(0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

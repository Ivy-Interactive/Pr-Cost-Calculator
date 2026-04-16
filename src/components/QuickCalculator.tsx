import { useState } from "react";

export function QuickCalculator() {
  const [monthlySalary, setMonthlySalary] = useState(5000);
  const [dailyTokenSpend, setDailyTokenSpend] = useState(200);
  const [prsPerMonth, setPrsPerMonth] = useState(20);

  const devCostPerPR = monthlySalary / prsPerMonth;
  const tokenCostPerPR = (dailyTokenSpend * 21) / prsPerMonth;
  const totalCostPerPR = devCostPerPR + tokenCostPerPR;

  return (
    <div className="quick-calculator">
      <h3>Quick Estimate</h3>
      <div className="calc-inputs">
        <div className="form-group">
          <label>Monthly Salary (USD)</label>
          <input
            type="number"
            value={monthlySalary}
            onChange={(e) => setMonthlySalary(Number(e.target.value))}
            min={0}
          />
        </div>
        <div className="form-group">
          <label>Daily Token Spend (USD)</label>
          <input
            type="number"
            value={dailyTokenSpend}
            onChange={(e) => setDailyTokenSpend(Number(e.target.value))}
            min={0}
          />
        </div>
        <div className="form-group">
          <label>PRs per Month</label>
          <input
            type="number"
            value={prsPerMonth}
            onChange={(e) => setPrsPerMonth(Math.max(1, Number(e.target.value)))}
            min={1}
          />
        </div>
      </div>
      <div className="calc-results">
        <div className="calc-row">
          <span>Dev Cost / PR</span>
          <span className="calc-value">${devCostPerPR.toFixed(2)}</span>
        </div>
        <div className="calc-row">
          <span>Token Cost / PR</span>
          <span className="calc-value">${tokenCostPerPR.toFixed(2)}</span>
        </div>
        <div className="calc-row calc-total">
          <span>Total Cost / PR</span>
          <span className="calc-value">${totalCostPerPR.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

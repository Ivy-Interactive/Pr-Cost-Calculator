import { useState } from "react";

export function QuickCalculator() {
  const [salaryStr, setSalaryStr] = useState("5000");
  const [tokenSpendStr, setTokenSpendStr] = useState("200");
  const [prsStr, setPrsStr] = useState("20");
  const [denialRate, setDenialRate] = useState(0);

  const salary = Number(salaryStr) || 0;
  const tokenSpend = Number(tokenSpendStr) || 0;
  const prsPerMonth = Number(prsStr) || 0;

  const canCalculate = prsPerMonth > 0 && denialRate < 100;

  const devCostPerPR = canCalculate ? salary / prsPerMonth : 0;
  const tokenCostPerPR = canCalculate ? (tokenSpend * 21) / prsPerMonth : 0;
  const baseTotalCost = devCostPerPR + tokenCostPerPR;
  const effectiveMultiplier = canCalculate ? 1 / (1 - denialRate / 100) : 0;
  const effectiveTotalCost = baseTotalCost * effectiveMultiplier;

  const fmt = (value: number) => (canCalculate ? `$${value.toFixed(2)}` : "—");

  return (
    <div className="quick-calculator">
      <h3>Quick Estimate</h3>
      <div className="calc-inputs">
        <div className="form-group">
          <label>Monthly Salary (USD)</label>
          <input
            type="number"
            value={salaryStr}
            onChange={(e) => setSalaryStr(e.target.value)}
            min={0}
          />
        </div>
        <div className="form-group">
          <label>Daily Token Spend (USD)</label>
          <input
            type="number"
            value={tokenSpendStr}
            onChange={(e) => setTokenSpendStr(e.target.value)}
            min={0}
          />
        </div>
        <div className="form-group">
          <label>PRs per Month</label>
          <input type="number" value={prsStr} onChange={(e) => setPrsStr(e.target.value)} min={0} />
        </div>
        <div className="form-group">
          <label>Denial Rate ({denialRate}%)</label>
          <input
            type="range"
            min={0}
            max={99}
            value={denialRate}
            onChange={(e) => setDenialRate(Number(e.target.value))}
            className="denial-slider"
          />
        </div>
      </div>
      <div className="calc-results">
        <div className="calc-row">
          <span>Dev Cost / merged PR</span>
          <span className="calc-value">{fmt(devCostPerPR * effectiveMultiplier)}</span>
        </div>
        <div className="calc-row">
          <span>Token Cost / merged PR</span>
          <span className="calc-value">{fmt(tokenCostPerPR * effectiveMultiplier)}</span>
        </div>
        {denialRate > 0 && (
          <div className="calc-row calc-denial-info">
            <span>Denial overhead</span>
            <span className="calc-value denial-value">
              +{((effectiveMultiplier - 1) * 100).toFixed(0)}%
            </span>
          </div>
        )}
        <div className="calc-row calc-total">
          <span>Total Cost / merged PR</span>
          <span className="calc-value">{fmt(effectiveTotalCost)}</span>
        </div>
      </div>
    </div>
  );
}

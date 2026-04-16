interface CostInputsProps {
  monthlySalary: number;
  dailyTokenSpend: number;
  onSalaryChange: (value: number) => void;
  onTokenSpendChange: (value: number) => void;
}

export function CostInputs({
  monthlySalary,
  dailyTokenSpend,
  onSalaryChange,
  onTokenSpendChange,
}: CostInputsProps) {
  return (
    <div className="cost-inputs">
      <div className="form-group">
        <label htmlFor="salary">Monthly Salary (USD)</label>
        <input
          id="salary"
          type="number"
          value={monthlySalary}
          onChange={(e) => onSalaryChange(Number(e.target.value))}
          min={0}
        />
      </div>
      <div className="form-group">
        <label htmlFor="tokenSpend">Daily Token Spend (USD)</label>
        <input
          id="tokenSpend"
          type="number"
          value={dailyTokenSpend}
          onChange={(e) => onTokenSpendChange(Number(e.target.value))}
          min={0}
        />
      </div>
    </div>
  );
}

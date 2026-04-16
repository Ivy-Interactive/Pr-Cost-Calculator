interface ContributorSelectProps {
  contributors: string[];
  selected: string;
  onChange: (contributor: string) => void;
}

export function ContributorSelect({
  contributors,
  selected,
  onChange,
}: ContributorSelectProps) {
  return (
    <div className="form-group">
      <label htmlFor="contributor">Contributor</label>
      <select
        id="contributor"
        value={selected}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">All contributors</option>
        {contributors.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}

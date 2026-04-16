import { useState } from "react";

interface RepoFormProps {
  onSubmit: (owner: string, repo: string) => void;
  loading: boolean;
}

export function RepoForm({ onSubmit, loading }: RepoFormProps) {
  const [repoInput, setRepoInput] = useState("Ivy-Interactive/Ivy-Framework");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const [owner, repo] = repoInput.split("/");
    if (owner && repo) {
      onSubmit(owner, repo);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="repo-form">
      <div className="form-group">
        <label htmlFor="repo">GitHub Repository</label>
        <input
          id="repo"
          type="text"
          value={repoInput}
          onChange={(e) => setRepoInput(e.target.value)}
          placeholder="owner/repo"
          disabled={loading}
        />
      </div>
      <button type="submit" disabled={loading || !repoInput.includes("/")}>
        {loading ? "Fetching PRs..." : "Fetch PRs"}
      </button>
    </form>
  );
}

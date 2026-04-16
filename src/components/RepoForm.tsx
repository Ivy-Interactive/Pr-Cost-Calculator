import { useState } from "react";

interface RepoFormProps {
  onSubmit: (owner: string, repo: string, token?: string) => void;
  loading: boolean;
}

export function RepoForm({ onSubmit, loading }: RepoFormProps) {
  const [repoInput, setRepoInput] = useState("Ivy-Interactive/Ivy-Framework");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const [owner, repo] = repoInput.split("/");
    if (owner && repo) {
      onSubmit(owner, repo, token || undefined);
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
      <div className="form-group token-group">
        <button
          type="button"
          className="toggle-token"
          onClick={() => setShowToken(!showToken)}
        >
          {showToken ? "Hide" : "Add"} GitHub Token (optional)
        </button>
        {showToken && (
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ghp_... (raises rate limit to 5,000 req/hr)"
            disabled={loading}
          />
        )}
      </div>
      <button type="submit" disabled={loading || !repoInput.includes("/")}>
        {loading ? "Fetching PRs..." : "Fetch PRs"}
      </button>
    </form>
  );
}

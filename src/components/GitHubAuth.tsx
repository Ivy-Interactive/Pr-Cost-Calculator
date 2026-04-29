import { useState, useEffect } from "react";
import {
  getStoredToken,
  storeToken,
  clearToken,
  fetchGitHubUser,
  type GitHubUser,
} from "../lib/auth";

interface GitHubAuthProps {
  onAuthChange?: (authenticated: boolean) => void;
}

export function GitHubAuth({ onAuthChange }: GitHubAuthProps) {
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Check stored token on mount
  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      fetchGitHubUser(token)
        .then((u) => {
          setUser(u);
          onAuthChange?.(true);
        })
        .catch(() => {
          clearToken();
          onAuthChange?.(false);
        });
    }
  }, []);

  const handleSubmit = async () => {
    if (!tokenInput.trim()) return;
    setLoading(true);
    setError("");
    try {
      const u = await fetchGitHubUser(tokenInput.trim());
      storeToken(tokenInput.trim());
      setUser(u);
      setShowModal(false);
      setTokenInput("");
      onAuthChange?.(true);
    } catch {
      setError("Invalid token. Make sure it has 'repo' scope.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    clearToken();
    setUser(null);
    onAuthChange?.(false);
  };

  if (user) {
    return (
      <div className="gh-auth gh-auth--signed-in">
        <img src={user.avatar_url} alt={user.login} className="gh-avatar" />
        <span className="gh-username">{user.login}</span>
        <button className="gh-sign-out" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <>
      <button className="gh-sign-in" onClick={() => setShowModal(true)}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
        Sign in with GitHub
      </button>

      {showModal && (
        <div className="gh-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="gh-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Connect GitHub Account</h3>
            <p className="gh-modal-desc">
              To access private repositories, create a Personal Access Token with{" "}
              <strong>repo</strong> scope.
            </p>

            <a
              href="https://github.com/settings/tokens/new?scopes=repo&description=PR+Cost+Calculator"
              target="_blank"
              rel="noopener noreferrer"
              className="gh-create-token-link"
            >
              → Create token on GitHub
            </a>

            <div className="gh-token-input">
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxx"
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                autoFocus
              />
              <button onClick={handleSubmit} disabled={loading || !tokenInput.trim()}>
                {loading ? "Verifying..." : "Connect"}
              </button>
            </div>

            {error && <div className="gh-error">{error}</div>}

            <p className="gh-security-note">
              🔒 Token stays in your browser only. Never sent to any server except GitHub API.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

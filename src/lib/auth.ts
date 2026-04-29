const STORAGE_KEY = "gh_pat";

export function getStoredToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function storeToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string | null;
}

export async function fetchGitHubUser(token: string): Promise<GitHubUser> {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });
  if (!res.ok) throw new Error("Invalid token");
  return res.json();
}

/** Build auth headers — prefers user token, falls back to env PAT */
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  const token = getStoredToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    const envPat = import.meta.env.VITE_GITHUB_PAT as string | undefined;
    if (envPat) {
      headers.Authorization = `Bearer ${envPat}`;
    }
  }
  return headers;
}

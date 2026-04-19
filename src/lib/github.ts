import type { PullRequest } from "./types";

export const PREFETCHED_REPOS = [
  { key: "Ivy-Interactive-Ivy-Framework", label: "Ivy-Interactive/Ivy-Framework" },
  { key: "facebook-react", label: "facebook/react" },
  { key: "angular-angular", label: "angular/angular" },
  { key: "vuejs-core", label: "vuejs/core" },
  { key: "tailwindlabs-tailwindcss", label: "tailwindlabs/tailwindcss" },
];

export async function loadPrefetchedPRs(repoKey: string): Promise<PullRequest[]> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/${repoKey}.json`);
  if (!res.ok) throw new Error(`Failed to load prefetched data for ${repoKey}`);
  return res.json();
}

const GITHUB_API = "https://api.github.com";
const GITHUB_PAT = import.meta.env.VITE_GITHUB_PAT as string | undefined;

export async function fetchPrefetchedPRs(
  owner: string,
  repo: string,
): Promise<PullRequest[] | null> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/${owner}-${repo}.json`);
    if (!response.ok) return null;
    const prs: PullRequest[] = await response.json();
    return prs;
  } catch {
    return null;
  }
}

async function fetchLivePRs(owner: string, repo: string): Promise<PullRequest[]> {
  const allPRs: PullRequest[] = [];
  let page = 1;
  const perPage = 100;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  if (GITHUB_PAT) {
    headers.Authorization = `Bearer ${GITHUB_PAT}`;
  }

  while (true) {
    const url = `${GITHUB_API}/repos/${owner}/${repo}/pulls?state=all&per_page=${perPage}&page=${page}`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error(
          "GitHub API rate limit exceeded. Add a personal access token to increase the limit.",
        );
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const prs: PullRequest[] = await response.json();
    if (prs.length === 0) break;

    allPRs.push(...prs);
    if (prs.length < perPage) break;
    page++;
  }

  return allPRs;
}

export async function fetchAllPRs(owner: string, repo: string): Promise<PullRequest[]> {
  const prefetched = await fetchPrefetchedPRs(owner, repo);
  if (prefetched) return prefetched;
  return fetchLivePRs(owner, repo);
}

export function getUniqueContributors(prs: PullRequest[]): string[] {
  const contributors = new Set(prs.map((pr) => pr.user.login));
  return Array.from(contributors).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}

export function categorizePR(pr: PullRequest): "merged" | "denied" | "open" {
  if (pr.merged_at) return "merged";
  if (pr.state === "closed" && !pr.merged_at) return "denied";
  return "open";
}

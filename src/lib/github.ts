import type { PullRequest } from "./types";
import { endOfDay, format, isAfter, parseISO } from "date-fns";
import { getAuthHeaders } from "./auth";

export const PR_DATA_THROUGH = endOfDay(parseISO("2026-04-23"));

export const PR_DATA_THROUGH_LABEL = format(PR_DATA_THROUGH, "MMMM d, yyyy");

export const PREFETCHED_REPOS = [
  { key: "Ivy-Interactive-Ivy-Framework", label: "Ivy-Interactive/Ivy-Framework" },
  { key: "facebook-react", label: "facebook/react" },
  { key: "angular-angular", label: "angular/angular" },
  { key: "vuejs-core", label: "vuejs/core" },
  { key: "tailwindlabs-tailwindcss", label: "tailwindlabs/tailwindcss" },
];

function trimPRsAfterCutoff(prs: PullRequest[]): PullRequest[] {
  return prs.filter((pr) => !isAfter(parseISO(pr.created_at), PR_DATA_THROUGH));
}

export async function loadPrefetchedPRs(repoKey: string): Promise<PullRequest[]> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/${repoKey}.json`);
  if (!res.ok) throw new Error(`Failed to load prefetched data for ${repoKey}`);
  return trimPRsAfterCutoff(await res.json());
}

export async function fetchPrefetchedPRs(
  owner: string,
  repo: string,
): Promise<PullRequest[] | null> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/${owner}-${repo}.json`);
    if (!response.ok) return null;
    const prs: PullRequest[] = await response.json();
    return trimPRsAfterCutoff(prs);
  } catch {
    return null;
  }
}

async function fetchLivePRs(owner: string, repo: string): Promise<PullRequest[]> {
  const allPRs: PullRequest[] = [];
  let page = 1;
  const perPage = 100;
  const headers = getAuthHeaders();

  while (true) {
    const url = `https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=${perPage}&page=${page}`;
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
  return trimPRsAfterCutoff(await fetchLivePRs(owner, repo));
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

#!/usr/bin/env node

const REPOS = ["Ivy-Interactive/Ivy-Framework", "facebook/react", "torvalds/linux"];

const GITHUB_API = "https://api.github.com";

function parseArgs() {
  const args = process.argv.slice(2);
  let days = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--days" && args[i + 1]) {
      days = parseInt(args[i + 1], 10);
      if (isNaN(days)) {
        console.error("Invalid --days value");
        process.exit(1);
      }
    }
  }
  return { days };
}

function getHeaders() {
  const headers = { Accept: "application/vnd.github.v3+json" };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

async function fetchPRsForRepo(owner, repo, days) {
  const headers = getHeaders();
  const allPRs = [];
  let page = 1;
  const perPage = 100;

  const since = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString() : null;

  console.log(`Fetching PRs for ${owner}/${repo}${since ? ` (updated since ${since})` : ""}...`);

  while (true) {
    let url = `${GITHUB_API}/repos/${owner}/${repo}/pulls?state=all&per_page=${perPage}&page=${page}&sort=updated&direction=desc`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(
          `  Repository ${owner}/${repo} has no pull requests endpoint (404). Writing empty array.`,
        );
        return allPRs;
      }
      const remaining = response.headers.get("x-ratelimit-remaining");
      throw new Error(
        `GitHub API error: ${response.status} ${response.statusText} (rate-limit remaining: ${remaining})`,
      );
    }

    const prs = await response.json();
    if (prs.length === 0) break;

    for (const pr of prs) {
      if (since && new Date(pr.updated_at) < new Date(since)) {
        // Since results are sorted by updated desc, we can stop early
        return allPRs;
      }

      allPRs.push({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        created_at: pr.created_at,
        closed_at: pr.closed_at,
        merged_at: pr.merged_at,
        user: { login: pr.user.login },
      });
    }

    if (prs.length < perPage) break;
    page++;
  }

  return allPRs;
}

async function main() {
  const { days } = parseArgs();
  const { readFile, writeFile, mkdir } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { dirname } = await import("node:path");

  const __filename = fileURLToPath(import.meta.url);
  const projectRoot = dirname(dirname(__filename));
  const dataDir = join(projectRoot, "public", "data");

  await mkdir(dataDir, { recursive: true });

  for (const repoSpec of REPOS) {
    const [owner, repo] = repoSpec.split("/");
    const filename = `${owner}-${repo}.json`;
    const filePath = join(dataDir, filename);

    try {
      const fetchedPRs = await fetchPRsForRepo(owner, repo, days);

      let finalPRs;
      if (days) {
        // Incremental mode: merge with existing data
        let existing = [];
        try {
          const raw = await readFile(filePath, "utf-8");
          existing = JSON.parse(raw);
        } catch {
          // No existing file, start fresh
        }

        // Build a map of existing PRs by number
        const prMap = new Map(existing.map((pr) => [pr.number, pr]));

        // Overwrite with fetched (newer) data
        for (const pr of fetchedPRs) {
          prMap.set(pr.number, pr);
        }

        finalPRs = Array.from(prMap.values()).sort((a, b) => b.number - a.number);
      } else {
        finalPRs = fetchedPRs;
      }

      await writeFile(filePath, JSON.stringify(finalPRs, null, 2) + "\n");
      console.log(`Wrote ${finalPRs.length} PRs to ${filename}`);
    } catch (err) {
      console.error(`Error fetching ${owner}/${repo}: ${err.message}`);
      process.exit(1);
    }
  }

  console.log("Done.");
}

main();

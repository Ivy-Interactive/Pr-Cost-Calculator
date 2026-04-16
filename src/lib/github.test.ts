import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUniqueContributors, categorizePR, fetchPrefetchedPRs } from "./github";
import type { PullRequest } from "./types";

function makePR(overrides: Partial<PullRequest>): PullRequest {
  return {
    number: 1,
    title: "Test PR",
    state: "closed",
    created_at: new Date().toISOString(),
    closed_at: new Date().toISOString(),
    merged_at: new Date().toISOString(),
    user: { login: "alice" },
    ...overrides,
  };
}

describe("categorizePR", () => {
  it("categorizes merged PR", () => {
    const pr = makePR({ state: "closed", merged_at: "2024-01-01T00:00:00Z" });
    expect(categorizePR(pr)).toBe("merged");
  });

  it("categorizes denied PR (closed, not merged)", () => {
    const pr = makePR({ state: "closed", merged_at: null });
    expect(categorizePR(pr)).toBe("denied");
  });

  it("categorizes open PR", () => {
    const pr = makePR({ state: "open", merged_at: null });
    expect(categorizePR(pr)).toBe("open");
  });
});

describe("getUniqueContributors", () => {
  it("returns unique sorted contributor logins", () => {
    const prs = [
      makePR({ user: { login: "charlie" } }),
      makePR({ user: { login: "alice" } }),
      makePR({ user: { login: "bob" } }),
      makePR({ user: { login: "alice" } }),
    ];
    const result = getUniqueContributors(prs);
    expect(result).toEqual(["alice", "bob", "charlie"]);
  });

  it("returns empty array for no PRs", () => {
    expect(getUniqueContributors([])).toEqual([]);
  });
});

describe("fetchPrefetchedPRs", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed PRs when JSON file exists", async () => {
    const mockPRs = [
      makePR({ number: 1, title: "First PR" }),
      makePR({ number: 2, title: "Second PR" }),
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockPRs), { status: 200 }),
    );

    const result = await fetchPrefetchedPRs("owner", "repo");
    expect(result).toEqual(mockPRs);
  });

  it("returns null when JSON file is not found (404)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("Not Found", { status: 404 }));

    const result = await fetchPrefetchedPRs("owner", "repo");
    expect(result).toBeNull();
  });

  it("returns null when fetch throws a network error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"));

    const result = await fetchPrefetchedPRs("owner", "repo");
    expect(result).toBeNull();
  });
});

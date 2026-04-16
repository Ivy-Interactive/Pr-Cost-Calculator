import { describe, it, expect } from "vitest";
import { getUniqueContributors, categorizePR } from "./github";
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

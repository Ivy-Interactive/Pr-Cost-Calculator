import { describe, it, expect } from "vitest";
import { filterByContributor, getMonthlyStats, getRollingAverages } from "./calculations";
import type { PullRequest } from "./types";
import { format } from "date-fns";

function makePR(overrides: Partial<PullRequest> & { user: { login: string } }): PullRequest {
  return {
    number: 1,
    title: "Test PR",
    state: "closed",
    created_at: new Date().toISOString(),
    closed_at: new Date().toISOString(),
    merged_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("filterByContributor", () => {
  it("filters PRs by contributor login", () => {
    const prs = [
      makePR({ user: { login: "alice" } }),
      makePR({ user: { login: "bob" } }),
      makePR({ user: { login: "alice" } }),
    ];
    const result = filterByContributor(prs, "alice");
    expect(result).toHaveLength(2);
    expect(result.every((pr) => pr.user.login === "alice")).toBe(true);
  });

  it("returns empty array when no match", () => {
    const prs = [makePR({ user: { login: "alice" } })];
    expect(filterByContributor(prs, "charlie")).toHaveLength(0);
  });
});

describe("getMonthlyStats", () => {
  it("calculates stats correctly for merged and denied PRs", () => {
    const now = new Date();
    const thisMonth = format(now, "yyyy-MM");

    const prs = [
      // 3 merged PRs this month
      makePR({
        user: { login: "alice" },
        state: "closed",
        merged_at: now.toISOString(),
        created_at: now.toISOString(),
      }),
      makePR({
        user: { login: "alice" },
        state: "closed",
        merged_at: now.toISOString(),
        created_at: now.toISOString(),
      }),
      makePR({
        user: { login: "alice" },
        state: "closed",
        merged_at: now.toISOString(),
        created_at: now.toISOString(),
      }),
      // 1 denied PR this month
      makePR({
        user: { login: "alice" },
        state: "closed",
        merged_at: null,
        created_at: now.toISOString(),
      }),
    ];

    const stats = getMonthlyStats(prs, 5000, 200, 1);
    expect(stats).toHaveLength(1);

    const month = stats[0];
    expect(month.month).toBe(thisMonth);
    expect(month.merged).toBe(3);
    expect(month.denied).toBe(1);
    expect(month.totalPRs).toBe(4);
    expect(month.denialRate).toBe(25); // 1/4 * 100
    expect(month.devCostPerPR).toBe(1250); // 5000/4
    expect(month.tokenCostPerPR).toBe(1050); // (200*21)/4
  });

  it("handles zero PRs in a month", () => {
    const stats = getMonthlyStats([], 5000, 200, 1);
    expect(stats[0].totalPRs).toBe(0);
    expect(stats[0].denialRate).toBe(0);
    expect(stats[0].devCostPerPR).toBe(0);
    expect(stats[0].tokenCostPerPR).toBe(0);
  });

  it("excludes open PRs from stats", () => {
    const now = new Date();
    const prs = [
      makePR({
        user: { login: "alice" },
        state: "open",
        merged_at: null,
        created_at: now.toISOString(),
      }),
    ];
    const stats = getMonthlyStats(prs, 5000, 200, 1);
    expect(stats[0].totalPRs).toBe(0);
  });

  it("returns stats for the correct number of months", () => {
    const stats = getMonthlyStats([], 5000, 200, 5);
    expect(stats).toHaveLength(5);

    // Verify months are in chronological order
    for (let i = 0; i < 4; i++) {
      expect(stats[i].month < stats[i + 1].month).toBe(true);
    }
  });
});

describe("getRollingAverages", () => {
  it("returns data points for the period", () => {
    const now = new Date();
    const prs = [
      makePR({
        user: { login: "alice" },
        merged_at: now.toISOString(),
        created_at: now.toISOString(),
      }),
    ];
    const data = getRollingAverages(prs, 5000, 200, 5);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("date");
    expect(data[0]).toHaveProperty("prsCreated");
    expect(data[0]).toHaveProperty("denialRate");
    expect(data[0]).toHaveProperty("costPerPR");
  });

  it("returns empty-like data for no PRs", () => {
    const data = getRollingAverages([], 5000, 200, 5);
    expect(data.length).toBeGreaterThan(0);
    expect(data.every((d) => d.prsCreated === 0)).toBe(true);
    expect(data.every((d) => d.costPerPR === 0)).toBe(true);
  });

  it("returns prsMerged field with correct count", () => {
    // Use a date 10 days ago to ensure it falls within a sampled 14-day window
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const dateStr = tenDaysAgo.toISOString();
    const prs = [
      makePR({
        user: { login: "alice" },
        state: "closed",
        merged_at: dateStr,
        created_at: dateStr,
      }),
      makePR({
        user: { login: "alice" },
        state: "closed",
        merged_at: dateStr,
        created_at: dateStr,
      }),
      makePR({
        user: { login: "alice" },
        state: "closed",
        merged_at: null,
        created_at: dateStr,
      }),
    ];
    const data = getRollingAverages(prs, 5000, 200, 5);
    const pointWithPRs = data.find((d) => d.prsCreated > 0);
    expect(pointWithPRs).toBeDefined();
    expect(pointWithPRs!).toHaveProperty("prsMerged");
    expect(pointWithPRs!.prsMerged).toBe(2);
    expect(pointWithPRs!.prsCreated).toBe(3);
  });

  it("prsMerged is distinct from prsCreated", () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const dateStr = tenDaysAgo.toISOString();
    const prs = [
      makePR({
        user: { login: "alice" },
        state: "closed",
        merged_at: dateStr,
        created_at: dateStr,
      }),
      makePR({
        user: { login: "alice" },
        state: "closed",
        merged_at: null,
        created_at: dateStr,
      }),
    ];
    const data = getRollingAverages(prs, 5000, 200, 5);
    const pointWithPRs = data.find((d) => d.prsCreated > 0);
    expect(pointWithPRs).toBeDefined();
    expect(pointWithPRs!.prsMerged).toBeLessThan(pointWithPRs!.prsCreated);
  });
});

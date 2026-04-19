import { describe, it, expect } from "vitest";
import { PREFETCHED_REPOS } from "../lib/github";

describe("ComparisonChart selector logic", () => {
  it("PREFETCHED_REPOS has correct entries for selectors", () => {
    expect(PREFETCHED_REPOS).toHaveLength(5);
    expect(PREFETCHED_REPOS.map((r) => r.label)).toEqual([
      "Ivy-Interactive/Ivy-Framework",
      "facebook/react",
      "angular/angular",
      "vuejs/core",
      "tailwindlabs/tailwindcss",
    ]);
  });

  it("Against dropdown excludes Ivy-Framework and currently selected Compare repo", () => {
    const compareKey = "Ivy-Interactive-Ivy-Framework";
    const againstOptions = PREFETCHED_REPOS.filter(
      (r) => r.key !== "Ivy-Interactive-Ivy-Framework" && r.key !== compareKey,
    );
    expect(againstOptions.map((r) => r.label)).toEqual([
      "facebook/react",
      "angular/angular",
      "vuejs/core",
      "tailwindlabs/tailwindcss",
    ]);
  });

  it("Against dropdown excludes Ivy-Framework and a non-Ivy Compare selection", () => {
    const compareKey = "facebook-react";
    const againstOptions = PREFETCHED_REPOS.filter(
      (r) => r.key !== "Ivy-Interactive-Ivy-Framework" && r.key !== compareKey,
    );
    expect(againstOptions).toHaveLength(3);
    expect(againstOptions[0].label).toBe("angular/angular");
  });

  it("keys match expected filename format", () => {
    for (const repo of PREFETCHED_REPOS) {
      expect(repo.key).toMatch(/^[a-zA-Z0-9-]+$/);
      expect(repo.label).toContain("/");
    }
  });
});

import { useState, useEffect } from "react";
import { loadPrefetchedPRs, categorizePR } from "../lib/github";
import type { PullRequest } from "../lib/types";

const CUTOFF = new Date("2026-03-02");
const BEFORE_START = new Date("2025-12-01");

interface ImpactStats {
  mergedPerWeekBefore: number;
  mergedPerWeekAfter: number;
  denialRateBefore: number;
  denialRateAfter: number;
  totalMergedAfter: number;
}

function computeStats(prs: PullRequest[]): ImpactStats {
  const beforePRs = prs.filter((pr) => {
    const d = new Date(pr.created_at);
    return d >= BEFORE_START && d < CUTOFF;
  });
  const afterPRs = prs.filter((pr) => new Date(pr.created_at) >= CUTOFF);

  const mergedBefore = beforePRs.filter((pr) => categorizePR(pr) === "merged").length;
  const mergedAfter = afterPRs.filter((pr) => categorizePR(pr) === "merged").length;

  const daysBefore = (CUTOFF.getTime() - BEFORE_START.getTime()) / 86400000;
  const daysAfter = (Date.now() - CUTOFF.getTime()) / 86400000;

  const weeksBefore = daysBefore / 7;
  const weeksAfter = daysAfter / 7;

  const mergedPerWeekBefore = weeksBefore > 0 ? mergedBefore / weeksBefore : 0;
  const mergedPerWeekAfter = weeksAfter > 0 ? mergedAfter / weeksAfter : 0;

  const totalBefore = beforePRs.filter((pr) => categorizePR(pr) !== "open").length;
  const totalAfter = afterPRs.filter((pr) => categorizePR(pr) !== "open").length;

  const denialRateBefore =
    totalBefore > 0
      ? (beforePRs.filter((pr) => categorizePR(pr) === "denied").length / totalBefore) * 100
      : 0;
  const denialRateAfter =
    totalAfter > 0
      ? (afterPRs.filter((pr) => categorizePR(pr) === "denied").length / totalAfter) * 100
      : 0;

  return { mergedPerWeekBefore, mergedPerWeekAfter, denialRateBefore, denialRateAfter, totalMergedAfter: mergedAfter };
}

function formatDelta(value: number, inverse = false): { text: string; positive: boolean } {
  if (!isFinite(value) || isNaN(value)) return { text: "—", positive: true };
  const positive = inverse ? value < 0 : value > 0;
  const abs = Math.abs(value);
  const text = `${value > 0 ? "+" : ""}${abs.toFixed(0)}%`;
  return { text, positive };
}

function formatPpDelta(before: number, after: number): { text: string; positive: boolean } {
  const diff = after - before;
  const positive = diff < 0;
  const text = `${diff > 0 ? "+" : ""}${diff.toFixed(1)}pp`;
  return { text, positive };
}

export function TendrilImpact() {
  const [stats, setStats] = useState<ImpactStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPrefetchedPRs("Ivy-Interactive-Ivy-Framework")
      .then((prs) => setStats(computeStats(prs)))
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return null;

  const weeklyPctChange =
    stats && stats.mergedPerWeekBefore > 0
      ? ((stats.mergedPerWeekAfter - stats.mergedPerWeekBefore) / stats.mergedPerWeekBefore) * 100
      : null;

  const weeklyDelta = weeklyPctChange !== null ? formatDelta(weeklyPctChange) : null;
  const denialDelta = stats ? formatPpDelta(stats.denialRateBefore, stats.denialRateAfter) : null;

  return (
    <div className="tendril-impact">
      <div className="tendril-impact-header">
        <span className="tendril-impact-badge">Ivy Tendril</span>
        <span className="tendril-impact-title">Since adopting Ivy Tendril</span>
        <span className="tendril-impact-repo">Ivy-Interactive/Ivy-Framework · from Mar 2</span>
      </div>

      <div className="tendril-impact-tiles">
        <div className="tendril-tile">
          <span className="tendril-tile-label">PRs / week</span>
          {!stats ? (
            <span className="tendril-tile-skeleton" />
          ) : (
            <>
              <span className="tendril-tile-values">
                {stats.mergedPerWeekBefore.toFixed(1)} → {stats.mergedPerWeekAfter.toFixed(1)}
              </span>
              {weeklyDelta && (
                <span className={`tendril-tile-delta ${weeklyDelta.positive ? "positive" : "negative"}`}>
                  {weeklyDelta.text}
                </span>
              )}
            </>
          )}
        </div>

        <div className="tendril-tile">
          <span className="tendril-tile-label">Denial Rate</span>
          {!stats ? (
            <span className="tendril-tile-skeleton" />
          ) : (
            <>
              <span className="tendril-tile-values">
                {stats.denialRateBefore.toFixed(0)}% → {stats.denialRateAfter.toFixed(0)}%
              </span>
              {denialDelta && (
                <span className={`tendril-tile-delta ${denialDelta.positive ? "positive" : "negative"}`}>
                  {denialDelta.text}
                </span>
              )}
            </>
          )}
        </div>

        <div className="tendril-tile">
          <span className="tendril-tile-label">Merged since Mar 2</span>
          {!stats ? (
            <span className="tendril-tile-skeleton" />
          ) : (
            <>
              <span className="tendril-tile-values">{stats.totalMergedAfter}</span>
              {weeklyDelta && (
                <span className={`tendril-tile-delta ${weeklyDelta.positive ? "positive" : "negative"}`}>
                  {weeklyDelta.text} vs prior pace
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

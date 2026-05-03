import { useEffect, useState } from "react";
import { loadPrefetchedPRs } from "../lib/github";
import { categorizePR } from "../lib/github";

const CUTOFF = new Date("2026-03-02");
const BEFORE_START = new Date("2025-12-01");

function fmt(n: number, decimals = 1) {
  return n.toFixed(decimals);
}

export function TendrilImpact() {
  const [stats, setStats] = useState<{
    mergedPerWeekBefore: number;
    mergedPerWeekAfter: number;
    denialRateBefore: number;
    denialRateAfter: number;
  } | null>(null);

  useEffect(() => {
    loadPrefetchedPRs("Ivy-Interactive-Ivy-Framework").then((prs) => {
      const beforePRs = prs.filter((pr) => {
        const d = new Date(pr.created_at);
        return d >= BEFORE_START && d < CUTOFF;
      });
      const afterPRs = prs.filter((pr) => new Date(pr.created_at) >= CUTOFF);

      const mergedBefore = beforePRs.filter((pr) => categorizePR(pr) === "merged").length;
      const mergedAfter = afterPRs.filter((pr) => categorizePR(pr) === "merged").length;

      const daysBefore = (CUTOFF.getTime() - BEFORE_START.getTime()) / 86400000;
      const daysAfter = (Date.now() - CUTOFF.getTime()) / 86400000;

      const mergedPerWeekBefore = mergedBefore / (daysBefore / 7);
      const mergedPerWeekAfter = mergedAfter / (daysAfter / 7);

      const closedBefore = beforePRs.filter((pr) => categorizePR(pr) !== "open").length;
      const closedAfter = afterPRs.filter((pr) => categorizePR(pr) !== "open").length;

      const denialRateBefore =
        closedBefore > 0
          ? (beforePRs.filter((pr) => categorizePR(pr) === "denied").length / closedBefore) * 100
          : 0;
      const denialRateAfter =
        closedAfter > 0
          ? (afterPRs.filter((pr) => categorizePR(pr) === "denied").length / closedAfter) * 100
          : 0;

      setStats({ mergedPerWeekBefore, mergedPerWeekAfter, denialRateBefore, denialRateAfter });
    });
  }, []);

  if (!stats) return null;

  const mergeIncreasePct = ((stats.mergedPerWeekAfter - stats.mergedPerWeekBefore) / stats.mergedPerWeekBefore) * 100;
  const denialDropPp = stats.denialRateBefore - stats.denialRateAfter;

  return (
    <section className="tendril-impact">
      <div className="tendril-impact-header">
        <span className="tendril-impact-title">Since adopting Ivy Tendril</span>
        <span className="tendril-impact-repo">Ivy-Interactive/Ivy-Framework</span>
      </div>
      <div className="tendril-impact-tiles">
        <div className="tendril-impact-tile">
          <div className="tendril-tile-label">PRs merged / week</div>
          <div className="tendril-tile-values">
            <span className="tendril-tile-before">{fmt(stats.mergedPerWeekBefore)}</span>
            <span className="tendril-tile-arrow">→</span>
            <span className="tendril-tile-after">{fmt(stats.mergedPerWeekAfter)}</span>
          </div>
          <div className="tendril-tile-delta tendril-delta-positive">
            +{fmt(mergeIncreasePct, 0)}%
          </div>
        </div>
        <div className="tendril-impact-tile">
          <div className="tendril-tile-label">Denial rate</div>
          <div className="tendril-tile-values">
            <span className="tendril-tile-before">{fmt(stats.denialRateBefore, 0)}%</span>
            <span className="tendril-tile-arrow">→</span>
            <span className="tendril-tile-after">{fmt(stats.denialRateAfter, 0)}%</span>
          </div>
          <div className="tendril-tile-delta tendril-delta-positive">
            -{fmt(denialDropPp, 0)}pp
          </div>
        </div>
      </div>
    </section>
  );
}

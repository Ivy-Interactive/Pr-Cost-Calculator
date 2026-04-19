import {
  subMonths,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
  format,
  eachDayOfInterval,
  subDays,
} from "date-fns";
import type { PullRequest, MonthlyStats, RollingDataPoint } from "./types";
import { categorizePR } from "./github";

const WORKING_HOURS_PER_MONTH = 168;
const WORKING_DAYS_PER_MONTH = 21;

export function filterByContributor(prs: PullRequest[], contributor: string): PullRequest[] {
  return prs.filter((pr) => pr.user.login === contributor);
}

export function getMonthlyStats(
  prs: PullRequest[],
  monthlySalary: number,
  dailyTokenSpend: number,
  months: number = 5,
): MonthlyStats[] {
  const now = new Date();
  const stats: MonthlyStats[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    const interval = {
      start: startOfMonth(monthDate),
      end: endOfMonth(monthDate),
    };
    const monthLabel = format(monthDate, "yyyy-MM");

    const monthPRs = prs.filter((pr) => {
      const createdAt = parseISO(pr.created_at);
      return isWithinInterval(createdAt, interval);
    });

    const merged = monthPRs.filter((pr) => categorizePR(pr) === "merged").length;
    const denied = monthPRs.filter((pr) => categorizePR(pr) === "denied").length;
    const totalPRs = merged + denied;

    const denialRate = totalPRs > 0 ? (denied / totalPRs) * 100 : 0;
    const avgHoursPerPR = totalPRs > 0 ? WORKING_HOURS_PER_MONTH / totalPRs : 0;
    const devCostPerPR = totalPRs > 0 ? monthlySalary / totalPRs : 0;
    const monthlyTokenSpend = dailyTokenSpend * WORKING_DAYS_PER_MONTH;
    const tokenCostPerPR = totalPRs > 0 ? monthlyTokenSpend / totalPRs : 0;

    stats.push({
      month: monthLabel,
      totalPRs,
      merged,
      denied,
      denialRate,
      avgHoursPerPR,
      devCostPerPR,
      tokenCostPerPR,
    });
  }

  return stats;
}

export function getRollingAverages(
  prs: PullRequest[],
  monthlySalary: number,
  dailyTokenSpend: number,
  months: number = 5,
): RollingDataPoint[] {
  const now = new Date();
  const startDate = startOfMonth(subMonths(now, months - 1));
  const endDate = new Date();
  const windowDays = 14;

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const dataPoints: RollingDataPoint[] = [];

  // Sample every 7 days to reduce data points
  for (let i = 0; i < days.length; i += 7) {
    const day = days[i];
    const windowStart = subDays(day, windowDays);
    const windowEnd = day;

    const windowPRs = prs.filter((pr) => {
      const createdAt = parseISO(pr.created_at);
      return isWithinInterval(createdAt, { start: windowStart, end: windowEnd });
    });

    const merged = windowPRs.filter((pr) => categorizePR(pr) === "merged").length;
    const denied = windowPRs.filter((pr) => categorizePR(pr) === "denied").length;
    const total = merged + denied;

    const denialRate = total > 0 ? (denied / total) * 100 : 0;
    const monthlyTokenSpend = dailyTokenSpend * WORKING_DAYS_PER_MONTH;
    const totalCostPerPR = total > 0 ? monthlySalary / total + monthlyTokenSpend / total : 0;

    dataPoints.push({
      date: format(day, "MMM dd"),
      prsCreated: total,
      prsMerged: merged,
      denialRate,
      costPerPR: totalCostPerPR,
    });
  }

  return dataPoints;
}

/**
 * Generate a "What if Tendril?" prediction for the Against repo.
 * Before cutoff: prediction = against values (unchanged).
 * After cutoff: against values are scaled by Ivy-Framework's growth coefficient.
 */
export function computeTendrilPrediction(
  ivyData: RollingDataPoint[],
  againstData: RollingDataPoint[],
  cutoffDate: string = "Mar 02",
): RollingDataPoint[] {
  // Find the cutoff index (first date >= cutoffDate)
  const cutoffIdx = ivyData.findIndex((d) => d.date >= cutoffDate);
  if (cutoffIdx <= 0) return againstData;

  // Compute Ivy baseline = average of Ivy values BEFORE cutoff
  const ivyBefore = ivyData.slice(0, cutoffIdx);

  const avgIvyPRs =
    ivyBefore.reduce((s, d) => s + d.prsCreated, 0) / ivyBefore.length || 1;
  const avgIvyDenial =
    ivyBefore.reduce((s, d) => s + d.denialRate, 0) / ivyBefore.length || 1;

  return againstData.map((point, i) => {
    if (i < cutoffIdx) return { ...point };

    const ivyPoint = ivyData[i] ?? ivyData[ivyData.length - 1];

    // Growth coefficient = how much Ivy grew relative to its own baseline
    // PRs: can only grow (coeff >= 1)
    const prsCoeff = Math.max(1, ivyPoint.prsCreated / avgIvyPRs);
    // Denial: can only shrink (coeff <= 1)
    const denialCoeff = avgIvyDenial > 0 ? Math.min(1, ivyPoint.denialRate / avgIvyDenial) : 1;

    const predPRs = point.prsCreated * prsCoeff;
    // Cost = same total budget spread over more PRs
    const predCost = predPRs > 0 ? (point.costPerPR * point.prsCreated) / predPRs : 0;

    return {
      ...point,
      prsCreated: Math.round(predPRs),
      prsMerged: Math.round(point.prsMerged * prsCoeff),
      denialRate: Math.max(0, point.denialRate * denialCoeff),
      costPerPR: Math.max(0, predCost),
    };
  });
}

/**
 * Apply Ivy-Framework's monthly improvement coefficients to Against repo monthly stats.
 * Months before March 2026 are unchanged; March onward get Tendril prediction.
 */
export function computeTendrilMonthlyPrediction(
  ivyMonthly: MonthlyStats[],
  againstMonthly: MonthlyStats[],
  cutoffMonth: string = "2026-03",
): MonthlyStats[] {
  // Compute Ivy baseline from months before cutoff
  const ivyBefore = ivyMonthly.filter((m) => m.month < cutoffMonth);
  if (ivyBefore.length === 0) return againstMonthly;

  const avgIvyTotal = ivyBefore.reduce((s, m) => s + m.totalPRs, 0) / ivyBefore.length || 1;
  const avgIvyDenial = ivyBefore.reduce((s, m) => s + m.denialRate, 0) / ivyBefore.length || 1;

  return againstMonthly.map((month) => {
    if (month.month < cutoffMonth) return { ...month };

    const ivyMonth = ivyMonthly.find((m) => m.month === month.month);
    if (!ivyMonth) return { ...month };

    const prsCoeff = Math.max(1, ivyMonth.totalPRs / avgIvyTotal);
    const denialCoeff = Math.min(1, ivyMonth.denialRate / avgIvyDenial);

    const predMerged = Math.round(month.merged * prsCoeff);
    const predDenied = Math.max(0, Math.round(month.denied * denialCoeff));
    const predTotal = predMerged + predDenied;
    const predDenialRate = predTotal > 0 ? (predDenied / predTotal) * 100 : 0;
    const predDevCost = predTotal > 0 ? month.devCostPerPR * month.totalPRs / predTotal : 0;
    const predTokenCost = predTotal > 0 ? month.tokenCostPerPR * month.totalPRs / predTotal : 0;

    return {
      ...month,
      merged: predMerged,
      denied: predDenied,
      totalPRs: predTotal,
      denialRate: predDenialRate,
      devCostPerPR: predDevCost,
      tokenCostPerPR: predTokenCost,
      avgHoursPerPR: predTotal > 0 ? WORKING_HOURS_PER_MONTH / predTotal : 0,
    };
  });
}

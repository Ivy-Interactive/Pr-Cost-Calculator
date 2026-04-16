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

export function filterByContributor(
  prs: PullRequest[],
  contributor: string,
): PullRequest[] {
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
    const totalCostPerPR =
      total > 0 ? monthlySalary / total + monthlyTokenSpend / total : 0;

    dataPoints.push({
      date: format(day, "MMM dd"),
      prsCreated: total,
      denialRate,
      costPerPR: totalCostPerPR,
    });
  }

  return dataPoints;
}

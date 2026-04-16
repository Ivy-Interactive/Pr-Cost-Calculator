export interface PullRequest {
  number: number;
  title: string;
  state: string;
  created_at: string;
  closed_at: string | null;
  merged_at: string | null;
  user: {
    login: string;
  };
}

export interface MonthlyStats {
  month: string; // YYYY-MM
  totalPRs: number;
  merged: number;
  denied: number;
  denialRate: number;
  avgHoursPerPR: number;
  devCostPerPR: number;
  tokenCostPerPR: number;
}

export interface RollingDataPoint {
  date: string;
  prsCreated: number;
  prsMerged: number;
  denialRate: number;
  costPerPR: number;
}

export interface UserInputs {
  repo: string;
  contributor: string;
  monthlySalary: number;
  dailyTokenSpend: number;
}

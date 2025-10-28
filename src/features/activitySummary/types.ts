export type ActivityRiskLevel = 'low' | 'medium' | 'high';

export interface ActivitySummaryRange {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

export interface ActivitySummaryStudentToday {
  activeSeconds: number;
  homeworkSeconds: number;
  vocabSeconds: number;
  // Backend may optionally provide flags (e.g. homework_submitted_today)
  [key: string]: unknown;
}

export interface ActivitySummaryStudent {
  studentId: string;
  name: string;
  email?: string;
  lastSeenTs?: string;
  timezone?: string;
  today: ActivitySummaryStudentToday;
  active7dSeconds: number[];
  homework7dSeconds: number[];
  vocab7dSeconds: number[];
  streakDays?: number;
  riskLevel?: ActivityRiskLevel;
  riskReasons?: string[];
  riskTags?: string[];
  online?: boolean;
  meta?: Record<string, unknown>;
}

export interface ActivitySummaryStats {
  onlineNowCount: number;
  activeTodayCount: number;
  atRiskCount: number;
  medianActiveSecondsToday: number;
  classMedianActiveMinutes7d?: number;
  classStdDevActiveMinutes7d?: number;
  [key: string]: unknown;
}

export interface ActivitySummaryResponse {
  generatedAt: string;
  range: ActivitySummaryRange;
  onlineNow: string[];
  students: ActivitySummaryStudent[];
  stats: ActivitySummaryStats;
  featureVersion?: string;
  meta?: Record<string, unknown>;
}

export interface StudentActivityViewModel {
  id: string;
  name: string;
  email?: string;
  lastSeenTs?: string;
  online: boolean;
  streakDays: number;
  riskLevel: ActivityRiskLevel | undefined;
  riskReasons: string[];
  riskTags: string[];
  todayMinutes: {
    active: number;
    homework: number;
    vocab: number;
  };
  series7d: {
    active: number[];
    homework: number[];
    vocab: number[];
  };
  stats: {
    total7dActiveMinutes: number;
    average7dActiveMinutes: number;
  };
  meta?: Record<string, unknown>;
}

import api from './api';

export interface DashboardError {
  service: string;
  message: string;
}

export interface DashboardStudent {
  id: string;
  displayName: string;
  avatar?: string;
}

export interface DashboardUser {
  id: string;
  displayName: string;
  avatar?: string;
  role: string;
  students?: DashboardStudent[];
}

export interface DashboardLessonSummaryItem {
  id: string;
  startsAtUtc: string;
  endsAtUtc: string;
  status: string;
  title: string;
  studentId?: string;
  tutorId?: string;
  studentName?: string;
  tutorName?: string;
}

export interface HomeworkSummaryItem {
  id: string;
  dueAtUtc?: string;
  status?: string;
  title?: string;
  lessonId?: string;
  studentId?: string;
  tutorId?: string;
  studentName?: string;
  tutorName?: string;
}

export interface HomeworkSummary {
  dueCount: number;
  overdueCount: number;
  toReviewCount: number;
  nextDueItems: HomeworkSummaryItem[];
}

export interface VocabularySummary {
  reviewQueueCount?: number;
  todayGoalMinutes?: number;
  streakDays?: number;
}

export interface TutorActionsSummary {
  missingNotesCount: number;
  studentsWithoutNextLessonCount: number;
}

export interface DashboardMetrics {
  lessonsCompletedThisMonth?: number | null;
  homeworkCompletionRate30d?: number | null;
  vocabularyReviewStreakDays?: number | null;
}

export interface DashboardSummary {
  serverTimeUtc: string;
  timezoneUsed: string;
  role: string;
  user: DashboardUser;
  nextLesson: DashboardLessonSummaryItem | null;
  upcomingLessons: DashboardLessonSummaryItem[];
  tutorTodayAgenda?: DashboardLessonSummaryItem[];
  metrics?: DashboardMetrics | null;
  homeworkSummary: HomeworkSummary;
  tutorActions?: TutorActionsSummary | null;
  vocabularySummary: VocabularySummary | null;
  warnings: string[];
  errors: DashboardError[];
}

export const getDashboardSummary = async (timezone?: string): Promise<DashboardSummary> => {
  const response = await api.get<DashboardSummary>('/users-service/api/dashboard/summary', {
    params: timezone ? { timezone } : {},
  });
  return response.data;
};

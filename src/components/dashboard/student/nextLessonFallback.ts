import { DashboardLessonSummaryItem, DashboardSummary } from "../../../services/dashboardSummary";

export type NextLessonSource = "nextLesson" | "upcomingFallback" | "empty";

export interface NextLessonResolution {
  source: NextLessonSource;
  lesson: DashboardLessonSummaryItem | null;
}

export const resolveNextLesson = (
  summary?: DashboardSummary | null
): NextLessonResolution => {
  if (summary?.nextLesson) {
    return {
      source: "nextLesson",
      lesson: summary.nextLesson,
    };
  }

  if (summary?.upcomingLessons?.length) {
    return {
      source: "upcomingFallback",
      lesson: summary.upcomingLessons[0],
    };
  }

  return {
    source: "empty",
    lesson: null,
  };
};


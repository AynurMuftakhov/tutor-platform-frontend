import { DashboardLessonSummaryItem } from "../../../services/dashboardSummary";

export const dedupeUpcomingLessons = (
  upcomingLessons: DashboardLessonSummaryItem[] = [],
  nextLesson?: DashboardLessonSummaryItem | null
): DashboardLessonSummaryItem[] => {
  if (!nextLesson?.id) {
    return upcomingLessons;
  }
  return upcomingLessons.filter((lesson) => lesson.id !== nextLesson.id);
};


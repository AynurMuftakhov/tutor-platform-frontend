import { describe, expect, it } from "vitest";
import { DashboardSummary } from "../../../services/dashboardSummary";
import { resolveNextLesson } from "./nextLessonFallback";

const baseSummary = (): DashboardSummary => ({
  serverTimeUtc: "2026-02-07T12:00:00Z",
  timezoneUsed: "UTC",
  role: "student",
  user: {
    id: "u-1",
    displayName: "Student",
    role: "student",
  },
  nextLesson: null,
  upcomingLessons: [],
  homeworkSummary: {
    dueCount: 0,
    overdueCount: 0,
    toReviewCount: 0,
    nextDueItems: [],
  },
  vocabularySummary: null,
  warnings: [],
  errors: [],
});

describe("resolveNextLesson", () => {
  it("prefers nextLesson when present", () => {
    const summary = baseSummary();
    summary.nextLesson = {
      id: "lesson-next",
      startsAtUtc: "2026-02-08T10:00:00Z",
      endsAtUtc: "2026-02-08T10:45:00Z",
      status: "SCHEDULED",
      title: "Speaking",
      tutorName: "Tutor A",
    };
    summary.upcomingLessons = [
      {
        id: "lesson-upcoming",
        startsAtUtc: "2026-02-09T10:00:00Z",
        endsAtUtc: "2026-02-09T10:45:00Z",
        status: "SCHEDULED",
        title: "Reading",
      },
    ];

    const resolved = resolveNextLesson(summary);

    expect(resolved.source).toBe("nextLesson");
    expect(resolved.lesson?.id).toBe("lesson-next");
  });

  it("falls back to first upcoming lesson when nextLesson is missing", () => {
    const summary = baseSummary();
    summary.upcomingLessons = [
      {
        id: "lesson-upcoming-first",
        startsAtUtc: "2026-02-08T10:00:00Z",
        endsAtUtc: "2026-02-08T10:45:00Z",
        status: "SCHEDULED",
        title: "Grammar",
      },
      {
        id: "lesson-upcoming-second",
        startsAtUtc: "2026-02-09T10:00:00Z",
        endsAtUtc: "2026-02-09T10:45:00Z",
        status: "SCHEDULED",
        title: "Reading",
      },
    ];

    const resolved = resolveNextLesson(summary);

    expect(resolved.source).toBe("upcomingFallback");
    expect(resolved.lesson?.id).toBe("lesson-upcoming-first");
  });

  it("returns empty when neither next nor upcoming lessons exist", () => {
    const resolved = resolveNextLesson(baseSummary());

    expect(resolved.source).toBe("empty");
    expect(resolved.lesson).toBeNull();
  });
});


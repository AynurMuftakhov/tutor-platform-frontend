import { describe, expect, it } from "vitest";
import { dedupeUpcomingLessons } from "./upcomingLessonsDedupe";

describe("dedupeUpcomingLessons", () => {
  it("removes lesson that matches nextLesson id", () => {
    const upcoming = [
      {
        id: "lesson-1",
        startsAtUtc: "2026-02-08T10:00:00Z",
        endsAtUtc: "2026-02-08T10:45:00Z",
        status: "SCHEDULED",
        title: "A",
      },
      {
        id: "lesson-2",
        startsAtUtc: "2026-02-09T10:00:00Z",
        endsAtUtc: "2026-02-09T10:45:00Z",
        status: "SCHEDULED",
        title: "B",
      },
    ];

    const result = dedupeUpcomingLessons(upcoming, {
      id: "lesson-1",
      startsAtUtc: "2026-02-08T10:00:00Z",
      endsAtUtc: "2026-02-08T10:45:00Z",
      status: "SCHEDULED",
      title: "A",
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("lesson-2");
  });

  it("returns all upcoming lessons when nextLesson is missing", () => {
    const upcoming = [
      {
        id: "lesson-1",
        startsAtUtc: "2026-02-08T10:00:00Z",
        endsAtUtc: "2026-02-08T10:45:00Z",
        status: "SCHEDULED",
        title: "A",
      },
    ];

    expect(dedupeUpcomingLessons(upcoming, null)).toHaveLength(1);
  });
});


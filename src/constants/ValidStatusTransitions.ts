import {LessonStatus} from "../types/Lesson";

export const ValidStatusTransitions: Record<LessonStatus, LessonStatus[]> = {
    SCHEDULED: ["IN_PROGRESS", "RESCHEDULED", "CANCELED"],
    RESCHEDULED: ["IN_PROGRESS", "CANCELED", "RESCHEDULED"],
    IN_PROGRESS: ["COMPLETED", "MISSED"],
    COMPLETED: [],
    MISSED: ["RESCHEDULED"],
    CANCELED: [],
};
export type LessonStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELED";

export type LessonSatisfaction =
    | "VERY_SATISFIED"
    | "SATISFIED"
    | "NEUTRAL"
    | "DISSATISFIED"
    | "VERY_DISSATISFIED";

export interface LessonAttachment {
    id: string;
    filename: string;
    url: string;
}

export interface Lesson {
    id: string;
    title: string;
    dateTime: string;
    duration: number;

    status: LessonStatus;
    lessonSatisfaction?: LessonSatisfaction;

    tutorId: string;
    studentId: string;

    location?: string;

    homework?: string;

    lessonPlan?: string;
    learningObjectives?: string;

    notes?: string;
    studentPerformance?: string;

    attachments?: LessonAttachment[];

    createdAt: string;
    updatedAt: string;
}
export type LessonNoteFormat = 'md' | 'plain';

export interface LessonNote {
    lessonId: string;
    content: string;
    format: LessonNoteFormat;
    updatedAt: string;
    updatedBy?: string;
}

export interface LessonNotePayload {
    content: string;
    format?: LessonNoteFormat;
}

export interface LessonNotesListItem {
    lessonId: string;
    scheduledAt: string;
    updatedAt?: string;
}

export interface LessonNotesListResponse {
    items: LessonNotesListItem[];
    nextCursor?: string;
}

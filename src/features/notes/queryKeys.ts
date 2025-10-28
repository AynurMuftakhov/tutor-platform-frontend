export const lessonNotesKey = (lessonId?: string | null) =>
    ['lessonNotes', lessonId ?? 'unknown'] as const;

export const previousNotesListKey = (
    studentId?: string | null,
    teacherId?: string | null,
    cursor?: string | null
) => ['notes:previous', studentId ?? 'unknown', teacherId ?? 'unknown', cursor ?? ''] as const;

export const previousNoteDetailKey = (lessonId?: string | null) =>
    ['notes:previous', 'detail', lessonId ?? 'unknown'] as const;

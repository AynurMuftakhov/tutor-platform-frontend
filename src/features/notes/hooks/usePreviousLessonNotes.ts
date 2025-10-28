import { useQuery } from '@tanstack/react-query';
import { listPreviousLessonNotes, NotesServiceError } from '../../../services/notesService';
import type { LessonNotesListResponse } from '../../../types/lessonNotes';
import { previousNotesListKey } from '../queryKeys';

export interface UsePreviousLessonNotesParams {
    studentId?: string;
    teacherId?: string;
    cursor?: string;
    limit?: number;
    enabled?: boolean;
}

export const usePreviousLessonNotes = (params: UsePreviousLessonNotesParams) => {
    const { studentId, teacherId, cursor, limit = 10, enabled = true } = params;

    return useQuery<LessonNotesListResponse, NotesServiceError>({
        queryKey: previousNotesListKey(studentId, teacherId, cursor),
        queryFn: () => listPreviousLessonNotes({
            studentId: studentId!,
            teacherId: teacherId!,
            cursor,
            limit
        }),
        enabled: Boolean(studentId && teacherId) && enabled
    });
};

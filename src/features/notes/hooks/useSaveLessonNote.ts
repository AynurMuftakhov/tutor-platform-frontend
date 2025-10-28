import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { LessonNote, LessonNotePayload } from '../../../types/lessonNotes';
import { lessonNotesKey } from '../queryKeys';
import { putLessonNote, NotesServiceError } from '../../../services/notesService';
import { clearLessonNoteCache, saveLessonNoteCache } from '../../../utils/notesCache';

export interface SaveLessonNoteVariables extends LessonNotePayload {
    lessonId: string;
}

export type SaveLessonNoteResult = LessonNote | null;

export const useSaveLessonNote = () => {
    const queryClient = useQueryClient();

    return useMutation<SaveLessonNoteResult, NotesServiceError, SaveLessonNoteVariables>({
        mutationFn: async (variables) => {
            const { lessonId, content, format } = variables;
            const trimmed = content.trim();
            const effectiveFormat = format;
            const payload: LessonNotePayload = {
                content,
                format: effectiveFormat
            };

            if (trimmed.length === 0) {
                payload.format = effectiveFormat;
            }

            return putLessonNote(lessonId, payload);
        },
        onSuccess: async (result, variables) => {
            const key = lessonNotesKey(variables.lessonId);
            queryClient.setQueryData<LessonNote | null>(key, result);
            if (result) {
                await saveLessonNoteCache(result);
            } else {
                await clearLessonNoteCache(variables.lessonId);
            }
        }
    });
};

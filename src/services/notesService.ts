import {isAxiosError} from 'axios';
import api from './api';
import type {LessonNote, LessonNoteFormat, LessonNotePayload, LessonNotesListResponse} from '../types/lessonNotes';

export type NotesServiceError = Error & {
    status?: number;
    data?: unknown;
};

const normalizeFormat = (format?: LessonNoteFormat | string | null): LessonNoteFormat => {
    return format === 'plain' ? 'plain' : 'md';
};

const normalizeNote = (raw: LessonNote | (LessonNote & Record<string, unknown>) | undefined): LessonNote => {
    if (!raw) {
        throw new Error('Missing note payload');
    }

    return {
        lessonId: String(raw.lessonId),
        content: raw.content,
        format: normalizeFormat((raw as LessonNote).format),
        updatedAt: raw.updatedAt,
        updatedBy: (raw as LessonNote).updatedBy
    };
};

const toServiceError = (error: unknown): NotesServiceError => {
    if (isAxiosError(error)) {
        const err: NotesServiceError = new Error(error.message);
        err.status = error.response?.status;
        err.data = error.response?.data;
        return err;
    }

    if (error instanceof Error) {
        return error as NotesServiceError;
    }

    return new Error('Unknown notes service error');
};

export const getLessonNote = async (lessonId: string): Promise<LessonNote | null> => {
    try {
        const response = await api.get<LessonNote>(`lessons-service/api/lessons/${encodeURIComponent(lessonId)}/notes`);
        return normalizeNote(response.data);
    } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) {
            return null;
        }
        throw toServiceError(error);
    }
};

export const putLessonNote = async (
    lessonId: string,
    payload: LessonNotePayload
): Promise<LessonNote | null> => {
    try {
        const response = await api.put<LessonNote | undefined>(
            `lessons-service/api/lessons/${encodeURIComponent(lessonId)}/notes`,
            {
                content: payload.content,
                format: payload.format ? normalizeFormat(payload.format) : undefined
            }
        );

        if (response.status === 204) {
            return null;
        }

        if (response.data) {
            return normalizeNote(response.data);
        }

        return null;
    } catch (error) {
        throw toServiceError(error);
    }
};

export interface PreviousLessonNotesParams {
    studentId: string;
    teacherId: string;
    limit?: number;
    cursor?: string;
}

export const listPreviousLessonNotes = async (
    params: PreviousLessonNotesParams
): Promise<LessonNotesListResponse> => {
    try {
        const response = await api.get<LessonNotesListResponse>('lessons-service/api/notes/lessons', {
            params: {
                studentId: params.studentId,
                teacherId: params.teacherId,
                limit: params.limit,
                cursor: params.cursor
            }
        });
        const { items = [], nextCursor } = response.data ?? {};
        return {
            items: items.map((item) => ({
                lessonId: String(item.lessonId),
                scheduledAt: item.scheduledAt,
                updatedAt: item.updatedAt
            })),
            nextCursor
        };
    } catch (error) {
        throw toServiceError(error);
    }
};

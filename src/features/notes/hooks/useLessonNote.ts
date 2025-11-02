import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { LessonNote } from '../../../types/lessonNotes';
import { getLessonNote, NotesServiceError } from '../../../services/notesService';
import { lessonNotesKey } from '../queryKeys';
import {
    loadLessonNoteCache,
    saveLessonNoteCache,
    clearLessonNoteCache,
    CachedLessonNote
} from '../../../utils/notesCache';

export interface UseLessonNoteOptions {
    lessonId?: string;
    enabled?: boolean;
    refetchInterval?: number | false;
    mode?: 'realtime' | 'offline';
}

export type LessonNoteSource = 'network' | 'cache' | 'none';

export interface UseLessonNoteResult {
    note: LessonNote | null;
    cachedNote: CachedLessonNote | null;
    isLoading: boolean;
    isFetching: boolean;
    error: NotesServiceError | null;
    refetch: () => Promise<LessonNote | null | undefined>;
    dataUpdatedAt: number;
    source: LessonNoteSource;
    hasPersistedNote: boolean;
}

const DEFAULT_REFETCH_INTERVAL = false;

export const useLessonNote = (options: UseLessonNoteOptions): UseLessonNoteResult => {
    const {
        lessonId,
        enabled = true,
        refetchInterval = DEFAULT_REFETCH_INTERVAL,
        mode = 'offline'
    } = options;
    const isRealtime = mode === 'realtime';
    const queryClient = useQueryClient();
    const [cachedNote, setCachedNote] = useState<CachedLessonNote | null>(null);

    useEffect(() => {
        if (!lessonId) {
            setCachedNote(null);
            return;
        }

        let cancelled = false;
        loadLessonNoteCache(lessonId).then((cached) => {
            if (!cancelled) {
                setCachedNote(cached);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [lessonId]);

    const query = useQuery<LessonNote | null, NotesServiceError>({
        queryKey: lessonNotesKey(lessonId),
        queryFn: () => getLessonNote(lessonId!),
        enabled: Boolean(lessonId) && enabled,
        refetchInterval: isRealtime ? false : refetchInterval,
        refetchIntervalInBackground: !isRealtime,
        refetchOnWindowFocus: !isRealtime,
        refetchOnReconnect: !isRealtime,
        staleTime: isRealtime ? Number.POSITIVE_INFINITY : undefined
    });

    useEffect(() => {
        if (!lessonId) {
            return;
        }

        if (query.status === 'success') {
            const data = query.data;
            if (data) {
                const cachedAt = data.updatedAt || new Date().toISOString();
                saveLessonNoteCache(data).then(() => setCachedNote({
                    ...data,
                    cachedAt
                }));
            } else {
                clearLessonNoteCache(lessonId).then(() => setCachedNote(null));
            }
        }
    }, [lessonId, query.status, query.data]);

    const note = useMemo<LessonNote | null>(() => {
        if (query.data) {
            return query.data;
        }
        if (query.data === null) {
            return null;
        }
        return cachedNote;
    }, [query.data, cachedNote]);

    const error = (query.error as NotesServiceError) ?? null;

    const refetch = async () => {
        const res = await query.refetch();
        return res.data;
    };

    useEffect(() => {
        if (!lessonId) {
            return;
        }
        if (query.data) {
            queryClient.setQueryData(lessonNotesKey(lessonId), query.data);
        }
    }, [query.data, lessonId, queryClient]);

    const source: LessonNoteSource = query.data
        ? 'network'
        : cachedNote
            ? 'cache'
            : 'none';

    const hasPersistedNote = useMemo(() => {
        if (query.data !== undefined) {
            return query.data !== null;
        }
        return Boolean(cachedNote);
    }, [query.data, cachedNote]);

    return {
        note,
        cachedNote,
        isLoading: query.isLoading && !cachedNote,
        isFetching: query.isFetching,
        error,
        refetch,
        dataUpdatedAt: query.dataUpdatedAt,
        source,
        hasPersistedNote
    };
};

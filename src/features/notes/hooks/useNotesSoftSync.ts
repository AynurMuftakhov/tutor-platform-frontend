import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DailyCall, DailyEventObjectAppMessage } from '@daily-co/daily-js';
import type { LessonNoteFormat } from '../../../types/lessonNotes';

export interface SoftSyncPayload {
    content: string;
    format: LessonNoteFormat;
    updatedAt?: string;
    senderId?: string;
}

interface UseNotesSoftSyncParams {
    call: DailyCall | null | undefined;
    lessonId?: string;
    enabled?: boolean;
    senderId?: string;
}

const isSoftSyncPacket = (data: unknown): data is {
    type: string;
    lessonId?: string;
    content?: string;
    format?: LessonNoteFormat;
    updatedAt?: string;
    senderId?: string;
} => {
    if (!data || typeof data !== 'object') {
        return false;
    }
    return (data as { type?: string }).type === 'note:soft-sync';
};

export const useNotesSoftSync = ({
    call,
    lessonId,
    enabled = true,
    senderId
}: UseNotesSoftSyncParams) => {
    const [incoming, setIncoming] = useState<SoftSyncPayload | null>(null);

    const sendPacket = useCallback((payload: SoftSyncPayload) => {
        if (!call || !lessonId || !enabled) {
            return;
        }
        try {
            const message = {
                type: 'note:soft-sync',
                lessonId,
                content: payload.content,
                format: payload.format,
                updatedAt: payload.updatedAt ?? new Date().toISOString(),
                senderId
            };
            call.sendAppMessage(message, '*');
        } catch (error) {
            console.warn('Failed to send note soft-sync payload', error);
        }
    }, [call, lessonId, enabled, senderId]);

    const lastSentRef = useRef(0);
    const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const latestPayloadRef = useRef<SoftSyncPayload | null>(null);

    const flushPending = useCallback(() => {
        if (!latestPayloadRef.current) return;
        sendPacket(latestPayloadRef.current);
        lastSentRef.current = Date.now();
        latestPayloadRef.current = null;
    }, [sendPacket]);

    const broadcast = useCallback((payload: SoftSyncPayload) => {
        latestPayloadRef.current = payload;
        const now = Date.now();
        const elapsed = now - lastSentRef.current;
        const MIN_INTERVAL = 200;

        if (elapsed >= MIN_INTERVAL) {
            if (pendingRef.current) {
                clearTimeout(pendingRef.current);
                pendingRef.current = null;
            }
            flushPending();
        } else if (!pendingRef.current) {
            pendingRef.current = setTimeout(() => {
                pendingRef.current = null;
                flushPending();
            }, MIN_INTERVAL - elapsed);
        }
    }, [flushPending]);

    useEffect(() => {
        if (!lessonId || !enabled) {
            lastSentRef.current = 0;
            latestPayloadRef.current = null;
            if (pendingRef.current) {
                clearTimeout(pendingRef.current);
                pendingRef.current = null;
            }
        }
    }, [lessonId, enabled]);

    useEffect(() => {
        return () => {
            if (pendingRef.current) {
                clearTimeout(pendingRef.current);
                pendingRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const dailyCall = call;
        if (!dailyCall || !lessonId || !enabled) {
            return;
        }

        let localId: string | undefined;
        try {
            localId = dailyCall.participants().local?.session_id;
        } catch {
            localId = undefined;
        }

        const handler = (event: DailyEventObjectAppMessage) => {
            if (event.fromId && localId && event.fromId === localId) {
                return;
            }

            const data = event.data;
            let parsed: unknown = data;
            if (typeof data === 'string') {
                try {
                    parsed = JSON.parse(data);
                } catch {
                    return;
                }
            }

            if (!isSoftSyncPacket(parsed)) {
                return;
            }

            if (parsed.lessonId !== lessonId) {
                return;
            }

            if (parsed.senderId && senderId && parsed.senderId === senderId) {
                return;
            }

            setIncoming({
                content: typeof parsed.content === 'string' ? parsed.content : '',
                format: parsed.format === 'plain' ? 'plain' : 'md',
                updatedAt: parsed.updatedAt,
                senderId: parsed.senderId
            });
        };

        dailyCall.on('app-message', handler);
        return () => {
            dailyCall.off('app-message', handler);
        };
    }, [call, lessonId, enabled, senderId]);

    const resetIncoming = useCallback(() => setIncoming(null), []);

    return useMemo(() => ({
        incoming,
        broadcast,
        resetIncoming
    }), [incoming, broadcast, resetIncoming]);
};

export default useNotesSoftSync;

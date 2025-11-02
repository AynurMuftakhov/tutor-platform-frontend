import { useCallback, useEffect, useRef, useState } from 'react';
import type { DailyCall, DailyEventObjectAppMessage } from '@daily-co/daily-js';
import type { LessonNoteFormat } from '../../../types/lessonNotes';
import { canonicalizeContent, fingerprintContent, normalizeFormat } from '../utils/contentCanonicalization';

const nowIso = () => new Date().toISOString();
const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// soft-sync pacing
const DEBOUNCE_MS = 200;   // wait for a short pause in typing
const MIN_IDLE_GATE_MS = 300; // if changes are tiny (<=2 chars), require at least this idle time
const MAX_WAIT_MS = 1200;  // but never wait longer than this while user is continuously typing
const DEBUG_SOFT_SYNC = ((import.meta as any)?.env?.DEV ?? false) ||
  (typeof window !== 'undefined' && !!window.localStorage?.getItem('NOTES_SOFT_SYNC_DEBUG'));

const debugLog = (phase: string, payload: Record<string, unknown>) => {
    if (!DEBUG_SOFT_SYNC) return;
    // eslint-disable-next-line no-console
    console.info('[NotesSoftSync]', phase, payload);
};

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

    const senderIdRef = useRef<string | undefined>(senderId);
    useEffect(() => {
        senderIdRef.current = senderId;
    }, [senderId]);

    const localSessionIdRef = useRef<string | undefined>(undefined);
    const updateLocalSessionId = useCallback(() => {
        if (!call) {
            localSessionIdRef.current = undefined;
            return;
        }
        try {
            localSessionIdRef.current = call.participants().local?.session_id ?? undefined;
        } catch {
            localSessionIdRef.current = undefined;
        }
    }, [call]);

    useEffect(() => {
        updateLocalSessionId();
    }, [updateLocalSessionId]);

    useEffect(() => {
        if (!call) return;
        const update = () => updateLocalSessionId();
        const events: string[] = ['joined-meeting', 'left-meeting', 'participant-updated', 'participant-joined', 'participant-left'];
        events.forEach((event) => {
            try {
                (call as any).on(event, update);
            } catch {
                /* noop */
            }
        });
        return () => {
            events.forEach((event) => {
                try {
                    (call as any).off(event, update);
                } catch {
                    /* noop */
                }
            });
        };
    }, [call, updateLocalSessionId]);

    const lastSentRef = useRef(0);
    const latestPayloadRef = useRef<{ content: string; format: LessonNoteFormat; updatedAt?: string } | null>(null);
    const lastSentSnapshotRef = useRef<{ content: string; format: LessonNoteFormat } | null>(null);
    const lastFingerprintRef = useRef<string | null>(null);

    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const maxWaitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const gateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearTimer = (ref: { current: ReturnType<typeof setTimeout> | null }) => {
        if (ref.current) {
            clearTimeout(ref.current);
            ref.current = null;
        }
    };

    const sendPacket = useCallback((payload: SoftSyncPayload) => {
        if (!call || !lessonId || !enabled) {
            return;
        }
        const format = normalizeFormat(payload.format);
        const canonical = canonicalizeContent(payload.content ?? '', format);
        try {
            const sentAtMs = nowMs();
            const sentAtIso = nowIso();
            const message = {
                type: 'note:soft-sync',
                lessonId,
                content: canonical,
                format,
                updatedAt: payload.updatedAt ?? sentAtIso,
                senderId: localSessionIdRef.current ?? senderIdRef.current,
                sentAtMs,
                sentAtIso,
                contentLength: canonical.length
            };
            call.sendAppMessage(message, '*');
            debugLog('broadcast-sent', { lessonId, contentLength: canonical.length, format, sentAtIso });
        } catch (err) {
            debugLog('broadcast-send-error', { message: (err as Error)?.message ?? 'unknown' });
        }
    }, [call, enabled, lessonId]);

    const flushPending = useCallback(() => {
        const pending = latestPayloadRef.current;
        if (!pending) return;

        const fingerprint = fingerprintContent(pending.content, pending.format);
        if (lastFingerprintRef.current && lastFingerprintRef.current === fingerprint) {
            debugLog('broadcast-skip-duplicate', { lessonId, format: pending.format, length: pending.content.length });
            latestPayloadRef.current = null;
            clearTimer(debounceTimerRef);
            clearTimer(maxWaitTimerRef);
            clearTimer(gateTimerRef);
            return;
        }

        sendPacket(pending);
        lastSentRef.current = nowMs();
        lastSentSnapshotRef.current = { content: pending.content, format: pending.format };
        lastFingerprintRef.current = fingerprint;
        latestPayloadRef.current = null;

        clearTimer(debounceTimerRef);
        clearTimer(maxWaitTimerRef);
        clearTimer(gateTimerRef);
    }, [lessonId, sendPacket]);

    const broadcast = useCallback((payload: SoftSyncPayload) => {
        if (!lessonId || !enabled) {
            debugLog('broadcast-ignore', { reason: 'disabled', enabled, lessonId });
            return;
        }

        const now = nowMs();
        const format = normalizeFormat(payload.format);
        const canonical = canonicalizeContent(payload.content ?? '', format);

        debugLog('broadcast-scheduled', {
            lessonId,
            len: canonical.length,
            format,
            sinceLast: lastSentRef.current ? Math.round(now - lastSentRef.current) : null
        });

        latestPayloadRef.current = { content: canonical, format, updatedAt: payload.updatedAt };

        const last = lastSentSnapshotRef.current;
        const prevLen = last?.content.length ?? 0;
        const delta = Math.abs(canonical.length - prevLen);
        const isTinyChange = delta <= 2 && (!!last || canonical.length <= 2);

        clearTimer(debounceTimerRef);

        if (isTinyChange) {
            clearTimer(gateTimerRef);
            gateTimerRef.current = setTimeout(() => {
                gateTimerRef.current = null;
                flushPending();
            }, MIN_IDLE_GATE_MS);
        } else {
            debounceTimerRef.current = setTimeout(() => {
                flushPending();
            }, DEBOUNCE_MS);
        }

        if (!maxWaitTimerRef.current) {
            maxWaitTimerRef.current = setTimeout(() => {
                flushPending();
            }, MAX_WAIT_MS);
        }
    }, [enabled, flushPending, lessonId]);

    useEffect(() => {
        if (!lessonId || !enabled) {
            lastSentRef.current = 0;
            latestPayloadRef.current = null;
            lastSentSnapshotRef.current = null;
            lastFingerprintRef.current = null;
            clearTimer(debounceTimerRef);
            clearTimer(maxWaitTimerRef);
            clearTimer(gateTimerRef);
        }
    }, [lessonId, enabled]);

    useEffect(() => {
        return () => {
            clearTimer(debounceTimerRef);
            clearTimer(maxWaitTimerRef);
            clearTimer(gateTimerRef);
        };
    }, []);

    useEffect(() => {
        if (!call || !lessonId || !enabled) {
            return;
        }

        const handler = (event: DailyEventObjectAppMessage) => {
            const localFromId = localSessionIdRef.current;
            if (event.fromId && localFromId && event.fromId === localFromId) {
                return;
            }

            let parsed: unknown = event.data;
            if (typeof event.data === 'string') {
                try {
                    parsed = JSON.parse(event.data);
                } catch {
                    return;
                }
            }

            if (!isSoftSyncPacket(parsed) || parsed.lessonId !== lessonId) {
                return;
            }

            const effectiveSender = localSessionIdRef.current ?? senderIdRef.current;
            if (parsed.senderId && effectiveSender && parsed.senderId === effectiveSender) {
                debugLog('daily:skip-self-sender', { lessonId, senderId: parsed.senderId });
                return;
            }

            const format = normalizeFormat(parsed.format);
            const content = canonicalizeContent(typeof parsed.content === 'string' ? parsed.content : '', format);

            const receivedAt = nowMs();
            const sentAtMs = typeof (parsed as any).sentAtMs === 'number' ? (parsed as any).sentAtMs : undefined;
            const transitMs = sentAtMs !== undefined ? Math.round(receivedAt - sentAtMs) : undefined;

            debugLog('daily:received', {
                lessonId,
                len: content.length,
                format,
                sentAtMs,
                receivedAt,
                transitMs
            });

            setIncoming({
                content,
                format,
                updatedAt: parsed.updatedAt,
                senderId: parsed.senderId
            });
        };

        call.on('app-message', handler);
        return () => {
            call.off('app-message', handler);
        };
    }, [call, lessonId, enabled]);

    const resetIncoming = useCallback(() => setIncoming(null), []);

    return {
        incoming,
        broadcast,
        resetIncoming
    };
};

export default useNotesSoftSync;

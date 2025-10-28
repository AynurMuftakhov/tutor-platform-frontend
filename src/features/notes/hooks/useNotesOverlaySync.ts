import { useCallback, useEffect, useMemo } from 'react';
import type { DailyCall, DailyEventObjectAppMessage } from '@daily-co/daily-js';

interface UseNotesOverlaySyncParams {
    call: DailyCall | null | undefined;
    lessonId?: string;
    enabled?: boolean;
    isTeacher?: boolean;
    onRemoteChange?: (open: boolean) => void;
}

const MESSAGE_TYPE = 'note:overlay-toggle';

type OverlayMessage = {
    type: string;
    lessonId?: string;
    open?: boolean;
};

const parsePacket = (data: unknown): OverlayMessage | null => {
    if (!data) return null;
    if (typeof data === 'string') {
        try {
            const parsed = JSON.parse(data);
            return typeof parsed === 'object' && parsed !== null ? (parsed as OverlayMessage) : null;
        } catch {
            return null;
        }
    }
    if (typeof data === 'object') {
        return data as OverlayMessage;
    }
    return null;
};

export const useNotesOverlaySync = ({
    call,
    lessonId,
    enabled = true,
    isTeacher = false,
    onRemoteChange
}: UseNotesOverlaySyncParams) => {
    const sendState = useCallback((open: boolean) => {
        if (!call || !lessonId || !enabled || !isTeacher) return;
        try {
            call.sendAppMessage({
                type: MESSAGE_TYPE,
                lessonId,
                open
            }, '*');
        } catch (err) {
            console.warn('Failed to send notes overlay packet', err);
        }
    }, [call, lessonId, enabled, isTeacher]);

    useEffect(() => {
        if (!call || !lessonId || !enabled) return;

        let localId: string | undefined;
        try {
            localId = call.participants().local?.session_id;
        } catch {
            localId = undefined;
        }

        const handler = (event: DailyEventObjectAppMessage) => {
            if (event.fromId && localId && event.fromId === localId) {
                return;
            }
            const payload = parsePacket(event.data);
            if (!payload || payload.type !== MESSAGE_TYPE) return;
            if (payload.lessonId !== lessonId) return;
            if (typeof payload.open !== 'boolean') return;
            onRemoteChange?.(payload.open);
        };

        call.on('app-message', handler);
        return () => {
            call.off('app-message', handler);
        };
    }, [call, lessonId, enabled, onRemoteChange]);

    return useMemo(() => ({ broadcastOverlayState: sendState }), [sendState]);
};

export default useNotesOverlaySync;

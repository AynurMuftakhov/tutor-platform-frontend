import { useCallback, useEffect, useMemo, useState } from 'react';

export interface FloatingWindowBounds {
    top: number;
    left: number;
    width: number;
    height: number;
}

export interface FloatingWindowState {
    open: boolean;
    minimized: boolean;
    pinned: boolean;
    bounds: FloatingWindowBounds;
}

const STORAGE_KEY_PREFIX = 'lesson-notes:window-state';
const DEFAULT_WIDTH = 520;
const DEFAULT_HEIGHT = 420;
const DEFAULT_MARGIN = 24;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const readStorage = (lessonId?: string): FloatingWindowState | null => {
    if (typeof window === 'undefined' || !lessonId) return null;
    try {
        const raw = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}:${lessonId}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as FloatingWindowState;
        if (!parsed || typeof parsed !== 'object') return null;
        return parsed;
    } catch {
        return null;
    }
};

const writeStorage = (lessonId: string | undefined, state: FloatingWindowState) => {
    if (typeof window === 'undefined' || !lessonId) return;
    try {
        window.localStorage.setItem(`${STORAGE_KEY_PREFIX}:${lessonId}`, JSON.stringify(state));
    } catch {
        // ignore
    }
};

const computeDefaultBounds = (): FloatingWindowBounds => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 720;
    const width = Math.min(DEFAULT_WIDTH, vw - DEFAULT_MARGIN * 2);
    const height = Math.min(DEFAULT_HEIGHT, vh - DEFAULT_MARGIN * 2);
    const left = Math.max(DEFAULT_MARGIN, vw - width - DEFAULT_MARGIN);
    const top = DEFAULT_MARGIN;
    return { top, left, width, height };
};

export const useFloatingWindow = (lessonId?: string) => {
    const [state, setState] = useState<FloatingWindowState>(() => {
        const persisted = readStorage(lessonId);
        if (persisted) {
            return persisted;
        }
        return {
            open: false,
            minimized: false,
            pinned: false,
            bounds: computeDefaultBounds()
        };
    });

    useEffect(() => {
        if (!lessonId) return;
        setState((prev) => {
            const persisted = readStorage(lessonId);
            if (persisted) {
                return persisted;
            }
            const defaults = computeDefaultBounds();
            const next: FloatingWindowState = {
                open: prev.open,
                minimized: prev.minimized,
                pinned: prev.pinned,
                bounds: defaults
            };
            writeStorage(lessonId, next);
            return next;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lessonId]);

    useEffect(() => {
        if (!lessonId) return;
        writeStorage(lessonId, state);
    }, [lessonId, state]);

    const setOpen = useCallback((open: boolean) => {
        setState((prev) => ({ ...prev, open, minimized: open ? prev.minimized : false }));
    }, []);

    const setMinimized = useCallback((minimized: boolean) => {
        setState((prev) => ({ ...prev, minimized }));
    }, []);

    const setPinned = useCallback((pinned: boolean) => {
        setState((prev) => ({ ...prev, pinned }));
    }, []);

    const updateBounds = useCallback((bounds: FloatingWindowBounds) => {
        setState((prev) => {
            const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
            const vh = typeof window !== 'undefined' ? window.innerHeight : 720;
            const width = clamp(bounds.width, 360, vw - DEFAULT_MARGIN);
            const height = clamp(bounds.height, 260, vh - DEFAULT_MARGIN);
            const left = clamp(bounds.left, 8, vw - width - 8);
            const top = clamp(bounds.top, 8, vh - height - 8);
            return {
                ...prev,
                bounds: {
                    width,
                    height,
                    left,
                    top
                }
            };
        });
    }, []);

    const value = useMemo(() => ({ state, setOpen, setMinimized, setPinned, updateBounds }), [state, setOpen, setMinimized, setPinned, updateBounds]);

    return value;
};

export default useFloatingWindow;

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Box, IconButton, Paper} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

type Bounds = {
    left: number;
    top: number;
    width: number;
    height: number;
};

interface FloatingNotesPanelProps {
    lessonId: string;
    children: React.ReactNode;
    defaultBounds?: Bounds;
    zIndex?: number;
    onClose?: () => void;
}

const STORAGE_PREFIX = 'notes:pos:';
const MIN_WIDTH = 360;
const MIN_HEIGHT = 260;
const EDGE_MARGIN = 12;

const readStoredBounds = (lessonId: string, fallback: Bounds): Bounds => {
    if (typeof window === 'undefined') return fallback;
    try {
        const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${lessonId}`);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw) as Partial<Bounds>;
        if (!parsed || typeof parsed !== 'object') return fallback;
        const next: Bounds = {
            left: typeof parsed.left === 'number' ? parsed.left : fallback.left,
            top: typeof parsed.top === 'number' ? parsed.top : fallback.top,
            width: typeof parsed.width === 'number' ? parsed.width : fallback.width,
            height: typeof parsed.height === 'number' ? parsed.height : fallback.height
        };
        return next;
    } catch {
        return fallback;
    }
};

const clampBounds = (bounds: Bounds): Bounds => {
    if (typeof window === 'undefined') return bounds;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(Math.max(bounds.width, MIN_WIDTH), vw - EDGE_MARGIN * 2);
    const height = Math.min(Math.max(bounds.height, MIN_HEIGHT), vh - EDGE_MARGIN * 2);
    const left = Math.min(Math.max(bounds.left, EDGE_MARGIN), vw - width - EDGE_MARGIN);
    const top = Math.min(Math.max(bounds.top, EDGE_MARGIN), vh - height - EDGE_MARGIN);
    return { left, top, width, height };
};

const FloatingNotesPanel: React.FC<FloatingNotesPanelProps> = ({
    lessonId,
    children,
    defaultBounds,
    zIndex,
    onClose
}) => {
    const initialBounds = useMemo<Bounds>(() => {
        const fallback: Bounds = defaultBounds ?? {
            width: 420,
            height: 440,
            left: typeof window !== 'undefined' ? Math.max(window.innerWidth - 440, EDGE_MARGIN) : EDGE_MARGIN,
            top: typeof window !== 'undefined' ? Math.max(EDGE_MARGIN, 96) : EDGE_MARGIN
        };
        return clampBounds(readStoredBounds(lessonId, fallback));
    }, [defaultBounds, lessonId]);

    const [bounds, setBounds] = useState<Bounds>(initialBounds);
    const interactionRef = useRef<{
        type: 'drag' | 'resize';
        pointerId: number;
        startX: number;
        startY: number;
        startBounds: Bounds;
    } | null>(null);
    const captureTargetRef = useRef<HTMLElement | null>(null);

    const panelRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handler = () => {
            setBounds((prev) => clampBounds(prev));
        };
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            window.localStorage.setItem(`${STORAGE_PREFIX}${lessonId}`, JSON.stringify(bounds));
        } catch {
            // ignore quota errors
        }
    }, [bounds, lessonId]);


    // Stable handler refs to avoid TDZ/circular deps when adding/removing listeners
    const moveFnRef = useRef<((e: PointerEvent) => void) | null>(null);
    const upFnRef = useRef<((e: PointerEvent) => void) | null>(null);
    const cancelFnRef = useRef<((e: PointerEvent) => void) | null>(null);

    const endInteraction = useCallback((pointerId?: number) => {
        const info = interactionRef.current;
        interactionRef.current = null;
        const target = captureTargetRef.current;
        captureTargetRef.current = null;
        const releaseId = pointerId ?? info?.pointerId;
        if (target && typeof releaseId === 'number' && target.hasPointerCapture?.(releaseId)) {
            try {
                target.releasePointerCapture(releaseId);
            } catch {
                // ignore
            }
        }
        document.body.style.userSelect = '';
        // Remove listeners using stable refs (if present)
        if (moveFnRef.current) window.removeEventListener('pointermove', moveFnRef.current, true);
        if (upFnRef.current) window.removeEventListener('pointerup', upFnRef.current, true);
        if (cancelFnRef.current) window.removeEventListener('pointercancel', cancelFnRef.current, true);
    }, []);

    // Keep the same function identity in listeners & removal
    moveFnRef.current = useCallback((event: PointerEvent) => {
        const info = interactionRef.current;
        if (!info) return;
        if (event.pointerId !== info.pointerId) return;
        event.preventDefault();

        const deltaX = event.clientX - info.startX;
        const deltaY = event.clientY - info.startY;

        if (info.type === 'drag') {
            setBounds((prev) => clampBounds({
                ...prev,
                left: info.startBounds.left + deltaX,
                top: info.startBounds.top + deltaY
            }));
        } else {
            setBounds((prev) => clampBounds({
                ...prev,
                width: info.startBounds.width + deltaX,
                height: info.startBounds.height + deltaY
            }));
        }
    }, []);

    // Keep the same function identity in listeners & removal
    upFnRef.current = useCallback((event: PointerEvent) => {
        const info = interactionRef.current;
        if (!info) return;
        if (event.pointerId !== info.pointerId) return;
        event.preventDefault();
        endInteraction(event.pointerId);
    }, [endInteraction]);

    cancelFnRef.current = useCallback((event: PointerEvent) => {
        const info = interactionRef.current;
        if (!info) return;
        if (event.pointerId !== info.pointerId) return;
        event.preventDefault();
        endInteraction(event.pointerId);
    }, [endInteraction]);

    const beginInteraction = useCallback((type: 'drag' | 'resize', event: React.PointerEvent) => {
        const target = panelRef.current;
        if (!target) return;
        interactionRef.current = {
            type,
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            startBounds: bounds
        };
        captureTargetRef.current = event.currentTarget as HTMLElement | null;
        if (captureTargetRef.current && captureTargetRef.current.setPointerCapture) {
            try {
                captureTargetRef.current.setPointerCapture(event.pointerId);
            } catch {
                // ignore environments without pointer capture
            }
        }
        document.body.style.userSelect = 'none';
        if (moveFnRef.current) window.addEventListener('pointermove', moveFnRef.current, true);
        if (upFnRef.current) window.addEventListener('pointerup', upFnRef.current, true);
        if (cancelFnRef.current) window.addEventListener('pointercancel', cancelFnRef.current, true);
    }, [bounds]);

    useEffect(() => {
        return () => endInteraction();
    }, [endInteraction]);

    return (
        <>
            <Paper
                ref={panelRef}
                elevation={6}
                sx={{
                    position: 'fixed',
                    left: bounds.left,
                    top: bounds.top,
                    width: bounds.width,
                    height: bounds.height,
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 0,
                    boxShadow: (theme) => theme.shadows[10],
                    backgroundColor: 'background.paper',
                    zIndex: zIndex ?? ((theme) => theme.zIndex.modal + 1),
                    pointerEvents: 'auto',
                    maxWidth: 'calc(100vw - 24px)',
                    maxHeight: 'calc(100vh - 24px)'
                }}
            >
                <Box
                    sx={{
                        cursor: 'grab',
                        userSelect: 'none',
                        touchAction: 'none',
                        px: 2,
                        py: 1,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1
                    }}
                    onPointerDown={(event) => {
                        event.preventDefault();
                        beginInteraction('drag', event);
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ fontWeight: 600, fontSize: '0.95rem' }}>Lesson Notes</Box>
                    </Box>
                    {onClose ? (
                        <IconButton
                            size="small"
                            aria-label="Close notes"
                            onClick={(event) => {
                                event.stopPropagation();
                                onClose();
                            }}
                            onPointerDown={(event) => event.stopPropagation()}
                        >
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    ) : null}
                </Box>
                <Box
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        overflow: 'hidden',
                        display: 'flex',
                        '& > *': {
                            flex: 1,
                            minWidth: 0,
                            minHeight: 0
                        }
                    }}
                >
                    {children}
                </Box>
                <Box
                    sx={{
                        position: 'absolute',
                        width: 18,
                        height: 18,
                        right: 2,
                        bottom: 2,
                        cursor: 'nwse-resize',
                        touchAction: 'none'
                    }}
                    onPointerDown={(event) => {
                        event.preventDefault();
                        beginInteraction('resize', event);
                    }}
                />
            </Paper>
        </>
    );
};

export default FloatingNotesPanel;

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Box,
    Chip,
    IconButton,
    MenuItem,
    Paper,
    Portal,
    Select,
    SelectChangeEvent,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import MinimizeIcon from '@mui/icons-material/HorizontalRule';
import NoteAltOutlinedIcon from '@mui/icons-material/NoteAltOutlined';
import type { LessonNoteFormat } from '../../../types/lessonNotes';
import LessonNotesPanel from './LessonNotesPanel';
import type { LessonNoteStatus } from './CurrentLessonNote';

const STORAGE_KEY_PREFIX = 'notesOverlay.v1.';
const DEFAULT_WIDTH = 440;
const DEFAULT_HEIGHT = 460;
const MIN_WIDTH = 320;
const MIN_HEIGHT = 280;

type NotesTab = 'current' | 'previous';

interface PersistedOverlayState {
    minimized?: boolean;
    pinned?: boolean;
    position?: { top: number; left: number };
    size?: { width: number; height: number };
    activeTab?: NotesTab;
    format?: LessonNoteFormat;
}

interface NotesOverlayProps {
    open: boolean;
    onClose: () => void;
    lessonId: string;
    lessonTitle?: string;
    studentId?: string;
    teacherId?: string;
    canEdit: boolean;
    initialTab?: NotesTab;
    initialPreviousLessonId?: string;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const loadPersistedState = (lessonId: string): PersistedOverlayState | null => {
    try {
        const raw = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${lessonId}`);
        if (!raw) return null;
        return JSON.parse(raw) as PersistedOverlayState;
    } catch {
        return null;
    }
};

const savePersistedState = (lessonId: string, state: PersistedOverlayState) => {
    try {
        window.localStorage.setItem(`${STORAGE_KEY_PREFIX}${lessonId}`, JSON.stringify(state));
    } catch {
        // ignore
    }
};

const NotesOverlay: React.FC<NotesOverlayProps> = ({
    open,
    onClose,
    lessonId,
    lessonTitle,
    studentId,
    teacherId,
    canEdit,
    initialTab = 'current',
    initialPreviousLessonId
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const cardRef = useRef<HTMLDivElement | null>(null);
    const [isInteracting, setIsInteracting] = useState(false);
    const dragInfoRef = useRef<{
        pointerId: number;
        startX: number;
        startY: number;
        startTop: number;
        startLeft: number;
    } | null>(null);

    const [overlayState, setOverlayState] = useState<{
        minimized: boolean;
        pinned: boolean;
        position: { top: number; left: number };
        size: { width: number; height: number };
        activeTab: NotesTab;
    }>(() => {
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
        const vh = typeof window !== 'undefined' ? window.innerHeight : 720;
        const persisted = typeof window !== 'undefined' ? loadPersistedState(lessonId) : null;
        const width = clamp(persisted?.size?.width ?? DEFAULT_WIDTH, MIN_WIDTH, vw - 32);
        const height = clamp(persisted?.size?.height ?? DEFAULT_HEIGHT, MIN_HEIGHT, vh - 32);
        const defaultTop = vh - height - 24;
        const defaultLeft = vw - width - 24;
        return {
            minimized: persisted?.minimized ?? false,
            pinned: persisted?.pinned ?? false,
            position: {
                top: persisted?.position?.top ?? defaultTop,
                left: persisted?.position?.left ?? defaultLeft
            },
            size: { width, height },
            activeTab: persisted?.activeTab ?? initialTab
        };
    });

    const [format, setFormat] = useState<LessonNoteFormat>(() => {
        const persisted = typeof window !== 'undefined' ? loadPersistedState(lessonId) : null;
        return persisted?.format ?? 'md';
    });

    const [status, setStatus] = useState<LessonNoteStatus>({
        label: '',
        tone: 'default',
        isSaving: false,
        lastSavedAt: null,
        errorMessage: null,
        offline: false
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const persisted = loadPersistedState(lessonId);
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        if (persisted) {
            setOverlayState((prev) => ({
                minimized: persisted.minimized ?? false,
                pinned: persisted.pinned ?? false,
                position: {
                    top: clamp(persisted.position?.top ?? prev.position.top, 8, vh - MIN_HEIGHT - 8),
                    left: clamp(persisted.position?.left ?? prev.position.left, 8, vw - MIN_WIDTH - 8)
                },
                size: {
                    width: clamp(persisted.size?.width ?? prev.size.width, MIN_WIDTH, vw - 24),
                    height: clamp(persisted.size?.height ?? prev.size.height, MIN_HEIGHT, vh - 24)
                },
                activeTab: persisted.activeTab ?? initialTab
            }));
            if (persisted.format) {
                setFormat(persisted.format);
            }
        } else {
            const width = clamp(DEFAULT_WIDTH, MIN_WIDTH, vw - 32);
            const height = clamp(DEFAULT_HEIGHT, MIN_HEIGHT, vh - 32);
            setOverlayState({
                minimized: false,
                pinned: false,
                position: {
                    top: vh - height - 24,
                    left: vw - width - 24
                },
                size: { width, height },
                activeTab: initialTab
            });
            setFormat('md');
        }
    }, [lessonId, initialTab]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const payload: PersistedOverlayState = {
            minimized: overlayState.minimized,
            pinned: overlayState.pinned,
            position: overlayState.position,
            size: overlayState.size,
            activeTab: overlayState.activeTab,
            format
        };
        savePersistedState(lessonId, payload);
    }, [lessonId, overlayState, format]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handleResize = () => {
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            setOverlayState((prev) => {
                const width = clamp(prev.size.width, MIN_WIDTH, vw - 24);
                const height = clamp(prev.size.height, MIN_HEIGHT, vh - 24);
                return {
                    ...prev,
                    size: { width, height },
                    position: {
                        top: clamp(prev.position.top, 8, vh - height - 8),
                        left: clamp(prev.position.left, 8, vw - width - 8)
                    }
                };
            });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!open) {
            setOverlayState((prev) => ({ ...prev, minimized: false }));
        }
    }, [open]);

    const resizeInfoRef = useRef<{
        pointerId: number;
        startX: number;
        startY: number;
        startWidth: number;
        startHeight: number;
    } | null>(null);

    const handleDragMoveWindow = useCallback((event: PointerEvent) => {
        if (isMobile) return;
        const info = dragInfoRef.current;
        if (!info || info.pointerId !== event.pointerId) return;
        const deltaX = event.clientX - info.startX;
        const deltaY = event.clientY - info.startY;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        setOverlayState((prev) => {
            const width = prev.size.width;
            const height = prev.size.height;
            const nextTop = clamp(info.startTop + deltaY, 8, vh - height - 8);
            const nextLeft = clamp(info.startLeft + deltaX, 8, vw - width - 8);
            return { ...prev, position: { top: nextTop, left: nextLeft } };
        });
    }, [isMobile]);

    const handleDragUpWindow = useCallback((event: PointerEvent) => {
        if (isMobile) return;
        const info = dragInfoRef.current;
        if (!info || info.pointerId !== event.pointerId) return;
        dragInfoRef.current = null;
        window.removeEventListener('pointermove', handleDragMoveWindow, true);
        window.removeEventListener('pointerup', handleDragUpWindow, true);
        setIsInteracting(false);
    }, [isMobile, handleDragMoveWindow]);

    const handlePointerDown = useCallback((event: React.PointerEvent) => {
        if (isMobile) return;
        if (!cardRef.current) return;
        const target = event.target as HTMLElement;
        if (target.closest('[data-overlay-action="true"]')) {
            return;
        }
        const rect = cardRef.current.getBoundingClientRect();
        dragInfoRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            startTop: rect.top,
            startLeft: rect.left
        };
        setIsInteracting(true);
        window.addEventListener('pointermove', handleDragMoveWindow, true);
        window.addEventListener('pointerup', handleDragUpWindow, true);
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        event.preventDefault();
    }, [isMobile, handleDragMoveWindow, handleDragUpWindow]);

    const handlePointerMove = useCallback((event: React.PointerEvent) => {
        if (isMobile) return;
        const info = dragInfoRef.current;
        if (!info || info.pointerId !== event.pointerId) return;
        const deltaX = event.clientX - info.startX;
        const deltaY = event.clientY - info.startY;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        setOverlayState((prev) => {
            const width = prev.size.width;
            const height = prev.size.height;
            const nextTop = clamp(info.startTop + deltaY, 8, vh - height - 8);
            const nextLeft = clamp(info.startLeft + deltaX, 8, vw - width - 8);
            return { ...prev, position: { top: nextTop, left: nextLeft } };
        });
    }, [isMobile]);

    const handlePointerUp = useCallback((event: React.PointerEvent) => {
        if (isMobile) return;
        const info = dragInfoRef.current;
        if (!info || info.pointerId !== event.pointerId) return;
        (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
        dragInfoRef.current = null;
        resizeInfoRef.current = null;
    }, [isMobile]);

    const handleResizePointerMove = useCallback((event: PointerEvent) => {
        if (isMobile) return;
        const info = resizeInfoRef.current;
        if (!info || info.pointerId !== event.pointerId) return;
        const deltaX = event.clientX - info.startX;
        const deltaY = event.clientY - info.startY;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        setOverlayState((prev) => {
            const width = clamp(info.startWidth + deltaX, MIN_WIDTH, vw - 24);
            const height = clamp(info.startHeight + deltaY, MIN_HEIGHT, vh - 24);
            const top = clamp(prev.position.top, 8, vh - height - 8);
            const left = clamp(prev.position.left, 8, vw - width - 8);
            return {
                ...prev,
                size: { width, height },
                position: { top, left }
            };
        });
    }, [isMobile]);

    const handleResizePointerUp = useCallback((event: PointerEvent) => {
        if (isMobile) return;
        const info = resizeInfoRef.current;
        if (!info || info.pointerId !== event.pointerId) return;
        resizeInfoRef.current = null;
        window.removeEventListener('pointermove', handleResizePointerMove, true);
        window.removeEventListener('pointerup', handleResizePointerUp, true);
        setIsInteracting(false);
    }, [isMobile, handleResizePointerMove]);

    const handleResizePointerDown = useCallback((event: React.PointerEvent) => {
        if (isMobile) return;
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        resizeInfoRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            startWidth: rect.width,
            startHeight: rect.height
        };
        setIsInteracting(true);
        window.addEventListener('pointermove', handleResizePointerMove, true);
        window.addEventListener('pointerup', handleResizePointerUp, true);
        event.stopPropagation();
        event.preventDefault();
    }, [isMobile, handleResizePointerMove, handleResizePointerUp]);

    useEffect(() => {
        return () => {
            window.removeEventListener('pointermove', handleResizePointerMove, true);
            window.removeEventListener('pointerup', handleResizePointerUp, true);
        };
    }, [handleResizePointerMove, handleResizePointerUp]);

    const handleFormatSelect = (event: SelectChangeEvent<LessonNoteFormat>) => {
        const nextFormat = (event.target.value as LessonNoteFormat) || 'md';
        setFormat(nextFormat);
    };

    const statusLabel = useMemo(() => {
        if (status.label) return status.label;
        if (status.isSaving) return 'Saving...';
        if (status.offline) return 'Offline';
        return 'Saved';
    }, [status]);

    const renderDesktopOverlay = () => {
        if (!open) return null;
        if (overlayState.minimized) {
            return (
                <Box
                    sx={{
                        position: 'fixed',
                        pointerEvents: 'none',
                        inset: 0,
                        zIndex: (theme.zIndex.modal || 1300) + (overlayState.pinned ? 4 : 2)
                    }}
                >
                    <Paper
                        elevation={4}
                        role="button"
                        tabIndex={0}
                        onClick={() => setOverlayState((prev) => ({ ...prev, minimized: false }))}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setOverlayState((prev) => ({ ...prev, minimized: false }));
                            }
                        }}
                        sx={{
                            pointerEvents: 'auto',
                            position: 'fixed',
                            right: 16,
                            bottom: 24,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            px: 2,
                            py: 1,
                            borderRadius: 999,
                            cursor: 'pointer'
                        }}
                    >
                        <NoteAltOutlinedIcon fontSize="small" color="primary" />
                        <Typography variant="body2" fontWeight={600}>Notes</Typography>
                        <Chip size="small" label={statusLabel} color={status.tone} />
                    </Paper>
                </Box>
            );
        }

        return (
            <Box
                sx={{
                    position: 'fixed',
                    inset: 0,
                    pointerEvents: isInteracting ? 'auto' : 'none',
                    zIndex: (theme.zIndex.modal || 1300) + (overlayState.pinned ? 4 : 2)
                }}
            >
                <Paper
                    ref={cardRef}
                    role="dialog"
                    aria-label="Lesson notes"
                    elevation={6}
                    sx={{
                        pointerEvents: 'auto',
                        position: 'fixed',
                        top: overlayState.position.top,
                        left: overlayState.position.left,
                        width: overlayState.size.width,
                        height: overlayState.size.height,
                        display: 'flex',
                        flexDirection: 'column',
                        resize: 'both',
                        minWidth: MIN_WIDTH,
                        minHeight: MIN_HEIGHT,
                        maxWidth: '90vw',
                        maxHeight: '90vh',
                        overflow: 'hidden',
                        borderRadius: 2
                    }}
                >
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            px: 1.5,
                            py: 1,
                            borderBottom: (t) => `1px solid ${t.palette.divider}`,
                            gap: 1
                        }}
                    >
                        <Box
                            sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'move' }}
                            onPointerDown={handlePointerDown}
                        >
                            <Typography variant="subtitle1" fontWeight={600}>
                                Lesson Notes
                            </Typography>
                            <Select
                                size="small"
                                value={format}
                                onChange={handleFormatSelect}
                                onPointerDown={(e) => e.stopPropagation()}
                                sx={{ minWidth: 120 }}
                                disabled={!canEdit}
                                data-overlay-action="true"
                            >
                                <MenuItem value="md">Markdown</MenuItem>
                                <MenuItem value="plain">Plain</MenuItem>
                            </Select>
                            <Chip size="small" label={statusLabel} color={status.tone} />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }} data-overlay-action="true">
                            <Tooltip title={overlayState.pinned ? 'Unpin overlay' : 'Pin overlay'}>
                                <IconButton size="small" onPointerDown={(e) => e.stopPropagation()} onClick={() => setOverlayState((prev) => ({ ...prev, pinned: !prev.pinned }))}>
                                    {overlayState.pinned ? <PushPinIcon fontSize="small" /> : <PushPinOutlinedIcon fontSize="small" />}
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Minimize notes">
                                <IconButton size="small" onPointerDown={(e) => e.stopPropagation()} onClick={() => setOverlayState((prev) => ({ ...prev, minimized: true }))}>
                                    <MinimizeIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Close notes">
                                <IconButton size="small" onPointerDown={(e) => e.stopPropagation()} onClick={onClose}>
                                    <CloseIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>
                    <Box sx={{ flex: 1, minHeight: 0, backgroundColor: 'background.paper', position: 'relative', overflow: 'hidden' }}>
                        <LessonNotesPanel
                            lessonId={lessonId}
                            lessonTitle={lessonTitle}
                            studentId={studentId}
                            teacherId={teacherId}
                            canEdit={canEdit}
                            uiMode="floating"
                            dataMode="offline"
                            initialTab={overlayState.activeTab}
                            activeTabOverride={overlayState.activeTab}
                            initialPreviousLessonId={initialPreviousLessonId}
                            onTabChange={(tab) => setOverlayState((prev) => ({ ...prev, activeTab: tab }))}
                            pollIntervalMs={15000}
                            hideContainerChrome
                            controlledFormat={{ value: format, onChange: setFormat }}
                            hideFormatControl
                            hideStatusChip
                            onStatusChange={setStatus}
                            showPreviousTab
                        />
                        <Box
                            data-overlay-action="true"
                            onPointerDown={handleResizePointerDown}
                            sx={{
                                position: 'absolute',
                                width: 18,
                                height: 18,
                                right: 0,
                                bottom: 0,
                                cursor: 'nwse-resize',
                                display: 'flex',
                                alignItems: 'flex-end',
                                justifyContent: 'flex-end',
                                pr: 0.5,
                                pb: 0.5
                            }}
                        >
                            <Box sx={{ width: 10, height: 10, borderRight: '2px solid', borderBottom: '2px solid', borderColor: 'divider' }} />
                        </Box>
                    </Box>
                </Paper>
            </Box>
        );
    };

    const renderMobileOverlay = () => {
        if (!open) return null;
        if (overlayState.minimized) {
            return (
                <Box
                    sx={{
                        position: 'fixed',
                        pointerEvents: 'none',
                        inset: 0,
                        zIndex: (theme.zIndex.modal || 1300) + 2
                    }}
                >
                    <Paper
                        elevation={4}
                        role="button"
                        tabIndex={0}
                        onClick={() => setOverlayState((prev) => ({ ...prev, minimized: false }))}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setOverlayState((prev) => ({ ...prev, minimized: false }));
                            }
                        }}
                        sx={{
                            pointerEvents: 'auto',
                            position: 'fixed',
                            right: 16,
                            bottom: 24,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            px: 2,
                            py: 1,
                            borderRadius: 999,
                            cursor: 'pointer'
                        }}
                    >
                        <NoteAltOutlinedIcon fontSize="small" color="primary" />
                        <Typography variant="body2" fontWeight={600}>Notes</Typography>
                        <Chip size="small" label={statusLabel} color={status.tone} />
                    </Paper>
                </Box>
            );
        }

        return (
            <Box
                sx={{
                    position: 'fixed',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: '80vh',
                    backgroundColor: 'background.paper',
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    zIndex: (theme.zIndex.modal || 1300) + 2,
                    boxShadow: theme.shadows[8],
                    display: 'flex',
                    flexDirection: 'column',
                    pointerEvents: 'auto'
                }}
                role="dialog"
                aria-label="Lesson notes"
            >
                <Box sx={{ pt: 1, pb: 1, display: 'flex', justifyContent: 'center' }}>
                    <Box sx={{ width: 40, height: 4, borderRadius: 999, backgroundColor: 'divider' }} />
                </Box>
                    <Box sx={{ px: 2, pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Typography variant="subtitle1" fontWeight={700}>
                                Lesson Notes
                            </Typography>
                            <Chip size="small" label={statusLabel} color={status.tone} />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title="Minimize notes">
                                <IconButton size="small" onPointerDown={(e) => e.stopPropagation()} onClick={() => setOverlayState((prev) => ({ ...prev, minimized: true }))}>
                                    <MinimizeIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Close notes">
                                <IconButton size="small" onPointerDown={(e) => e.stopPropagation()} onClick={onClose}>
                                    <CloseIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>
                <Box sx={{ px: 2, pb: 1 }}>
                    <Select
                        fullWidth
                        size="small"
                        value={format}
                        onChange={handleFormatSelect}
                        disabled={!canEdit}
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <MenuItem value="md">Markdown</MenuItem>
                        <MenuItem value="plain">Plain</MenuItem>
                    </Select>
                </Box>
                <Box sx={{ flex: 1, minHeight: 0, px: 1, pb: 1 }}>
                    <LessonNotesPanel
                        lessonId={lessonId}
                        lessonTitle={lessonTitle}
                        studentId={studentId}
                        teacherId={teacherId}
                        canEdit={canEdit}
                        uiMode="docked-bottom"
                        dataMode="offline"
                        initialTab={overlayState.activeTab}
                        activeTabOverride={overlayState.activeTab}
                        initialPreviousLessonId={initialPreviousLessonId}
                        onTabChange={(tab) => setOverlayState((prev) => ({ ...prev, activeTab: tab }))}
                        pollIntervalMs={15000}
                        hideContainerChrome
                        controlledFormat={{ value: format, onChange: setFormat }}
                        hideFormatControl
                        hideStatusChip
                        onStatusChange={setStatus}
                    />
                </Box>
            </Box>
        );
    };

    return (
        <Portal>
            {isMobile ? renderMobileOverlay() : renderDesktopOverlay()}
        </Portal>
    );
};

export default NotesOverlay;

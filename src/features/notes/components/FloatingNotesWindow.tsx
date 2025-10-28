import React, { useEffect, useMemo, useRef } from 'react';
import {
    Box,
    Chip,
    IconButton,
    Paper,
    Portal,
    Tooltip,
    Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MinimizeIcon from '@mui/icons-material/HorizontalRule';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';

import type { FloatingWindowBounds } from '../hooks/useFloatingWindow';

export interface FloatingNotesWindowProps {
    open: boolean;
    minimized: boolean;
    pinned: boolean;
    bounds: FloatingWindowBounds;
    minWidth?: number;
    minHeight?: number;
    title: string;
    statusLabel?: string;
    statusTone?: 'default' | 'success' | 'error' | 'warning' | 'info';
    headerExtras?: React.ReactNode;
    onClose: () => void;
    onToggleMinimize: () => void;
    onTogglePin: () => void;
    onBoundsChange: (next: FloatingWindowBounds) => void;
    children: React.ReactNode;
}

const SHIELD_ID = 'floating-notes-shield';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const applyIframeInteraction = (disabled: boolean) => {
    const iframes = Array.from(document.querySelectorAll('iframe')) as HTMLElement[];
    iframes.forEach((frame) => {
        if (disabled) {
            frame.dataset._prevPointerEvents = frame.style.pointerEvents;
            frame.style.pointerEvents = 'none';
        } else {
            if (frame.dataset._prevPointerEvents !== undefined) {
                frame.style.pointerEvents = frame.dataset._prevPointerEvents;
                delete frame.dataset._prevPointerEvents;
            } else {
                frame.style.pointerEvents = '';
            }
        }
    });
};

const createShield = (cursor: string) => {
    let shield = document.getElementById(SHIELD_ID) as HTMLDivElement | null;
    if (!shield) {
        shield = document.createElement('div');
        shield.id = SHIELD_ID;
        document.body.appendChild(shield);
    }
    Object.assign(shield.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '100000',
        cursor,
        background: 'transparent'
    });
    shield.dataset.active = 'true';
    return shield;
};

const destroyShield = () => {
    const shield = document.getElementById(SHIELD_ID);
    if (shield) {
        shield.remove();
    }
};

const focusFirstEditable = (container: HTMLElement | null) => {
    if (!container) return;
    const selector = 'textarea, [contenteditable="true"], input[type="text"], .ProseMirror';
    const target = container.querySelector(selector) as HTMLElement | null;
    target?.focus({ preventScroll: false });
};

const FloatingNotesWindow: React.FC<FloatingNotesWindowProps> = ({
    open,
    minimized,
    pinned,
    bounds,
    minWidth = 360,
    minHeight = 260,
    title,
    statusLabel,
    statusTone = 'default',
    headerExtras,
    onClose,
    onToggleMinimize,
    onTogglePin,
    onBoundsChange,
    children
}) => {
    const windowRef = useRef<HTMLDivElement | null>(null);
    const interactionRef = useRef<{
        type: 'drag' | 'resize';
        pointerId: number;
        startX: number;
        startY: number;
        startBounds: FloatingWindowBounds;
    } | null>(null);

    useEffect(() => {
        if (open && !minimized) {
            const node = windowRef.current;
            focusFirstEditable(node ?? null);
        }
    }, [open, minimized]);

    useEffect(() => {
        return () => {
            destroyShield();
            applyIframeInteraction(false);
            document.body.style.userSelect = '';
        };
    }, []);

    const beginInteraction = (type: 'drag' | 'resize', event: React.PointerEvent | PointerEvent) => {
        if (!windowRef.current) return;
        const startBounds: FloatingWindowBounds = { ...bounds };
        interactionRef.current = {
            type,
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            startBounds
        };
        createShield(type === 'drag' ? 'move' : type === 'resize' ? 'nwse-resize' : 'default');
        applyIframeInteraction(true);
        document.body.style.userSelect = 'none';
        window.addEventListener('pointermove', handlePointerMove, { passive: false });
        window.addEventListener('pointerup', handlePointerUp, { passive: false });
    };

    const endInteraction = () => {
        interactionRef.current = null;
        destroyShield();
        applyIframeInteraction(false);
        document.body.style.userSelect = '';
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
    };

    const handlePointerMove = (event: PointerEvent) => {
        const info = interactionRef.current;
        if (!info) return;
        if (event.pointerId !== info.pointerId) return;
        event.preventDefault();

        const deltaX = event.clientX - info.startX;
        const deltaY = event.clientY - info.startY;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        if (info.type === 'drag') {
            const nextLeft = clamp(info.startBounds.left + deltaX, 8, vw - minWidth - 8);
            const nextTop = clamp(info.startBounds.top + deltaY, 8, vh - minHeight - 8);
            onBoundsChange({ ...bounds, left: nextLeft, top: nextTop });
        } else {
            const nextWidth = clamp(info.startBounds.width + deltaX, minWidth, vw - 16);
            const nextHeight = clamp(info.startBounds.height + deltaY, minHeight, vh - 16);
            onBoundsChange({ ...bounds, width: nextWidth, height: nextHeight });
        }
    };

    const handlePointerUp = (event: PointerEvent) => {
        const info = interactionRef.current;
        if (!info || event.pointerId !== info.pointerId) return;
        event.preventDefault();
        endInteraction();
    };

    const handleHeaderPointerDown = (event: React.PointerEvent) => {
        const target = event.target as HTMLElement;
        if (target.closest('[data-fw-action="true"]')) {
            return;
        }
        beginInteraction('drag', event);
    };

    const handleResizePointerDown = (event: React.PointerEvent) => {
        beginInteraction('resize', event);
    };

    if (!open) {
        return null;
    }

    const renderMinimized = () => (
        <Paper
            elevation={4}
            sx={{
                borderRadius: 0,
                position: 'fixed',
                top: bounds.top,
                left: bounds.left,
                pointerEvents: 'auto',
                zIndex: 10002,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 2,
                py: 1,
                cursor: 'pointer'
            }}
            onClick={onToggleMinimize}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onToggleMinimize();
                }
            }}
        >
            <Typography variant="body2" fontWeight={600}>{title}</Typography>
            {statusLabel && <Chip size="small" label={statusLabel} color={statusTone} />}
        </Paper>
    );

    const renderWindow = () => (
        <Paper
            ref={windowRef}
            role="dialog"
            aria-modal="false"
            aria-label={title}
            elevation={8}
            sx={{
                borderRadius: 0,
                boxSizing: 'border-box',
                maxWidth: 'calc(100vw - 16px)',
                maxHeight: 'calc(100vh - 16px)',
                border: (theme) => `1px solid ${theme.palette.divider}`,
                position: 'fixed',
                pointerEvents: 'auto',
                top: bounds.top,
                left: bounds.left,
                width: bounds.width,
                height: bounds.height,
                minWidth,
                minHeight,
                zIndex: pinned ? 10005 : 10003,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 1.5,
                    py: 1,
                    borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                    gap: 1,
                    cursor: 'default'
                }}
                onPointerDown={handleHeaderPointerDown}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>{title}</Typography>
                    {statusLabel && <Chip size="small" label={statusLabel} color={statusTone} />}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {headerExtras}
                    <Tooltip title="Minimize notes">
                        <IconButton size="small" data-fw-action="true" onClick={onToggleMinimize}>
                            <MinimizeIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Close notes">
                        <IconButton size="small" data-fw-action="true" onClick={onClose}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>
            <Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
                {children}
                <Box
                    data-fw-action="true"
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
    );

    return (
        <Portal>
            {minimized ? renderMinimized() : renderWindow()}
        </Portal>
    );
};

export default FloatingNotesWindow;

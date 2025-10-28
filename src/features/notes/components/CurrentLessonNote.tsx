import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Box,
    Chip,
    CircularProgress,
    MenuItem,
    Select,
    SelectChangeEvent,
    Stack,
    TextField,
    Typography
} from '@mui/material';
import dayjs from 'dayjs';
import useOnlineStatus from '../../../hooks/useOnlineStatus';
import useDebouncedCallback from '../../../hooks/useDebouncedCallback';
import { useLessonNote } from '../hooks/useLessonNote';
import { useSaveLessonNote } from '../hooks/useSaveLessonNote';
import type { LessonNoteFormat } from '../../../types/lessonNotes';
import { getNoteSizeBytes, formatByteSize, resolveNotesErrorMessage } from '../utils';
import type { NotesServiceError } from '../../../services/notesService';

const AUTOSAVE_DELAY_MS = 1000;
const SOFT_LIMIT_BYTES = 100 * 1024;
const HARD_LIMIT_BYTES = 256 * 1024;

export type LessonNoteStatusTone = 'default' | 'success' | 'error' | 'warning' | 'info';

export interface LessonNoteStatus {
    label: string;
    tone: LessonNoteStatusTone;
    isSaving: boolean;
    lastSavedAt?: string | null;
    errorMessage?: string | null;
    offline: boolean;
}

interface CurrentLessonNoteProps {
    lessonId: string;
    isActive: boolean;
    canEdit: boolean;
    lessonTitle?: string;
    pollIntervalMs?: number;
    incomingSoftSync?: { content: string; format: LessonNoteFormat; updatedAt?: string };
    onBroadcastSoftSync?: (payload: { content: string; format: LessonNoteFormat }) => void;
    controlledFormat?: {
        value: LessonNoteFormat;
        onChange: (next: LessonNoteFormat) => void;
    };
    hideFormatControl?: boolean;
    hideStatusChip?: boolean;
    onStatusChange?: (status: LessonNoteStatus) => void;
    hideHeader?: boolean;
}

const getFormatLabel = (format: LessonNoteFormat) => {
    return format === 'plain' ? 'Plain text' : 'Markdown';
};

const CurrentLessonNote: React.FC<CurrentLessonNoteProps> = ({
    lessonId,
    isActive,
    canEdit,
    lessonTitle,
    pollIntervalMs = 15000,
    incomingSoftSync,
    onBroadcastSoftSync,
    controlledFormat,
    hideFormatControl = false,
    hideStatusChip = false,
    onStatusChange,
    hideHeader = false
}) => {
    const online = useOnlineStatus();
    const [content, setContent] = useState<string>('');
    const [internalFormat, setInternalFormat] = useState<LessonNoteFormat>('md');
    const [isDirty, setIsDirty] = useState<boolean>(false);
    const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
    const [lastError, setLastError] = useState<NotesServiceError | null>(null);

    const lastPersistedRef = useRef<{ content: string; format: LessonNoteFormat; updatedAt?: string | null }>({
        content: '',
        format: 'md',
        updatedAt: undefined
    });
    const latestStateRef = useRef({ isDirty: false, online: true, overHardLimit: false });
    const savingRef = useRef(false);
    const lastSaveAttemptRef = useRef<number>(0);

    const saveMutation = useSaveLessonNote();
    const format = controlledFormat?.value ?? internalFormat;

    const shouldPoll = useMemo(() => {
        if (!isActive) return false;
        if (!lessonId) return false;
        if (!online) return false;
        if (saveMutation.isPending) return false;
        if (isDirty) return false;
        return pollIntervalMs > 0;
    }, [isActive, lessonId, online, saveMutation.isPending, isDirty, pollIntervalMs]);

    const {
        note,
        cachedNote,
        source,
        hasPersistedNote,
        isLoading,
        isFetching,
        error: loadError,
        refetch
    } = useLessonNote({
        lessonId,
        enabled: Boolean(lessonId && isActive),
        refetchInterval: shouldPoll ? pollIntervalMs : false
    });

    useEffect(() => {
        if (savingRef.current) {
            return;
        }
        if (note) {
            const last = lastPersistedRef.current;
            const incomingUpdatedAt = note.updatedAt ?? null;
            const lastUpdatedAt = last.updatedAt ?? null;
            if (lastUpdatedAt && incomingUpdatedAt && dayjs(incomingUpdatedAt).isBefore(dayjs(lastUpdatedAt))) {
                console.debug('[LessonNotes] skip stale note payload', { lessonId, incomingUpdatedAt, lastUpdatedAt });
                return;
            }
            lastPersistedRef.current = {
                content: note.content,
                format: note.format,
                updatedAt: incomingUpdatedAt
            };
            setLastSavedAt(incomingUpdatedAt ?? null);
            if (!isDirty && content !== note.content) {
                setContent(note.content);
            }
            if (!isDirty && format !== note.format) {
                if (controlledFormat) {
                    controlledFormat.onChange(note.format);
                } else {
                    setInternalFormat(note.format);
                }
            }
        } else if (note === null) {
            lastPersistedRef.current = {
                content: '',
                format: 'md',
                updatedAt: undefined
            };
            if (!isDirty) {
                setContent('');
                if (controlledFormat) {
                    controlledFormat.onChange('md');
                } else {
                    setInternalFormat('md');
                }
                setLastSavedAt(null);
            }
        }
    }, [note, isDirty, content, format, lessonId, controlledFormat]);

    useEffect(() => {
        if (!incomingSoftSync) {
            return;
        }
        setContent(incomingSoftSync.content);
        if (controlledFormat) {
            controlledFormat.onChange(incomingSoftSync.format);
        } else {
            setInternalFormat(incomingSoftSync.format);
        }
        setIsDirty(false);
    }, [incomingSoftSync]);

    const contentBytes = useMemo(() => getNoteSizeBytes(content), [content]);
    const overSoftLimit = contentBytes >= SOFT_LIMIT_BYTES;
    const overHardLimit = contentBytes >= HARD_LIMIT_BYTES;

    const runSave = useCallback(async () => {
        const now = Date.now();
        const elapsed = now - lastSaveAttemptRef.current;
        lastSaveAttemptRef.current = now;

        if (!lessonId || saveMutation.isPending || savingRef.current) {
            return;
        }
        if (!canEdit) {
            return;
        }
        if (overHardLimit) {
            setLastError({ message: 'Too large. Please shorten your notes.' } as NotesServiceError);
            return;
        }
        if (!online) {
            setLastError({ message: 'No connection. Changes not saved.' } as NotesServiceError);
            return;
        }
        if (!isDirty && !saveMutation.isPending) {
            return;
        }

        const trimmed = content.trim();
        if (trimmed.length === 0 && !hasPersistedNote) {
            setIsDirty(false);
            setLastError(null);
            setLastSavedAt(new Date().toISOString());
            return;
        }

        setLastError(null);

        savingRef.current = true;
        try {
            const result = await saveMutation.mutateAsync({
                lessonId,
                content: trimmed.length === 0 ? '' : content,
                format
            });
            setIsDirty(false);
            if (result) {
                lastPersistedRef.current = {
                    content: result.content,
                    format: result.format,
                    updatedAt: result.updatedAt
                };
                setLastSavedAt(result.updatedAt ?? null);
                if (controlledFormat && result.format !== format) {
                    controlledFormat.onChange(result.format);
                } else if (!controlledFormat) {
                    setInternalFormat(result.format);
                }
            } else {
                lastPersistedRef.current = {
                    content: '',
                    format,
                    updatedAt: undefined
                };
                setLastSavedAt(new Date().toISOString());
            }
            if (onBroadcastSoftSync) {
                onBroadcastSoftSync({
                    content: trimmed.length === 0 ? '' : content,
                    format
                });
            }
        } catch (err) {
            const serviceError = err as NotesServiceError;
            setLastError(serviceError);
        } finally {
            savingRef.current = false;
        }
    }, [lessonId, canEdit, overHardLimit, online, isDirty, saveMutation, hasPersistedNote, content, format, onBroadcastSoftSync, isActive]);

    const {
        callback: triggerAutosave,
        cancel: cancelAutosave
    } = useDebouncedCallback(
        useCallback(() => {
            if (!isActive || !canEdit) {
                return;
            }
            void runSave();
        }, [isActive, canEdit, runSave]),
        AUTOSAVE_DELAY_MS
    );

    const scheduleAutosave = useCallback((nextContent: string, nextFormat: LessonNoteFormat) => {
        if (!canEdit || !isActive) {
            return;
        }
        const nextBytes = getNoteSizeBytes(nextContent);
        if (nextBytes >= HARD_LIMIT_BYTES) {
            cancelAutosave();
            setLastError({ message: 'Too large. Please shorten your notes.' } as NotesServiceError);
            return;
        }
        if (!online) {
            cancelAutosave();
            setLastError({ message: 'No connection. Changes not saved.' } as NotesServiceError);
            return;
        }
        if (saveMutation.isPending || savingRef.current) {
            cancelAutosave();
            return;
        }
        cancelAutosave();
        triggerAutosave();
    }, [cancelAutosave, triggerAutosave, canEdit, isActive, online, saveMutation.isPending, lessonId]);

    useEffect(() => {
        latestStateRef.current = { isDirty, online, overHardLimit };
    }, [isDirty, online, overHardLimit]);

    useEffect(() => {
        if (!isActive || !canEdit || !online || overHardLimit) {
            cancelAutosave();
        }
    }, [isActive, canEdit, online, overHardLimit, cancelAutosave]);

    const runSaveRef = useRef(runSave);
    useEffect(() => {
        runSaveRef.current = runSave;
    }, [runSave]);

    useEffect(() => {
        return () => {
            cancelAutosave();
            const { isDirty: dirty, online: wasOnline, overHardLimit: wasOverLimit } = latestStateRef.current;
            if (dirty && wasOnline && !wasOverLimit) {
                void runSaveRef.current();
            }
        };
    }, [cancelAutosave, lessonId]);

    const handleContentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!canEdit) {
            return;
        }
        const next = event.target.value;
        setContent(next);
        setIsDirty(true);
        setLastError(null);
        if (onBroadcastSoftSync) {
            onBroadcastSoftSync({ content: next, format });
        }
        scheduleAutosave(next, format);
    };

    const handleFormatChange = (event: SelectChangeEvent<LessonNoteFormat>) => {
        const nextFormat = (event.target.value as LessonNoteFormat) || 'md';
        if (controlledFormat) {
            controlledFormat.onChange(nextFormat);
        } else {
            setInternalFormat(nextFormat);
        }
        setIsDirty(true);
        setLastError(null);
        if (onBroadcastSoftSync) {
            onBroadcastSoftSync({ content, format: nextFormat });
        }
        scheduleAutosave(content, nextFormat);
        console.debug('[LessonNotes] format change', { lessonId, nextFormat });
    };

    const activeErrorMessage = useMemo(() => {
        if (lastError) {
            const mapped = resolveNotesErrorMessage(lastError);
            if (mapped) {
                return mapped;
            }
            return lastError.message;
        }
        if (loadError) {
            return resolveNotesErrorMessage(loadError);
        }
        if (overHardLimit) {
            return 'Too large. Please shorten your notes.';
        }
        if (!online && (isDirty || saveMutation.isPending)) {
            return 'No connection. Changes not saved.';
        }
        return null;
    }, [lastError, loadError, overHardLimit, online, isDirty, saveMutation.isPending]);

    const statusLabel = useMemo(() => {
        if (!online && (isDirty || saveMutation.isPending)) {
            return 'No connection. Changes not saved.';
        }
        if (saveMutation.isPending) {
            return 'Saving...';
        }
        if (activeErrorMessage) {
            return activeErrorMessage;
        }
        if (lastSavedAt) {
            return `Saved`;
        }
        if (source === 'cache' && cachedNote?.updatedAt) {
            return `Offline copy from ${dayjs(cachedNote.updatedAt).format('MMM D, HH:mm')}`;
        }
        return '';
    }, [online, isDirty, saveMutation.isPending, activeErrorMessage, lastSavedAt, source, cachedNote]);

    const statusTone = useMemo<'default' | 'success' | 'error' | 'warning' | 'info'>(() => {
        if (!online && (isDirty || saveMutation.isPending)) {
            return 'warning';
        }
        if (activeErrorMessage) {
            return 'error';
        }
        if (saveMutation.isPending) {
            return 'info';
        }
        if (lastSavedAt) {
            return 'success';
        }
        if (source === 'cache') {
            return 'warning';
        }
        return 'default';
    }, [online, isDirty, saveMutation.isPending, activeErrorMessage, lastSavedAt, source]);

    const disabled = !canEdit || !online;

    const helperText = useMemo(() => {
        if (!online && canEdit) {
            return 'Offline — read-only.';
        }
        return undefined;
    }, [online, canEdit]);

    useEffect(() => {
        if (!onStatusChange) return;
        const status: LessonNoteStatus = {
            label: statusLabel || '',
            tone: statusTone,
            isSaving: saveMutation.isPending,
            lastSavedAt,
            errorMessage: activeErrorMessage ?? null,
            offline: !online
        };
        onStatusChange(status);
    }, [onStatusChange, statusLabel, statusTone, saveMutation.isPending, lastSavedAt, activeErrorMessage, online]);

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                p: hideHeader ? 0 : 2,
                width: '100%'
            }}
        >
            {!hideHeader ? (
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
                    <Box>
                        <Typography variant="h6" component="h2">
                            {lessonTitle ?? 'Lesson Notes'}
                        </Typography>
                        {source === 'cache' && cachedNote?.updatedAt && (
                            <Typography variant="caption" color="text.secondary">
                                Offline copy from {dayjs(cachedNote.updatedAt).format('MMM D, HH:mm')}
                            </Typography>
                        )}
                    </Box>
                    {!hideFormatControl && (
                        <Select
                            id="lesson-note-format"
                            value={format}
                            size="small"
                            onChange={handleFormatChange}
                            disabled={disabled}
                            aria-label="Notes format"
                        >
                            <MenuItem value="md">{getFormatLabel('md')}</MenuItem>
                            <MenuItem value="plain">{getFormatLabel('plain')}</MenuItem>
                        </Select>
                    )}
                </Stack>
            ) : (
                source === 'cache' && cachedNote?.updatedAt ? (
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
                        Offline copy from {dayjs(cachedNote.updatedAt).format('MMM D, HH:mm')}
                    </Typography>
                ) : null
            )}
            {hideHeader && !hideFormatControl && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                    <Select
                        id="lesson-note-format"
                        value={format}
                        size="small"
                        onChange={handleFormatChange}
                        disabled={disabled}
                        aria-label="Notes format"
                    >
                        <MenuItem value="md">{getFormatLabel('md')}</MenuItem>
                        <MenuItem value="plain">{getFormatLabel('plain')}</MenuItem>
                    </Select>
                </Box>
            )}

            {overSoftLimit && !overHardLimit && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Large note ({formatByteSize(contentBytes)}). Consider trimming before you hit the limit (256 KB).
                </Alert>
            )}

            {activeErrorMessage && (
                <Alert severity={statusTone === 'error' ? 'error' : 'warning'} sx={{ mb: 2 }}>
                    {activeErrorMessage}
                </Alert>
            )}

            <Box sx={{ flex: 1, position: 'relative', width: '100%' }}>
                <TextField
                    id="lesson-note-editor"
                    label="Lesson notes editor"
                    placeholder="Capture key points of this lesson…"
                    multiline
                    minRows={8}
                    maxRows={20}
                    value={content}
                    onChange={handleContentChange}
                    fullWidth
                    disabled={disabled}
                    helperText={helperText}
                    FormHelperTextProps={{ sx: { mt: 0.5 } }}
                    inputProps={{
                        'aria-label': 'Lesson notes editor',
                        style: { whiteSpace: 'pre-wrap' }
                    }}
                    variant="outlined"
                    InputProps={{
                        sx: {
                            borderRadius: 0,
                            '& fieldset': { borderRadius: 0 }
                        }
                    }}
                    sx={{
                        height: '100%',
                        width: '100%',
                        flex: 1,
                        boxSizing: 'border-box',
                        '& .MuiInputBase-root': {
                            height: '100%',
                            width: '100%',
                            alignItems: 'flex-start',
                            display: 'flex'
                        },
                        '& textarea': {
                            flex: 1,
                            width: '100%'
                        }
                    }}
                />
            </Box>

            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 2 }}>
                <Typography variant="caption" color={overHardLimit ? 'error.main' : overSoftLimit ? 'warning.main' : 'text.secondary'}>
                    {formatByteSize(contentBytes)} / 256 KB
                </Typography>
                {statusLabel && (
                    <Chip
                        label={statusLabel}
                        color={statusTone}
                        size="small"
                        icon={saveMutation.isPending ? <CircularProgress size={14} color="inherit" /> : undefined}
                        sx={{
                            '& .MuiChip-icon': {
                                ml: 0
                            }
                        }}
                    />
                )}
            </Stack>
        </Box>
    );
};

export default CurrentLessonNote;

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Box,
    Chip,
    CircularProgress,
    MenuItem,
    Select,
    SelectChangeEvent,
    Stack,
    Typography
} from '@mui/material';
import BlockNoteMiniEditor from './BlockNoteMiniEditor';
import dayjs from 'dayjs';
import type { DailyCall } from '@daily-co/daily-js';
import useOnlineStatus from '../../../hooks/useOnlineStatus';
import useDebouncedCallback from '../../../hooks/useDebouncedCallback';
import { useLessonNote } from '../hooks/useLessonNote';
import { useSaveLessonNote } from '../hooks/useSaveLessonNote';
import type { LessonNoteFormat } from '../../../types/lessonNotes';
import { getNoteSizeBytes, formatByteSize, resolveNotesErrorMessage } from '../utils';
import type { NotesServiceError } from '../../../services/notesService';
import type { NotesDataMode, NotesUIMode } from '../utils/modeSelectors';
import useNotesSoftSync, { SoftSyncPayload } from '../hooks/useNotesSoftSync';
import { canonicalizeContent, computeDiffMeta, normalizeFormat, fingerprintContent } from '../utils/contentCanonicalization';

const AUTOSAVE_DELAY_MS = 1000;
const AUTOSAVE_MAX_INTERVAL_MS = 30000;
const SOFT_LIMIT_BYTES = 100 * 1024;
const HARD_LIMIT_BYTES = 256 * 1024;
const SOFT_SYNC_IMMUNITY_WINDOW_MS = 1500;
const REMOTE_APPLY_IDLE_MS = 800;
const USER_INPUT_RECENT_MS = 2500;
const LOCAL_HISTORY_LIMIT = 25;

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
    dataMode: NotesDataMode;
    uiMode?: NotesUIMode;
    call?: DailyCall | null;
    senderId?: string;
    canEdit: boolean;
    lessonTitle?: string;
    pollIntervalMs?: number;
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
    dataMode,
    uiMode,
    call,
    senderId,
    canEdit,
    lessonTitle,
    pollIntervalMs = 15000,
    controlledFormat,
    hideFormatControl = false,
    hideStatusChip = false,
    onStatusChange,
    hideHeader = false
}) => {
    const online = useOnlineStatus();
    const isRealtime = dataMode === 'realtime';
    const localStorageRef = typeof window !== 'undefined' ? window.localStorage : null;
    const debugEnabled = ((import.meta as any)?.env?.DEV ?? false) ||
        (!!localStorageRef?.getItem('NOTES_SOFT_SYNC_DEBUG'));
    const shadowModeEnabled = !!localStorageRef?.getItem('NOTES_SOFT_SYNC_SHADOW');
    const debugLog = useCallback((phase: string, payload: Record<string, unknown>) => {
        if (!debugEnabled) return;
        // eslint-disable-next-line no-console
        console.info('[LessonNotes]', phase, payload);
    }, [debugEnabled]);
    const [content, setContent] = useState<string>('');
    const [internalFormat, setInternalFormat] = useState<LessonNoteFormat>('md');
    const [isDirty, setIsDirty] = useState<boolean>(false);
    const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
    const [lastError, setLastError] = useState<NotesServiceError | null>(null);
    const softSyncAppliedAtRef = useRef<number | null>(null);
    const lastLocalEditAtRef = useRef<number>(0);
    const deferredApplyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const needsFlushRef = useRef<boolean>(false);
    const initialNoteFetchedRef = useRef<boolean>(false);
    const autosaveMaxWaitRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [showSyncedBadge, setShowSyncedBadge] = useState(false);
    const syncedBadgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const localRevisionRef = useRef<number>(0);
    const recentLocalHistoryRef = useRef<Map<string, number>>(new Map());

    const lastPersistedRef = useRef<{ content: string; format: LessonNoteFormat; updatedAt?: string | null }>({
        content: '',
        format: 'md',
        updatedAt: undefined
    });
    const latestStateRef = useRef({ isDirty: false, online: true, overHardLimit: false, dataMode });
    const savingRef = useRef(false);
    const lastSaveAttemptRef = useRef<number>(0);
    const prevDataModeRef = useRef<NotesDataMode>(dataMode);
    const prevOnlineRef = useRef<boolean>(online);

    const contentDiffersFromPersisted = useCallback(
        (candidateContent: string, candidateFormat: LessonNoteFormat) => {
            const normalizedFormat = normalizeFormat(candidateFormat);
            const canonicalCandidate = canonicalizeContent(candidateContent, normalizedFormat);
            const last = lastPersistedRef.current;
            return last.content !== canonicalCandidate || last.format !== normalizedFormat;
        },
        []
    );

    const saveMutation = useSaveLessonNote();
    const format = controlledFormat?.value ?? internalFormat;
    const shouldUseSoftSync = dataMode === 'realtime' && !!lessonId && !!call;
    const softSync = useNotesSoftSync({
        call: shouldUseSoftSync ? call : null,
        lessonId,
        enabled: shouldUseSoftSync,
        senderId
    });
    const pendingSoftSyncRef = useRef<SoftSyncPayload | null>(null);
    const normalizedFormat = normalizeFormat(format);
    const canonicalCurrentContent = useMemo(() => canonicalizeContent(content, normalizedFormat), [content, normalizedFormat]);
    const pruneLocalHistory = useCallback((currentRevision: number) => {
        const cutoff = currentRevision - LOCAL_HISTORY_LIMIT;
        for (const [fingerprint, revision] of recentLocalHistoryRef.current.entries()) {
            if (revision <= cutoff) {
                recentLocalHistoryRef.current.delete(fingerprint);
            }
        }
    }, []);

    const shouldPoll = useMemo(() => {
        if (!isActive) return false;
        if (!lessonId) return false;
        if (!online) return false;
        if (isRealtime) return false;
        if (saveMutation.isPending) return false;
        if (isDirty) return false;
        return pollIntervalMs > 0;
    }, [isActive, lessonId, online, isRealtime, saveMutation.isPending, isDirty, pollIntervalMs]);

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
        enabled: Boolean(lessonId && isActive && (!isRealtime || !initialNoteFetchedRef.current)),
        refetchInterval: isRealtime ? false : (shouldPoll ? pollIntervalMs : false),
        mode: dataMode
    });

    useEffect(() => {
        initialNoteFetchedRef.current = false;
    }, [lessonId]);

    useEffect(() => {
        if (savingRef.current) {
            return;
        }

        const isNetworkSource = source === 'network';
        const isInitialNetworkPayload = isNetworkSource && !initialNoteFetchedRef.current;
        const allowDuringCall = !isRealtime || isInitialNetworkPayload || source !== 'network';

        if (!allowDuringCall) {
            return;
        }

        const softSyncAppliedAt = softSyncAppliedAtRef.current;
        if (softSyncAppliedAt) {
            const elapsed = Date.now() - softSyncAppliedAt;
            if (elapsed < SOFT_SYNC_IMMUNITY_WINDOW_MS) {
                if (isNetworkSource && !initialNoteFetchedRef.current) {
                    initialNoteFetchedRef.current = true;
                }
                return;
            }
        }

        if (note) {
            const normalizedIncomingFormat = normalizeFormat(note.format);
            const canonicalIncomingContent = canonicalizeContent(note.content, normalizedIncomingFormat);
            const last = lastPersistedRef.current;
            const incomingUpdatedAt = note.updatedAt ?? null;
            const lastUpdatedAt = last.updatedAt ?? null;
            if (lastUpdatedAt && incomingUpdatedAt && dayjs(incomingUpdatedAt).isBefore(dayjs(lastUpdatedAt))) {
                return;
            }
            lastPersistedRef.current = {
                content: canonicalIncomingContent,
                format: normalizedIncomingFormat,
                updatedAt: incomingUpdatedAt
            };
            needsFlushRef.current = false;
            setLastSavedAt(incomingUpdatedAt ?? null);
            if (!isDirty && canonicalCurrentContent !== canonicalIncomingContent) {
                setContent(canonicalIncomingContent);
            }
            if (!isDirty && normalizedFormat !== normalizedIncomingFormat) {
                if (controlledFormat) {
                    controlledFormat.onChange(normalizedIncomingFormat);
                } else {
                    setInternalFormat(normalizedIncomingFormat);
                }
            }
        } else if (note === null) {
            lastPersistedRef.current = {
                content: '',
                format: 'md',
                updatedAt: undefined
            };
            needsFlushRef.current = false;
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

        if (isNetworkSource) {
            initialNoteFetchedRef.current = true;
        }
    }, [note, isDirty, content, format, lessonId, controlledFormat, isRealtime, source, canonicalCurrentContent, normalizedFormat]);

    const applyIncoming = useCallback((payload: SoftSyncPayload, sourceLabel: 'live' | 'pending', context?: { reason?: string; diffMeta?: ReturnType<typeof computeDiffMeta> }) => {
        const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const nextFormat = normalizeFormat(payload.format);
        const nextContent = canonicalizeContent(payload.content, nextFormat);
        const diffFromPersisted = contentDiffersFromPersisted(nextContent, nextFormat);
        const incomingFingerprint = fingerprintContent(nextContent, nextFormat);

        softSyncAppliedAtRef.current = Date.now();
        needsFlushRef.current = needsFlushRef.current || diffFromPersisted;
        recentLocalHistoryRef.current.set(incomingFingerprint, localRevisionRef.current);
        pruneLocalHistory(localRevisionRef.current);

        setContent(nextContent);
        if (controlledFormat) {
            controlledFormat.onChange(nextFormat);
        } else {
            setInternalFormat(nextFormat);
        }
        setIsDirty(false);
        setLastError(null);
        debugLog('apply-incoming', {
            source: sourceLabel,
            length: nextContent.length,
            reason: context?.reason,
            diff: context?.diffMeta,
            updatedAt: payload.updatedAt ?? null
        });

        if (typeof requestAnimationFrame === 'function' && typeof performance !== 'undefined') {
            requestAnimationFrame(() => {
                const renderLatencyMs = Math.round(performance.now() - start);
                debugLog('render-commit', { source: sourceLabel, renderLatencyMs, reason: context?.reason });
            });
        }
    }, [contentDiffersFromPersisted, controlledFormat, debugLog, pruneLocalHistory]);

    useLayoutEffect(() => {
        if (!shouldUseSoftSync) {
            return;
        }

        const payload = softSync.incoming;
        if (!payload) {
            return;
        }

        const normalizedIncomingFormat = normalizeFormat(payload.format);
        const canonicalIncomingContent = canonicalizeContent(payload.content, normalizedIncomingFormat);
        const sanitizedPayload: SoftSyncPayload = {
            ...payload,
            content: canonicalIncomingContent,
            format: normalizedIncomingFormat
        };

        const incomingAt = payload.updatedAt ? dayjs(payload.updatedAt).valueOf() : Date.now();
        const now = Date.now();
        const sinceTypingMs = now - lastLocalEditAtRef.current;
        const userIsTyping = sinceTypingMs < REMOTE_APPLY_IDLE_MS;
        const lastLocalWriteAt = Math.max(lastLocalEditAtRef.current, softSyncAppliedAtRef.current ?? 0);

        const diffMeta = computeDiffMeta(canonicalCurrentContent, canonicalIncomingContent);
        const formatsMatch = normalizedFormat === normalizedIncomingFormat;
        const identical = diffMeta.equal && formatsMatch;
        const incomingFingerprint = fingerprintContent(canonicalIncomingContent, normalizedIncomingFormat);
        const currentLocalRevision = localRevisionRef.current;
        const incomingLocalRevision = recentLocalHistoryRef.current.get(incomingFingerprint);

        let skipReason: string | null = null;

        if (payload.senderId && senderId && payload.senderId === senderId) {
            skipReason = 'self-sender';
        } else if (incomingAt < lastLocalWriteAt) {
            skipReason = 'stale-timestamp';
        } else if (identical) {
            skipReason = 'identical';
        } else if (diffMeta.whitespaceOnly && sinceTypingMs < SOFT_SYNC_IMMUNITY_WINDOW_MS) {
            skipReason = 'whitespace-while-typing';
        } else if (diffMeta.strictlyShorter && incomingAt <= lastLocalWriteAt) {
            skipReason = 'shorter-than-local';
        } else if (typeof incomingLocalRevision === 'number' && incomingLocalRevision < currentLocalRevision) {
            skipReason = 'older-local-revision';
        }

        debugLog('incoming-eval', {
            length: canonicalIncomingContent.length,
            updatedAt: payload.updatedAt ?? null,
            userIsTyping,
            sinceTypingMs,
            diffMeta,
            incomingFormat: normalizedIncomingFormat,
            localFormat: normalizedFormat,
            incomingAt,
            lastLocalWriteAt,
            skipReason,
            shadowModeEnabled,
            incomingLocalRevision,
            currentLocalRevision
        });

        if (skipReason) {
            softSync.resetIncoming();
            return;
        }

        if (savingRef.current) {
            pendingSoftSyncRef.current = sanitizedPayload;
            return;
        }

        const applyWithBadge = (reason: string) => {
            applyIncoming(sanitizedPayload, 'live', { reason, diffMeta });
            softSync.resetIncoming();
            setShowSyncedBadge(true);
            if (syncedBadgeTimerRef.current) { clearTimeout(syncedBadgeTimerRef.current); syncedBadgeTimerRef.current = null; }
            syncedBadgeTimerRef.current = setTimeout(() => setShowSyncedBadge(false), 1400);
        };

        if (shadowModeEnabled) {
            debugLog('incoming-shadow-skip', { reason: 'shadow-mode', diffMeta });
            softSync.resetIncoming();
            return;
        }

        if (userIsTyping && !diffMeta.strictAppend) {
            if (deferredApplyTimerRef.current) {
                clearTimeout(deferredApplyTimerRef.current);
                deferredApplyTimerRef.current = null;
            }
            deferredApplyTimerRef.current = setTimeout(() => {
                const idleFor = Date.now() - lastLocalEditAtRef.current;
                if (idleFor >= REMOTE_APPLY_IDLE_MS) {
                    applyWithBadge('deferred-idle');
                } else {
                    if (deferredApplyTimerRef.current) { clearTimeout(deferredApplyTimerRef.current); }
                    deferredApplyTimerRef.current = setTimeout(() => {
                        const idleFor2 = Date.now() - lastLocalEditAtRef.current;
                        if (idleFor2 >= REMOTE_APPLY_IDLE_MS) {
                            applyWithBadge('deferred-second');
                        } else {
                            debugLog('incoming-drop', { reason: 'still-typing-after-defer', diffMeta });
                            softSync.resetIncoming();
                            deferredApplyTimerRef.current = null;
                        }
                    }, REMOTE_APPLY_IDLE_MS);
                }
            }, REMOTE_APPLY_IDLE_MS);
            return;
        }

        applyWithBadge(diffMeta.strictAppend ? 'strict-append' : 'immediate');
    }, [shouldUseSoftSync, softSync, applyIncoming, canonicalCurrentContent, normalizedFormat, senderId, shadowModeEnabled, debugLog]);

    const contentBytes = useMemo(() => getNoteSizeBytes(canonicalCurrentContent), [canonicalCurrentContent]);
    const overSoftLimit = contentBytes >= SOFT_LIMIT_BYTES;
    const overHardLimit = contentBytes >= HARD_LIMIT_BYTES;

    const runSave = useCallback(async ({ force = false, allowDuringRealtime = false }: { force?: boolean; allowDuringRealtime?: boolean } = {}) => {
        const now = Date.now();
        const elapsed = now - lastSaveAttemptRef.current;
        lastSaveAttemptRef.current = now;
        void elapsed;

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

        const diffFromPersisted = contentDiffersFromPersisted(canonicalCurrentContent, normalizedFormat);

        if (isRealtime && !allowDuringRealtime) {
            if (diffFromPersisted) {
                needsFlushRef.current = true;
            }
            return;
        }
        if (!online) {
            if (diffFromPersisted) {
                needsFlushRef.current = true;
            }
            return;
        }
        if (!force) {
            if (!isDirty && !saveMutation.isPending) {
                return;
            }
        } else if (!diffFromPersisted) {
            needsFlushRef.current = false;
            return;
        }

        const canonicalTrimmed = canonicalCurrentContent.trim();
        if (canonicalTrimmed.length === 0 && !hasPersistedNote) {
            setIsDirty(false);
            needsFlushRef.current = false;
            setLastError(null);
            setLastSavedAt(new Date().toISOString());
            if (autosaveMaxWaitRef.current) {
                clearTimeout(autosaveMaxWaitRef.current);
                autosaveMaxWaitRef.current = null;
            }
            return;
        }

        if (autosaveMaxWaitRef.current) {
            clearTimeout(autosaveMaxWaitRef.current);
            autosaveMaxWaitRef.current = null;
        }

        setLastError(null);

        const saveContext = { force, mode: dataMode, length: canonicalCurrentContent.length };
        debugLog('server-save-start', saveContext);

        savingRef.current = true;
        let succeeded = false;
        try {
            const result = await saveMutation.mutateAsync({
                lessonId,
                content: canonicalTrimmed.length === 0 ? '' : canonicalCurrentContent,
                format: normalizedFormat
            });
            setIsDirty(false);
            needsFlushRef.current = false;
            if (result) {
                const resultFormat = normalizeFormat(result.format);
                const resultContent = canonicalizeContent(result.content, resultFormat);
                lastPersistedRef.current = {
                    content: resultContent,
                    format: resultFormat,
                    updatedAt: result.updatedAt
                };
                setLastSavedAt(result.updatedAt ?? null);
                if (controlledFormat && resultFormat !== normalizedFormat) {
                    controlledFormat.onChange(resultFormat);
                } else if (!controlledFormat) {
                    setInternalFormat(resultFormat);
                }
            } else {
                lastPersistedRef.current = {
                    content: '',
                    format: normalizedFormat,
                    updatedAt: undefined
                };
                setLastSavedAt(new Date().toISOString());
            }
            succeeded = true;
        } catch (err) {
            needsFlushRef.current = diffFromPersisted || needsFlushRef.current;
            const serviceError = err as NotesServiceError;
            setLastError(serviceError);
            debugLog('server-save-error', {
                message: serviceError?.message,
                status: (serviceError as NotesServiceError)?.status
            });
        } finally {
            savingRef.current = false;
            debugLog('server-save-finish', { ...saveContext, success: succeeded });
            if (shouldUseSoftSync && pendingSoftSyncRef.current) {
                const buffered = pendingSoftSyncRef.current;
                pendingSoftSyncRef.current = null;

                const bufferedFormat = normalizeFormat(buffered.format);
                const canonicalBufferedContent = canonicalizeContent(buffered.content, bufferedFormat);
                const incomingAt = buffered.updatedAt ? dayjs(buffered.updatedAt).valueOf() : Date.now();
                const lastLocalWriteAt = Math.max(lastLocalEditAtRef.current, softSyncAppliedAtRef.current ?? 0);
                const isSelf = buffered.senderId && senderId && buffered.senderId === senderId;

                // Apply only if it's not from us and it's strictly newer than our last local write
                if (!isSelf && incomingAt > lastLocalWriteAt) {
                    const bufferedDiff = computeDiffMeta(canonicalCurrentContent, canonicalBufferedContent);
                    applyIncoming(
                        { ...buffered, content: canonicalBufferedContent, format: bufferedFormat },
                        'pending',
                        { reason: 'post-save', diffMeta: bufferedDiff }
                    );
                }
                softSync.resetIncoming();
            }
        }
    }, [
        lessonId,
        saveMutation,
        canEdit,
        overHardLimit,
        contentDiffersFromPersisted,
        canonicalCurrentContent,
        normalizedFormat,
        isRealtime,
        online,
        isDirty,
        hasPersistedNote,
        controlledFormat,
        shouldUseSoftSync,
        softSync,
        applyIncoming,
        debugLog,
        dataMode
    ]);

    const {
        callback: triggerAutosave,
        cancel: cancelAutosave
    } = useDebouncedCallback(
        useCallback(() => {
            if (!isActive || !canEdit || isRealtime || !online) {
                return;
            }
            void runSave();
        }, [isActive, canEdit, isRealtime, online, runSave]),
        AUTOSAVE_DELAY_MS
    );

    const clearAutosaveTimers = useCallback(() => {
        cancelAutosave();
        if (autosaveMaxWaitRef.current) {
            clearTimeout(autosaveMaxWaitRef.current);
            autosaveMaxWaitRef.current = null;
        }
    }, [cancelAutosave]);

    const scheduleAutosave = useCallback((nextContent: string, nextFormat: LessonNoteFormat) => {
        if (!canEdit || !isActive) {
            clearAutosaveTimers();
            return;
        }
        const nextBytes = getNoteSizeBytes(nextContent);
        if (nextBytes >= HARD_LIMIT_BYTES) {
            clearAutosaveTimers();
            setLastError({ message: 'Too large. Please shorten your notes.' } as NotesServiceError);
            needsFlushRef.current = true;
            return;
        }

        const diffFromPersisted = contentDiffersFromPersisted(nextContent, nextFormat);

        if (isRealtime || !online) {
            needsFlushRef.current = needsFlushRef.current || diffFromPersisted;
            clearAutosaveTimers();
            return;
        }
        if (!diffFromPersisted) {
            clearAutosaveTimers();
            return;
        }
        if (saveMutation.isPending || savingRef.current) {
            needsFlushRef.current = needsFlushRef.current || diffFromPersisted;
            clearAutosaveTimers();
            return;
        }

        clearAutosaveTimers();
        triggerAutosave();
        autosaveMaxWaitRef.current = setTimeout(() => {
            autosaveMaxWaitRef.current = null;
            void runSave({ force: true });
        }, AUTOSAVE_MAX_INTERVAL_MS);
    }, [
        clearAutosaveTimers,
        triggerAutosave,
        canEdit,
        isActive,
        isRealtime,
        online,
        saveMutation.isPending,
        contentDiffersFromPersisted,
        runSave
    ]);

    useEffect(() => {
        latestStateRef.current = { isDirty, online, overHardLimit, dataMode };
    }, [isDirty, online, overHardLimit, dataMode]);

    useEffect(() => {
        if (!isActive || !canEdit || !online || overHardLimit || isRealtime) {
            clearAutosaveTimers();
        }
    }, [isActive, canEdit, online, overHardLimit, isRealtime, clearAutosaveTimers]);

    const runSaveRef = useRef(runSave);
    useEffect(() => {
        runSaveRef.current = runSave;
    }, [runSave]);

    useEffect(() => {
        return () => {
            clearAutosaveTimers();
            const { isDirty: dirty, overHardLimit: wasOverLimit } = latestStateRef.current;
            if (wasOverLimit) {
                return;
            }
            if (dirty || needsFlushRef.current) {
                void runSaveRef.current({ force: true, allowDuringRealtime: true });
            }
        };
    }, [clearAutosaveTimers]);

    useEffect(() => {
        if (dataMode === 'realtime') {
            clearAutosaveTimers();
        }
        if (prevDataModeRef.current === 'realtime' && dataMode === 'offline') {
            if (needsFlushRef.current || isDirty || contentDiffersFromPersisted(content, format)) {
                void runSave({ force: true, allowDuringRealtime: true });
            }
            initialNoteFetchedRef.current = false;
        }
        prevDataModeRef.current = dataMode;
    }, [dataMode, clearAutosaveTimers, isDirty, content, format, runSave, contentDiffersFromPersisted]);

    useEffect(() => {
        if (!prevOnlineRef.current && online && !isRealtime) {
            if (needsFlushRef.current || isDirty || contentDiffersFromPersisted(content, format)) {
                void runSave({ force: true });
            }
        }
        prevOnlineRef.current = online;
    }, [online, isRealtime, isDirty, content, format, runSave, contentDiffersFromPersisted]);

    const handleContentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!canEdit) {
            return;
        }
        const next = event.target.value;
        setContent(next);
        setIsDirty(true);
        setLastError(null);
        const diffFromPersisted = contentDiffersFromPersisted(next, format);
        needsFlushRef.current = needsFlushRef.current || diffFromPersisted;
        debugLog('input-change', { mode: dataMode, length: next.length, online });
        if (shouldUseSoftSync) {
            softSync.broadcast({ content: next, format });
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
        const diffFromPersisted = contentDiffersFromPersisted(content, nextFormat);
        needsFlushRef.current = needsFlushRef.current || diffFromPersisted;
        if (shouldUseSoftSync) {
            softSync.broadcast({ content, format: nextFormat });
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
        return null;
    }, [lastError, loadError, overHardLimit]);

    const statusLabel = useMemo(() => {
        if (isRealtime) {
            return showSyncedBadge ? 'Synced' : '';
        }
        if (activeErrorMessage) {
            return activeErrorMessage;
        }
        if (!online) {
            return 'Offline — changes queued';
        }
        if (saveMutation.isPending) {
            return 'Saving...';
        }
        if (lastSavedAt) {
            return `Saved`;
        }
        if (source === 'cache' && cachedNote?.updatedAt) {
            return `Offline copy from ${dayjs(cachedNote.updatedAt).format('MMM D, HH:mm')}`;
        }
        return '';
    }, [isRealtime, showSyncedBadge, online, saveMutation.isPending, activeErrorMessage, lastSavedAt, source, cachedNote]);

    const statusTone = useMemo<'default' | 'success' | 'error' | 'warning' | 'info'>(() => {
        if (isRealtime) {
            return 'default';
        }
        if (activeErrorMessage) {
            return 'error';
        }
        if (!online) {
            return 'warning';
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
    }, [isRealtime, online, saveMutation.isPending, activeErrorMessage, lastSavedAt, source]);

    const disabled = !canEdit;

    const helperText = useMemo(() => {
        if (!online && canEdit) {
            return 'Offline — changes will sync when back online.';
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
                <BlockNoteMiniEditor
                    valueMarkdown={content}
                    readOnly={disabled}
                    onChangeMarkdown={(md) => {
                        if (!canEdit) return;
                        const canonicalNext = canonicalizeContent(md, normalizedFormat);
                        if (canonicalNext === content) {
                            return;
                        }
                        setContent(canonicalNext);
                        setIsDirty(true);
                        setLastError(null);

                        const now = Date.now();
                        const isUserDriven = now - lastLocalEditAtRef.current <= USER_INPUT_RECENT_MS;
                        if (isUserDriven) {
                            localRevisionRef.current += 1;
                            const revision = localRevisionRef.current;
                            const fingerprint = fingerprintContent(canonicalNext, normalizedFormat);
                            recentLocalHistoryRef.current.set(fingerprint, revision);
                            pruneLocalHistory(revision);
                        }

                        const diffFromPersisted = contentDiffersFromPersisted(canonicalNext, normalizedFormat);
                        needsFlushRef.current = needsFlushRef.current || diffFromPersisted;
                        debugLog('input-change', { mode: dataMode, length: canonicalNext.length, online });
                        if (shouldUseSoftSync) {
                            softSync.broadcast({ content: canonicalNext, format: normalizedFormat });
                        }
                        scheduleAutosave(canonicalNext, normalizedFormat);
                    }}
                    onImmediateInput={() => {
                        // mark last local typing time to defer remote apply
                        lastLocalEditAtRef.current = Date.now();
                    }}
                    ariaLabel={'Lesson notes editor'}
                    minHeight={220}
                />
                {helperText && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        {helperText}
                    </Typography>
                )}
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
                        icon={!isRealtime && saveMutation.isPending ? <CircularProgress size={14} color="inherit" /> : undefined}
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

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { activityEmitter } from '../services/tracking/activityEmitter';
import {
    Box,
    Typography,
    IconButton,
    Tooltip,
    FormControlLabel,
    Switch,
    Chip,
} from '@mui/material';
import type { DailyEventObjectAppMessage } from '@daily-co/daily-js';
import { useAuth } from '../context/AuthContext';
import DraggableDivider from '../components/lessonDetail/DraggableDivider';
import { useWorkspaceToggle } from '../hooks/useWorkspaceToggle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DoneIcon from "@mui/icons-material/Done";
import { useTheme, alpha } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

import { useRtc } from '../context/RtcContext';
import RtcHost from '../components/rtc/RtcHost';
import RtcErrorBanner from '../components/rtc/RtcErrorBanner';
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import CloseIcon from "@mui/icons-material/Close";
import StudentPage from "../pages/StudentPage";
import SubtitlesOutlinedIcon from "@mui/icons-material/SubtitlesOutlined";
import TranscriptionPanel from "../components/transcription/TranscriptionPanel";
import { FocusWordsProvider, useFocusWords } from "../context/FocusWordsContext";
import GridViewIcon from '@mui/icons-material/GridView';
import { useSyncedContent } from '../hooks/useSyncedContent';
import SyncedContentView from '../features/lessonContent/student/SyncedContentView';
import PresenterBar from '../components/lessonDetail/PresenterBar';
import { OpenCompositionButton } from '../components/lessonDetail/WorkZone';
import { useQuery } from '@tanstack/react-query';
import { getLessonById, getLessonContent } from '../services/api';
import type { PageModel } from '../types/lessonContent';
import NoteAltOutlinedIcon from '@mui/icons-material/NoteAltOutlined';
import { FloatingNotesPanel, LessonNotesPanel } from '../features/notes';
import useNotesOverlaySync from '../features/notes/hooks/useNotesOverlaySync';
import { getNotesUIMode } from '../features/notes/utils/modeSelectors';
import type { LessonNoteFormat } from '../types/lessonNotes';
import type { LessonNoteStatus } from '../features/notes/components/CurrentLessonNote';

interface VideoCallPageProps {
    identity?: string;
    roomName?: string;
}
const VideoCallPage: React.FC<VideoCallPageProps> = (props) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [searchParams] = useSearchParams();
    const roomName = props.roomName ||
        searchParams.get('roomName') ||
        (location.state?.roomName as string);
    const studentId = searchParams.get('studentId') ||
        (location.state?.studentId as string);

    const lessonId = roomName?.startsWith('lesson-') ? roomName.slice(7) : roomName;
    const previousPath = location.state?.from || '/dashboard';

    const { refreshJoin } = useRtc();

    // Define leave handler and RTC hooks BEFORE any early returns to preserve Hooks order
    const handleLeave = () => navigate(previousPath);

    // Bootstrap RTC join once auth user and roomName are available
    const joinRoomRef = useRef<string | null>(null);

    useEffect(() => {
        if (!user?.id || !roomName) return;

        // если зашли в другую комнату — надо заново дернуть refreshJoin
        if (joinRoomRef.current === roomName) {
            return;
        }

        joinRoomRef.current = roomName;

        const mappedRole =
            user?.role === 'tutor'
                ? 'teacher'
                : user?.role === 'student'
                    ? 'student'
                    : undefined;

        void refreshJoin({ roomName, lessonId, role: mappedRole });
    }, [user?.id, user?.role, roomName, lessonId, refreshJoin]);

    // Activity tracking for lessons: join on mount, leave on unmount/hidden
    useEffect(() => {
        if (!roomName) return;
        try { activityEmitter.emit('lesson_join', '/lesson', { roomName, lessonId }); } catch {/* no op*/}
        const onVis = () => {
            try {
                if (document.hidden) activityEmitter.emit('lesson_leave', '/lesson', { reason: 'hidden' });
                else activityEmitter.emit('lesson_join', '/lesson', { reason: 'visible' });
            } catch {/* no op*/}
        };
        document.addEventListener('visibilitychange', onVis);
        return () => {
            document.removeEventListener('visibilitychange', onVis);
            try { activityEmitter.emit('lesson_leave', '/lesson', { reason: 'unmount' }); } catch {/* no op*/}
        };
    }, [roomName, lessonId]);

    return (
        <FocusWordsProvider>
            <DailyCallLayout
                roomName={roomName ?? undefined}
                studentId={studentId ?? undefined}
                lessonId={lessonId ?? undefined}
                onLeave={handleLeave}
            />
        </FocusWordsProvider>
    );
};

/* -------------------------------------------------------------------- */
/* DailyCallLayout – overlay UI for Daily provider                      */
/* -------------------------------------------------------------------- */
const DailyCallLayout: React.FC<{
    roomName?: string;
    studentId?: string;
    lessonId?: string;
    onLeave: () => void;
}> = ({ roomName, studentId, lessonId, onLeave }) => {
    const { user } = useAuth();
    const {
        failureMessage,
        refreshJoin,
        dailyCall,
    } = useRtc();

    const [copiedDaily, setCopiedDaily] = useState(false);
    const [shareStudentProfile, setShareStudentProfile] = useState(false);
    const [studentProfileTab, setStudentProfileTab] = useState(0);
    const [sharedProfileOpen, setSharedProfileOpen] = useState(false);
    const [sharedProfileTab, setSharedProfileTab] = useState(0);
    const [sharedProfileBy, setSharedProfileBy] = useState<string | undefined>();
    const [shareLessonContent, setShareLessonContent] = useState(false);
    const [sharedContentOpen, setSharedContentOpen] = useState(false);
    const [sharedContentBy, setSharedContentBy] = useState<string | undefined>();
    // Sync commands (student side) for Daily
    const [openWordIdCmd, setOpenWordIdCmd] = useState<string | null>(null);
    const [openAssignmentIdCmd, setOpenAssignmentIdCmd] = useState<string | null>(null);
    const [openTaskIdCmd, setOpenTaskIdCmd] = useState<string | null>(null);
    const [closeAssignmentCmd, setCloseAssignmentCmd] = useState(false);
    const consumeCloseAssignmentCommand = useCallback(() => setCloseAssignmentCmd(false), []);
    const { setWordsFromRemote } = useFocusWords();
    const isTutor = user?.role === 'tutor';
    const contentSync = useSyncedContent(dailyCall, isTutor);

    // Workspace view selector: student profile or live transcription
    const [workspaceView, setWorkspaceView] = useState<'student' | 'transcription' | 'content'>('student');
    const resolvedStudentId = studentId ?? (user?.role === 'student' ? user.id : undefined);
    // Embedded StudentPage tabs when used inside StudentProfileDrawer (Overview hidden):
    const TAB_HOMEWORK = 0;
    const TAB_DICTIONARY = 1;

    // Split view for Student panel (tutor side) – reuse workspace pattern
    const [workspaceOpen, openWorkspace, closeWorkspace, splitRatio, setSplitRatio] = useWorkspaceToggle();

    const theme = useTheme();
    const isPhone = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'lg'));
    const isCompactDrawer = useMediaQuery('(max-width:1199px)');
    const isOverlayDrawer = useMediaQuery('(max-width:991px)');
    const isSmallScreen = isOverlayDrawer;

    const drawerMinWidth = isCompactDrawer ? 340 : 380;
    const drawerMaxWidth = isCompactDrawer ? 420 : 460;
    const callMinWidth = isCompactDrawer ? 520 : 640;
    const notesButtonRef = useRef<HTMLButtonElement | null>(null);
    const [notesVisible, setNotesVisible] = useState(false);
    const [noteStatus, setNoteStatus] = useState<LessonNoteStatus | null>(null);
    const [noteFormat, setNoteFormat] = useState<LessonNoteFormat>('md');

    const notesUIMode = useMemo(() => getNotesUIMode({ isPhone, isTablet }), [isPhone, isTablet]);
    const [callActive, setCallActive] = useState<boolean>(false);
    const notesDataMode = callActive ? 'realtime' : 'offline';

    const [studentSessionIdForDaily, setStudentSessionIdForDaily] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (!dailyCall) {
            setCallActive(false);
            return;
        }

        const computeState = () => {
            try {
                const state = dailyCall.meetingState?.();
                setCallActive(state === 'joined-meeting');
            } catch {
                setCallActive(false);
            }
        };

        const handleJoined = () => setCallActive(true);
        const handleLeft = () => setCallActive(false);

        computeState();

        dailyCall.on('joined-meeting', handleJoined);
        dailyCall.on('left-meeting', handleLeft);

        return () => {
            dailyCall.off('joined-meeting', handleJoined);
            dailyCall.off('left-meeting', handleLeft);
        };
    }, [dailyCall]);

    const handleRemoteOverlay = useCallback((open: boolean) => {
        if (isTutor) return;
        setNotesVisible(open);
    }, [isTutor]);

    const { broadcastOverlayState } = useNotesOverlaySync({
        call: dailyCall,
        lessonId,
        enabled: Boolean(dailyCall && lessonId),
        isTeacher: isTutor,
        onRemoteChange: handleRemoteOverlay
    });

    useEffect(() => {
        if (!isTutor || !callActive) return;
        broadcastOverlayState(notesVisible);
    }, [isTutor, callActive, notesVisible, broadcastOverlayState]);

    const handleNotesToggle = useCallback(() => {
        setNotesVisible((prev) => {
            const next = !prev;
            if (isTutor) {
                broadcastOverlayState(next);
            }
            return next;
        });
    }, [broadcastOverlayState, isTutor]);

    const handleNotesClose = useCallback(() => {
        setNotesVisible(false);
        if (isTutor) {
            broadcastOverlayState(false);
        }
    }, [broadcastOverlayState, isTutor]);

    const notesActive = Boolean(lessonId && notesVisible);

    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if (event.key.toLowerCase() !== 'n') return;
            const target = event.target as HTMLElement | null;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                return;
            }
            event.preventDefault();
            handleNotesToggle();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handleNotesToggle]);

    const workspaceHeader = useMemo(() => {
        if (workspaceView === 'transcription') return 'Live Transcript';
        if (workspaceView === 'content') return contentSync.state.title || 'Lesson content';
        return 'Student profile';
    }, [workspaceView, contentSync.state.title]);
    const workspaceTagline = useMemo(() => {
        if (workspaceView === 'content') return 'Lesson workspace';
        return 'Student insights';
    }, [workspaceView]);
    const { data: lessonDetails } = useQuery({
        queryKey: ['lesson-detail', lessonId],
        queryFn: () => getLessonById(lessonId!),
        enabled: Boolean(lessonId),
        staleTime: 60_000,
    });

    const contentId = contentSync.state.contentId;
    const notesStudentId = lessonDetails?.studentId ?? resolvedStudentId;
    const notesTeacherId = lessonDetails?.tutorId ?? (user?.role === 'tutor' ? user.id : undefined);
    const notesLessonTitle = lessonDetails?.title;
    const canEditNotes = Boolean(
        user?.id && (
            lessonDetails
                ? (user.id === lessonDetails.tutorId || user.id === lessonDetails.studentId)
                : (user?.role === 'tutor' || user?.role === 'student')
        )
    );

    const { data: presenterContent, isFetching: isPresenterContentFetching } = useQuery({
        queryKey: ['lesson-content', contentId],
        queryFn: () => {
            if (!contentId) throw new Error('Missing contentId');
            return getLessonContent(contentId);
        },
        enabled: Boolean(contentId),
        staleTime: 30_000,
    });
    const contentSections = useMemo(() => presenterContent?.layout?.sections ?? [], [presenterContent?.layout?.sections]);
    const [contentSectionIndex, setContentSectionIndex] = useState(0);
    const handleContentSelection = useCallback((content: { id: string; title?: string }) => {
        contentSync.open(content);
        setWorkspaceView('content');
        openWorkspace();
    }, [contentSync, setWorkspaceView, openWorkspace]);

    const handleContentLockToggle = useCallback(() => {
        contentSync.setScrollLock(!contentSync.state.locked);
    }, [contentSync]);

    const handleContentEnd = useCallback(() => {
        contentSync.close();
    }, [contentSync]);

    const handlePrevSection = useCallback(() => {
        if (!isTutor || !contentSections.length) return;
        setContentSectionIndex((prev) => {
            const nextIdx = Math.max(0, prev - 1);
            if (nextIdx === prev) return prev;
            const targetSection = contentSections[nextIdx];
            if (targetSection) {
                contentSync.navigate({ sectionId: targetSection.id, rowId: getFirstRowId(targetSection) });
                const firstBlockId = getFirstBlockId(targetSection);
                if (firstBlockId) contentSync.focus(firstBlockId);
            }
            return nextIdx;
        });
    }, [isTutor, contentSections, contentSync]);

    const handleNextSection = useCallback(() => {
        if (!isTutor || !contentSections.length) return;
        setContentSectionIndex((prev) => {
            const nextIdx = Math.min(contentSections.length - 1, prev + 1);
            if (nextIdx === prev) return prev;
            const targetSection = contentSections[nextIdx];
            if (targetSection) {
                contentSync.navigate({ sectionId: targetSection.id, rowId: getFirstRowId(targetSection) });
                const firstBlockId = getFirstBlockId(targetSection);
                if (firstBlockId) contentSync.focus(firstBlockId);
            }
            return nextIdx;
        });
    }, [isTutor, contentSections, contentSync]);

    const handleContentFocus = useCallback(() => {
        if (!isTutor) return;
        const currentSection = contentSections[contentSectionIndex];
        const firstBlock = currentSection ? getFirstBlockId(currentSection) : undefined;
        if (firstBlock) contentSync.focus(firstBlock);
    }, [isTutor, contentSections, contentSectionIndex, contentSync]);

    const isContentOpen = Boolean(contentSync.state.open && contentSync.state.contentId);

    useEffect(() => {
        if (!dailyCall) {
            setStudentSessionIdForDaily(undefined);
            return;
        }

        const recompute = () => {
            try {
                const parts = dailyCall.participants();
                // entries: [participantId, participant]
                const entries = Object.entries(parts)
                    .filter(([id, p]) => id !== 'local' && p && typeof p === 'object');

                // Пытаемся найти студента по user_id / user_name
                const matched = resolvedStudentId
                    ? entries.find(([_, p]: any) => p.user_id === resolvedStudentId || p.user_name === resolvedStudentId)
                    : undefined;

                const pickedId = (matched?.[0]) ?? entries[0]?.[0]; // берём participantId (ключ), не p.session_id
                setStudentSessionIdForDaily(pickedId);
            } catch (e) {
                console.warn('Failed to compute studentSessionIdForDaily', e);
                setStudentSessionIdForDaily(undefined);
            }
        };

        recompute();
        dailyCall.on('participant-joined', recompute);
        dailyCall.on('participant-updated', recompute);
        dailyCall.on('participant-left', recompute);
        return () => {
            dailyCall.off('participant-joined', recompute);
            dailyCall.off('participant-updated', recompute);
            dailyCall.off('participant-left', recompute);
        };
    }, [dailyCall, resolvedStudentId]);

    const homeworkWords = useMemo(() => [], []);

    const generateDirectLinkDaily = useCallback(() => {
        const baseUrl = window.location.origin;
        const rn = roomName ?? '';
        const sid = studentId ?? '';
        return `${baseUrl}/video-call?identity=${sid}&roomName=${rn}`;
    }, [roomName, studentId]);

    const handleCopyLinkDaily = useCallback(() => {
        navigator.clipboard.writeText(generateDirectLinkDaily());
        setCopiedDaily(true);
        setTimeout(() => setCopiedDaily(false), 3000);
    }, [generateDirectLinkDaily]);

    // Safe sender: waits for Daily to be joined before sending, to avoid "sendAppMessage() only supported after join" errors
    const sendDailyMessage = useCallback(async (payload: any) => {
        if (!dailyCall) return;
        const state = (dailyCall as any).meetingState?.() ?? undefined;
        // if already joined — send immediately
        if (state === 'joined') {
            try {
                (dailyCall as any).sendAppMessage?.(payload);
            } catch (err) {
                console.warn('Failed to send Daily appMessage (joined path)', err, payload);
            }
            return;
        }
        // otherwise, wait for a one-time joined event with a timeout
        await new Promise<void>((resolve) => {
            let done = false;
            const onJoined = () => {
                if (done) return;
                done = true;
                try { (dailyCall as any).off?.('joined-meeting', onJoined); } catch {/* no op*/}
                resolve();
            };
            try { (dailyCall as any).on?.('joined-meeting', onJoined); } catch {/* no op*/}
            // timeout safety (3s)
            setTimeout(() => {
                if (done) return;
                done = true;
                try { (dailyCall as any).off?.('joined-meeting', onJoined); } catch {/* no op*/}
                resolve();
            }, 3000);
        });
        try {
            (dailyCall as any).sendAppMessage?.(payload);
        } catch (err) {
            console.warn('Failed to send Daily appMessage after waiting for join', err, payload);
        }
    }, [dailyCall]);

    const sendStudentPanelState = useCallback(
        (open: boolean, tabOverride?: number) => {
            if (!dailyCall || !isTutor) return;
            sendDailyMessage({
                t: 'STUDENT_PANEL',
                open,
                tab: tabOverride ?? studentProfileTab,
                from: user?.name || 'Teacher',
            });
        },
        [dailyCall, isTutor, studentProfileTab, user?.name, sendDailyMessage],
    );

    const sendContentPanelState = useCallback(
        (open: boolean) => {
            if (!dailyCall || !isTutor) return;
            sendDailyMessage({
                t: 'CONTENT_PANEL',
                open,
                from: user?.name || 'Teacher',
            });
        },
        [dailyCall, isTutor, user?.name, sendDailyMessage],
    );

    // Tutor → Student sync for Live Transcription panel
    const sendTranscriptionPanelState = useCallback(
        (open: boolean) => {
            if (!dailyCall || !isTutor) return;
            sendDailyMessage({
                t: 'TRANSCRIPTION_PANEL',
                open,
                from: user?.name || 'Teacher',
            });
        },
        [dailyCall, isTutor, user?.name, sendDailyMessage],
    );

    const transcriptionShareRef = useRef(false);
    const shareTranscriptionPanel = useCallback((open: boolean) => {
        if (!isTutor) return;
        if (transcriptionShareRef.current === open) return;
        transcriptionShareRef.current = open;
        sendTranscriptionPanelState(open);
    }, [isTutor, sendTranscriptionPanelState]);

    // Keep stable references so lesson reset effect doesn't re-run when callbacks change
    const studentPanelStateRef = useRef(sendStudentPanelState);
    useEffect(() => {
        studentPanelStateRef.current = sendStudentPanelState;
    }, [sendStudentPanelState]);

    const contentPanelStateRef = useRef(sendContentPanelState);
    useEffect(() => {
        contentPanelStateRef.current = sendContentPanelState;
    }, [sendContentPanelState]);

    const transcriptionPanelStateRef = useRef(shareTranscriptionPanel);
    useEffect(() => {
        transcriptionPanelStateRef.current = shareTranscriptionPanel;
    }, [shareTranscriptionPanel]);

    useEffect(() => {
        if (!isTutor) {
            transcriptionShareRef.current = false;
        }
    }, [isTutor]);

    const handleStudentShareToggle = (value: boolean) => {
        setShareStudentProfile(value);
        if (value) {
            shareTranscriptionPanel(false);
            // ensure split view is open so teacher sees the panel too
            openWorkspace();
            sendStudentPanelState(true);
        } else {
            sendStudentPanelState(false);
        }
    };

    const handleStudentDrawerClose = () => {
        if (shareStudentProfile) {
            setShareStudentProfile(false);
            sendStudentPanelState(false);
        }
    };

    const handleStudentProfileTabChange = (tab: number) => {
        setStudentProfileTab(tab);
        if (shareStudentProfile) {
            sendStudentPanelState(true, tab);
        }
    };

    const handleContentShareToggle = useCallback((value: boolean) => {
        if (!contentSync.state.open && value) {
            return;
        }
        setShareLessonContent(value);
        if (value) {
            shareTranscriptionPanel(false);
            setWorkspaceView('content');
            openWorkspace();
            sendContentPanelState(true);
        } else {
            sendContentPanelState(false);
        }
    }, [contentSync.state.open, openWorkspace, sendContentPanelState, setWorkspaceView, shareTranscriptionPanel]);

    // Teacher → Student sync (Daily only)
    const sendWordOpenToStudent = React.useCallback(
        (wordId: string) => {
            if (!dailyCall || !isTutor) return;
            // Do not send if sharing is not enabled
            if (!shareStudentProfile) return;
            try {
                // ensure panel opens on Dictionary tab on student first (ordering)
                sendStudentPanelState(true, TAB_DICTIONARY);
                sendDailyMessage({ t: 'WORD_OPEN', wordId, from: user?.name || 'Teacher' });
            } catch (err) {
                console.warn('Failed to send WORD_OPEN via Daily', err);
            }
        },
        [dailyCall, isTutor, user?.name, sendStudentPanelState, shareStudentProfile],
    );

    const sendAssignmentOpenToStudent = React.useCallback(
        (assignment: any, preselectTaskId?: string | null) => {
            if (!dailyCall || !isTutor) return;
            // Do not send if sharing is not enabled
            if (!shareStudentProfile) return;
            try {
                // ensure Homework tab visible on student first (ordering)
                sendStudentPanelState(true, TAB_HOMEWORK);
                sendDailyMessage({
                    t: 'ASSIGNMENT_OPEN',
                    assignmentId: assignment?.id,
                    taskId: preselectTaskId ?? null,
                    from: user?.name || 'Teacher',
                });
            } catch (err) {
                console.warn('Failed to send ASSIGNMENT_OPEN via Daily', err);
            }
        },
        [dailyCall, isTutor, user?.name, sendStudentPanelState, shareStudentProfile],
    );

    const sendAssignmentCloseToStudent = useCallback(() => {
        if (!dailyCall || !isTutor || !shareStudentProfile) return;
        try {
            sendStudentPanelState(true, TAB_HOMEWORK);
            sendDailyMessage({
                t: 'ASSIGNMENT_CLOSE',
                from: user?.name || 'Teacher',
            });
        } catch (err) {
            console.warn('Failed to send ASSIGNMENT_CLOSE via Daily', err);
        }
    }, [dailyCall, isTutor, shareStudentProfile, sendStudentPanelState, user?.name]);

    const consumeWordCommand = useCallback(() => {
        setOpenWordIdCmd(null);
    }, []);

    const consumeAssignmentCommand = useCallback(() => {
        setOpenAssignmentIdCmd(null);
        setOpenTaskIdCmd(null);
    }, []);

    const sendWordCloseToStudent = React.useCallback(() => {
        if (!dailyCall || !isTutor) return;
        if (!shareStudentProfile) return; // keep behavior consistent with sharing toggle
        try {
            sendDailyMessage({ t: 'WORD_CLOSE', from: user?.name || 'Teacher' });
        } catch (err) {
            console.warn('Failed to send WORD_CLOSE via Daily', err);
        }
    }, [dailyCall, isTutor, shareStudentProfile, user?.name]);

    const sendWordPronounceToStudent = React.useCallback((wordId: string, audioUrl: string) => {
        if (!dailyCall || !isTutor) return;
        if (!shareStudentProfile) return; // keep behavior consistent with sharing toggle
        try {
            sendDailyMessage({ t: 'WORD_PRONOUNCE', wordId, audioUrl, from: user?.name || 'Teacher' });
        } catch (err) {
            console.warn('Failed to send WORD_PRONOUNCE via Daily', err);
        }
    }, [dailyCall, isTutor, shareStudentProfile, user?.name]);

    useEffect(() => {
        if (!lessonId) return;
        setNotesVisible(false);
        setShareStudentProfile(false);
        setShareLessonContent(false);
        setWorkspaceView('student');
        closeWorkspace();
        setSharedProfileOpen(false);
        setSharedProfileTab(0);
        setSharedProfileBy(undefined);
        setSharedContentOpen(false);
        setSharedContentBy(undefined);
        if (isTutor) {
            studentPanelStateRef.current?.(false);
            contentPanelStateRef.current?.(false);
            transcriptionPanelStateRef.current?.(false);
        }
    }, [
        lessonId,
        closeWorkspace,
        isTutor,
    ]);

    useEffect(() => {
        if (!dailyCall) return;

        const onAppMessage = (event: DailyEventObjectAppMessage) => {
            const msg = event?.data as any;
            if (msg?.t === 'STUDENT_PANEL' && !isTutor) {
                const shouldOpen = Boolean(msg?.open);
                setSharedProfileOpen(shouldOpen);
                if (typeof msg?.tab === 'number') {
                    setSharedProfileTab(msg.tab);
                }
                if (shouldOpen) {
                    setSharedProfileBy(msg?.from || 'Teacher');
                    if (workspaceView !== 'student') {
                        setWorkspaceView('student');
                    }
                    openWorkspace();
                } else {
                    setSharedProfileBy(undefined);
                    if (workspaceView === 'student') {
                        closeWorkspace();
                    }
                }
            } else if (msg?.t === 'WORD_OPEN' && !isTutor) {
                // Open student profile on Dictionary tab and command open word dialog
                setSharedProfileOpen(true);
                setSharedProfileTab(TAB_DICTIONARY);
                setOpenWordIdCmd(msg?.wordId || null);
                setSharedProfileBy(msg?.from || 'Teacher');
            } else if (msg?.t === 'WORD_CLOSE' && !isTutor) {
                // Close the word dialog by resetting the command
                setOpenWordIdCmd(null);
            } else if (msg?.t === 'ASSIGNMENT_OPEN' && !isTutor) {
                // Open student profile on Homework tab and command embedded assignment open
                setSharedProfileOpen(true);
                setSharedProfileTab(TAB_HOMEWORK);
                setOpenAssignmentIdCmd(msg?.assignmentId || null);
                setOpenTaskIdCmd(msg?.taskId ?? null);
                setSharedProfileBy(msg?.from || 'Teacher');
            } else if (msg?.t === 'TRANSCRIPTION_PANEL' && !isTutor) {
                const shouldOpen = Boolean(msg?.open);
            if (shouldOpen) {
                setWorkspaceView('transcription');
                openWorkspace();
            } else {
                // close only if we are currently showing transcription view to avoid disrupting other views
                setWorkspaceView((prev) => {
                        if (prev === 'transcription') {
                            closeWorkspace();
                        }
                        return prev;
                    });
                }
            } else if (msg?.t === 'FOCUS_WORDS' && !isTutor) {
                const words = Array.isArray(msg?.words) ? msg.words : [];
                const meta = msg && typeof msg.meta === 'object' ? msg.meta : undefined;
                setWordsFromRemote(words, meta);
            } else if (msg?.t === 'ASSIGNMENT_CLOSE' && !isTutor) {
                setSharedProfileOpen(true);
                setSharedProfileTab(TAB_HOMEWORK);
                setCloseAssignmentCmd(true);
                setSharedProfileBy(msg?.from || 'Teacher');
            } else if (msg?.t === 'WORD_PRONOUNCE' && !isTutor) {
                const url = typeof msg?.audioUrl === 'string' ? msg.audioUrl : '';
                if (url) {
                    try {
                        new Audio(url).play().catch((e) => console.warn('Autoplay blocked or failed', e));
                    } catch (e) {
                        console.warn('Failed to play pronunciation audio', e);
                    }
                }
            } else if (msg?.t === 'CONTENT_PANEL' && !isTutor) {
                const shouldOpen = Boolean(msg?.open);
                setSharedContentOpen(shouldOpen);
                if (shouldOpen) {
                    setWorkspaceView('content');
                    openWorkspace();
                    setSharedContentBy(msg?.from || 'Teacher');
                } else {
                    setSharedContentBy(undefined);
                }
            }
        };

        dailyCall.on('app-message', onAppMessage);
        return () => {
            dailyCall.off('app-message', onAppMessage);
        };
    }, [dailyCall, isTutor, openWorkspace, closeWorkspace, setWordsFromRemote, setWorkspaceView, setSharedContentOpen, setSharedContentBy, workspaceView]);

    useEffect(() => {
        if (!isTutor) return;
        if (shareStudentProfile && dailyCall) {
            sendStudentPanelState(true);
        }
    }, [shareStudentProfile, dailyCall, sendStudentPanelState, isTutor]);

    // Student side: mirror shared panel state into split view
    useEffect(() => {
        if (isTutor) return;
        if (sharedProfileOpen) {
            openWorkspace();
        } else if (workspaceView === 'student') {
            closeWorkspace();
        }
    }, [isTutor, sharedProfileOpen, openWorkspace, closeWorkspace, workspaceView]);

    const wasContentOpenRef = useRef(contentSync.state.open);
    const wasSharedContentOpenRef = useRef(sharedContentOpen);

    useEffect(() => {
        const nowContentOpen = contentSync.state.open;
        const prevContentOpen = wasContentOpenRef.current;
        wasContentOpenRef.current = nowContentOpen;

        if (isTutor) {
            if (nowContentOpen && !prevContentOpen) {
                shareTranscriptionPanel(false);
                if (workspaceView !== 'content') {
                    setWorkspaceView('content');
                }
                openWorkspace();
            }
            return;
        }

        const nowSharedContentOpen = sharedContentOpen && nowContentOpen;
        const prevSharedContentOpen = wasSharedContentOpenRef.current;
        wasSharedContentOpenRef.current = nowSharedContentOpen;

        if (nowSharedContentOpen && !prevSharedContentOpen) {
            shareTranscriptionPanel(false);
            if (workspaceView !== 'content') {
                setWorkspaceView('content');
            }
            openWorkspace();
        } else if (!nowSharedContentOpen && prevSharedContentOpen && workspaceView === 'content') {
            closeWorkspace();
        }
    }, [isTutor, contentSync.state.open, sharedContentOpen, workspaceView, setWorkspaceView, openWorkspace, closeWorkspace, shareTranscriptionPanel]);

    useEffect(() => {
        if (!contentSync.state.open) {
            setContentSectionIndex(0);
            if (shareLessonContent) {
                setShareLessonContent(false);
                sendContentPanelState(false);
            }
            if (!isTutor) {
                setSharedContentOpen(false);
                setSharedContentBy(undefined);
            }
            return;
        }
        if (!contentSections.length) return;
        if (contentSync.state.focusBlockId) {
            const idx = findSectionIndexByBlock(contentSections, contentSync.state.focusBlockId);
            if (idx >= 0) {
                setContentSectionIndex(idx);
                return;
            }
        }
        setContentSectionIndex((prev) => {
            if (prev < contentSections.length) return prev;
            return Math.max(0, contentSections.length - 1);
        });
    }, [contentSync.state.open, contentSync.state.focusBlockId, contentSections, shareLessonContent, sendContentPanelState, isTutor]);

    useEffect(() => {
        if (!contentSections.length) return;
        const handleNavigate = (evt: any) => {
            const detail = evt?.detail || {};
            const sectionId = detail.sectionId as string | undefined;
            if (!sectionId) return;
            const idx = findSectionIndexById(contentSections, sectionId);
            if (idx >= 0) {
                setContentSectionIndex(idx);
            }
        };
        window.addEventListener('CONTENT_NAVIGATE', handleNavigate as EventListener);
        return () => {
            window.removeEventListener('CONTENT_NAVIGATE', handleNavigate as EventListener);
        };
    }, [contentSections]);

    useEffect(() => {
        if (!isTutor) return;
        if (!dailyCall) return;
        if (shareLessonContent && contentSync.state.open) {
            sendContentPanelState(true);
        }
    }, [isTutor, dailyCall, shareLessonContent, contentSync.state.open, sendContentPanelState]);

    useEffect(() => {
        return () => {
            shareTranscriptionPanel(false);
        };
    }, [shareTranscriptionPanel]);

    const mySenderId = useMemo(() => {
        try { return dailyCall?.participants().local?.session_id || user?.id; } catch { return user?.id; }
    }, [dailyCall, user?.id]);

    const dividerWidth = 6;
    const callPanePercent = Math.max(0, Math.min(100, splitRatio));
    const drawerPercent = Math.max(0, 100 - callPanePercent);
    const showNotes = Boolean(lessonId && notesVisible);
    const notesPanelElement = showNotes && lessonId ? (
        <LessonNotesPanel
            lessonId={lessonId}
            lessonTitle={notesLessonTitle}
            studentId={notesStudentId}
            teacherId={notesTeacherId}
            canEdit={canEditNotes}
            uiMode={notesUIMode}
            dataMode={notesDataMode}
            call={notesDataMode === 'realtime' ? dailyCall : null}
            senderId={mySenderId}
            initialTab="current"
            controlledFormat={{ value: noteFormat, onChange: setNoteFormat }}
            hideStatusChip
            hideFormatControl
            hideContainerChrome={notesUIMode === 'floating'}
            onStatusChange={setNoteStatus}
            onClose={handleNotesClose}
        />
    ) : null;

    const studentHeaderAccessory = useMemo(() => {
        if (workspaceView !== 'student') return null;
        if (isTutor) {
            return (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
                    <FormControlLabel
                        control={<Switch size="small" checked={shareStudentProfile} onChange={(e) => handleStudentShareToggle(e.target.checked)} />}
                        label="Show to student"
                        sx={{ m: 0, '& .MuiFormControlLabel-label': { fontSize: 12, fontWeight: 600, letterSpacing: 0.6 } }}
                    />
                    {shareStudentProfile && (<Chip size="small" color="success" label="Sharing" sx={{ fontWeight: 600 }} />)}
                </Box>
            );
        }
        return sharedProfileBy ? (
            <Chip
                size="small"
                color="primary"
                variant="outlined"
                label={`Shared by ${sharedProfileBy}`}
                sx={{ fontWeight: 600 }}
            />
        ) : null;
    }, [workspaceView, isTutor, shareStudentProfile, sharedProfileBy, handleStudentShareToggle]);

    const gridTemplateColumns = !workspaceOpen || isSmallScreen
        ? '100%'
        : `minmax(${callMinWidth}px, ${callPanePercent}%) ${dividerWidth}px minmax(${drawerMinWidth}px, ${drawerPercent}%)`;

    const drawerSurface = (
        <Box
            sx={{
                height: '100%',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderLeft: isSmallScreen ? 0 : '1px solid',
                borderColor: 'divider',
                backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.96),
                boxShadow: isSmallScreen ? (theme) => theme.shadows[8] : 'none',
            }}
        >
            <Box
                sx={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    px: 1.5,
                    py: 1,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: 'background.paper',
                }}
            >
                <Box>
                    <Typography variant="overline" sx={{ letterSpacing: 1, color: 'primary.main' }}>{workspaceTagline}</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{workspaceHeader}</Typography>
                    {workspaceView === 'student' && !isTutor && sharedProfileBy && (
                        <Typography variant="caption" color="text.secondary">Shared by {sharedProfileBy}</Typography>
                    )}
                    {workspaceView === 'content' && !isTutor && sharedContentBy && (
                        <Typography variant="caption" color="text.secondary">Shared by {sharedContentBy}</Typography>
                    )}
                    {workspaceView === 'content' && isContentOpen && (
                        <Typography variant="caption" color="text.secondary">
                            Section {contentSectionIndex + 1}{contentSections.length ? ` of ${contentSections.length}` : ''}
                        </Typography>
                    )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {workspaceView === 'content' && (
                        isTutor ? (
                            <>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            size="small"
                                            checked={shareLessonContent}
                                            onChange={(e) => handleContentShareToggle(e.target.checked)}
                                            disabled={!isContentOpen}
                                        />
                                    }
                                    label="Show to student"
                                    sx={{ m: 0, '& .MuiFormControlLabel-label': { fontSize: 12, fontWeight: 600, letterSpacing: 0.6 } }}
                                />
                                {shareLessonContent && (<Chip size="small" color="success" label="Sharing" sx={{ fontWeight: 600 }} />)}
                            </>
                        ) : (
                            sharedContentBy ? <Chip size="small" color="primary" variant="outlined" label={`Shared by ${sharedContentBy}`} sx={{ fontWeight: 600 }} /> : null
                        )
                    )}
                    {workspaceView === 'content' && isContentOpen && (
                        <Chip size="small" color="primary" variant="outlined" label={`Section ${contentSectionIndex + 1}/${Math.max(contentSections.length, 1)}`} sx={{ fontWeight: 600 }} />
                    )}
                    <IconButton
                        onClick={() => {
                            if (workspaceView === 'student') {
                                handleStudentDrawerClose();
                            }
                            if (workspaceView === 'transcription' && isTutor) {
                                shareTranscriptionPanel(false);
                            }
                            if (workspaceView === 'content') {
                                if (isTutor && shareLessonContent) {
                                    handleContentShareToggle(false);
                                }
                                setWorkspaceView('student');
                            } else if (workspaceView === 'transcription') {
                                setWorkspaceView('student');
                            } else {
                                closeWorkspace();
                            }
                        }}
                        data-fw-action="true"
                        size="small"
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>
            </Box>
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {workspaceView === 'transcription' && (
                    <Box sx={{ flex: 1, minHeight: 0, position: 'relative', width: '100%' }}>
                        <TranscriptionPanel
                            embedded
                            call={dailyCall}
                            studentSessionId={studentSessionIdForDaily}
                            studentId={(isTutor ? studentId : resolvedStudentId) as string | undefined}
                            homeworkWords={homeworkWords}
                            lessonId={lessonId || undefined}
                        />
                    </Box>
                )}

                {workspaceView === 'student' && (
                    <Box sx={{ flex: 1, minHeight: 0, width: '100%', overflow: 'auto', p: 1.5 }}>
                        {(isTutor ? !!studentId : !!resolvedStudentId) ? (
                            <StudentPage
                                studentIdOverride={(isTutor ? studentId : resolvedStudentId) as string}
                                embedded
                                hideOverviewTab
                                headerAccessory={studentHeaderAccessory}
                                activeTabOverride={isTutor ? studentProfileTab : sharedProfileTab}
                                onTabChange={isTutor ? handleStudentProfileTabChange : undefined}
                                onWordPronounce={isTutor ? sendWordPronounceToStudent : undefined}
                                openWordId={isTutor ? undefined : openWordIdCmd}
                                onConsumeOpenWordCommand={isTutor ? sendWordCloseToStudent : consumeWordCommand}
                                autoOpenAssignmentId={isTutor ? undefined : openAssignmentIdCmd}
                                autoOpenTaskId={isTutor ? undefined : openTaskIdCmd}
                                onConsumeOpenAssignmentCommand={isTutor ? undefined : consumeAssignmentCommand}
                                onWordOpen={isTutor ? sendWordOpenToStudent : undefined}
                                onEmbeddedAssignmentOpen={isTutor ? sendAssignmentOpenToStudent : undefined}
                                onEmbeddedAssignmentClose={isTutor ? sendAssignmentCloseToStudent : undefined}
                                closeEmbeddedAssignment={isTutor ? undefined : closeAssignmentCmd}
                                onConsumeCloseEmbeddedAssignment={isTutor ? undefined : consumeCloseAssignmentCommand}
                            />
                        ) : (
                            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Typography color="text.secondary">No student selected.</Typography>
                            </Box>
                        )}
                    </Box>
                )}

                {workspaceView === 'content' && (
                    <Box sx={{ flex: 1, minHeight: 0, width: '100%', display: 'flex', flexDirection: 'column' }}>
                        {isTutor && (
                            <Box sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                                <OpenCompositionButton onOpen={handleContentSelection} />
                            </Box>
                        )}
                        {isTutor && isContentOpen && (
                            <PresenterBar
                                content={{ id: contentSync.state.contentId as string, title: contentSync.state.title }}
                                onPrevSection={handlePrevSection}
                                onNextSection={handleNextSection}
                                onLockToggle={handleContentLockToggle}
                                locked={!!contentSync.state.locked}
                                onEnd={handleContentEnd}
                                onFocus={handleContentFocus}
                            />
                        )}
                        <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', bgcolor: 'background.paper' }}>
                            {isPresenterContentFetching && (
                                <Box sx={{ p: 2 }}>
                                    <Typography variant="body2" color="text.secondary">Loading content…</Typography>
                                </Box>
                            )}
                            {isContentOpen ? (
                                <SyncedContentView
                                    contentId={contentSync.state.contentId as string}
                                    focusBlockId={contentSync.state.focusBlockId}
                                    locked={!!contentSync.state.locked && !isTutor}
                                    contentSync={{ call: dailyCall, isTutor, contentId: contentSync.state.contentId as string, controller: contentSync }}
                                />
                            ) : (!isTutor && contentSync.state.open ? null : (
                                <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
                                    <Typography color="text.secondary">
                                        {isTutor ? 'Select lesson materials to present.' : 'Waiting for the teacher to start the presentation.'}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                )}
            </Box>
        </Box>
    );

    const mainStage = (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns,
                gridTemplateRows: '100%',
                height: '100%',
                position: 'relative'
            }}
            data-workspace-grid="true"
        >
            <Box sx={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
                <RtcHost onLeft={onLeave} />
            </Box>
            {workspaceOpen && !isSmallScreen && (
                <>
                    <DraggableDivider onDrag={setSplitRatio} />
                    {drawerSurface}
                </>
            )}
            {workspaceOpen && isSmallScreen && (
                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 20,
                        backgroundColor: 'rgba(9, 9, 12, 0.55)',
                        display: 'flex',
                        justifyContent: 'flex-end'
                    }}
                    onClick={closeWorkspace}
                >
                    <Box
                        sx={{ width: 'min(420px, 100%)', height: '100%' }}
                        onClick={(event) => event.stopPropagation()}
                    >
                        {drawerSurface}
                    </Box>
                </Box>
            )}
        </Box>
    );

    let callAndNotesLayout: React.ReactNode;
    if (!lessonId) {
        callAndNotesLayout = mainStage;
    } else if (notesUIMode === 'docked-bottom') {
        callAndNotesLayout = (
            <Box sx={{ display: 'grid', gridTemplateRows: '1fr minmax(32vh, 45vh)', height: '100%' }}>
                <Box sx={{ minHeight: 0, overflow: 'hidden' }}>{mainStage}</Box>
                {notesPanelElement ? (
                    <Box
                        sx={{
                            minHeight: 0,
                            borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                            backgroundColor: 'background.paper',
                            paddingBottom: 'env(safe-area-inset-bottom)'
                        }}
                    >
                        {notesPanelElement}
                    </Box>
                ) : null}
            </Box>
        );
    } else if (notesUIMode === 'docked-side') {
        callAndNotesLayout = (
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: notesPanelElement ? '1fr minmax(420px, 480px)' : '1fr',
                    height: '100%'
                }}
            >
                <Box sx={{ minWidth: 0, minHeight: 0, overflow: 'hidden' }}>{mainStage}</Box>
                {notesPanelElement ? (
                    <Box sx={{ minHeight: 0, backgroundColor: 'background.paper', borderLeft: (theme) => `1px solid ${theme.palette.divider}` }}>
                        {notesPanelElement}
                    </Box>
                ) : null}
            </Box>
        );
    } else {
        callAndNotesLayout = (
            <>
                {mainStage}
                {notesPanelElement && lessonId ? (
                    <FloatingNotesPanel lessonId={lessonId} onClose={handleNotesClose}>
                        {notesPanelElement}
                    </FloatingNotesPanel>
                ) : null}
            </>
        );
    }

    return (
        <Box sx={{ width: '100%', height: '100vh', overflow: 'hidden', position: 'relative' }}>
            {!!failureMessage && (
                <RtcErrorBanner
                    message={failureMessage}
                    onRetry={() => refreshJoin()}
                />
            )}
            {isTutor && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 48,
                        right: 'auto',
                        left: 8,
                        zIndex: 1000,
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        borderRadius: '50%',
                        padding: '4px',
                    }}
                >
                    {!copiedDaily ? (
                        <Tooltip title="Copy direct link to this video call">
                            <IconButton
                                onClick={handleCopyLinkDaily}
                                color="primary"
                                size="small"
                            >
                                <ContentCopyIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    ) : (
                        <Tooltip title="Copied!">
                            <IconButton color="success" size="small">
                                <DoneIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            )}
            {isTutor && (
                <Tooltip title={shareStudentProfile ? 'Sharing student profile' : 'Open student profile'}>
                    <IconButton
                        onClick={() => {
                            if (isTutor) {
                                shareTranscriptionPanel(false);
                            }
                            setWorkspaceView('student');
                            openWorkspace();
                        }}
                        sx={{
                            position: 'absolute',
                            top: 100,
                            left: 8,
                            right: 'auto',
                            zIndex: 1000,
                            bgcolor: shareStudentProfile ? 'success.main' : 'primary.main',
                            color: 'white',
                            '&:hover': { bgcolor: shareStudentProfile ? 'success.dark' : 'primary.dark' },
                            boxShadow: (theme) => theme.shadows[2],
                            border: '1px solid',
                            borderColor: 'divider',
                        }}
                        aria-label="Open student profile"
                        aria-pressed={workspaceOpen && workspaceView==='student'}
                    >
                        <PersonRoundedIcon />
                    </IconButton>
                </Tooltip>
            )}
            {isTutor && (
                <Tooltip title={studentSessionIdForDaily ? "Live Transcript" : "Waiting for student to join…"}>
                    <span>
                        <IconButton
                            onClick={() => {
                                setWorkspaceView('transcription');
                                openWorkspace();
                                if (isTutor) {
                                    shareTranscriptionPanel(true);
                                }
                            }}
                            sx={{
                                position: 'absolute',
                                top: 155,
                                left: 8,
                                right: 'auto',
                                zIndex: 1000,
                                bgcolor: 'primary.main',
                                color: 'white',
                                '&:hover': { bgcolor: 'primary.dark' },
                                boxShadow: (theme) => theme.shadows[6],
                            }}
                            aria-label="Open live transcript"
                            aria-pressed={workspaceOpen && workspaceView==='transcription'}
                        >
                            <SubtitlesOutlinedIcon />
                        </IconButton>
                    </span>
                </Tooltip>
            )}
            {isTutor && (
                <Tooltip title={shareLessonContent ? 'Showing lesson content to student' : (contentSync.state.open ? 'Lesson content ready to share' : 'Open lesson content')}>
                    <span>
                        <IconButton
                            onClick={() => {
                                if (isTutor) {
                                    shareTranscriptionPanel(false);
                                }
                                setWorkspaceView('content');
                                openWorkspace();
                            }}
                            sx={{
                                position: 'absolute',
                                top: 210,
                                left: 8,
                                right: 'auto',
                                zIndex: 1000,
                                bgcolor: shareLessonContent ? 'success.main' : (workspaceView === 'content' ? 'primary.main' : 'primary.light'),
                                color: shareLessonContent || workspaceView === 'content' ? 'common.white' : 'primary.main',
                                '&:hover': { bgcolor: shareLessonContent ? 'success.dark' : (workspaceView === 'content' ? 'primary.dark' : 'primary.main'), color: 'common.white' },
                                boxShadow: (theme) => theme.shadows[4],
                                border: '1px solid',
                                borderColor: 'divider',
                            }}
                            aria-label="Open lesson content"
                            aria-pressed={workspaceOpen && workspaceView==='content'}
                        >
                            <GridViewIcon />
                        </IconButton>
                    </span>
                </Tooltip>
            )}

            <Tooltip title="Lesson notes">
                <IconButton
                    ref={notesButtonRef}
                    onClick={handleNotesToggle}
                    sx={{
                        position: 'absolute',
                        top: isTutor ? 265 : 100,
                        left: 8,
                        right: 'auto',
                        zIndex: 1000,
                        bgcolor: notesActive ? 'primary.main' : 'primary.light',
                        color: notesActive ? 'common.white' : 'primary.main',
                        '&:hover': { bgcolor: 'primary.main', color: 'common.white' },
                        boxShadow: (theme) => theme.shadows[4],
                        border: '1px solid',
                        borderColor: 'divider',
                    }}
                    aria-label="Toggle lesson notes"
                    aria-pressed={notesActive}
                >
                    <NoteAltOutlinedIcon />
                </IconButton>
            </Tooltip>

            {callAndNotesLayout}

        </Box>
    );
};

export default VideoCallPage;

type LessonSection = PageModel['sections'][number];

function getFirstRowId(section?: LessonSection) {
    if (!section || !Array.isArray(section.rows) || section.rows.length === 0) return undefined;
    return section.rows[0]?.id;
}

function getFirstBlockId(section?: LessonSection): string | undefined {
    if (!section) return undefined;
    for (const row of section.rows ?? []) {
        for (const column of row.columns ?? []) {
            const block = column.blocks?.[0];
            if (block?.id) return block.id;
        }
    }
    return undefined;
}

function findSectionIndexById(sections: LessonSection[], sectionId?: string) {
    if (!sectionId) return -1;
    return sections.findIndex((section) => section.id === sectionId);
}

function findSectionIndexByBlock(sections: LessonSection[], blockId?: string) {
    if (!blockId) return -1;
    for (let i = 0; i < sections.length; i += 1) {
        const section = sections[i];
        for (const row of section.rows ?? []) {
            for (const column of row.columns ?? []) {
                if (column.blocks?.some((block) => block.id === blockId)) {
                    return i;
                }
            }
        }
    }
    return -1;
}

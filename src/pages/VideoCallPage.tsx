import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
    Box,
    Typography,
    IconButton,
    Tooltip,
    FormControlLabel,
    Switch,
    Chip,
} from '@mui/material';
import '@livekit/components-styles';
import type { DailyEventObjectAppMessage } from '@daily-co/daily-js';
import { useAuth } from '../context/AuthContext';
import DraggableDivider from '../components/lessonDetail/DraggableDivider';
import { useWorkspaceToggle } from '../hooks/useWorkspaceToggle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DoneIcon from "@mui/icons-material/Done";
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

import '../styles/livekit-custom.css';
import { useRtc } from '../context/RtcContext';
import RtcHost from '../components/rtc/RtcHost';
import RtcErrorBanner from '../components/rtc/RtcErrorBanner';
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import CloseIcon from "@mui/icons-material/Close";
import StudentPage from "../pages/StudentPage";
import SubtitlesOutlinedIcon from "@mui/icons-material/SubtitlesOutlined";
import TranscriptionPanel from "../components/transcription/TranscriptionPanel";
import { FocusWordsProvider } from "../context/FocusWordsContext";

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
    useEffect(() => {
        if (!user?.id || !roomName) return;
        if (joinStartedRef.current) return;
        joinStartedRef.current = true;

        const mappedRole =
            user?.role === 'tutor' ? 'teacher'
                : user?.role === 'student' ? 'student'
                    : undefined;

        // Pass explicit hint so context doesn't depend solely on the URL query
        void refreshJoin({ roomName, lessonId, role: mappedRole });
    }, [user?.id, user?.role, roomName, lessonId, refreshJoin]);

    const joinStartedRef = useRef(false);

    return (
        <FocusWordsProvider>
            <DailyCallLayout
                roomName={roomName ?? undefined}
                studentId={studentId ?? undefined}
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
    onLeave: () => void;
}> = ({ roomName, studentId, onLeave }) => {
    const { user } = useAuth();
    const {
        failureMessage,
        canFallbackToLiveKit,
        refreshJoin,
        forceFallbackToLiveKit,
        dailyCall,
    } = useRtc();

    const [copiedDaily, setCopiedDaily] = useState(false);
    const [studentProfileOpen, setStudentProfileOpen] = useState(false);
    const [shareStudentProfile, setShareStudentProfile] = useState(false);
    const [studentProfileTab, setStudentProfileTab] = useState(0);
    const [sharedProfileOpen, setSharedProfileOpen] = useState(false);
    const [sharedProfileTab, setSharedProfileTab] = useState(0);
    const [sharedProfileBy, setSharedProfileBy] = useState<string | undefined>();
    // Sync commands (student side) for Daily
    const [openWordIdCmd, setOpenWordIdCmd] = useState<string | null>(null);
    const [openAssignmentIdCmd, setOpenAssignmentIdCmd] = useState<string | null>(null);
    const [openTaskIdCmd, setOpenTaskIdCmd] = useState<string | null>(null);

    // Workspace view selector: student profile or live transcription
    const [workspaceView, setWorkspaceView] = useState<'student' | 'transcription'>('student');

    const isTutor = user?.role === 'tutor';
    const resolvedStudentId = studentId ?? (user?.role === 'student' ? user.id : undefined);
    // Embedded StudentPage tabs when used inside StudentProfileDrawer (Overview hidden):
    const TAB_HOMEWORK = 0;
    const TAB_DICTIONARY = 1;

    // Split view for Student panel (tutor side) – reuse workspace pattern
    const [workspaceOpen, openWorkspace, closeWorkspace, splitRatio, setSplitRatio] = useWorkspaceToggle();

    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

    const [studentSessionIdForDaily, setStudentSessionIdForDaily] = useState<string | undefined>(undefined);

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

    const homeworkWords = useMemo(() => ['because', 'really', 'tomorrow', 'homework'], []);

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

    const sendStudentPanelState = useCallback(
        (open: boolean, tabOverride?: number) => {
            if (!dailyCall || !isTutor) return;
            try {
                dailyCall.sendAppMessage({
                    t: 'STUDENT_PANEL',
                    open,
                    tab: tabOverride ?? studentProfileTab,
                    from: user?.name || 'Teacher',
                });
            } catch (err) {
                console.warn('Failed to share student profile via Daily', err);
            }
        },
        [dailyCall, isTutor, studentProfileTab, user?.name],
    );

    // Tutor → Student sync for Live Transcription panel
    const sendTranscriptionPanelState = useCallback(
        (open: boolean) => {
            if (!dailyCall || !isTutor) return;
            try {
                dailyCall.sendAppMessage({
                    t: 'TRANSCRIPTION_PANEL',
                    open,
                    from: user?.name || 'Teacher',
                });
            } catch (err) {
                console.warn('Failed to share transcription panel via Daily', err);
            }
        },
        [dailyCall, isTutor, user?.name],
    );

    const handleStudentShareToggle = (value: boolean) => {
        setShareStudentProfile(value);
        if (value) {
            // ensure split view is open so teacher sees the panel too
            openWorkspace();
            sendStudentPanelState(true);
        } else {
            sendStudentPanelState(false);
        }
    };

    const handleStudentDrawerClose = () => {
        setStudentProfileOpen(false);
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

    // Teacher → Student sync (Daily only)
    const sendWordOpenToStudent = React.useCallback(
        (wordId: string) => {
            if (!dailyCall || !isTutor) return;
            // Do not send if sharing is not enabled
            if (!shareStudentProfile) return;
            try {
                // ensure panel opens on Dictionary tab on student first (ordering)
                sendStudentPanelState(true, TAB_DICTIONARY);
                dailyCall.sendAppMessage({ t: 'WORD_OPEN', wordId, from: user?.name || 'Teacher' });
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
                dailyCall.sendAppMessage({
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
                } else {
                    setSharedProfileBy(undefined);
                }
            } else if (msg?.t === 'WORD_OPEN' && !isTutor) {
                // Open student profile on Dictionary tab and command open word dialog
                setSharedProfileOpen(true);
                setSharedProfileTab(TAB_DICTIONARY);
                setOpenWordIdCmd(msg?.wordId || null);
                setSharedProfileBy(msg?.from || 'Teacher');
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
            }
        };

        dailyCall.on('app-message', onAppMessage);
        return () => {
            dailyCall.off('app-message', onAppMessage);
        };
    }, [dailyCall, isTutor]);

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
        } else {
            closeWorkspace();
        }
    }, [isTutor, sharedProfileOpen, openWorkspace, closeWorkspace]);

    return (
        <Box sx={{ width: '100%', height: '100vh', overflow: 'hidden', position: 'relative' }}>
            {!!failureMessage && (
                <RtcErrorBanner
                    message={failureMessage}
                    canFallback={canFallbackToLiveKit}
                    onRetry={() => refreshJoin()}
                    onFallback={() => forceFallbackToLiveKit()}
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
            {isTutor && studentId && (
                <Tooltip title={shareStudentProfile ? 'Sharing student profile' : 'Open student profile'}>
                    <IconButton
                        onClick={() => { setWorkspaceView('student'); openWorkspace(); }}
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
                            onClick={() => { setWorkspaceView('transcription'); openWorkspace(); if (isTutor) { sendTranscriptionPanelState(true); } }}
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


            <Box sx={{ display: 'grid', gridTemplateColumns: !workspaceOpen || isSmallScreen ? '100%' : `${splitRatio}% 6px 1fr`, gridTemplateRows: '100%', height: '100%' }}>
                            <Box sx={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
                                <RtcHost onLeft={onLeave} />
                            </Box>
                            {workspaceOpen && !isSmallScreen && (
                                <DraggableDivider onDrag={setSplitRatio} />
                            )}
                            {workspaceOpen && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', borderLeft: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                                        <Box>
                                            <Typography variant="overline" sx={{ letterSpacing: 1, color: 'primary.main' }}>Student insights</Typography>
                                            <Typography variant="h6" sx={{ fontWeight: 700 }}>{workspaceView === 'transcription' ? 'Live Transcript' : 'Student profile'}</Typography>
                                        </Box>
                                        <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                                            {workspaceView === 'student' && (
                                                isTutor ? (
                                                    <>
                                                        <FormControlLabel control={<Switch size="small" checked={shareStudentProfile} onChange={(e)=>handleStudentShareToggle(e.target.checked)} />} label="Show to student" sx={{ m:0, '& .MuiFormControlLabel-label': { fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 } }} />
                                                        {shareStudentProfile && (<Chip size="small" color="success" label="Sharing" sx={{ fontWeight: 600 }} />)}
                                                    </>
                                                ) : (
                                                    sharedProfileBy ? <Chip size="small" color="primary" variant="outlined" label={`Shared by ${sharedProfileBy}`} sx={{ fontWeight: 600 }} /> : null
                                                )
                                            )}
                                            <IconButton onClick={()=>{ if (workspaceView==='student') { handleStudentDrawerClose(); } if (workspaceView==='transcription' && isTutor) { sendTranscriptionPanelState(false); } closeWorkspace(); }} size="small"><CloseIcon /></IconButton>
                                        </Box>
                                    </Box>
                                    {workspaceView === 'transcription' ? (
                                        <Box sx={{ flex:1, overflow:'auto' }}>
                                            <TranscriptionPanel
                                                embedded
                                                call={dailyCall}
                                                studentSessionId={studentSessionIdForDaily}
                                                studentId={(isTutor ? studentId : resolvedStudentId) as string | undefined}
                                                homeworkWords={homeworkWords}
                                            />
                                        </Box>
                                    ) : (
                                        <Box sx={{ flex:1, overflow:'auto', p: 1.5 }}>
                                            {(isTutor ? !!studentId : !!resolvedStudentId) ? (
                                                <StudentPage
                                                    studentIdOverride={(isTutor ? studentId : resolvedStudentId) as string}
                                                    embedded
                                                    hideOverviewTab
                                                    activeTabOverride={studentProfileTab}
                                                    onTabChange={handleStudentProfileTabChange}
                                                    onWordOpen={isTutor ? sendWordOpenToStudent : undefined}
                                                    onEmbeddedAssignmentOpen={isTutor ? sendAssignmentOpenToStudent : undefined}
                                                />
                                            ) : (
                                                <Box sx={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                                    <Typography color="text.secondary">No student selected.</Typography>
                                                </Box>
                                            )}
                                        </Box>
                                    )}
                                </Box>
                            )}
                        </Box>

        </Box>
    );
};

export default VideoCallPage;

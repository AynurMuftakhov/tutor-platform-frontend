import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Typography, Button, CircularProgress, IconButton, Tooltip, Alert, FormControlLabel, Switch, Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useRtc } from '../../context/RtcContext';
import RtcHost from '../../components/rtc/RtcHost';
import RtcErrorBanner from '../../components/rtc/RtcErrorBanner';
import WorkZone from '../../components/lessonDetail/WorkZone';
import DraggableDivider from '../../components/lessonDetail/DraggableDivider';
import StudentProfileDrawer from '../../components/videoCall/StudentProfileDrawer';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import MicIcon from '@mui/icons-material/Mic';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DoneIcon from '@mui/icons-material/Done';
import { WorkspaceProvider } from '../../context/WorkspaceContext';
import { useWorkspaceToggle } from '../../hooks/useWorkspaceToggle';
import { useWorkspaceSyncDaily } from '../../hooks/useWorkspaceSyncDaily';
import { useSyncedVideoDaily } from '../../hooks/useSyncedVideoDaily';
import { useSyncedContentDaily } from '../../hooks/useSyncedContentDaily';
import { useSyncedGrammarDaily } from '../../hooks/useSyncedGrammarDaily';
import {useAuth} from "../../context/AuthContext";

// Note: This component enhances the existing Daily call layout by adding support
// for the collaborative workspace (materials, grammar, content) previously
// available only in LiveKit rooms. It uses custom hooks to synchronize
// workspace state and media actions over Daily's app-message API.

interface DailyCallLayoutProps {
    roomName?: string;
    studentId?: string;
    onLeave: () => void;
}

const DailyCallLayout: React.FC<DailyCallLayoutProps> = ({ roomName, studentId, onLeave }) => {
    const { user } = useAuth();
    const {
        failureMessage,
        canFallbackToLiveKit,
        refreshJoin,
        forceFallbackToLiveKit,
        dailyCall,
    } = useRtc();

    // Derive a lessonId from the roomName (mirror LiveKit convention)
    const lessonId = roomName?.startsWith('lesson-') ? roomName.slice(7) : roomName;

    const [copied, setCopied] = useState(false);
    const [showUnmutePrompt, setShowUnmutePrompt] = useState(false);
    const [studentProfileOpen, setStudentProfileOpen] = useState(false);
    const [shareStudentProfile, setShareStudentProfile] = useState(false);
    const [studentProfileTab, setStudentProfileTab] = useState(0);
    const [sharedProfileOpen, setSharedProfileOpen] = useState(false);
    const [sharedProfileTab, setSharedProfileTab] = useState(0);
    const [sharedProfileBy, setSharedProfileBy] = useState<string | undefined>();
    const [openWordIdCmd, setOpenWordIdCmd] = useState<string | null>(null);
    const [openAssignmentIdCmd, setOpenAssignmentIdCmd] = useState<string | null>(null);
    const [openTaskIdCmd, setOpenTaskIdCmd] = useState<string | null>(null);

    const isTutor = user?.role === 'tutor';
    // Resolve student identity: tutor sees provided studentId; student sees self
    const resolvedStudentId = studentId ?? (user?.role === 'student' ? user.id : undefined);

    // Workspace state & sync: separate from student profile
    const [workspaceOpen, openWorkspace, closeWorkspace, splitRatio, setSplitRatio] = useWorkspaceToggle();
    useWorkspaceSyncDaily(dailyCall, isTutor, workspaceOpen, openWorkspace, closeWorkspace);

    // Synced hooks for materials, grammar and content
    const syncedVideo = useSyncedVideoDaily(dailyCall, isTutor, workspaceOpen, openWorkspace);
    const syncedContent = useSyncedContentDaily(dailyCall, isTutor);
    const syncedGrammar = useSyncedGrammarDaily(dailyCall, isTutor, workspaceOpen, openWorkspace);

    // Theme helpers to hide workspace on small screens
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

    // Copy direct link for the call
    const generateDirectLink = () => {
        const baseUrl = window.location.origin;
        return `${baseUrl}/video-call?identity=${studentId}&roomName=${roomName}`;
    };
    const handleCopyLink = () => {
        navigator.clipboard.writeText(generateDirectLink());
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };

    // Ask student to unmute via Daily app-message; targeted if possible
    const requestStudentUnmute = useCallback(() => {
        if (!dailyCall || !isTutor) return;
        const payload = {
            t: 'REQUEST_UNMUTE',
            from: user?.name || 'Teacher',
            to: resolvedStudentId,
        };
        try {
            dailyCall.sendAppMessage(payload);
        } catch (e) {
            console.warn('Failed to send unmute request', e);
        }
    }, [dailyCall, isTutor, user?.name, resolvedStudentId]);

    // Student accepts unmute request; enable local audio
    const enableMicLocal = async () => {
        if (!dailyCall) return;
        try {
            await dailyCall.setLocalAudio(true);
        } catch (e) {
            console.warn('Failed to unmute microphone', e);
        }
        setShowUnmutePrompt(false);
    };

    // Student profile sync via Daily app-message
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

    const handleStudentShareToggle = (value: boolean) => {
        setShareStudentProfile(value);
        if (value) {
            if (!studentProfileOpen) {
                setStudentProfileOpen(true);
            }
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

    // Listen for incoming Daily app messages
    useEffect(() => {
        if (!dailyCall) return;
        const onAppMessage = (event: any) => {
            const msg = event?.data as any;
            if (!msg) return;
            if (msg.t === 'STUDENT_PANEL' && !isTutor) {
                const shouldOpen = Boolean(msg.open);
                setSharedProfileOpen(shouldOpen);
                if (typeof msg.tab === 'number') {
                    setSharedProfileTab(msg.tab);
                }
                if (shouldOpen) {
                    setSharedProfileBy(msg.from || 'Teacher');
                } else {
                    setSharedProfileBy(undefined);
                }
            } else if (msg.t === 'WORD_OPEN' && !isTutor) {
                setSharedProfileOpen(true);
                setSharedProfileTab(1); // dictionary tab
                setOpenWordIdCmd(msg.wordId || null);
                setSharedProfileBy(msg.from || 'Teacher');
            } else if (msg.t === 'ASSIGNMENT_OPEN' && !isTutor) {
                setSharedProfileOpen(true);
                setSharedProfileTab(0); // homework tab
                setOpenAssignmentIdCmd(msg.assignmentId || null);
                setOpenTaskIdCmd(msg.taskId ?? null);
                setSharedProfileBy(msg.from || 'Teacher');
            } else if (msg.t === 'REQUEST_UNMUTE' && !isTutor) {
                // Tutor has requested student to unmute
                setShowUnmutePrompt(true);
            } else if (msg.t === 'WORKSPACE_SYNC') {
                // ignore here; handled by useWorkspaceSyncDaily
            } else {
                // other messages (e.g. MATERIAL_SYNC, CONTENT_SYNC, GRAMMAR_SYNC)
                // are handled by the respective hooks
            }
        };
        dailyCall.on('app-message', onAppMessage);
        return () => {
            dailyCall.off('app-message', onAppMessage);
        };
    }, [dailyCall, isTutor]);

    // When tutor toggles shareStudentProfile, publish state
    useEffect(() => {
        if (!isTutor) return;
        if (shareStudentProfile && dailyCall) {
            sendStudentPanelState(true);
        }
    }, [shareStudentProfile, dailyCall, sendStudentPanelState, isTutor]);

    // Students mirror shared profile state into workspace (open/close)
    useEffect(() => {
        if (isTutor) return;
        if (sharedProfileOpen) {
            // open workspace to show content (not student profile, but materials) remains separate
        } else {
            // nothing
        }
    }, [isTutor, sharedProfileOpen]);

    return (
        <WorkspaceProvider>
            <Box
                sx={{
                    width: '100%',
                    height: '100vh',
                    overflow: 'hidden',
                    position: 'relative',
                }}
            >
                {!!failureMessage && (
                    <RtcErrorBanner
                        message={failureMessage}
                        canFallback={canFallbackToLiveKit}
                        onRetry={() => refreshJoin()}
                        onFallback={() => forceFallbackToLiveKit()}
                    />
                )}
                {/* Overlay buttons: copy link, open workspace, ask unmute, open student profile */}
                {isTutor && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 8,
                            left: 8,
                            zIndex: 1000,
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            borderRadius: '50%',
                            padding: '4px',
                        }}
                    >
                        {!copied ? (
                            <Tooltip title="Copy direct link to this video call">
                                <IconButton onClick={handleCopyLink} color="primary" size="small">
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
                {/* Open materials button (tutor only) */}
                {!workspaceOpen && isTutor && (
                    <Tooltip title="Open materials">
                        <IconButton
                            onClick={openWorkspace}
                            sx={{
                                position: 'absolute',
                                top: 64,
                                left: 8,
                                zIndex: 1000,
                                bgcolor: 'primary.main',
                                color: 'white',
                                '&:hover': { bgcolor: 'primary.dark' },
                            }}
                            aria-label="Open workspace"
                        >
                            <LibraryBooksIcon />
                        </IconButton>
                    </Tooltip>
                )}
                {/* Ask student to unmute button (tutor only) */}
                {isTutor && (
                    <Tooltip title="Ask student to unmute">
                        <IconButton
                            onClick={requestStudentUnmute}
                            sx={{
                                position: 'absolute',
                                top: workspaceOpen ? 126 : 126,
                                left: 8,
                                zIndex: 1000,
                                bgcolor: 'primary.main',
                                color: 'white',
                                '&:hover': { bgcolor: 'primary.dark' },
                            }}
                            aria-label="Request unmute"
                        >
                            <MicIcon />
                        </IconButton>
                    </Tooltip>
                )}
                {/* Open student profile button (tutor only) */}
                {isTutor && studentId && (
                    <Tooltip title={shareStudentProfile ? 'Sharing student profile' : 'Open student profile'}>
                        <IconButton
                            onClick={() => setStudentProfileOpen(true)}
                            sx={{
                                position: 'absolute',
                                top: workspaceOpen ? 188 : 188,
                                left: 8,
                                zIndex: 1000,
                                bgcolor: shareStudentProfile ? 'success.main' : 'primary.main',
                                color: 'white',
                                '&:hover': { bgcolor: shareStudentProfile ? 'success.dark' : 'primary.dark' },
                                boxShadow: (theme) => theme.shadows[6],
                            }}
                            aria-label="Open student profile"
                            aria-pressed={studentProfileOpen}
                        >
                            <PersonRoundedIcon />
                        </IconButton>
                    </Tooltip>
                )}
                {/* Main grid layout: video conference on left, workspace on right */}
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: !workspaceOpen || isSmallScreen ? '100%' : `${splitRatio}% 6px 1fr`,
                        gridTemplateRows: '100%',
                        height: '100%',
                        overflow: 'hidden',
                        position: 'relative',
                    }}
                >
                    {/* Video conference area */}
                    <Box
                        sx={{
                            height: '100%',
                            minWidth: 280,
                            overflow: 'hidden',
                            position: 'relative',
                        }}
                    >
                        {/* RtcHost renders the call UI for Daily */}
                        <RtcHost onLeft={onLeave} />
                        {/* Student side: show unmute prompt when tutor requests */}
                        {!isTutor && showUnmutePrompt && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: 8,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    zIndex: 1200,
                                    maxWidth: 520,
                                    width: 'calc(100% - 16px)',
                                }}
                            >
                                <Alert
                                    severity="info"
                                    variant="filled"
                                    sx={{ display: 'flex', alignItems: 'center' }}
                                    action={
                                        <Button color="inherit" size="small" onClick={enableMicLocal}>
                                            Unmute now
                                        </Button>
                                    }
                                >
                                    Your teacher asked you to unmute your microphone. Click “Unmute now” to start speaking.
                                </Alert>
                            </Box>
                        )}
                    </Box>
                    {/* Draggable divider between video and workspace */}
                    {workspaceOpen && !isSmallScreen && <DraggableDivider onDrag={setSplitRatio} />}
                    {/* Workspace area */}
                    {workspaceOpen && (
                        <Box sx={{ height: '100%', overflow: 'hidden' }}>
                            <WorkZone
                                useSyncedVideo={syncedVideo}
                                useSyncedGrammar={syncedGrammar}
                                useSyncedContent={syncedContent}
                                onClose={closeWorkspace}
                                lessonId={lessonId || ''}
                                room={undefined as any}
                            />
                        </Box>
                    )}
                    {/* Student profile drawer for tutor */}
                    {isTutor && studentId && (
                        <StudentProfileDrawer
                            open={studentProfileOpen}
                            onClose={handleStudentDrawerClose}
                            studentId={studentId}
                            showShareToggle
                            shareEnabled={shareStudentProfile}
                            onShareChange={handleStudentShareToggle}
                            activeTab={studentProfileTab}
                            onTabChange={handleStudentProfileTabChange}
                        />
                    )}
                    {/* Student profile drawer for student (when teacher shares) */}
                    {!isTutor && resolvedStudentId && (
                        <StudentProfileDrawer
                            open={sharedProfileOpen}
                            onClose={() => setSharedProfileOpen(false)}
                            studentId={resolvedStudentId}
                            activeTab={sharedProfileTab}
                            sharedBy={sharedProfileBy}
                        />
                    )}
                </Box>
            </Box>
        </WorkspaceProvider>
    );
};

export default DailyCallLayout;
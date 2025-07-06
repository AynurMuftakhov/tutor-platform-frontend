import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
    Box,
    Typography,
    Button,
    CircularProgress,
    IconButton,
    Tooltip, Snackbar
} from '@mui/material';
import { LiveKitRoom, VideoConference, useRoomContext } from '@livekit/components-react';
import '@livekit/components-styles';
import { useAuth } from '../context/AuthContext';
import { fetchLiveKitToken } from '../services/api';
import SyncedVideoPlayer from '../components/lessonDetail/SyncedVideoPlayer';
import WorkZone from '../components/lessonDetail/WorkZone';
import DraggableDivider from '../components/lessonDetail/DraggableDivider';
import { useSyncedVideo } from '../hooks/useSyncedVideo';
import { useWorkspaceToggle } from '../hooks/useWorkspaceToggle';
import { WorkspaceProvider } from '../context/WorkspaceContext';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DoneIcon from "@mui/icons-material/Done";
import { LibraryBooks as LibraryBooksIcon } from '@mui/icons-material';

interface VideoCallPageProps {
    identity?: string;
    roomName?: string;
}

const SERVER_URL = 'wss://mytutorspace-ftahx5sh.livekit.cloud';

const VideoCallPage: React.FC<VideoCallPageProps> = (props) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [searchParams] = useSearchParams();

    // Get identity and roomName from props, URL query parameters, or location state
    const identity = props.identity ||
        searchParams.get('identity') ||
        (location.state?.identity as string);
    const roomName = props.roomName ||
        searchParams.get('roomName') ||
        (location.state?.roomName as string);
    const studentId = searchParams.get('studentId') ||
        (location.state?.studentId as string);

    const lessonId = roomName?.startsWith('lesson-') ? roomName.slice(7) : roomName;
    const previousPath = location.state?.from || '/dashboard';

    const [liveKitToken, setLiveKitToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    /* ------------------------------------------------------------------ */
    /* 1. Fetch LiveKit token                                             */
    /* ------------------------------------------------------------------ */
    useEffect(() => {
        (async () => {
            if (!identity || !roomName) {
                setError('Identity and room name are required');
                setIsLoading(false);
                return;
            }

            try {
                const { token } = await fetchLiveKitToken(identity, roomName, user?.name || '');
                setLiveKitToken(token);
            } catch (err) {
                console.error('Failed to fetch LiveKit token:', err);
                setError('Failed to fetch token. Please try again.');
            } finally {
                setIsLoading(false);
            }
        })();
    }, [identity, roomName, user?.name]);

    /* ------------------------------------------------------------------ */
    /* 2. Loading / error UI                                              */
    /* ------------------------------------------------------------------ */
    if (isLoading) {
        return (
            <Centered>
                <CircularProgress size={60} thickness={4} />
                <Typography variant="h6" sx={{ mt: 2 }}>
                    Connecting to video call…
                </Typography>
            </Centered>
        );
    }

    if (error || !liveKitToken) {
        return (
            <Centered>
                <Typography variant="h5" color="error" gutterBottom>
                    {error || 'Failed to get video-call token'}
                </Typography>
                <Button variant="contained" onClick={() => navigate(-1)}>
                    Go Back
                </Button>
            </Centered>
        );
    }

    /* ------------------------------------------------------------------ */
    /* 3. Normal render                                                   */
    /* ------------------------------------------------------------------ */
    const handleLeave = () => navigate(previousPath);

    return (
        <LiveKitRoom
            token={liveKitToken}
            serverUrl={SERVER_URL}
            connect
            data-lk-theme="default"
            onDisconnected={handleLeave}
        >
            <RoomContent onLeave={handleLeave} lessonId={lessonId} studentId={studentId} />
        </LiveKitRoom>
    );
};

/* -------------------------------------------------------------------- */
/* RoomContent – everything inside LiveKit context                      */
/* -------------------------------------------------------------------- */
const RoomContent: React.FC<{
    onLeave: () => void;
    lessonId: string;
    studentId?: string;
}> = ({ onLeave, lessonId, studentId }) => {
    const { user } = useAuth();
    const room = useRoomContext(); // existing LiveKit room
    const [copied, setIsCopied] = useState(false);

    // Hook that encapsulates all playback sync
    const syncedVideo = useSyncedVideo(room, user?.role === 'tutor');

    // Hook to manage workspace toggle and split ratio
    const [workspaceOpen, openWorkspace, closeWorkspace, splitRatio, setSplitRatio] = useWorkspaceToggle();

    const generateDirectLink = () => {
        const baseUrl = window.location.origin;
        return `${baseUrl}/video-call?identity=${studentId}&roomName=${room.name}`;
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(generateDirectLink());
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 3000); // reset after 3 seconds
    };

    // Pause video locally when workspace is closed
    useEffect(() => {
        if (syncedVideo.state.open && syncedVideo.state.isPlaying && !workspaceOpen) {
            syncedVideo.pauseLocally();
        }
    }, [workspaceOpen, syncedVideo]);

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: workspaceOpen ? 'row' : 'column',
                height: '100vh',
                overflow: 'hidden',
                position: 'relative',
            }}
        >
            {/* Copy Link Button - only visible for teachers */}
            {user?.role === 'tutor' && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: workspaceOpen ? 8 : 120,
                        right: workspaceOpen ? 'auto' : 8,
                        left: workspaceOpen ? 8 : 'auto',
                        zIndex: 1000,
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        borderRadius: '50%',
                        padding: '4px',
                    }}
                >
                    {!copied ? (
                        <Tooltip title="Copy direct link to this video call">
                            <IconButton
                                onClick={handleCopyLink}
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

            {/* ---------- Button to open workspace (always visible when workspace is closed) */}
            {!workspaceOpen && (
                <Tooltip title="Open materials">
                    <IconButton
                        onClick={openWorkspace}
                        sx={{
                            position: 'absolute',
                            top: 64,
                            right: 8,
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

            {/* ---------- Left pane: VideoConference ----------------------- */}
            <Box
                sx={{
                    height: '100%',
                    width: workspaceOpen ? `${splitRatio}%` : '100%',
                    minWidth: 280,
                    flex: workspaceOpen ? `0 0 ${splitRatio}%` : 1,
                    overflow: 'hidden',
                }}
            >
                <VideoConference style={{ height: '100%', width: '100%' }} />
            </Box>

            {/* ---------- Draggable divider (only when workspace is open) -- */}
            {workspaceOpen && (
                <DraggableDivider onDrag={setSplitRatio} />
            )}

            {/* ---------- Right pane: WorkZone (only when workspace is open) */}
            {workspaceOpen && (
                <Box
                    sx={{
                        height: '100%',
                        flex: 1,
                        overflow: 'hidden',
                    }}
                >
                    <WorkspaceProvider>
                        <WorkZone
                            room={room}
                            useSyncedVideo={syncedVideo}
                            onClose={closeWorkspace}
                            lessonId={lessonId}
                        />
                    </WorkspaceProvider>
                </Box>
            )}
        </Box>
    );
};

/* Utility wrapper for center-aligned states */
const Centered: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Box
        sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            bgcolor: '#fafbfd',
        }}
    >
        {children}
    </Box>
);

export default VideoCallPage;

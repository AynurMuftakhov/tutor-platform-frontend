import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Button,
    CircularProgress,
    IconButton,
} from '@mui/material';
import { LibraryBooks as LibraryBooksIcon } from '@mui/icons-material';
import { LiveKitRoom, VideoConference, useRoomContext } from '@livekit/components-react';
import '@livekit/components-styles';
import { useAuth } from '../context/AuthContext';
import { fetchLiveKitToken } from '../services/api';
import MaterialDrawer from '../components/lessonDetail/MaterialDrawer';
import SyncedVideoPlayer from '../components/lessonDetail/SyncedVideoPlayer';
import { useSyncedVideo } from '../hooks/useSyncedVideo';
import VideocamIcon from "@mui/icons-material/Videocam";

interface VideoCallPageProps {
    identity?: string;
    roomName?: string;
}

const SERVER_URL = 'wss://mytutorspace-ftahx5sh.livekit.cloud';

const VideoCallPage: React.FC<VideoCallPageProps> = (props) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();

    // identity & roomName come either from props (tests) or router state
    const identity = props.identity || (location.state?.identity as string);
    const roomName = props.roomName || (location.state?.roomName as string);
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
            <RoomContent onLeave={handleLeave} lessonId={lessonId} />
        </LiveKitRoom>
    );
};

/* -------------------------------------------------------------------- */
/* RoomContent – everything inside LiveKit context                      */
/* -------------------------------------------------------------------- */
const RoomContent: React.FC<{
    onLeave: () => void;
    lessonId: string;
}> = ({ onLeave, lessonId }) => {
    const { user } = useAuth();
    const room = useRoomContext(); // existing LiveKit room
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Hook that encapsulates all playback sync
    const syncedVideo = useSyncedVideo(room, user?.role === 'tutor');

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                overflow: 'hidden',
                position: 'relative',
            }}
        >
            {/* ---------- Material drawer trigger (tutor only) ------------- */}
            {user?.role === 'tutor' && (
                <IconButton
                    onClick={() => setDrawerOpen(true)}
                    sx={{
                        position: 'absolute',
                        top: 64,
                        right: 8,
                        zIndex: 1000,
                        bgcolor: 'background.paper',
                        '&:hover': { bgcolor: 'white' },
                    }}
                    aria-label="Open lesson materials"
                >
                    <LibraryBooksIcon />
                </IconButton>
            )}

            {/* ---------- LiveKit's default UI ----------------------------- */}
            <VideoConference style={{ height: '95%', width: '100%' }} />

            {/* ---------- Drawer with lesson videos ------------------------ */}
            <MaterialDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                lessonId={lessonId}
                onSelectMaterial={syncedVideo.open}
            />

            {/* ---------- Synced video dialog ------------------------------ */}
            <SyncedVideoPlayer room={room} useSyncedVideo={syncedVideo} />
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
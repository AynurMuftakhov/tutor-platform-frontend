import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress, Tooltip, IconButton, Snackbar } from '@mui/material';
import { fetchLiveKitToken } from '../services/api';
import {
  LiveKitRoom,
  VideoConference,
} from '@livekit/components-react';
import '@livekit/components-styles';
import {useAuth} from "../context/AuthContext";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

interface VideoCallPageProps {
  identity?: string;
  roomName?: string;
}

const VideoCallPage: React.FC<VideoCallPageProps> = (props) => {
  const location = useLocation();
  const navigate = useNavigate();
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

  const previousPath = location.state?.from || '/dashboard';

  const [liveKitToken, setLiveKitToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth()

  // Fetch LiveKit token
  useEffect(() => {
    const fetchToken = async () => {
      if (!identity || !roomName) {
        setError('Identity and room name are required');
        setIsLoading(false);
        return;
      }

      try {
        const token = await fetchLiveKitToken(identity, roomName, user?.name || '');
        setLiveKitToken(token.token);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to fetch LiveKit token:', error);
        setError('Failed to fetch token. Please try again.');
        setIsLoading(false);
      }
    };

    fetchToken();
  }, [identity, roomName, user?.name]);

  if (isLoading) {
    return (
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
          <CircularProgress size={60} thickness={4} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Connecting to video call...
          </Typography>
        </Box>
    );
  }

  if (error) {
    return (
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
          <Typography variant="h5" color="error" gutterBottom>
            {error}
          </Typography>
          <Button variant="contained" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </Box>
    );
  }

  if (!liveKitToken) {
    return (
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
          <Typography variant="h5" color="error" gutterBottom>
            Failed to get video call token
          </Typography>
          <Button variant="contained" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </Box>
    );
  }

  const handleLeave = () => {
    navigate(previousPath);
  };

  return (
      <LiveKitRoom
          token={liveKitToken}
          serverUrl="wss://mytutorspace-ftahx5sh.livekit.cloud"
          connect={true}
          data-lk-theme="default"
          onDisconnected={handleLeave}
      >
        <RoomContent 
          onLeave={handleLeave}
          roomName={roomName}
          userRole={user?.role}
          studentId={studentId}
        />
      </LiveKitRoom>
  );
};

interface RoomContentProps {
  onLeave: () => void;
  roomName?: string;
  userRole?: string;
  studentId?: string;
}

const RoomContent: React.FC<RoomContentProps> = ({ onLeave, roomName, userRole, studentId }) => {
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const generateDirectLink = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/video-call?identity=${studentId}&roomName=${roomName}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generateDirectLink());
    setSnackbarOpen(true);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  return (
      <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            overflow: 'hidden',
            position: 'relative',
          }}
      >
        <VideoConference style={{ height: '95%', width: '100%' }} />

        {/* Copy Link Button - only visible for teachers */}
        {userRole === 'tutor' && (
          <Box
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              zIndex: 1000,
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              borderRadius: '50%',
              padding: '4px',
            }}
          >
            <Tooltip title="Copy direct link to this video call">
              <IconButton 
                onClick={handleCopyLink}
                color="primary"
                size="small"
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {/* Snackbar notification */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={3000}
          onClose={handleCloseSnackbar}
          message="Direct link copied to clipboard!"
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        />
      </Box>
  );
};

export default VideoCallPage;

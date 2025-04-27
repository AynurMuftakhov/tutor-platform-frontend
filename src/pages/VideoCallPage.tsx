import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { fetchLiveKitToken } from '../services/api';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';

interface VideoCallPageProps {
  identity?: string;
  roomName?: string;
}

const VideoCallPage: React.FC<VideoCallPageProps> = (props) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Get identity and roomName from props or location state
  const identity = props.identity || (location.state?.identity as string);
  const roomName = props.roomName || (location.state?.roomName as string);

  const [liveKitToken, setLiveKitToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch LiveKit token
  useEffect(() => {
    const fetchToken = async () => {
      if (!identity || !roomName) {
        setError('Identity and room name are required');
        setIsLoading(false);
        return;
      }

      try {
        const token = await fetchLiveKitToken(identity, roomName);
        setLiveKitToken(token.token);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to fetch LiveKit token:', error);
        setError('Failed to fetch token. Please try again.');
        setIsLoading(false);
      }
    };

    fetchToken();
  }, [identity, roomName]);


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

    return (
        <LiveKitRoom token={liveKitToken} serverUrl="wss://mytutorspace-ftahx5sh.livekit.cloud" connect={true}
                     data-lk-theme="default">
            <VideoConference />
        </LiveKitRoom>
    );
};

export default VideoCallPage;
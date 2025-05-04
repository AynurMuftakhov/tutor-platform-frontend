import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { fetchLiveKitToken } from '../services/api';
import {
  LiveKitRoom,
  VideoConference,
  PreJoin,
  FocusLayout, useTracks
} from '@livekit/components-react';
import { Track } from 'livekit-client';
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
  const previousPath = location.state?.from || '/dashboard';

  const [liveKitToken, setLiveKitToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  const [roomReady, setRoomReady] = useState(false);

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

  const handleJoin = () => {
    setHasJoinedRoom(true);
  };

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
      onConnected={() => setRoomReady(true)}
    >
      {!hasJoinedRoom || !roomReady ? (
        <Box
          sx={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: '#fafbfd',
            padding: 4
          }}
        >
          <Typography variant="h4" sx={{ mb: 3, fontWeight: 600, color: '#2573ff' }}>
            Join Video Call
          </Typography>
          <Box sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
            boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
            bgcolor: 'white',
            padding: 4
          }}>
            <PreJoin
              onSubmit={handleJoin}
              onError={(err) => console.error('PreJoin error:', err)}
              style={{ width: '100%', maxWidth: '800px' }}
            />
          </Box>
        </Box>
      ) : (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
          <RoomContent onLeave={handleLeave} />
        </Box>
      )}
    </LiveKitRoom>
  );
};

const RoomContent: React.FC<{ onLeave: () => void }> = ({ onLeave }) => {
  const cameraTrackRef = useTracks([{ source: Track.Source.Camera }])
    .find((trackRef) => trackRef.publication && trackRef.publication.track);

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden'
      }}
    >
      {cameraTrackRef ? (
        <FocusLayout
          trackRef={cameraTrackRef}
          style={{ flex: 1, height: '100%', width: '100%', minHeight: 0 }}
        >
          <VideoConference style={{ height: '100%', width: '100%' }} />
        </FocusLayout>
      ) : (
        <VideoConference style={{ height: '100%', width: '100%' }} />
      )}
    </Box>
  );
};

export default VideoCallPage;

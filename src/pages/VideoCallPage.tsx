import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress, Grid, Paper } from '@mui/material';
import { fetchLiveKitToken, getListeningTasks } from '../services/api';
import {
  LiveKitRoom,
  VideoConference,
  useRoomContext,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { useAuth } from "../context/AuthContext";
import { ListeningTask } from '../types';
import ListeningCard from '../components/lessonDetail/ListeningCard';
import SharedMediaPlayer from '../components/shared/SharedMediaPlayer';
import { extractVideoId } from '../utils/videoUtils';

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
      <RoomContent onLeave={handleLeave} />
    </LiveKitRoom>
  );
};

const RoomContent: React.FC<{ onLeave: () => void }> = () => {
  const room = useRoomContext();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<ListeningTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTask, setCurrentTask] = useState<ListeningTask | null>(null);

  // Extract lesson ID from room name (format: lesson-{id})
  const lessonId = room?.name?.replace('lesson-', '') || '';
  const isTutor = user?.role === 'tutor';

  // Fetch listening tasks for this lesson
  useEffect(() => {
    if (!lessonId) return;

    const fetchTasks = async () => {
      try {
        setLoading(true);
        const data = await getListeningTasks(lessonId);
        setTasks(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch listening tasks', err);
        setError('Failed to load listening tasks');
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [lessonId]);

  // Handle play in lesson button click
  const handlePlayInLesson = (task: ListeningTask) => {
    setCurrentTask(task);
  };

  // Close the shared media player
  const handleClosePlayer = () => {
    setCurrentTask(null);
  };

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <Grid container sx={{ height: '100%' }}>
        {/* Video conference */}
        <Grid item xs={12} md={currentTask ? 8 : 12}>
          <VideoConference style={{ height: '95%', width: '100%' }} />
        </Grid>

        {/* Shared media player */}
        {currentTask && (
          <Grid item xs={12} md={4}>
            <Paper 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                borderRadius: 0,
              }}
            >
              <Box sx={{ p: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
                <Typography variant="h6">Shared Media Player</Typography>
                <Typography variant="body2" color="text.secondary">
                  Everyone in the call can see and control this player
                </Typography>
              </Box>

              <Box sx={{ flex: 1, position: 'relative' }}>
                {room && (
                  <SharedMediaPlayer
                    room={room}
                    videoId={extractVideoId(currentTask.sourceUrl) || ''}
                    startTime={currentTask.startSec}
                    endTime={currentTask.endSec}
                    onClose={handleClosePlayer}
                  />
                )}
              </Box>

              <Box sx={{ p: 2 }}>
                <Button 
                  variant="outlined" 
                  fullWidth 
                  onClick={handleClosePlayer}
                >
                  Close Player
                </Button>
              </Box>
            </Paper>
          </Grid>
        )}

        {/* Listening tasks */}
        {isTutor && !currentTask && (
          <Box 
            sx={{ 
              position: 'absolute', 
              bottom: 20, 
              right: 20, 
              width: 300,
              maxHeight: 400,
              overflow: 'auto',
              bgcolor: 'background.paper',
              borderRadius: 1,
              boxShadow: 3,
              zIndex: 10,
            }}
          >
            <Box sx={{ p: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
              <Typography variant="h6">Listening Tasks</Typography>
            </Box>

            <Box sx={{ p: 2 }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : error ? (
                <Typography color="error">{error}</Typography>
              ) : tasks.length === 0 ? (
                <Typography>No listening tasks available</Typography>
              ) : (
                tasks.map(task => (
                  <ListeningCard
                    key={task.id}
                    task={task}
                    isInLesson={true}
                    isTutor={isTutor}
                    onPlayInLesson={handlePlayInLesson}
                  />
                ))
              )}
            </Box>
          </Box>
        )}
      </Grid>
    </Box>
  );
};

export default VideoCallPage;

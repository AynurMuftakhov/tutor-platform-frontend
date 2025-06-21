import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Grid,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { fetchLiveKitToken, getLessonTasks } from '../services/api';
import {
  LiveKitRoom,
  VideoConference,
  useRoomContext,
} from '@livekit/components-react';
import '@livekit/components-styles';

import { useAuth } from '../context/AuthContext';
import { ListeningTask } from '../types';
import { useSharedMedia } from '../hooks/useSharedMedia';
import SharedMediaLayer from '../components/shared/SharedMediaLayer';
import ListeningTaskDrawer from '../components/shared/ListeningTaskDrawer';

interface VideoCallPageProps {
  identity?: string;
  roomName?: string;
}

const VideoCallPage: React.FC<VideoCallPageProps> = ({ identity, roomName }) => {
  const { state } = useLocation() as any;
  const navigate = useNavigate();
  const { user } = useAuth();

  const finalIdentity = identity || state?.identity;
  const finalRoom = roomName || state?.roomName;
  const previousPath = state?.from || '/dashboard';

  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  /* ---- fetch LiveKit token ---- */
  useEffect(() => {
    if (!finalIdentity || !finalRoom) {
      setErr('Identity and room name are required');
      setLoading(false);
      return;
    }

    fetchLiveKitToken(finalIdentity, finalRoom, user?.name || '')
        .then(t => setToken(t.token))
        .catch(() => setErr('Failed to fetch token'))
        .finally(() => setLoading(false));
  }, [finalIdentity, finalRoom, user?.name]);

  if (loading) return <FullScreenMsg text="Connecting to video call…" spinner />;
  if (err) return <FullScreenMsg text={err} action={() => navigate(-1)} />;
  if (!token) return <FullScreenMsg text="Failed to get video call token" />;

  return (
      <LiveKitRoom
          token={token}
          serverUrl="wss://mytutorspace-ftahx5sh.livekit.cloud"
          connect
          data-lk-theme="default"
          onDisconnected={() => navigate(previousPath)}
      >
        <RoomContent />
      </LiveKitRoom>
  );
};

/* -------- ROOM CONTENT ---------- */
const RoomContent: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const room = useRoomContext();
  const { user } = useAuth();

  const isTutor = user?.role === 'tutor';

  const [lessonTasks, setLessonTasks] = useState<ListeningTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksErr, setTasksErr] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  /* ---------- shared media hook ---------- */
  const [mediaState, mediaActions] = useSharedMedia(room, isTutor);
  const { task: currentTask, mode: currentMode } = mediaState;

  /* ---------- load tasks for lesson ---------- */
  const lessonId = room?.name?.replace('lesson-', '') || '';
  useEffect(() => {
    if (!lessonId) return;

    setTasksLoading(true);
    getLessonTasks(lessonId)
        .then(setLessonTasks)
        .catch(() => setTasksErr('Failed to load listening tasks'))
        .finally(() => setTasksLoading(false));
  }, [lessonId]);

  /* ---------- helpers ---------- */
  const drawerVisible =
      isTutor &&
      (!currentTask || currentMode === 'docked') &&
      (!isMobile || drawerOpen);

  const gridMd = (currentTask && currentMode === 'docked') || drawerVisible ? 8 : 12;

  return (
      <Box sx={{ height: '100vh', overflow: 'hidden', position: 'relative' }}>
        <Grid container sx={{ height: '100%' }}>
          <Grid
              item
              xs={12}
              md={gridMd}
              sx={{ transition: 'all .3s ease' }}
          >
            <VideoConference style={{ height: '95%', width: '100%' }} />
          </Grid>
        </Grid>

        {/* media player */}
        {currentTask && (
            <SharedMediaLayer
                room={room}
                task={currentTask}
                mode={currentMode}
                onClose={mediaActions.clearTask}
                onChangeMode={mediaActions.setMode}
            />
        )}

        {/* drawer */}
        {isTutor && (!currentTask || currentMode === 'docked') && (
            <ListeningTaskDrawer
                tasks={lessonTasks}
                loading={tasksLoading}
                error={tasksErr}
                isTutor={isTutor}
                isOpen={drawerOpen}
                onOpen={() => setDrawerOpen(true)}
                onClose={() => setDrawerOpen(false)}
                onPlayInLesson={mediaActions.setTask}
            />
        )}
      </Box>
  );
};

/* ---------- helper component ---------- */
const FullScreenMsg: React.FC<{
  text: string;
  spinner?: boolean;
  action?: () => void;
}> = ({ text, spinner, action }) => (
    <Box
        sx={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#fafbfd',
          gap: 2,
        }}
    >
      {spinner && <CircularProgress size={56} />}
      <Typography variant="h6">{text}</Typography>
      {action && (
          <Button variant="contained" onClick={action}>
            Go Back
          </Button>
      )}
    </Box>
);

export default VideoCallPage;
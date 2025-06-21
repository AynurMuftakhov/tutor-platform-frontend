import React, { useState } from 'react';
import { Box, Typography, IconButton, Dialog, Paper, SwipeableDrawer, useTheme, useMediaQuery } from '@mui/material';
import { Close as CloseIcon, Fullscreen as FullscreenIcon, PictureInPicture as PipIcon } from '@mui/icons-material';
import { Room } from 'livekit-client';
import { ListeningTask } from '../../types';
import SharedMediaPlayer from './SharedMediaPlayer';
import { extractVideoId } from '../../utils/videoUtils';

// Define the available modes for the shared media layer
export type SharedMediaMode = 'docked' | 'pip' | 'fullscreen';

interface SharedMediaLayerProps {
  room: Room;
  task: ListeningTask;
  mode: SharedMediaMode;
  onClose: () => void;
  onChangeMode: (mode: SharedMediaMode) => void;
}

const SharedMediaLayer: React.FC<SharedMediaLayerProps> = ({
  room,
  task,
  mode,
  onClose,
  onChangeMode,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Render the media player with appropriate header based on the mode
  const renderContent = () => (
    <>
      <Box 
        sx={{ 
          p: 2, 
          borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Box>
          <Typography variant="h6" noWrap sx={{ maxWidth: '200px' }}>
            {task.title || 'Shared Media'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Everyone in the call can see and control this player
          </Typography>
        </Box>
        <Box sx={{ display: 'flex' }}>
          {/* Show different mode toggle buttons based on current mode */}
          {mode === 'docked' && (
            <>
              <IconButton onClick={() => onChangeMode('pip')} title="Picture in Picture">
                <PipIcon />
              </IconButton>
              <IconButton onClick={() => onChangeMode('fullscreen')} title="Fullscreen">
                <FullscreenIcon />
              </IconButton>
            </>
          )}
          {mode === 'pip' && (
            <>
              <IconButton onClick={() => onChangeMode('docked')} title="Dock">
                <FullscreenIcon sx={{ transform: 'rotate(180deg)' }} />
              </IconButton>
              <IconButton onClick={() => onChangeMode('fullscreen')} title="Fullscreen">
                <FullscreenIcon />
              </IconButton>
            </>
          )}
          {mode === 'fullscreen' && (
            <>
              <IconButton onClick={() => onChangeMode('docked')} title="Dock">
                <FullscreenIcon sx={{ transform: 'rotate(180deg)' }} />
              </IconButton>
              <IconButton onClick={() => onChangeMode('pip')} title="Picture in Picture">
                <PipIcon />
              </IconButton>
            </>
          )}
          <IconButton onClick={onClose} title="Close">
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>
      <Box sx={{ flex: 1, position: 'relative' }}>
        <SharedMediaPlayer
          room={room}
          videoId={extractVideoId(task.sourceUrl) || ''}
          startTime={task.startSec}
          endTime={task.endSec}
          onClose={onClose}
        />
      </Box>
    </>
  );

  // Render based on the current mode
  if (mode === 'fullscreen') {
    return (
      <Dialog
        open={true}
        onClose={() => onChangeMode('docked')}
        maxWidth="lg"
        fullScreen
      >
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          height: '100%' 
        }}>
          {renderContent()}
        </Box>
      </Dialog>
    );
  }

  if (mode === 'pip') {
    // Note: For proper draggable functionality, react-draggable should be installed:
    // npm install react-draggable
    // Then wrap this Paper component with Draggable from react-draggable
    return (
      <Paper
        elevation={6}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          width: 320,
          height: 180,
          zIndex: 1300,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 1,
          cursor: 'move',
        }}
      >
        {renderContent()}
      </Paper>
    );
  }

  // Default: docked mode
  return (
    <SwipeableDrawer
      anchor="right"
      open={true}
      onClose={() => onChangeMode('pip')}
      onOpen={() => console.log('Drawer opened')}
      variant={isMobile ? "temporary" : "permanent"}
      ModalProps={{
        keepMounted: true,
      }}
      sx={{
        '& .MuiDrawer-paper': {
          width: 360,
          boxSizing: 'border-box',
        },
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%' 
      }}>
        {renderContent()}
      </Box>
    </SwipeableDrawer>
  );
};

export default SharedMediaLayer;

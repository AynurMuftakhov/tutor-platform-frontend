import React from 'react';
import { Dialog, DialogContent, IconButton, Box } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import ReactPlayer from 'react-player';
import { Room } from 'livekit-client';

interface SyncedVideoPlayerProps {
  room: Room;
  useSyncedVideo: any; // Import the actual type from your hook
  inWorkspace?: boolean; // Whether the player is rendered inside WorkZone
}

const SyncedVideoPlayer: React.FC<SyncedVideoPlayerProps> = ({ room, useSyncedVideo, inWorkspace = false }) => {
  const { state, playerRef, play, pause, seek, close, isTutor } = useSyncedVideo;

  // If the video is not open, don't render anything
  if (!state.open || !state.material) {
    return null;
  }

  const handleSeek = (seconds: number) => {
    // broadcast seek when user drags the scrubber
    seek(seconds);
  };

  // If rendered inside WorkZone, use a simple Box container
  if (inWorkspace) {
    return (
      <Box sx={{ width: '100%', height: '100%', bgcolor: 'black' }}>
        <ReactPlayer
          ref={playerRef}
          url={state.material.sourceUrl}
          playing={state.isPlaying}
          controls
          width="100%"
          height="100%"
          onPlay={play}
          onPause={pause}
          onSeek={handleSeek}
          config={{
            file: {
              attributes: {
                controlsList: 'nodownload', // Prevent downloading
                disablePictureInPicture: true, // Disable picture-in-picture
              },
            },
          }}
        />
      </Box>
    );
  }

  // Otherwise, render as a dialog
  return (
    <Dialog
      open={state.open}
      maxWidth="md"
      fullWidth
      onClose={close}
      PaperProps={{
        sx: {
          position: 'relative',
          backgroundColor: 'black',
          boxShadow: 24,
        }
      }}
    >
      <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
        <IconButton
          onClick={close}
          sx={{ color: 'white' }}
          aria-label="close"
        >
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0, overflow: 'hidden', width: '100%', height: '50vh' }}>
        <ReactPlayer
          ref={playerRef}
          url={state.material.sourceUrl}
          playing={state.isPlaying}
          controls
          width="100%"
          height="50vh"
          onPlay={play}
          onPause={pause}
          onSeek={handleSeek}
          config={{
            file: {
              attributes: {
                controlsList: 'nodownload', // Prevent downloading
                disablePictureInPicture: true, // Disable picture-in-picture
              },
            },
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default SyncedVideoPlayer;

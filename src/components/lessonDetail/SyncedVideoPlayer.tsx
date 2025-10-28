import React from 'react';
import { Box } from '@mui/material';
import ReactPlayer from 'react-player';
import type { Material } from '../../types/material';

export interface SyncedVideoControls {
  state: {
    open: boolean;
    material: Material | null;
    isPlaying: boolean;
  };
  playerRef: React.RefObject<ReactPlayer | null>;
  open: (material: Material) => void;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  close: () => void;
  pauseLocally: () => void;
}

interface SyncedVideoPlayerProps {
  useSyncedVideo: SyncedVideoControls;
}

const SyncedVideoPlayer: React.FC<SyncedVideoPlayerProps> = ({ useSyncedVideo }) => {
  const { state, playerRef, play, pause, seek } = useSyncedVideo;

  // If the video is not open, don't render anything
  if (!state.open || !state.material) {
    return null;
  }

  const handleSeek = (seconds: number) => {
    // broadcast seek when user drags the scrubber
    seek(seconds);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        bgcolor: 'black',
      }}
    >
      {/* --- video --- */}
      <ReactPlayer
        ref={playerRef}
        url={`${state.material.sourceUrl}?rel=0&modestbranding=1`}
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
};

export default SyncedVideoPlayer;

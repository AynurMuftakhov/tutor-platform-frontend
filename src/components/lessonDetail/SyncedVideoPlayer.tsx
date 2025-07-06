import React from 'react';
import { Box } from '@mui/material';
import ReactPlayer from 'react-player';
import { UseSyncedVideoResult } from '../../hooks/useSyncedVideo';

interface SyncedVideoPlayerProps {
  useSyncedVideo: UseSyncedVideoResult;
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
};

export default SyncedVideoPlayer;

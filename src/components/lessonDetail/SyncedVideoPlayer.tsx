import React from 'react';
import { Box } from '@mui/material';
import ReactPlayer from 'react-player';
import { UseSyncedVideoResult } from '../../hooks/useSyncedVideo';
import {StyledChat} from "./StyledChat";

interface SyncedVideoPlayerProps {
  useSyncedVideo: UseSyncedVideoResult;
  showChat?: boolean;
}

const SyncedVideoPlayer: React.FC<SyncedVideoPlayerProps> = ({ useSyncedVideo, showChat = true }) => {
  const { state, playerRef, play, pause, seek } = useSyncedVideo;

  // If the video is not open, don't render anything
  if (!state.open || !state.material) {
    return null;
  }

  const handleSeek = (seconds: number) => {
    // broadcast seek when user drags the scrubber
    seek(seconds);
  };

  const playerHeight = showChat ? '60%' : '100%';

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
        height={playerHeight}   /* 60 % video, 40 % chat – tweak if needed */
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

      {/* --- chat --- */}
      {showChat && (
        <Box sx={{ flexGrow: 1, minHeight: 0, overflow: 'hidden' }}>
          <StyledChat/>
        </Box>
      )}
    </Box>
  );
};

export default SyncedVideoPlayer;

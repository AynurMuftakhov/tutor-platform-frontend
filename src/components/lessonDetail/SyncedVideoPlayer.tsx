import React from 'react';
import { Box } from '@mui/material';
import ReactPlayer from 'react-player';
import { Chat } from '@livekit/components-react';
import { UseSyncedVideoResult } from '../../hooks/useSyncedVideo';
import {StyledChat} from "./StyledChat";

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
        height="60%"   /* 60 % video, 40 % chat – tweak if needed */
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
      <Box sx={{ flexGrow: 1, minHeight: 0, overflow: 'hidden' }}>
        <StyledChat/>
      </Box>
    </Box>
  );
};

export default SyncedVideoPlayer;

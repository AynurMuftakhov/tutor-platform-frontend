import React, { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, Typography, IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

interface StandaloneMediaPlayerProps {
  videoId: string;
  startTime: number;
  endTime: number;
  onClose?: () => void;
}

const StandaloneMediaPlayer: React.FC<StandaloneMediaPlayerProps> = ({
  videoId,
  startTime,
  endTime,
  onClose,
}) => {
  const playerRef = useRef<YT.Player | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track if we're the one who initiated a seek to avoid feedback loops
  const seekingRef = useRef(false);
  
  // Load YouTube IFrame API
  useEffect(() => {
    // Create YouTube script tag if it doesn't exist
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
    
    // Initialize player when API is ready
    const onYouTubeIframeAPIReady = () => {
      playerRef.current = new window.YT.Player('youtube-player', {
        videoId,
        playerVars: {
          start: startTime,
          controls: 1,
          disablekb: 0,
          rel: 0,
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
          onError: (e) => {
            console.error('YouTube player error:', e);
            setError('Failed to load video');
          },
        },
      });
    };
    
    // Setup YouTube API callback
    if (window.YT && window.YT.Player) {
      onYouTubeIframeAPIReady();
    } else {
      window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
    }
    
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [videoId, startTime]);
  
  // Handle player ready event
  const onPlayerReady = () => {
    setIsReady(true);
    
    // Start a timer to check if we need to loop back to start time
    const checkTimeInterval = setInterval(() => {
      if (playerRef.current) {
        const currentTime = playerRef.current.getCurrentTime();
        
        // If we've reached the end time, seek back to start time
        if (currentTime >= endTime) {
          seekingRef.current = true;
          playerRef.current.seekTo(startTime, true);
          setTimeout(() => {
            seekingRef.current = false;
          }, 500);
        }
      }
    }, 1000);
    
    return () => {
      clearInterval(checkTimeInterval);
    };
  };
  
  // Handle player state change events
  const onPlayerStateChange = (event: YT.OnStateChangeEvent) => {
    // No need to handle state changes for standalone player
  };
  
  if (error) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }
  
  if (!isReady) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      {onClose && (
        <IconButton 
          onClick={onClose}
          sx={{ 
            position: 'absolute', 
            top: 8, 
            right: 8, 
            zIndex: 1, 
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            color: 'white',
            '&:hover': {
              bgcolor: 'rgba(0, 0, 0, 0.7)',
            }
          }}
        >
          <CloseIcon />
        </IconButton>
      )}
      <div id="youtube-player" style={{ width: '100%', height: '100%' }}></div>
    </Box>
  );
};

export default StandaloneMediaPlayer;
import React, { useEffect, useRef, useState, useId } from 'react';
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
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playerId = useId().replace(/:/g, '-');  // unique id for each rendered player, replace colons which can cause issues
  const loopIntervalRef = useRef<number | null>(null);
  const [isApiReady, setIsApiReady] = useState(false);

  useEffect(() => {
    // Check for window existence and YT API
    if (typeof window !== 'undefined' && (!('YT' in window) || !(window as any).YT.Player)) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
      window.onYouTubeIframeAPIReady = () => {
        setIsApiReady(true);
      };
    } else {
      setIsApiReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isApiReady || !playerContainerRef.current) return;

    // Clear previous container contents
    while (playerContainerRef.current.firstChild) {
      playerContainerRef.current.removeChild(playerContainerRef.current.firstChild);
    }
    // Create a fresh player div
    const playerElement = document.createElement('div');
    playerElement.id = playerId;
    playerContainerRef.current.appendChild(playerElement);

    // Initialize YouTube player
    playerRef.current = new (window as any).YT.Player(playerId, {
      height: '100%',
      width: '100%',
      videoId,
      playerVars: {
        start: startTime,
        controls: 1,
        disablekb: 0,
        rel: 0,
        origin: window.location.origin,
        enablejsapi: 1,
      },
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange,
        onError: (e: any) => {
          setError('Failed to load video');
        },
      },
    });

    return () => {
      if (loopIntervalRef.current) {
        clearInterval(loopIntervalRef.current);
      }
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [isApiReady, videoId, startTime, endTime, playerId]);

  // Handle player ready event
  const onPlayerReady = (event: YT.OnStateChangeEvent) => {
    try {
      // Make sure the player is actually ready and accessible
      if (event.target && typeof event.target.playVideo === 'function') {
        // Store a reference to the player
        playerRef.current = event.target;

        // Seek to the desired start and play segment
        playerRef.current?.seekTo(startTime, true);
        playerRef.current?.playVideo();
        setIsReady(true);

        // Set up the loop interval
        loopIntervalRef.current = window.setInterval(() => {
          if (playerRef.current) {
            try {
              const currentTime = playerRef.current.getCurrentTime();
              if (endTime != 0 && currentTime >= endTime) {
                playerRef.current.pauseVideo();
                clearInterval(loopIntervalRef.current!);
                loopIntervalRef.current = null;
              }
            } catch (err) {
              setError('Player ready event received but player is invalid');
            }
          }
        }, 1000);

        // Start playback after a short delay to ensure correct segment is loaded
        try {
          setTimeout(() => {
            playerRef.current?.playVideo();
          }, 500);
        } catch (err) {
          setError('Unable to play a video');
        }
      } else {
        setError('Player ready event received but player is invalid');
      }
    } catch (err) {
      setError('Error in player ready callback');
    }
  };

  // Handle player state change events
  const onPlayerStateChange = (event: YT.OnStateChangeEvent) => {

    // Check if the player is in an error state
    if (event.data === -1) {
      // If the player is unstarted for too long, it might indicate an issue
      setTimeout(() => {
        if (playerRef.current && !isReady) {
          try {
            playerRef.current.playVideo();
          } catch (err) {
            setError('Player ready event received but player is invalid');
          }
        }
      }, 3000);
    }
  };

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {onClose && (
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 2,
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            color: 'white',
            '&:hover': {
              bgcolor: 'rgba(0, 0, 0, 0.7)',
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      )}

      {/* Always‑mounted container for the YouTube player */}
      <div
        ref={playerContainerRef}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '300px',
          backgroundColor: '#000',
        }}
      />

      {/* Loading overlay */}
      {!isReady && !error && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(0,0,0,0.3)',
            zIndex: 1,
          }}
        >
          <CircularProgress />
        </Box>
      )}

      {/* Error overlay */}
      {error && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(0,0,0,0.6)',
            zIndex: 1,
          }}
        >
          <Typography color="error">{error}</Typography>
        </Box>
      )}
    </Box>
  );
};

export default StandaloneMediaPlayer;

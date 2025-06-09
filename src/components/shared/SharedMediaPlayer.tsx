import React, { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { Room, LocalParticipant, RemoteParticipant, DataPacket_Kind } from 'livekit-client';

// Define message types for player state synchronization
enum MessageType {
  PLAY = 'PLAY',
  PAUSE = 'PAUSE',
  SEEK = 'SEEK',
  STATE_REQUEST = 'STATE_REQUEST',
  STATE_RESPONSE = 'STATE_RESPONSE',
}

interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  videoId: string;
  startTime: number;
  endTime: number;
}

interface PlayerMessage {
  type: MessageType;
  data?: PlayerState;
  timestamp?: number;
}

interface SharedMediaPlayerProps {
  room: Room;
  videoId: string;
  startTime: number;
  endTime: number;
  onClose?: () => void;
}

const SharedMediaPlayer: React.FC<SharedMediaPlayerProps> = ({
  room,
  videoId,
  startTime,
  endTime,
  onClose,
}) => {
  const playerRef = useRef<YT.Player | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    currentTime: startTime,
    videoId,
    startTime,
    endTime,
  });
  
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
    
    // Request current state from other participants
    sendMessage({
      type: MessageType.STATE_REQUEST,
      timestamp: Date.now(),
    });
    
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
    if (!playerRef.current) return;
    
    const currentTime = playerRef.current.getCurrentTime();
    
    // YT.PlayerState.PLAYING = 1, YT.PlayerState.PAUSED = 2
    if (event.data === 1) { // Playing
      if (!playerState.isPlaying) {
        setPlayerState(prev => ({ ...prev, isPlaying: true, currentTime }));
        sendMessage({
          type: MessageType.PLAY,
          data: {
            ...playerState,
            isPlaying: true,
            currentTime,
          },
          timestamp: Date.now(),
        });
      }
    } else if (event.data === 2) { // Paused
      if (playerState.isPlaying) {
        setPlayerState(prev => ({ ...prev, isPlaying: false, currentTime }));
        sendMessage({
          type: MessageType.PAUSE,
          data: {
            ...playerState,
            isPlaying: false,
            currentTime,
          },
          timestamp: Date.now(),
        });
      }
    } else if (event.data === 3) { // Buffering
      // Do nothing
    }
    
    // Handle seeking
    if (Math.abs(currentTime - playerState.currentTime) > 1 && !seekingRef.current) {
      setPlayerState(prev => ({ ...prev, currentTime }));
      sendMessage({
        type: MessageType.SEEK,
        data: {
          ...playerState,
          currentTime,
        },
        timestamp: Date.now(),
      });
    }
  };
  
  // Send message to all participants via LiveKit data channel
  const sendMessage = (message: PlayerMessage) => {
    if (!room || !room.localParticipant) return;
    
    try {
      const data = JSON.stringify(message);
      room.localParticipant.publishData(
        new TextEncoder().encode(data),
        DataPacket_Kind.RELIABLE
      );
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };
  
  // Listen for messages from other participants
  useEffect(() => {
    if (!room) return;
    
    const handleData = (payload: Uint8Array, participant: RemoteParticipant | LocalParticipant) => {
      try {
        const message: PlayerMessage = JSON.parse(new TextDecoder().decode(payload));
        
        // Ignore our own messages
        if (participant === room.localParticipant) return;
        
        switch (message.type) {
          case MessageType.PLAY:
            if (playerRef.current && message.data) {
              if (Math.abs(playerRef.current.getCurrentTime() - message.data.currentTime) > 1) {
                seekingRef.current = true;
                playerRef.current.seekTo(message.data.currentTime, true);
                setTimeout(() => {
                  seekingRef.current = false;
                }, 500);
              }
              playerRef.current.playVideo();
              setPlayerState(prev => ({ ...prev, isPlaying: true, currentTime: message.data.currentTime }));
            }
            break;
            
          case MessageType.PAUSE:
            if (playerRef.current) {
              playerRef.current.pauseVideo();
              if (message.data) {
                setPlayerState(prev => ({ ...prev, isPlaying: false, currentTime: message.data.currentTime }));
              }
            }
            break;
            
          case MessageType.SEEK:
            if (playerRef.current && message.data) {
              seekingRef.current = true;
              playerRef.current.seekTo(message.data.currentTime, true);
              setPlayerState(prev => ({ ...prev, currentTime: message.data.currentTime }));
              setTimeout(() => {
                seekingRef.current = false;
              }, 500);
            }
            break;
            
          case MessageType.STATE_REQUEST:
            // Someone joined and is requesting the current state
            if (playerRef.current && isReady) {
              const currentTime = playerRef.current.getCurrentTime();
              const isPlaying = playerRef.current.getPlayerState() === 1;
              
              sendMessage({
                type: MessageType.STATE_RESPONSE,
                data: {
                  isPlaying,
                  currentTime,
                  videoId,
                  startTime,
                  endTime,
                },
                timestamp: Date.now(),
              });
            }
            break;
            
          case MessageType.STATE_RESPONSE:
            // We received the current state from another participant
            if (playerRef.current && message.data) {
              seekingRef.current = true;
              playerRef.current.seekTo(message.data.currentTime, true);
              
              if (message.data.isPlaying) {
                playerRef.current.playVideo();
              } else {
                playerRef.current.pauseVideo();
              }
              
              setPlayerState(message.data);
              
              setTimeout(() => {
                seekingRef.current = false;
              }, 500);
            }
            break;
        }
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };
    
    // Subscribe to data messages
    room.on('dataReceived', handleData);
    
    return () => {
      room.off('dataReceived', handleData);
    };
  }, [room, isReady, videoId, startTime, endTime]);
  
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
      <div id="youtube-player" style={{ width: '100%', height: '100%' }}></div>
    </Box>
  );
};

export default SharedMediaPlayer;
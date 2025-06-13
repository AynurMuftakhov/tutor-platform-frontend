import React from 'react';
import { Box, Card, CardContent, CardMedia, Typography, Chip, Button } from '@mui/material';
import { ListeningTask, AssetType } from '../../types/ListeningTask';
import { MusicNote as AudioIcon, Videocam as VideoIcon, PlayArrow as PlayIcon } from '@mui/icons-material';

interface ListeningCardProps {
  task: ListeningTask;
  isInLesson?: boolean;
  isTutor?: boolean;
  onPlayInLesson?: (task: ListeningTask) => void;
  onPlay?: (task: ListeningTask) => void;
}

const ListeningCard: React.FC<ListeningCardProps> = ({ 
  task, 
  isInLesson = false, 
  isTutor = false, 
  onPlayInLesson,
  onPlay
}) => {
  // Calculate duration in minutes and seconds
  const durationSec = task.endSec - task.startSec;
  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;
  const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  // Use provided title or extract from URL as fallback
  const extractTitleFromUrl = () => {
    const urlParts = task.sourceUrl.split('/');
    return urlParts[urlParts.length - 1].replace(/\.[^/.]+$/, "").replace(/-|_/g, " ");
  };

  const title = task.title || extractTitleFromUrl();

  // Get thumbnail based on asset type
  const getThumbnail = () => {
    if (task.assetType === AssetType.VIDEO) {
      // For YouTube videos, we can use their thumbnail API
      if (task.sourceUrl.includes('youtube.com') || task.sourceUrl.includes('youtu.be')) {
        const videoId = task.sourceUrl.includes('v=') 
          ? task.sourceUrl.split('v=')[1].split('&')[0]
          : task.sourceUrl.split('/').pop();
        return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
      }
      return '/assets/video-placeholder.jpg';
    }
    return '/assets/audio-placeholder.jpg';
  };

  return (
    <Card sx={{ display: 'flex', mb: 2, height: 100 }}>
      <CardMedia
        component="img"
        sx={{ width: 150, height: '100%', objectFit: 'cover' }}
        image={getThumbnail()}
        alt={title}
      />
      <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        <CardContent sx={{ flex: '1 0 auto', py: 1 }}>
          <Typography component="div" variant="h6" noWrap>
            {title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, justifyContent: 'space-between' }}>
            <Chip 
              icon={task.assetType === AssetType.AUDIO ? <AudioIcon /> : <VideoIcon />}
              label={formattedDuration}
              size="small"
              color="primary"
              variant="outlined"
            />
            {isInLesson && isTutor && onPlayInLesson && (
              <Button
                size="small"
                variant="contained"
                color="primary"
                startIcon={<PlayIcon />}
                onClick={() => onPlayInLesson(task)}
              >
                Play in Lesson
              </Button>
            )}
            {!isInLesson && isTutor && onPlay && (
              <Button
                size="small"
                variant="contained"
                color="primary"
                startIcon={<PlayIcon />}
                onClick={() => onPlay(task)}
              >
                Play
              </Button>
            )}
          </Box>
        </CardContent>
      </Box>
    </Card>
  );
};

export default ListeningCard;

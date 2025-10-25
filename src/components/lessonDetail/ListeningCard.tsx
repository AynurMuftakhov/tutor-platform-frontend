import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    CardMedia,
    Typography,
    Chip,
    Button,
    Tooltip,
    IconButton,
    alpha,
    useTheme,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle
} from '@mui/material';
import { ListeningTask, AssetType } from '../../types';
import { MusicNote as AudioIcon, Videocam as VideoIcon, PlayArrow as PlayIcon } from '@mui/icons-material';
import DeleteIcon from "@mui/icons-material/Delete";

interface ListeningCardProps {
  task: ListeningTask;
  isInLesson?: boolean;
  isTutor?: boolean;
  onPlayInLesson?: (task: ListeningTask) => void;
  onPlay?: (task: ListeningTask) => void;
  onDelete?:(task: ListeningTask) => void;
  viewMode?: 'list' | 'grid';
}

export const ListeningCard: React.FC<ListeningCardProps> = ({
  task, 
  isInLesson = false,
  isTutor = false, 
  onPlayInLesson,
  onPlay, onDelete,
  viewMode = 'grid'
}) => {
  // State for delete confirmation dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Calculate duration in minutes and seconds
  const durationSec = task.endSec - task.startSec;
  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;
  const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const theme = useTheme();
  const sourceUrl = task.sourceUrl || '';

  // Use provided title or extract from URL as fallback
  const extractTitleFromUrl = () => {
    if (!sourceUrl) return 'Listening task';
    const urlParts = sourceUrl.split('/');
    return urlParts[urlParts.length - 1].replace(/\.[^/.]+$/, '').replace(/-|_/g, ' ');
  };

  const title = task.title || extractTitleFromUrl();

  // Handle opening the delete confirmation dialog
  const handleOpenDeleteDialog = () => {
    setIsDeleteDialogOpen(true);
  };

  // Handle closing the delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
  };

  // Handle confirming the deletion
  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete(task);
    }
    setIsDeleteDialogOpen(false);
  };

  // Get thumbnail based on asset type
  const getThumbnail = () => {
    if (task.assetType === AssetType.VIDEO) {
      // For YouTube videos, we can use their thumbnail API
      if (sourceUrl.includes('youtube.com') || sourceUrl.includes('youtu.be')) {
        const videoId = sourceUrl.includes('v=')
          ? sourceUrl.split('v=')[1].split('&')[0]
          : sourceUrl.split('/').pop();
        return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
      }
      return '/assets/video-placeholder.jpg';
    }
    return '/assets/audio-placeholder.jpg';
  };

  return (
    <>
      <Card
        sx={{
          display: 'flex',
          flexDirection: viewMode === 'list' 
            ? { xs: 'column', sm: 'row' } 
            : 'column',
          mb: 2,
          height: viewMode === 'list' 
            ? { xs: 'auto', sm: 100 } 
            : '100%',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 3
          }
        }}
      >
        <CardMedia
          component="img"
          sx={{
            width: viewMode === 'list' 
              ? { xs: '100%', sm: 150 } 
              : '100%',
            height: viewMode === 'list' 
              ? { xs: 180, sm: '100%' } 
              : 180,
            objectFit: 'cover'
          }}
          image={getThumbnail()}
          alt={title}
        />
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            justifyContent: 'space-between',
            flexGrow: 1
          }}
        >
          <CardContent sx={{ 
              flex: '1 0 auto', 
              py: 1,
              height: viewMode === 'grid' ? '100%' : 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: viewMode === 'grid' ? 'space-between' : 'flex-start'
            }}>
            <Typography 
              component="div" 
              variant="h6" 
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: viewMode === 'grid' ? 2 : 1,
                WebkitBoxOrient: 'vertical',
                lineHeight: '1.2em',
                height: viewMode === 'grid' ? '2.4em' : '1.2em'
              }}
            >
              {title}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 1,
                mt: viewMode === 'grid' ? 'auto' : 1,
                justifyContent: 'space-between'
              }}
            >
              <Chip
                icon={task.assetType === AssetType.AUDIO ? <AudioIcon /> : <VideoIcon />}
                label={formattedDuration}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ 
                  minWidth: viewMode === 'grid' ? '80px' : 'auto',
                  justifyContent: 'flex-start'
                }}
              />
              {(isInLesson && isTutor && onPlayInLesson) && (
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  startIcon={<PlayIcon />}
                  onClick={() => onPlayInLesson(task)}
                  sx={{ 
                    whiteSpace: 'nowrap',
                    alignSelf: viewMode === 'grid' ? 'flex-end' : 'auto',
                    mt: viewMode === 'grid' ? 1 : 0
                  }}
                >
                  Play in Lesson
                </Button>
              )}
              {/* Right-aligned action buttons */}
              <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                {(!isInLesson && isTutor && onPlay) && (
                    <Tooltip title="Play Video">
                        <IconButton
                            size="small"
                            onClick={() => onPlay(task)}
                            sx={{
                                color: theme.palette.primary.main,
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                width: 32,
                                height: 32,
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    bgcolor: alpha(theme.palette.primary.main, 0.2),
                                    transform: 'translateY(-2px)'
                                }
                            }}
                        >
                            <PlayIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
                {(!isInLesson && isTutor && onDelete) && (
                    <Tooltip title="Delete Video">
                        <IconButton
                            size="small"
                            onClick={handleOpenDeleteDialog}
                            sx={{
                                color: theme.palette.error.main,
                                bgcolor: alpha(theme.palette.error.main, 0.1),
                                width: 32,
                                height: 32,
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    bgcolor: alpha(theme.palette.error.main, 0.2),
                                    transform: 'translateY(-2px)'
                                }
                            }}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
              </Box>
            </Box>
          </CardContent>
        </Box>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Confirm Deletion
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete &ldquo;{title}&rdquo;?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Slider,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid
} from '@mui/material';
import ReactPlayer from 'react-player';
import { AssetType } from '../../types';
import { createGlobalListeningTask, assignTaskToLesson } from '../../services/api';

interface CreateListeningTaskModalProps {
  open: boolean;
  onClose: () => void;
  lessonId?: string;
  onTaskCreated: () => void;
  isGlobal?: boolean;
}

const CreateListeningTaskModal: React.FC<CreateListeningTaskModalProps> = ({
  open,
  onClose,
  lessonId,
  onTaskCreated,
  isGlobal = false
}) => {
  // Form state
  const [assetType, setAssetType] = useState<AssetType>(AssetType.VIDEO);
  const [sourceUrl, setSourceUrl] = useState('');
  const [title, setTitle] = useState('');
  const [startSec, setStartSec] = useState(0);
  const [endSec, setEndSec] = useState(60); // Default 1 minute
  const [wordLimit, setWordLimit] = useState(100); // Default 100 words
  const [timeLimitSec, setTimeLimitSec] = useState(900); // Default 15 minutes (900 seconds)

  // Validation state
  const [urlError, setUrlError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Player state
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const playerRef = useRef<ReactPlayer>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setAssetType(AssetType.VIDEO);
      setSourceUrl('');
      setTitle('');
      setStartSec(0);
      setEndSec(60);
      setWordLimit(100);
      setTimeLimitSec(900);
      setUrlError('');
      setIsReady(false);
      setDuration(0);
    }
  }, [open]);

  // Validate YouTube URL
  const validateUrl = (url: string) => {
    // Simple regex for YouTube URLs
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
    if (!url) {
      setUrlError('URL is required');
      return false;
    }
    if (!youtubeRegex.test(url)) {
      setUrlError('Please enter a valid YouTube URL');
      return false;
    }
    setUrlError('');
    return true;
  };

  // Handle player ready event
  const handleReady = () => {
    setIsReady(true);
    if (playerRef.current) {
      const videoDuration = playerRef.current.getDuration();
      setDuration(videoDuration);
      // Set end time to video duration if it's shorter than default
      if (videoDuration < endSec) {
        setEndSec(Math.floor(videoDuration));
      }
    }
  };

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateUrl(sourceUrl)) {
      return;
    }

    if (startSec >= endSec) {
      setUrlError('End time must be after start time');
      return;
    }

    const taskData = {
      assetType,
      sourceUrl,
      startSec,
      endSec,
      wordLimit,
      timeLimitSec,
      title
    };

    setIsSubmitting(true);
    try {
      // Always create a global task first
      const createdTask = await createGlobalListeningTask(taskData);

      // If this is for a specific lesson, assign the task to the lesson
      if (!isGlobal && lessonId) {
        await assignTaskToLesson(lessonId, createdTask.id);
      }

      onTaskCreated();
      onClose();
    } catch (error) {
      console.error('Failed to create listening task', error);
      // You could add error handling here
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Add Listening Task</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id="asset-type-label">Asset Type</InputLabel>
            <Select
              labelId="asset-type-label"
              value={assetType}
              label="Asset Type"
              onChange={(e) => setAssetType(e.target.value as AssetType)}
            >
              <MenuItem value={AssetType.VIDEO}>Video</MenuItem>
              <MenuItem value={AssetType.AUDIO}>Audio</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="YouTube URL"
            value={sourceUrl}
            onChange={(e) => {
              setSourceUrl(e.target.value);
              if (e.target.value) validateUrl(e.target.value);
            }}
            error={!!urlError}
            helperText={urlError}
            sx={{ mb: 3 }}
          />

          <TextField
            fullWidth
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a descriptive title for this listening task"
            sx={{ mb: 3 }}
          />

          {sourceUrl && !urlError && (
            <Box sx={{ mb: 3 }}>
              <ReactPlayer
                ref={playerRef}
                url={sourceUrl}
                controls
                width="100%"
                height="240px"
                onReady={handleReady}
                onDuration={setDuration}
                config={{
                  youtube: {
                    playerVars: { start: startSec }
                  }
                }}
              />
            </Box>
          )}

          {isReady && (
            <>
              <Typography gutterBottom>
                Time Range: {formatTime(startSec)} - {formatTime(endSec)} (Duration: {formatTime(endSec - startSec)})
              </Typography>
              <Box sx={{ px: 1, mb: 3 }}>
                <Slider
                  value={[startSec, endSec]}
                  onChange={(_, newValue) => {
                    const [newStart, newEnd] = newValue as number[];
                    setStartSec(newStart);
                    setEndSec(newEnd);
                  }}
                  min={0}
                  max={duration}
                  step={1}
                  valueLabelDisplay="auto"
                  valueLabelFormat={formatTime}
                  disableSwap
                />
              </Box>

              <Grid container spacing={3} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Word Limit"
                    value={wordLimit}
                    onChange={(e) => setWordLimit(parseInt(e.target.value) || 0)}
                    InputProps={{ inputProps: { min: 0 } }}
                    helperText="Maximum number of words (0 for no limit)"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Time Limit (seconds)"
                    value={timeLimitSec}
                    onChange={(e) => setTimeLimitSec(parseInt(e.target.value) || 0)}
                    InputProps={{ inputProps: { min: 0 } }}
                    helperText="Time limit in seconds (0 for no limit)"
                  />
                </Grid>
              </Grid>
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          color="primary" 
          variant="contained"
          disabled={!isReady || !!urlError || isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateListeningTaskModal;

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Typography,
  Box,
  Paper,
  CircularProgress
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material';
import {GenerateExerciseRequest} from "../../types";

interface AISuggestDialogProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (request: GenerateExerciseRequest) => void;
  loading: boolean;
}

const AISuggestDialog: React.FC<AISuggestDialogProps> = ({
  open,
  onClose,
  onGenerate,
  loading
}) => {
  const [formData, setFormData] = useState<GenerateExerciseRequest>({
    grammarFocus: '',
    topic: '',
    level: 'intermediate',
    sentences: 5,
    language: 'en',
    tokenStyle: 'doubleBraces'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (name) {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSliderChange = (_: Event, value: number | number[]) => {
    setFormData(prev => ({ ...prev, sentences: value as number }));
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    if (name) {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = () => {
    onGenerate(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm">
      <Paper sx={{ width: '420px' }}>
        <DialogTitle>Generate exercise with AI</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Grammar focus"
              name="grammarFocus"
              value={formData.grammarFocus}
              onChange={handleChange}
              fullWidth
              placeholder="e.g. articles, prepositions, tenses"
              variant="outlined"
              size="small"
            />

            <TextField
              label="Topic"
              name="topic"
              value={formData.topic}
              onChange={handleChange}
              fullWidth
              placeholder="e.g. geographic entities, daily routines"
              variant="outlined"
              size="small"
            />

            <FormControl fullWidth size="small">
              <InputLabel>Level</InputLabel>
              <Select
                name="level"
                value={formData.level}
                onChange={handleSelectChange}
                label="Level"
              >
                <MenuItem value="beginner">Beginner</MenuItem>
                <MenuItem value="intermediate">Intermediate</MenuItem>
                <MenuItem value="advanced">Advanced</MenuItem>
              </Select>
            </FormControl>
            
            <Box>
              <Typography gutterBottom>
                Number of sentences: {formData.sentences}
              </Typography>
              <Slider
                value={formData.sentences}
                onChange={handleSliderChange}
                min={1}
                max={20}
                step={1}
                marks
                valueLabelDisplay="auto"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary"
            disabled={loading || !formData.grammarFocus || !formData.topic}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Generating...' : 'Generate'}
          </Button>
        </DialogActions>
      </Paper>
    </Dialog>
  );
};

export default AISuggestDialog;
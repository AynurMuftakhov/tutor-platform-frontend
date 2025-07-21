import React, {useEffect, useState} from 'react';
import {
  Box,
  TextField,
  Typography,
  Grid,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Paper,
} from '@mui/material';

interface MultipleChoiceEditorProps {
  initialQuestion?: string;
  initialOptions?: string[];
  initialCorrectIndex?: number;
  onSave: (question: string, options: string[], correctIndex: number) => void;
}

const MultipleChoiceEditor: React.FC<MultipleChoiceEditorProps> = ({
  initialQuestion = '',
  initialOptions = ['', '', '', ''],
  initialCorrectIndex = -1,
  onSave
}) => {
  const [question, setQuestion] = useState(initialQuestion);
  const [options, setOptions] = useState<string[]>(initialOptions.length === 4 ? initialOptions : ['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState<number>(initialCorrectIndex);

  // Update option at specific index
  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  useEffect(() => {
    onSave(question, options, correctIndex);
  }, [question, options, correctIndex])

  return (
    <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom>
        Multiple Choice Question
      </Typography>
      
      <TextField
        fullWidth
        label="Question"
        multiline
        rows={3}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Enter your question here"
        sx={{ mb: 3 }}
      />
      
      <FormControl component="fieldset" sx={{ width: '100%', mb: 3 }}>
        <FormLabel component="legend">Options (select the correct answer)</FormLabel>
        <RadioGroup
          value={correctIndex}
          onChange={(e) => setCorrectIndex(parseInt(e.target.value))}
        >
          <Grid container spacing={2}>
            {options.map((option, index) => (
              <Grid size={{xs: 12}} key={index}>
                <Box display="flex" alignItems="center">
                  <FormControlLabel
                    value={index}
                    control={<Radio />}
                    label=""
                    sx={{ mr: 0 }}
                  />
                  <TextField
                    fullWidth
                    label={`Option ${index + 1}`}
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Enter option ${index + 1}`}
                  />
                </Box>
              </Grid>
            ))}
          </Grid>
        </RadioGroup>
      </FormControl>
    </Paper>
  );
};

export default MultipleChoiceEditor;
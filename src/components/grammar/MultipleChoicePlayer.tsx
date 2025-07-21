import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Paper,
  Divider
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

interface MultipleChoicePlayerProps {
  question: string;
  options: string[];
  chosenIndex?: number;
  correctIndex?: number;
  showResults?: boolean;
  onChange: (index: number) => void;
  itemId: string;
}

const MultipleChoicePlayer: React.FC<MultipleChoicePlayerProps> = ({
  question,
  options,
  chosenIndex = -1,
  correctIndex,
  showResults = false,
  onChange,
  itemId
}) => {
  const [selectedOption, setSelectedOption] = useState<number>(chosenIndex);

  // Update selected option when chosenIndex prop changes
  useEffect(() => {
    setSelectedOption(chosenIndex);
  }, [chosenIndex]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(event.target.value);
    setSelectedOption(newValue);
    onChange(newValue);
  };

  return (
    <Paper elevation={0} sx={{ p: 2, mb: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
      <Typography variant="body1" gutterBottom sx={{ fontWeight: 'medium', mb: 2 }}>
        {question}
      </Typography>
      
      <Divider sx={{ mb: 2 }} />
      
      <FormControl component="fieldset" sx={{ width: '100%' }}>
        <RadioGroup
          value={selectedOption}
          onChange={handleChange}
        >
          {options.map((option, index) => {
            // Determine if this option is correct or incorrect when showing results
            const isCorrect = showResults && correctIndex !== undefined && index === correctIndex;
            const isIncorrect = showResults && selectedOption === index && index !== correctIndex;
            
            return (
              <Box 
                key={index} 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  mb: 1,
                  p: 1,
                  borderRadius: 1,
                  bgcolor: isCorrect ? 'success.light' : isIncorrect ? 'error.light' : 'transparent'
                }}
              >
                <FormControlLabel
                  value={index}
                  control={
                    <Radio 
                      color={isCorrect ? "success" : isIncorrect ? "error" : "primary"}
                      disabled={showResults}
                    />
                  }
                  label={option}
                  sx={{ 
                    flexGrow: 1,
                    color: isCorrect ? 'success.dark' : isIncorrect ? 'error.dark' : 'inherit'
                  }}
                />
                
                {showResults && isCorrect && (
                  <CheckCircleIcon color="success" sx={{ ml: 1 }} />
                )}
                
                {showResults && isIncorrect && (
                  <CancelIcon color="error" sx={{ ml: 1 }} />
                )}
              </Box>
            );
          })}
        </RadioGroup>
      </FormControl>
    </Paper>
  );
};

export default MultipleChoicePlayer;
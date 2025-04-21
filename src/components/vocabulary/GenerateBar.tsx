import React, { useState } from 'react';
import { Box, TextField, Button } from '@mui/material';

interface GenerateBarProps {
    onGenerate: (word: string) => void;
}

const GenerateBar: React.FC<GenerateBarProps> = ({ onGenerate }) => {
    const [word, setWord] = useState('');

    const handleGenerate = () => {
        const trimmedWord = word.trim();
        if (trimmedWord) {
            onGenerate(trimmedWord);
            setWord('');
        }
    };

    return (
        <Box display="flex" gap={2} mb={3}>
            <TextField
                label="Enter English word"
                variant="outlined"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                fullWidth
            />
            <Button
                variant="contained"
                color="primary"
                onClick={handleGenerate}
                disabled={!word.trim()}
            >
                Generate
            </Button>
        </Box>
    );
};

export default GenerateBar;
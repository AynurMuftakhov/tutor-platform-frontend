import React from 'react';
import { Grid, Box, Typography, Button } from '@mui/material';
import { VocabularyWord } from '../../types';
import WordCard from './WordCard';
import SchoolIcon from '@mui/icons-material/School';
import { motion } from 'framer-motion';

interface WordGridProps {
    data: VocabularyWord[];
    onDelete?: (id: string) => void;
    onEdit?: (word: VocabularyWord) => void;
    onToggleLearned?: (id: string) => void;
    onAddToMyVocabulary?: (id: string) => void;
    learnedWords?: Set<string>;
    readOnly?: boolean;
    selectionMode?: boolean;
    selectedWords?: string[];
    onToggleSelection?: (id: string) => void;
}

const WordGrid: React.FC<WordGridProps> = ({ 
    data, 
    onDelete, 
    onEdit, 
    onToggleLearned,
    onAddToMyVocabulary,
    learnedWords = new Set(),
    readOnly = false,
    selectionMode = false,
    selectedWords = [],
    onToggleSelection
}) => {
// Empty state when no words are available
    if (data.length === 0) {
        return (
            <Box 
                sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    py: 8,
                    textAlign: 'center'
                }}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <SchoolIcon sx={{ fontSize: 60, color: 'rgba(37, 115, 255, 0.2)', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        No vocabulary words found
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
                        Add new words to your vocabulary list to start learning and practicing.
                    </Typography>
                    <Button 
                        variant="contained" 
                        color="primary"
                        sx={{ 
                            borderRadius: 2,
                            px: 3,
                            py: 1,
                            bgcolor: '#2573ff',
                            '&:hover': {
                                bgcolor: '#1a5cd1'
                            }
                        }}
                    >
                        Add your first word
                    </Button>
                </motion.div>
            </Box>
        );
    }

    return (
        <Grid container spacing={3}>
            {data.map((word) => (
                <Grid item xs={12} sm={6} md={4} key={word.id} sx={{ px: 1 }}>
                    <WordCard
                        word={word}
                        onDelete={!readOnly ? onDelete : undefined}
                        onEdit={!readOnly ? onEdit : undefined}
                        onToggleLearned={onToggleLearned}
                        onAddToMyVocabulary={onAddToMyVocabulary}
                        isLearned={learnedWords.has(word.id)}
                        selectionMode={selectionMode}
                        isSelected={selectedWords.includes(word.id)}
                        onToggleSelection={onToggleSelection}
                        readOnly={readOnly}
                        compact={readOnly}
                    />
                </Grid>
            ))}
        </Grid>
    );
};

export default WordGrid;

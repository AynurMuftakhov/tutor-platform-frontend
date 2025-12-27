import React from 'react';
import { Grid, Box, Typography, Button } from '@mui/material';
import { VocabularyWord } from '../../types';
import WordCard, { CardDensity } from './WordCard';
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
    /** Controls the visual density of cards. 'compact' shows more cards with reduced padding */
    density?: CardDensity;
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
    onToggleSelection,
    density = 'compact'
}) => {
    // Determine grid column sizing based on density
    // Compact mode shows more columns to fit more items on screen
    const isCompact = density === 'compact';
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
        <Grid
            container
            columnSpacing={{ xs: isCompact ? 1.5 : 2, md: isCompact ? 2 : 3 }}
            rowSpacing={{ xs: isCompact ? 2 : 3, md: isCompact ? 2 : 4 }}
        >
            {data.map((word) => (
                <Grid 
                    size={{ 
                        xs: 12, 
                        sm: 6, 
                        md: isCompact ? 3 : 4,  // Compact: 4 columns, Comfortable: 3 columns
                        lg: isCompact ? 2.4 : 4  // Compact: 5 columns on large screens
                    }} 
                    key={word.id} 
                    sx={{ px: isCompact ? 0.5 : 1 }}
                >
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
                        density={density}
                    />
                </Grid>
            ))}
        </Grid>
    );
};

export default WordGrid;

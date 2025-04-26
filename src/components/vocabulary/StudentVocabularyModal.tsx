import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography
} from '@mui/material';
import { useAssignments } from '../../hooks/useAssignments';
import WordGrid from './WordGrid';
import { VocabularyWord } from '../../types';
import { useDictionary } from '../../hooks/useVocabulary';

interface Props {
    open: boolean;
    onClose: () => void;
    student: {
        id: string;
        name: string;
    } | null;
}

const StudentVocabularyModal: React.FC<Props> = ({ open, onClose, student }) => {
    // Fetch all vocabulary words
    const { data: allWords = [] } = useDictionary();
    
    // Fetch assignments for the selected student
    const { data: assignments = [], isLoading } = useAssignments(student?.id || '');
    
    // Create a map of assigned word IDs for quick lookup
    const assignedWordIds = new Set<string>();
    assignments.forEach(assignment => assignedWordIds.add(assignment.vocabularyWordId));
    
    // Filter all words to get only the ones assigned to this student
    const assignedWords = allWords.filter(word => assignedWordIds.has(word.id));

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
            <DialogTitle>
                {student ? `${student.name}'s Vocabulary Words` : 'Student Vocabulary'}
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {assignedWords.length} word{assignedWords.length !== 1 ? 's' : ''} assigned
                </Typography>
            </DialogTitle>
            
            <DialogContent dividers>
                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : assignedWords.length > 0 ? (
                    <WordGrid 
                        data={assignedWords} 
                        readOnly={true}
                    />
                ) : (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                        <Typography color="text.secondary">
                            No vocabulary words assigned to this student yet.
                        </Typography>
                    </Box>
                )}
            </DialogContent>
            
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};

export default StudentVocabularyModal;
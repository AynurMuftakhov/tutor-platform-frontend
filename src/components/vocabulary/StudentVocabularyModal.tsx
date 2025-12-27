import React, { useMemo } from 'react';
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
import { useDictionary } from '../../hooks/useVocabulary';

interface Props {
    open: boolean;
    onClose: () => void;
    student: {
        id: string;
        name: string;
    } | null;
}

const EMPTY_ARRAY: any[] = [];

const StudentVocabularyModal: React.FC<Props> = ({ open, onClose, student }) => {
    // Fetch assignments for the selected student
    const { data: assignments = EMPTY_ARRAY, isLoading: assignmentsLoading } = useAssignments(
        student?.id || '',
        { enabled: open }
    );
    
    // Create a list of assigned word IDs
    const assignedWordIds = useMemo(() => 
        assignments.map(a => a.vocabularyWordId), 
    [assignments]);
    
    // Fetch vocabulary words for these IDs
    const { data: wordsPage, isLoading: wordsLoading } = useDictionary(
        { 
            ids: assignedWordIds, 
            size: Math.max(assignedWordIds.length, 1) 
        },
        { enabled: open && assignedWordIds.length > 0 }
    );
    
    const assignedWords = wordsPage?.content ?? EMPTY_ARRAY;
    const isLoading = assignmentsLoading || (wordsLoading && assignedWordIds.length > 0);

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
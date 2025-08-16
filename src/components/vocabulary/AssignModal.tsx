// src/modules/vocabulary/components/AssignModal.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Checkbox, ListItemButton, Box, CircularProgress, Typography, TextField, InputAdornment
} from '@mui/material';
import { useDictionary } from '../../hooks/useVocabulary';
import { useAssignWords, useAssignments } from '../../hooks/useAssignments';
import { AssignWordsRequest } from '../../types';
import SearchIcon from '@mui/icons-material/Search';

interface Props {
    open: boolean;
    studentId: string;
    onClose: () => void;
}

const AssignModal: React.FC<Props> = ({ open, studentId, onClose }) => {
    const { data: words = [], isLoading: wordsLoading } = useDictionary();
    const { data: assignments = [], isLoading: assignmentsLoading } = useAssignments(studentId);
    const assign = useAssignWords();
    const [selected, setSelected] = useState<string[]>([]);
    const [search, setSearch] = useState('');

    // Reset selection and search when modal is (re)opened
    useEffect(() => {
        if (open) {
            setSelected([]);
            setSearch('');
        }
    }, [open]);

    // Build a set of already assigned word IDs
    const assignedIds = useMemo(() => new Set(assignments.map((a: any) => a.vocabularyWordId)), [assignments]);

    // Filter out assigned words
    const availableWords = useMemo(() => words.filter((w: any) => !assignedIds.has(w.id)), [words, assignedIds]);

    // Apply search filter
    const filteredWords = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return availableWords;
        return availableWords.filter((w: any) =>
            (w.text?.toLowerCase().includes(q)) ||
            (w.translation?.toLowerCase().includes(q)) ||
            (w.partOfSpeech?.toLowerCase().includes(q))
        );
    }, [availableWords, search]);

    const toggle = (id: string) =>
        setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

    const handleAssign = () => {
        const dto: AssignWordsRequest = { studentId, vocabularyWordIds: selected };
        assign.mutate(dto, { onSuccess: () => onClose() });
    };

    const loading = wordsLoading || assignmentsLoading;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Assign Words to Student</DialogTitle>
            <DialogContent dividers>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                        <CircularProgress />
                    </Box>
                ) : availableWords.length === 0 ? (
                    <Box sx={{ py: 3, textAlign: 'center' }}>
                        <Typography color="text.secondary">
                            All available words are already assigned to this student.
                        </Typography>
                    </Box>
                ) : (
                    <>
                        <TextField
                            placeholder="Search words…"
                            fullWidth
                            size="small"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                )
                            }}
                            sx={{ mb: 2 }}
                        />
                        {filteredWords.length > 0 ? (
                            <List>
                                {filteredWords.map((w: any) => (
                                    <ListItem key={w.id} disablePadding>
                                        <ListItemButton onClick={() => toggle(w.id)}>
                                            <ListItemIcon>
                                                <Checkbox
                                                    edge="start"
                                                    checked={selected.includes(w.id)}
                                                    tabIndex={-1}
                                                    disableRipple
                                                />
                                            </ListItemIcon>
                                            <ListItemText primary={`${w.text} — ${w.translation}`} />
                                        </ListItemButton>
                                    </ListItem>
                                ))}
                            </List>
                        ) : (
                            <Box sx={{ py: 3, textAlign: 'center' }}>
                                <Typography color="text.secondary">
                                    No words match your search.
                                </Typography>
                            </Box>
                        )}
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={handleAssign}
                    disabled={!selected.length || assign.isPending}
                >
                    {assign.isPending ? 'Assigning…' : `Assign (${selected.length})`}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AssignModal;
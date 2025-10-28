import React from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
} from '@mui/material';
import VocabularyList from './VocabularyList';
import type { VocabularyWord } from '../../types';

interface VocabularyPickerDialogProps {
    open: boolean;
    words: VocabularyWord[];
    selectedWordIds: string[];
    onChange: (ids: string[]) => void;
    onClose: () => void;
    title?: string;
    searchLabel?: string;
}

const VocabularyPickerDialog: React.FC<VocabularyPickerDialogProps> = ({
    open,
    words,
    selectedWordIds,
    onChange,
    onClose,
    title = 'Select vocabulary words',
    searchLabel = 'Search',
}) => {
    const [search, setSearch] = React.useState('');

    React.useEffect(() => {
        if (!open) {
            setSearch('');
        }
    }, [open]);

    const filteredWords = React.useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return words;
        return words.filter((word) => {
            const text = word.text.toLowerCase();
            const translation = (word.translation ?? '').toLowerCase();
            return text.includes(query) || translation.includes(query);
        });
    }, [words, search]);

    const handleToggle = React.useCallback(
        (id: string) => {
            const isSelected = selectedWordIds.includes(id);
            const updated = isSelected
                ? selectedWordIds.filter((wordId) => wordId !== id)
                : [...selectedWordIds, id];
            onChange(updated);
        },
        [selectedWordIds, onChange],
    );

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <Stack gap={2} sx={{ mt: 1 }}>
                    <TextField
                        label={searchLabel}
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        fullWidth
                    />
                    <VocabularyList
                        data={filteredWords}
                        selectionMode
                        selectedWords={selectedWordIds}
                        onToggleSelection={handleToggle}
                        readOnly={false}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Done</Button>
            </DialogActions>
        </Dialog>
    );
};

export default VocabularyPickerDialog;

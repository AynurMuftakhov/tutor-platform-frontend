import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button
} from '@mui/material';
import { VocabularyWordRequest, VocabularyWordResponse } from '../../types';

interface Props {
    open: boolean;
    initialData?: VocabularyWordResponse;
    onSubmit: (values: VocabularyWordRequest) => void;
    onClose: () => void;
}

const WordForm: React.FC<Props> = ({ open, initialData, onSubmit, onClose }) => {
    const [values, setValues] = useState<VocabularyWordRequest>({ text: '', translation: '', partOfSpeech: '' });

    useEffect(() => {
        if (initialData) {
            setValues({
                text: initialData.text,
                translation: initialData.translation,
                partOfSpeech: initialData.partOfSpeech || ''
            });
        }
    }, [initialData]);

    const handleChange = (field: keyof VocabularyWordRequest) =>
        (e: React.ChangeEvent<HTMLInputElement>) => setValues({ ...values, [field]: e.target.value });

    const handleSubmit = () => {
        onSubmit(values);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>{initialData ? 'Edit Word' : 'New Word'}</DialogTitle>
            <DialogContent dividers>
                <TextField
                    label="Word"
                    value={values.text}
                    onChange={handleChange('text')}
                    fullWidth
                    margin="normal"
                    required
                />
                <TextField
                    label="Translation"
                    value={values.translation}
                    onChange={handleChange('translation')}
                    fullWidth
                    margin="normal"
                    required
                />
                <TextField
                    label="Part of Speech"
                    value={values.partOfSpeech}
                    onChange={handleChange('partOfSpeech')}
                    fullWidth
                    margin="normal"
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" onClick={handleSubmit}>Save</Button>
            </DialogActions>
        </Dialog>
    );
};

export default WordForm;
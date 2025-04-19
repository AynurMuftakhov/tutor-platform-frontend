import React, { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useDictionary, useCreateWord, useUpdateWord, useDeleteWord } from '../hooks/useVocabulary';
import WordTable from '../components/vocabulary/WordTable';
import WordForm from '../components/vocabulary/WordForm';

const DictionaryPage: React.FC = () => {
    const { data: words = [], isLoading, error } = useDictionary();
    const createWord = useCreateWord();
    const updateWord = useUpdateWord();
    const deleteWord = useDeleteWord();

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<string | null>(null);

    const openNew = () => { setEditing(null); setFormOpen(true); };
    const openEdit = (wordId: string) => { setEditing(wordId); setFormOpen(true); };

    const handleSave = (values:any, id?: string) => {
        if (id) updateWord.mutate({ id, dto: values });
        else createWord.mutate(values);
    };

    return (
        <Box sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h4">Vocabulary Dictionary</Typography>
                <Button variant="contained" onClick={openNew}>New Word</Button>
            </Box>

            {isLoading && <Typography>Loading...</Typography>}
            {error && <Typography color="error">Failed to load words.</Typography>}

            {!isLoading && !error && (
                <WordTable
                    data={words}
                    onEdit={(w) => openEdit(w.id)}
                    onDelete={(id) => deleteWord.mutate(id)}
                />
            )}

            <WordForm
                open={formOpen}
                initialData={words.find((w:any) => w.id === editing) || undefined}
                onSubmit={(vals) => handleSave(vals, editing || undefined)}
                onClose={() => setFormOpen(false)}
            />
        </Box>
    );
};

export default DictionaryPage;
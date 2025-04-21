import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    CircularProgress,
    IconButton,
    Tooltip
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useCreateWord, useUpdateWord } from '../../hooks/useVocabulary';
import { useAuth } from '../../context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { VocabularyWord } from '../../types';

interface Props {
    open: boolean;
    onClose: () => void;
}

type Step = 'INPUT' | 'REVIEW';

const GenerateWordDialog: React.FC<Props> = ({ open, onClose }) => {
    const { user } = useAuth();
    const qc = useQueryClient();
    const createWord = useCreateWord();
    const updateWord = useUpdateWord();

    const [step, setStep] = useState<Step>('INPUT');
    const [input, setInput] = useState('');
    const [draft, setDraft] = useState<VocabularyWord | null>(null);
    const [patch, setPatch] = useState<Partial<VocabularyWord>>({});

    // When createWord returns, switch to review step
    useEffect(() => {
        if (createWord.data) {
            setDraft(createWord.data);
            setStep('REVIEW');
        }
    }, [createWord.data]);

    const reset = () => {
        setStep('INPUT');
        setInput('');
        setDraft(null);
        setPatch({});
        createWord.reset();
    };

    const handleGenerate = () => {
        if (!input.trim()) return;
        createWord.mutate({ text: input.trim(), teacherId: user?.id as string });
    };

    const handleSave = () => {
        if (draft) {
            updateWord.mutate({ id: draft.id, dto: patch });
            // Optimistically update cache
            qc.setQueryData<VocabularyWord[]>(['vocabulary', 'words'], old =>
                old ? old.map(w => (w.id === draft.id ? { ...w, ...patch } : w)) : old
            );
        }
        onClose();
        setTimeout(reset, 400); // small delay to allow dialog close animation
    };

    const handleRegenerate = () => {
        if (!draft) return;
        createWord.mutate({ text: draft.text, teacherId: user?.id as string });
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" transitionDuration={300}>
            {step === 'INPUT' && (
                <>
                    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, overflowWrap: 'anywhere' }}>Generate a new word</DialogTitle>
                    <DialogContent sx={{ pt: 3 }}>
                        <TextField
                            autoFocus
                            label="English word"
                            fullWidth
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={onClose}>Cancel</Button>
                        <Button variant="contained" onClick={handleGenerate} disabled={createWord.isPending}>
                            {createWord.isPending ? <CircularProgress size={20} /> : 'Generate'}
                        </Button>
                    </DialogActions>
                </>
            )}

            {step === 'REVIEW' && draft && (
                <>
                    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, overflowWrap: 'anywhere' }}>
                        Review “{draft.text}”
                        <Tooltip title="Regenerate">
                            <IconButton size="small" onClick={handleRegenerate}>
                                <RestartAltIcon fontSize="inherit" />
                            </IconButton>
                        </Tooltip>
                    </DialogTitle>
                    <DialogContent dividers sx={{ display: 'grid', gap: 2 }}>
                        <TextField
                            label="Definition"
                            multiline
                            value={patch.definitionEn ?? draft.definitionEn}
                            onChange={e => setPatch({ ...patch, definitionEn: e.target.value })}
                        />
                        <TextField
                            label="Translation (ru)"
                            value={patch.translation ?? draft.translation}
                            onChange={e => setPatch({ ...patch, translation: e.target.value })}
                        />
                        <TextField
                            label="Part of speech"
                            value={patch.partOfSpeech ?? draft.partOfSpeech ?? ''}
                            onChange={e => setPatch({ ...patch, partOfSpeech: e.target.value })}
                        />
                        <TextField
                            label="Synonyms (comma‑separated)"
                            value={(patch.synonymsEn ?? draft.synonymsEn).join(', ')}
                            onChange={e =>
                                setPatch({
                                    ...patch,
                                    synonymsEn: e.target.value.split(',').map(s => s.trim())
                                })
                            }
                        />
                        {draft.audioUrl && (
                            <audio controls src={draft.audioUrl} style={{ width: '100%' }} />
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={onClose}>Cancel</Button>
                        <Button variant="contained" onClick={handleSave}>Save</Button>
                    </DialogActions>
                </>
            )}
        </Dialog>
    );
};

export default GenerateWordDialog;
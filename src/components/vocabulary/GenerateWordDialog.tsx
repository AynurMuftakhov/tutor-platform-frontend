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
    Tooltip,
    Box,
    Typography,
    Paper,
    Slider,
    FormControl,
    InputLabel,
    Select,
    MenuItem
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
        createWord.mutate({ text: input.trim(), teacherId: user?.id as string }, {
            onSuccess: () => {
                // Invalidate the query to ensure the UI is updated
                qc.invalidateQueries({ queryKey: ['vocabulary', 'words'] });
            }
        });
    };

    const handleSave = () => {
        if (draft) {
            updateWord.mutate({ id: draft.id, dto: patch });
            // Optimistically update cache
            qc.setQueryData<VocabularyWord[]>(['vocabulary', 'words'], old =>
                old ? old.map(w => (w.id === draft.id ? { ...w, ...patch } : w)) : old
            );
            // Invalidate the query to ensure the UI is updated
            qc.invalidateQueries({ queryKey: ['vocabulary', 'words'] });
        }
        onClose();
        setTimeout(reset, 400); // small delay to allow dialog close animation
    };

    const handleRegenerate = () => {
        if (!draft) return;
        createWord.mutate({ text: draft.text, teacherId: user?.id as string }, {
            onSuccess: () => {
                // Invalidate the query to ensure the UI is updated
                qc.invalidateQueries({ queryKey: ['vocabulary', 'words'] });
            }
        });
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" transitionDuration={300}>
            {step === 'INPUT' && (
                <>
                    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, overflowWrap: 'anywhere' }}>
                        <Typography variant="h6" fontWeight="600" color="primary">
                            Add New Vocabulary Word
                        </Typography>
                    </DialogTitle>
                    <DialogContent sx={{ pt: 3, pb: 4 }}>
                        <Paper elevation={0} sx={{ p: 3, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                            <Typography variant="body1" gutterBottom color="text.secondary" sx={{ mb: 3 }}>
                                Enter an English word to generate its definition, translation, and other details automatically.
                            </Typography>
                            <TextField
                                autoFocus
                                label="English word"
                                placeholder="e.g. accomplish, diligent, prosperity"
                                fullWidth
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                                variant="outlined"
                                sx={{ 
                                    '& .MuiOutlinedInput-root': { 
                                        borderRadius: 1.5,
                                        fontSize: '1.1rem'
                                    }
                                }}
                            />
                        </Paper>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 3 }}>
                        <Button 
                            onClick={onClose}
                            sx={{ 
                                borderRadius: 1.5,
                                px: 3
                            }}
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="contained" 
                            onClick={handleGenerate} 
                            disabled={createWord.isPending}
                            sx={{ 
                                borderRadius: 1.5,
                                px: 3,
                                bgcolor: '#2573ff',
                                '&:hover': {
                                    bgcolor: '#1a5cd1'
                                }
                            }}
                        >
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
                    <DialogContent dividers sx={{ display: 'grid', gap: 3, py: 3 }}>
                        <Paper elevation={0} sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                            <Typography variant="subtitle1" fontWeight="600" gutterBottom color="primary">
                                Basic Information
                            </Typography>
                            <Box sx={{ display: 'grid', gap: 2 }}>
                                <TextField
                                    label="Definition"
                                    multiline
                                    rows={2}
                                    value={patch.definitionEn ?? draft.definitionEn}
                                    onChange={e => setPatch({ ...patch, definitionEn: e.target.value })}
                                    variant="outlined"
                                    fullWidth
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                                />
                                <TextField
                                    label="Translation (ru)"
                                    value={patch.translation ?? draft.translation}
                                    onChange={e => setPatch({ ...patch, translation: e.target.value })}
                                    variant="outlined"
                                    fullWidth
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                                />
                                <TextField
                                    label="Example Sentence"
                                    multiline
                                    rows={2}
                                    value={patch.exampleSentence ?? draft.exampleSentence ?? ''}
                                    onChange={e => setPatch({ ...patch, exampleSentence: e.target.value })}
                                    variant="outlined"
                                    fullWidth
                                    placeholder="Enter a short, realistic example sentence"
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                                />
                            </Box>
                        </Paper>

                        <Paper elevation={0} sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                            <Typography variant="subtitle1" fontWeight="600" gutterBottom color="primary">
                                Classification
                            </Typography>
                            <Box sx={{ display: 'grid', gap: 2 }}>
                                <FormControl fullWidth variant="outlined" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}>
                                    <InputLabel>Part of speech</InputLabel>
                                    <Select
                                        value={patch.partOfSpeech ?? draft.partOfSpeech ?? ''}
                                        onChange={e => setPatch({ ...patch, partOfSpeech: e.target.value })}
                                        label="Part of speech"
                                    >
                                        <MenuItem value="noun">Noun</MenuItem>
                                        <MenuItem value="verb">Verb</MenuItem>
                                        <MenuItem value="adjective">Adjective</MenuItem>
                                        <MenuItem value="adverb">Adverb</MenuItem>
                                        <MenuItem value="phrasal‑verb">Phrasal Verb</MenuItem>
                                        <MenuItem value="other">Other</MenuItem>
                                    </Select>
                                </FormControl>

                                <TextField
                                    label="Synonyms (comma‑separated)"
                                    value={(patch.synonymsEn ?? draft.synonymsEn).join(', ')}
                                    onChange={e =>
                                        setPatch({
                                            ...patch,
                                            synonymsEn: e.target.value.split(',').map(s => s.trim())
                                        })
                                    }
                                    variant="outlined"
                                    fullWidth
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                                />
                            </Box>
                        </Paper>

                        <Paper elevation={0} sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                            <Typography variant="subtitle1" fontWeight="600" gutterBottom color="primary">
                                Difficulty & Usage
                            </Typography>
                            <Box sx={{ display: 'grid', gap: 3 }}>
                                <Box>
                                    <Typography variant="body2" gutterBottom>
                                        Difficulty Level: {patch.difficulty ?? draft.difficulty ?? 3}/5
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" gutterBottom>
                                        1 = beginner can learn easily, 5 = advanced
                                    </Typography>
                                    <Slider
                                        value={patch.difficulty ?? draft.difficulty ?? 3}
                                        onChange={(_, newValue) => setPatch({ ...patch, difficulty: newValue as number })}
                                        step={1}
                                        marks
                                        min={1}
                                        max={5}
                                        valueLabelDisplay="auto"
                                        sx={{ color: '#2573ff' }}
                                    />
                                </Box>

                                <Box>
                                    <Typography variant="body2" gutterBottom>
                                        Popularity: {patch.popularity ?? draft.popularity ?? 3}/5
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" gutterBottom>
                                        1 = almost unused, 5 = very frequent (daily)
                                    </Typography>
                                    <Slider
                                        value={patch.popularity ?? draft.popularity ?? 3}
                                        onChange={(_, newValue) => setPatch({ ...patch, popularity: newValue as number })}
                                        step={1}
                                        marks
                                        min={1}
                                        max={5}
                                        valueLabelDisplay="auto"
                                        sx={{ color: '#00d7c2' }}
                                    />
                                </Box>
                            </Box>
                        </Paper>

                        <Paper elevation={0} sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                            <Typography variant="subtitle1" fontWeight="600" gutterBottom color="primary">
                                Pronunciation
                            </Typography>
                            <Box sx={{ display: 'grid', gap: 2 }}>
                                {draft.audioUrl && (
                                    <audio controls src={draft.audioUrl} style={{ width: '100%' }} />
                                )}
                                {!draft.audioUrl && (
                                    <Typography variant="body2" color="text.secondary">
                                        No audio pronunciation available
                                    </Typography>
                                )}
                            </Box>
                        </Paper>
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

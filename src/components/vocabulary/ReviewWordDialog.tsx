import React, {useEffect, useState} from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Typography,
    Box,
    Slider,
    Rating,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Paper,
    IconButton,
    Tooltip,
    alpha,
    useTheme
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import {AudioPart, VocabularyWord} from '../../types';
import {useRegenerateAudio} from '../../hooks/useVocabulary';

const ReviewWordDialog: React.FC<{
    open: boolean;
    data: VocabularyWord | null;
    onSave: (patch: Partial<VocabularyWord>) => void;
    onClose: () => void;
}> = ({open, data, onSave, onClose}) => {
    const [values, setValues] = useState<Partial<VocabularyWord>>({});
    const regenerateAudio = useRegenerateAudio();
    const theme = useTheme();
    useEffect(() => setValues(data ?? {}), [data]);

    const handleRegenerateAudio = (part: AudioPart) => {
        if (!data) return;
        regenerateAudio.mutate({ id: data.id, part }, {
            onSuccess: (updatedWord) => {
                // Update the data with the new audio URLs
                // Since we can't modify the data prop directly, we'll update the values state
                setValues(prev => ({
                    ...prev,
                    audioUrl: updatedWord.audioUrl,
                    exampleSentenceAudioUrl: updatedWord.exampleSentenceAudioUrl
                }));
            }
        });
    };

    const handleRegenerateTextAudio = () => {
        handleRegenerateAudio(AudioPart.TEXT);
    };

    const handleRegenerateExampleAudio = () => {
        handleRegenerateAudio(AudioPart.EXAMPLE_SENTENCE);
    };

    if (!data) return null;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle sx={{overflowWrap: 'anywhere'}}>
                Review “{data.text}”
            </DialogTitle>
            <DialogContent dividers sx={{display: 'grid', gap: 3, py: 3}}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                    <Typography variant="subtitle1" fontWeight="600" gutterBottom color="primary">
                        Basic Information
                    </Typography>
                    <Box sx={{ display: 'grid', gap: 2 }}>
                        <TextField
                            label="Text"
                            multiline
                            rows={1}
                            value={values.text ?? data.text}
                            onChange={e => setValues({...values, text: e.target.value})}
                            variant="outlined"
                            fullWidth
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                        />
                        <TextField
                            label="Definition"
                            multiline
                            rows={2}
                            value={values.definitionEn ?? data.definitionEn}
                            onChange={e => setValues({...values, definitionEn: e.target.value})}
                            variant="outlined"
                            fullWidth
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                        />
                        <TextField
                            label="Translation (ru)"
                            value={values.translation ?? data.translation}
                            onChange={e => setValues({...values, translation: e.target.value})}
                            variant="outlined"
                            fullWidth
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                        />
                        <TextField
                            label="Example Sentence"
                            multiline
                            rows={2}
                            value={values.exampleSentence ?? data.exampleSentence ?? ''}
                            onChange={e => setValues({...values, exampleSentence: e.target.value})}
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
                                value={values.partOfSpeech ?? data.partOfSpeech ?? ''}
                                onChange={e => setValues({...values, partOfSpeech: e.target.value})}
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
                            value={(values.synonymsEn ?? data.synonymsEn).join(', ')}
                            onChange={e =>
                                setValues({
                                    ...values,
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
                                Difficulty Level: {values.difficulty ?? data.difficulty ?? 3}/5
                            </Typography>
                            <Typography variant="caption" color="text.secondary" gutterBottom>
                                1 = beginner can learn easily, 5 = advanced
                            </Typography>
                            <Slider
                                value={values.difficulty ?? data.difficulty ?? 3}
                                onChange={(_, newValue) => setValues({...values, difficulty: newValue as number})}
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
                                Popularity: {values.popularity ?? data.popularity ?? 3}/5
                            </Typography>
                            <Typography variant="caption" color="text.secondary" gutterBottom>
                                1 = almost unused, 5 = very frequent (daily)
                            </Typography>
                            <Slider
                                value={values.popularity ?? data.popularity ?? 3}
                                onChange={(_, newValue) => setValues({...values, popularity: newValue as number})}
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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1" fontWeight="600" color="primary">
                            Pronunciation
                        </Typography>
                        <Tooltip title="Regenerate audio">
                            <IconButton
                                size="small"
                                onClick={handleRegenerateTextAudio}
                                disabled={regenerateAudio.isPending}
                                sx={{
                                    color: theme.palette.primary.main,
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    width: 28,
                                    height: 28,
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.2)
                                    }
                                }}
                            >
                                <RestartAltIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                    <Box sx={{ display: 'grid', gap: 2 }}>
                        <Typography variant="body2">
                            Phonetic: <b>{data.phonetic ?? '—'}</b>
                        </Typography>
                        {(values.audioUrl || data.audioUrl) && (
                            <audio controls src={values.audioUrl || data.audioUrl} style={{width: '100%'}} />
                        )}
                    </Box>
                </Paper>

                <Paper elevation={0} sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1" fontWeight="600" color="primary">
                            Example Pronunciation
                        </Typography>
                        <Tooltip title="Regenerate example audio">
                            <IconButton
                                size="small"
                                onClick={handleRegenerateExampleAudio}
                                disabled={regenerateAudio.isPending}
                                sx={{
                                    color: theme.palette.primary.main,
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    width: 28,
                                    height: 28,
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.2)
                                    }
                                }}
                            >
                                <RestartAltIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                    <Box sx={{ display: 'grid', gap: 1.5 }}>
                        {(values.exampleSentenceAudioUrl || data.exampleSentenceAudioUrl) && (
                            <audio controls src={values.exampleSentenceAudioUrl || data.exampleSentenceAudioUrl} style={{width: '100%'}} />
                        )}
                        {!values.exampleSentenceAudioUrl && !data.exampleSentenceAudioUrl && (
                            <Typography variant="body2" color="text.secondary">
                                No Example pronunciation available
                            </Typography>
                        )}
                    </Box>
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
                    onClick={() => {
                        onSave(values);
                        onClose();
                    }}
                    sx={{ 
                        borderRadius: 1.5,
                        px: 3,
                        bgcolor: '#2573ff',
                        '&:hover': {
                            bgcolor: '#1a5cd1'
                        }
                    }}
                >
                    Save Changes
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ReviewWordDialog;

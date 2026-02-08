import React from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    LinearProgress,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { vocabApi } from '../../services/vocabulary.api';
import { BatchWordsCreateResponse, BatchWordsPreviewResponse, VocabularyWord } from '../../types';
import { useUpdateWord } from '../../hooks/useVocabulary';
import ReviewWordDialog from './ReviewWordDialog';

interface BatchAddWordsDialogProps {
    open: boolean;
    teacherId?: string;
    onClose: () => void;
    onCreated?: (result: BatchWordsCreateResponse) => void;
}

const MAX_BATCH_SIZE = 30;

const parseInputs = (value: string): string[] =>
    value
        .split(/[\n,;]+/)
        .map(v => v.trim())
        .filter(v => v.length > 0);

const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
    NEW: 'success',
    DUPLICATE_REUSE: 'warning',
    INVALID: 'error'
};

const BatchAddWordsDialog: React.FC<BatchAddWordsDialogProps> = ({ open, teacherId, onClose, onCreated }) => {
    const qc = useQueryClient();
    const updateWord = useUpdateWord();
    const [rawInput, setRawInput] = React.useState('');
    const [preview, setPreview] = React.useState<BatchWordsPreviewResponse | null>(null);
    const [createdResult, setCreatedResult] = React.useState<BatchWordsCreateResponse | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [jobId, setJobId] = React.useState<string | null>(null);
    const [dots, setDots] = React.useState('');
    const [reviewWord, setReviewWord] = React.useState<VocabularyWord | null>(null);

    const parsedInputs = React.useMemo(() => parseInputs(rawInput), [rawInput]);
    const tooManyInputs = parsedInputs.length > MAX_BATCH_SIZE;

    const previewMutation = useMutation({
        mutationFn: () => {
            if (!teacherId) {
                throw new Error('Teacher id is required');
            }
            return vocabApi.previewBatch({
                teacherId,
                inputs: parsedInputs
            });
        },
        onSuccess: response => {
            setPreview(response);
            setCreatedResult(null);
            setError(null);
        },
        onError: err => {
            setError(err instanceof Error ? err.message : 'Failed to preview words');
        }
    });

    const createBatchJobMutation = useMutation({
        mutationFn: () => {
            if (!teacherId) {
                throw new Error('Teacher id is required');
            }
            return vocabApi.createBatchJob({
                teacherId,
                inputs: parsedInputs,
                reuseDuplicates: true,
                generateAudio: true
            });
        },
        onSuccess: response => {
            setJobId(response.jobId);
            setError(null);
            setCreatedResult(null);
        },
        onError: err => {
            setError(err instanceof Error ? err.message : 'Failed to start batch job');
        }
    });

    const jobStatusQuery = useQuery({
        queryKey: ['vocabulary', 'batch-job', jobId],
        queryFn: () => vocabApi.getBatchJobStatus(jobId as string),
        enabled: Boolean(jobId),
        refetchInterval: query => {
            const status = query.state.data?.status;
            if (status === 'QUEUED' || status === 'RUNNING') {
                return 1200;
            }
            return false;
        }
    });

    React.useEffect(() => {
        const status = jobStatusQuery.data?.status;
        if (status !== 'QUEUED' && status !== 'RUNNING') {
            setDots('');
            return;
        }
        const timer = setInterval(() => {
            setDots(prev => {
                if (prev.length >= 3) return '';
                return prev + '.';
            });
        }, 350);
        return () => clearInterval(timer);
    }, [jobStatusQuery.data?.status]);

    React.useEffect(() => {
        const data = jobStatusQuery.data;
        const status = data?.status;
        if (!status || !data) return;

        if (status === 'COMPLETED') {
            if (data.result) {
                setCreatedResult(data.result);
                qc.invalidateQueries({ queryKey: ['vocabulary', 'words'] });
                setError(null);
            } else {
                setError('Batch job completed but no result was returned.');
            }
        }

        if (status === 'FAILED') {
            setError(data.message || 'Batch job failed');
        }
    }, [jobStatusQuery.data, qc]);

    const resetState = React.useCallback(() => {
        setRawInput('');
        setPreview(null);
        setCreatedResult(null);
        setError(null);
        setJobId(null);
        setDots('');
        setReviewWord(null);
        previewMutation.reset();
        createBatchJobMutation.reset();
    }, [createBatchJobMutation, previewMutation]);

    const handleClose = () => {
        onClose();
        setTimeout(resetState, 200);
    };

    const jobStatus = jobStatusQuery.data?.status;
    const isJobInProgress = createBatchJobMutation.isPending || jobStatus === 'QUEUED' || jobStatus === 'RUNNING';
    const canPreview = parsedInputs.length > 0 && !tooManyInputs && !previewMutation.isPending && !isJobInProgress;
    const canCreate = Boolean(preview) && !tooManyInputs && !isJobInProgress;
    const progressPct = jobStatusQuery.data?.progressPct ?? 0;
    const progressKnown = Boolean(jobStatusQuery.data && jobStatus !== 'QUEUED');
    const resultWords = React.useMemo(() => {
        if (!createdResult) {
            return [] as Array<{ word: VocabularyWord; source: 'CREATED' | 'REUSED' }>;
        }
        return [
            ...createdResult.created.map(word => ({ word, source: 'CREATED' as const })),
            ...createdResult.reused.map(word => ({ word, source: 'REUSED' as const }))
        ];
    }, [createdResult]);

    const handleReviewSave = React.useCallback((patch: Partial<VocabularyWord>) => {
        if (!reviewWord) {
            return;
        }
        updateWord.mutate(
            { id: reviewWord.id, dto: patch },
            {
                onSuccess: updatedWord => {
                    setCreatedResult(prev => {
                        if (!prev) {
                            return prev;
                        }
                        const mapWords = (words: VocabularyWord[]) =>
                            words.map(word => (word.id === updatedWord.id ? updatedWord : word));
                        return {
                            ...prev,
                            created: mapWords(prev.created),
                            reused: mapWords(prev.reused)
                        };
                    });
                    qc.invalidateQueries({ queryKey: ['vocabulary', 'words'] });
                    setError(null);
                },
                onError: err => {
                    setError(err instanceof Error ? err.message : 'Failed to update word');
                }
            }
        );
    }, [qc, reviewWord, updateWord]);

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>Batch Add Vocabulary</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                        Paste up to {MAX_BATCH_SIZE} words. You can separate words by new line, comma, or semicolon.
                    </Typography>

                    <TextField
                        multiline
                        minRows={6}
                        maxRows={10}
                        label="Words"
                        placeholder={'accomplish\nresilient\nmandatory'}
                        value={rawInput}
                        onChange={event => {
                            setRawInput(event.target.value);
                            setPreview(null);
                            setCreatedResult(null);
                            setError(null);
                        }}
                        fullWidth
                    />

                    <Stack direction="row" spacing={1} alignItems="center">
                        <Chip label={`Detected: ${parsedInputs.length}`} size="small" />
                        {tooManyInputs && (
                            <Chip color="error" size="small" label={`Limit is ${MAX_BATCH_SIZE}`} />
                        )}
                    </Stack>

                    {error && <Alert severity="error">{error}</Alert>}

                    {isJobInProgress && (
                        <Box
                            sx={{
                                p: 2,
                                borderRadius: 2,
                                color: 'white',
                                background: 'linear-gradient(120deg, #2573ff, #00bfa5, #2573ff)',
                                backgroundSize: '200% 200%',
                                animation: 'vocabBatchGradient 3.2s ease infinite',
                                '@keyframes vocabBatchGradient': {
                                    '0%': { backgroundPosition: '0% 50%' },
                                    '50%': { backgroundPosition: '100% 50%' },
                                    '100%': { backgroundPosition: '0% 50%' }
                                }
                            }}
                        >
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                <CircularProgress size={18} color="inherit" />
                                <Typography variant="subtitle2">
                                    Processing batch{dots}
                                </Typography>
                            </Stack>
                            <LinearProgress
                                variant={progressKnown ? 'determinate' : 'indeterminate'}
                                value={progressKnown ? progressPct : undefined}
                                sx={{
                                    height: 8,
                                    borderRadius: 999,
                                    bgcolor: 'rgba(255,255,255,0.24)',
                                    '& .MuiLinearProgress-bar': {
                                        bgcolor: '#fff'
                                    }
                                }}
                            />
                            <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.95 }}>
                                {jobStatusQuery.data?.processedCount ?? 0}/{jobStatusQuery.data?.totalCount ?? parsedInputs.length} processed
                                {' · '}created {jobStatusQuery.data?.createdCount ?? 0}
                                {' · '}reused {jobStatusQuery.data?.reusedCount ?? 0}
                                {' · '}failed {jobStatusQuery.data?.failedCount ?? 0}
                            </Typography>
                        </Box>
                    )}

                    {preview && (
                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                Preview
                            </Typography>
                            <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
                                <Chip size="small" color="success" label={`New: ${preview.summary.newCount}`} />
                                <Chip size="small" color="warning" label={`Reuse: ${preview.summary.duplicateCount}`} />
                                <Chip size="small" color="error" label={`Invalid: ${preview.summary.invalidCount}`} />
                            </Stack>
                            <TableContainer sx={{ maxHeight: 320, border: '1px solid rgba(0,0,0,0.12)', borderRadius: 1 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Input</TableCell>
                                            <TableCell>Status</TableCell>
                                            <TableCell>Reason</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {preview.rows.map((row, index) => (
                                            <TableRow key={`${row.input}-${index}`}>
                                                <TableCell>{row.input || '(empty)'}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        size="small"
                                                        color={statusColorMap[row.status] || 'default'}
                                                        label={row.status}
                                                    />
                                                </TableCell>
                                                <TableCell>{row.reason || '-'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    )}

                    {createdResult && (
                        <Box sx={{ display: 'grid', gap: 1.5 }}>
                            <Alert severity={createdResult.summary.failedCount > 0 ? 'warning' : 'success'}>
                                Created: {createdResult.summary.createdCount}, reused: {createdResult.summary.reusedCount}, failed: {createdResult.summary.failedCount}
                            </Alert>
                            {resultWords.length > 0 && (
                                <Box>
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                        Review saved words
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                        Click a row to review and edit the word.
                                    </Typography>
                                    <TableContainer sx={{ maxHeight: 320, border: '1px solid rgba(0,0,0,0.12)', borderRadius: 1 }}>
                                        <Table size="small" stickyHeader>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Word</TableCell>
                                                    <TableCell>Translation</TableCell>
                                                    <TableCell>Source</TableCell>
                                                    <TableCell>Difficulty</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {resultWords.map(({ word, source }) => (
                                                    <TableRow
                                                        key={`${source}-${word.id}`}
                                                        hover
                                                        onClick={() => setReviewWord(word)}
                                                        sx={{ cursor: 'pointer' }}
                                                    >
                                                        <TableCell>{word.text}</TableCell>
                                                        <TableCell>{word.translation || '-'}</TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                size="small"
                                                                color={source === 'CREATED' ? 'success' : 'warning'}
                                                                label={source}
                                                            />
                                                        </TableCell>
                                                        <TableCell>{word.difficulty ?? '-'}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>
                            )}
                        </Box>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Close</Button>
                <Button onClick={() => previewMutation.mutate()} disabled={!canPreview} variant="outlined">
                    {previewMutation.isPending ? <CircularProgress size={16} /> : 'Preview'}
                </Button>
                <Button onClick={() => createBatchJobMutation.mutate()} disabled={!canCreate} variant="contained">
                    {isJobInProgress ? <CircularProgress size={16} /> : 'Create'}
                </Button>
                {createdResult && createdResult.allWordIdsForHomework.length > 0 && (
                    <Button
                        variant="contained"
                        color="secondary"
                        onClick={() => onCreated?.(createdResult)}
                    >
                        Create Homework From Batch
                    </Button>
                )}
            </DialogActions>
            <ReviewWordDialog
                open={Boolean(reviewWord)}
                data={reviewWord}
                onSave={handleReviewSave}
                onClose={() => setReviewWord(null)}
            />
        </Dialog>
    );
};

export default BatchAddWordsDialog;

import React, { useMemo } from 'react';
import {
    Alert,
    Box,
    CircularProgress,
    Chip,
    Divider,
    Stack,
    Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { fetchListeningTasks, getListeningTranscript } from '../../../services/api';
import { resolveUrl } from '../../../services/assets';
import type { Material } from '../../../types/material';
import type { ListeningTask } from '../../../types/ListeningTask';

interface ListeningMaterialViewerProps {
    material: Material;
    open: boolean;
}

const selectActiveTask = (tasks: ListeningTask[]): ListeningTask | undefined =>
    tasks.find((task) => task.status === 'READY') ?? tasks[0];

const formatDuration = (seconds: number | null | undefined) => {
    if (seconds == null || Number.isNaN(seconds)) return null;
    const total = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(total / 60);
    const remaining = total % 60;
    return `${minutes}:${remaining.toString().padStart(2, '0')}`;
};

const ListeningMaterialViewer: React.FC<ListeningMaterialViewerProps> = ({ material, open }) => {
    const { user } = useAuth();

    const {
        data: tasks = [],
        isLoading: tasksLoading,
        isError: tasksError,
        error: tasksErrorObj,
    } = useQuery({
        queryKey: ['listeningTasks', material.id],
        queryFn: () => fetchListeningTasks(material.id),
        enabled: open && material.type === 'LISTENING',
        staleTime: 30_000,
    });

    const activeTask = useMemo(() => selectActiveTask(tasks), [tasks]);
    const transcriptId = activeTask?.transcriptId;

    const {
        data: transcriptData,
        isLoading: transcriptLoading,
        isError: transcriptError,
        error: transcriptErrorObj,
    } = useQuery({
        queryKey: ['listeningTranscript', transcriptId],
        queryFn: () => getListeningTranscript(user!.id, transcriptId!),
        enabled: open && !!transcriptId && !!user?.id,
        retry: false,
        staleTime: 30_000,
    });

    const audioUrlRaw = activeTask?.audioUrl || material.sourceUrl || '';
    const audioUrl = audioUrlRaw ? resolveUrl(audioUrlRaw) : '';
    const transcriptText = transcriptData?.transcript ?? activeTask?.transcriptText ?? '';
    const wordCoverage = transcriptData?.wordCoverage;
    const durationSec = activeTask
        ? Math.max(0, (activeTask.endSec ?? 0) - (activeTask.startSec ?? 0))
        : material.duration ?? null;

    const highlightedTranscript = useMemo(() => {
        if (!transcriptText) return null;
        if (!wordCoverage || Object.keys(wordCoverage).length === 0) return transcriptText;

        const escapeRegExp = (value: string) => value.replace(/([-\\^$*+?.()|[\]{}])/g, '\\$1');
        const coveredWords = Object.entries(wordCoverage)
            .filter(([, covered]) => !!covered)
            .map(([word]) => word.trim())
            .filter(Boolean);

        if (coveredWords.length === 0) return transcriptText;

        const pattern = new RegExp(
            coveredWords
                .sort((a, b) => b.length - a.length)
                .map((word) => escapeRegExp(word))
                .join('|'),
            'gi',
        );

        const nodes: React.ReactNode[] = [];
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = pattern.exec(transcriptText)) !== null) {
            if (match.index > lastIndex) {
                nodes.push(transcriptText.slice(lastIndex, match.index));
            }

            const matchedText = match[0];
            nodes.push(
                <Box
                    key={`hit-${match.index}-${matchedText}-${nodes.length}`}
                    component="strong"
                    sx={{ color: '#1d4ed8' }}
                >
                    {matchedText}
                </Box>,
            );

            lastIndex = match.index + matchedText.length;
        }

        if (lastIndex < transcriptText.length) {
            nodes.push(transcriptText.slice(lastIndex));
        }

        return nodes.length > 0 ? nodes : transcriptText;
    }, [transcriptText, wordCoverage]);

    if (tasksLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (tasksError) {
        return (
            <Alert severity="error">
                {tasksErrorObj instanceof Error ? tasksErrorObj.message : 'Failed to load listening task.'}
            </Alert>
        );
    }

    if (!activeTask || !audioUrl) {
        return (
            <Alert severity="warning">
                Audio preview is unavailable for this listening material.
            </Alert>
        );
    }

    return (
        <Stack spacing={3}>
            <Box>
                <audio controls src={audioUrl} style={{ width: '100%' }} aria-label={material.title || 'Listening audio'}>
                    Your browser does not support the audio element.
                </audio>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    {formatDuration(durationSec) ?? 'Duration unavailable'}
                </Typography>
            </Box>

            {(activeTask.targetWords?.length ?? 0) > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {activeTask.targetWords!.map((word) => (
                        <Chip key={word} label={word} size="small" color="primary" variant="outlined" />
                    ))}
                </Stack>
            )}

            <Divider />

            {transcriptLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={24} />
                </Box>
            )}

            {transcriptError && !transcriptText && (
                <Alert severity="warning">
                    {transcriptErrorObj instanceof Error ? transcriptErrorObj.message : 'Transcript is unavailable.'}
                </Alert>
            )}

            {transcriptText && (
                <Stack spacing={1}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        Transcript
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                        {highlightedTranscript}
                    </Typography>
                </Stack>
            )}
        </Stack>
    );
};

export default ListeningMaterialViewer;

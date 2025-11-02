import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  Paper,
  Radio,
  Slider,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import ReplayIcon from '@mui/icons-material/Replay';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import { useSnackbar } from 'notistack';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import {
  getListeningAudioJobStatus,
  listListeningVoices,
  startListeningAudioGeneration,
} from '../../services/api';
import type {
  ListeningAudioJobStartResponse,
  ListeningAudioJobStatus,
  ListeningAudioJobStatusResponse,
  ListeningGeneratedAudioContentRef,
  ListeningTranscriptMetadata,
  ListeningVoice,
  ListeningVoiceSettings,
  StartListeningAudioJobPayload,
} from '../../types';

const DEFAULT_VOICE_SETTINGS: ListeningVoiceSettings = {
  stability: 0.4,
  similarity_boost: 0.7,
  style: 0.2,
  speed: 1.0,
  use_speaker_boost: true,
};

const MAX_WAIT_MS = 90_000;
const POLL_DELAYS_MS = [1_000, 2_000, 4_000, 5_000];

const generateKey = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

const isTerminalStatus = (status: ListeningAudioJobStatus | undefined | null) =>
  status === 'SUCCEEDED' || status === 'FAILED' || status === 'CANCELLED' || status === 'EXPIRED';

const normalizeTranscript = (value: string) => value.trim().replace(/\s+/g, ' ');

interface PersistedJobState {
  jobId: string;
  idempotencyKey: string;
  voiceId: string;
  voiceSettings: ListeningVoiceSettings;
  transcript: string;
  startedAt: number;
}

export interface ListeningAudioGenerationPanelProps {
  transcriptId: string | null;
  transcriptText: string;
  metadata?: ListeningTranscriptMetadata;
  wordIds: string[];
  coverageSatisfied: boolean;
  disabled?: boolean;
  languageCode?: string;
  theme?: string;
  cefr?: string;
  hasUnsavedTranscriptEdits: boolean;
  onAudioContentChange: (content: ListeningGeneratedAudioContentRef | null) => void;
  onDurationUpdate?: (durationSec: number | null) => void;
  onStatusChange?: (status: ListeningAudioJobStatus | null) => void;
}

const ListeningAudioGenerationPanel: React.FC<ListeningAudioGenerationPanelProps> = ({
  transcriptId,
  transcriptText,
  metadata,
  wordIds,
  coverageSatisfied,
  disabled,
  languageCode,
  theme,
  cefr,
  hasUnsavedTranscriptEdits,
  onAudioContentChange,
  onDurationUpdate,
  onStatusChange,
}) => {
  const { token, user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [search, setSearch] = useState('');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
  const [voiceSettings, setVoiceSettings] = useState<ListeningVoiceSettings>(DEFAULT_VOICE_SETTINGS);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(generateKey());
  const [job, setJob] = useState<ListeningAudioJobStatusResponse | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [needsRegeneration, setNeedsRegeneration] = useState(false);
  const [audioContent, setAudioContent] = useState<ListeningGeneratedAudioContentRef | null>(null);
  const [transcriptUsed, setTranscriptUsed] = useState<string | null>(null);
  const [pollIndex, setPollIndex] = useState(0);
  const [jobStartedAt, setJobStartedAt] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [documentHidden, setDocumentHidden] = useState<boolean>(false);
  const bannerRef = useRef<HTMLDivElement | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewingVoiceRef = useRef<string | null>(null);
  const lastProgressStatus = useRef<ListeningAudioJobStatus | null>(null);
  const lastTranscriptProp = useRef<string>('');
  const previousStorageKeyRef = useRef<string | null>(null);
  // Track which jobId has already had success side-effects applied
  const processedSuccessJobIdRef = useRef<string | null>(null);

  const storageKey = useMemo(() => (transcriptId ? `listeningAudioJob:${transcriptId}` : null), [transcriptId]);

  const voicesQuery = useQuery({
    queryKey: ['listening-voices'],
    queryFn: () => listListeningVoices(),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const voices = voicesQuery.data ?? [];

  useEffect(() => {
    if (!selectedVoiceId && voices.length > 0) {
      setSelectedVoiceId(voices[0].voiceId);
      if (voices[0].settings) {
        setVoiceSettings((prev) => ({ ...prev, ...voices[0].settings }));
      }
    }
  }, [voices, selectedVoiceId]);

  const filteredVoices = useMemo(() => {
    if (!search.trim()) return voices;
    const q = search.trim().toLowerCase();
    return voices.filter((voice) => voice.name.toLowerCase().includes(q));
  }, [voices, search]);

  const persistJobState = useCallback(
    (state: PersistedJobState | null) => {
      if (!storageKey || typeof window === 'undefined') return;
      if (!state) {
        sessionStorage.removeItem(storageKey);
      } else {
        sessionStorage.setItem(storageKey, JSON.stringify(state));
      }
    },
    [storageKey],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (previousStorageKeyRef.current && previousStorageKeyRef.current !== storageKey) {
      sessionStorage.removeItem(previousStorageKeyRef.current);
    }
    previousStorageKeyRef.current = storageKey;
  }, [storageKey]);

  // Resume any persisted job state when transcriptId changes
  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') {
      setJob(null);
      setAudioContent(null);
      setTranscriptUsed(null);
      return;
    }

    const raw = sessionStorage.getItem(storageKey);
    if (!raw) {
      setJob(null);
      setAudioContent(null);
      setTranscriptUsed(null);
      return;
    }

    try {
      const saved: PersistedJobState = JSON.parse(raw);
      if (saved.idempotencyKey) setIdempotencyKey(saved.idempotencyKey);
      if (saved.voiceId) setSelectedVoiceId(saved.voiceId);
      if (saved.voiceSettings) setVoiceSettings((prev) => ({ ...prev, ...saved.voiceSettings }));
      setJobStartedAt(saved.startedAt || Date.now());
      if (saved.jobId) {
        getListeningAudioJobStatus(saved.jobId)
          .then((status) => {
            setJob(status);
            if (status.status === 'SUCCEEDED' && status.audioUrl) {
              const durationSec = status.durationSec ?? null;
              if (durationSec != null) {
                onDurationUpdate?.(durationSec);
              }
              const content: ListeningGeneratedAudioContentRef = {
                sourceKind: 'GENERATED_AUDIO',
                generatorRequestId: status.jobId,
                audioMaterialId: status.audioMaterialId,
                audioUrl: status.audioUrl,
                transcriptId: transcriptId as string,
                durationSec: status.durationSec ?? 0,
                wordIds,
                theme: theme ?? metadata?.theme,
                cefr: cefr ?? metadata?.cefr,
                metadata,
                voiceId: saved.voiceId,
                voiceSettings: saved.voiceSettings,
              };
              setAudioContent(content);
              setTranscriptUsed(normalizeTranscript(saved.transcript || transcriptText));
              onAudioContentChange(content);
              persistJobState(null);
            } else if (status.status && !isTerminalStatus(status.status)) {
              setJobStartedAt(saved.startedAt || Date.now());
            } else if (status.status === 'FAILED') {
              setJobError(status.message || status.error || 'Audio generation failed.');
            }
          })
          .catch(() => {
            setJob(null);
            persistJobState(null);
          });
      }
    } catch {
      persistJobState(null);
      setJob(null);
    }
  }, [storageKey]);

  // Track document visibility for adaptive polling
  useEffect(() => {
    const handleVisibility = () => {
      setDocumentHidden(document.visibilityState === 'hidden');
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const stopPreviewAudio = useCallback(() => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }
    previewingVoiceRef.current = null;
  }, []);

  useEffect(() => () => stopPreviewAudio(), [stopPreviewAudio]);

  const handlePreview = useCallback(
    (voice: ListeningVoice) => {
      if (!voice.previewUrl) return;

      if (!previewAudioRef.current) {
        previewAudioRef.current = new Audio();
      }

      const audio = previewAudioRef.current;
      if (previewingVoiceRef.current === voice.voiceId) {
        stopPreviewAudio();
        return;
      }

      audio.src = voice.previewUrl;
      audio.play().catch(() => {
        enqueueSnackbar('Unable to play preview. Please check your audio output.', { variant: 'warning' });
      });
      previewingVoiceRef.current = voice.voiceId;
      audio.onended = () => {
        previewingVoiceRef.current = null;
      };
    },
    [enqueueSnackbar, stopPreviewAudio],
  );

  const resetAudioState = useCallback(
    (resetSelection = false) => {
      setJob(null);
      setJobError(null);
      setAudioContent(null);
      setTranscriptUsed(null);
      setNeedsRegeneration(false);
      setPollIndex(0);
      setJobStartedAt(null);
      onAudioContentChange(null);
      onStatusChange?.(null);
      if (resetSelection) {
        setIdempotencyKey(generateKey());
      }
      if (storageKey) {
        persistJobState(null);
      }
    },
    [onAudioContentChange, onStatusChange, persistJobState, storageKey],
  );

  // Invalidate generated audio when transcript changes meaningfully
  useEffect(() => {
    const normalized = normalizeTranscript(transcriptText);
    if (!audioContent) {
      lastTranscriptProp.current = normalized;
      return;
    }
    if (transcriptUsed && normalized !== transcriptUsed) {
      setNeedsRegeneration(true);
      onAudioContentChange(null);
    } else if (needsRegeneration && transcriptUsed && normalized === transcriptUsed) {
      setNeedsRegeneration(false);
      onAudioContentChange(audioContent);
    }
    lastTranscriptProp.current = normalized;
  }, [audioContent, transcriptText, transcriptUsed, needsRegeneration, onAudioContentChange]);

  useEffect(() => {
    if (!hasUnsavedTranscriptEdits) return;
    if (audioContent) {
      setNeedsRegeneration(true);
      onAudioContentChange(null);
    }
  }, [hasUnsavedTranscriptEdits, audioContent, onAudioContentChange]);

  // Poll job status until terminal state
  useEffect(() => {
    if (!job || !job.jobId || isTerminalStatus(job.status)) {
      return undefined;
    }

    const delay = documentHidden ? Math.max(POLL_DELAYS_MS[pollIndex] ?? 5_000, 5_000) : POLL_DELAYS_MS[pollIndex] ?? 5_000;

    const timeout = window.setTimeout(async () => {
      try {
        const status = await getListeningAudioJobStatus(job.jobId);
        setJob(status);
      } catch (error) {
        console.error('Failed to poll audio job', error);
        setJobError('Lost connection while polling audio job. Retrying...');
      }
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [job, pollIndex, documentHidden]);

  // Handle job transitions
  useEffect(() => {
    const status = job?.status ?? null;
    if (status && status !== lastProgressStatus.current) {
      onStatusChange?.(status);
      lastProgressStatus.current = status;
      if (bannerRef.current) {
        bannerRef.current.focus({ preventScroll: false });
      }
    }

    if (!job || !job.jobId) return;

    if (!jobStartedAt) {
      setJobStartedAt(Date.now());
    }

    if (!status) return;

    if (!isTerminalStatus(status)) {
      setPollIndex((prev) => Math.min(prev + 1, POLL_DELAYS_MS.length - 1));
      if (jobStartedAt && Date.now() - jobStartedAt > MAX_WAIT_MS) {
        setJob({ ...job, status: 'FAILED' });
        setJobError('Audio generation timed out. Please try again.');
        enqueueSnackbar('Audio generation timed out. Try again.', { variant: 'error' });
        persistJobState(null);
      }
      return;
    }

    if (status === 'SUCCEEDED') {
      // Guard to avoid re-running success side-effects on re-renders or StrictMode double-invoke
      if (processedSuccessJobIdRef.current === job.jobId) {
        return;
      }
      processedSuccessJobIdRef.current = job.jobId;
      if (job.audioUrl) {
        const normalizedTranscript = normalizeTranscript(transcriptText);
        const durationSec = job.durationSec ?? null;
        if (durationSec != null) {
          onDurationUpdate?.(durationSec);
        }
        const content: ListeningGeneratedAudioContentRef = {
          sourceKind: 'GENERATED_AUDIO',
          generatorRequestId: job.jobId,
          audioMaterialId: job.audioMaterialId,
          audioUrl: job.audioUrl,
          transcriptId: transcriptId as string,
          durationSec: job.durationSec ?? 0,
          wordIds,
          theme: theme ?? metadata?.theme,
          cefr: cefr ?? metadata?.cefr,
          metadata,
          voiceId: selectedVoiceId || undefined,
          voiceSettings: voiceSettings,
        };
        setAudioContent(content);
        setTranscriptUsed(normalizedTranscript);
        setNeedsRegeneration(false);
        onAudioContentChange(content);
        enqueueSnackbar('Audio ready! Review the preview below.', { variant: 'success' });
      } else {
        setJobError('Audio job completed without an audio asset.');
        enqueueSnackbar('Audio generation completed but no audio was returned.', { variant: 'warning' });
      }
      persistJobState(null);
      setIdempotencyKey(generateKey());
    } else if (status === 'FAILED' || status === 'CANCELLED' || status === 'EXPIRED') {
      const errorMessage = job.message || job.error || 'Audio generation failed. Please retry.';
      setJobError(errorMessage);
      enqueueSnackbar(errorMessage, { variant: 'error' });
      persistJobState(null);
      setIdempotencyKey(generateKey());
    }
  }, [job, enqueueSnackbar, metadata, onAudioContentChange, onDurationUpdate, onStatusChange, persistJobState, jobStartedAt, wordIds, theme, cefr, selectedVoiceId]);

  const handleGenerateAudio = async () => {
    if (!transcriptId || !transcriptText.trim()) {
      enqueueSnackbar('Generate and save a transcript before creating audio.', { variant: 'warning' });
      return;
    }
    if (!token) {
      enqueueSnackbar('You need to be signed in to generate audio.', { variant: 'error' });
      return;
    }
    if (!selectedVoiceId) {
      enqueueSnackbar('Select a voice to continue.', { variant: 'warning' });
      return;
    }
    if (!coverageSatisfied) {
      enqueueSnackbar('Please ensure every focus word appears in the transcript.', { variant: 'warning' });
      return;
    }

    stopPreviewAudio();
    setIsSubmitting(true);
    setJobError(null);

    const payload: StartListeningAudioJobPayload = {
      transcriptId,
      transcriptOverride: transcriptText.trim(),
      voiceId: selectedVoiceId,
      ttsModel: 'eleven_multilingual_v2',
      languageCode: (metadata?.language || languageCode || 'en-US') as string,
      voiceSettings: {
        ...DEFAULT_VOICE_SETTINGS,
        ...voiceSettings,
      },
      outputFormat: 'mp3_44100_128',
      metadata: {
        ...(metadata || {}),
        ...(theme ? { theme } : {}),
        ...(cefr ? { cefr } : {}),
      },
    };

    try {
      const response: ListeningAudioJobStartResponse = await startListeningAudioGeneration(user?.id as string, payload, token, idempotencyKey);
      setJob({ jobId: response.jobId, status: response.status });
      setJobStartedAt(Date.now());
      setPollIndex(0);
      setNeedsRegeneration(false);
      onAudioContentChange(null);
      onStatusChange?.(response.status);
      persistJobState({
        jobId: response.jobId,
        idempotencyKey,
        voiceId: selectedVoiceId,
        voiceSettings,
        transcript: normalizeTranscript(transcriptText),
        startedAt: Date.now(),
      });
      enqueueSnackbar('Audio generation started. This may take up to a minute.', { variant: 'info' });
    } catch (error: any) {
      console.error('Failed to start audio generation', error);
      const message = error?.response?.data?.message || error?.message || 'Unable to start audio generation.';
      setJobError(message);
      enqueueSnackbar(message, { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setIdempotencyKey(generateKey());
    resetAudioState(false);
  };

  const handleReplaceAudio = () => {
    resetAudioState(true);
  };

  const canGenerate =
    !disabled &&
    !!transcriptId &&
    !!transcriptText.trim() &&
    !!selectedVoiceId &&
    coverageSatisfied &&
    !isSubmitting &&
    !(job && !isTerminalStatus(job.status));

  const currentStatus = job?.status ?? (audioContent ? 'SUCCEEDED' : null);

  const showAdvancedHint = advancedOpen ? 'Hide advanced voice controls' : 'Show advanced voice controls';

  return (
    <Stack spacing={2} sx={{ mt: 3 }}>
      <Divider flexItem sx={{ borderStyle: 'dashed', opacity: 0.6 }} />
      <Stack direction="row" spacing={1} alignItems="center">
        <GraphicEqIcon color="primary" fontSize="small" />
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Audio generation</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        Choose a narration voice, optionally tweak the delivery, then generate an MP3 preview for this listening task.
      </Typography>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'flex-start' }}>
            <Stack spacing={1.5} flex={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <VolumeUpIcon fontSize="small" color="action" />
                <Typography variant="subtitle2">Voice</Typography>
              </Stack>
              <TextField
                size="small"
                label="Search voices"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Type to filter"
              />
              <Stack spacing={1} sx={{ maxHeight: 240, overflowY: 'auto', pr: 1 }}>
                {filteredVoices.map((voice) => {
                  const isSelected = voice.voiceId === selectedVoiceId;
                  const isPreviewing = previewingVoiceRef.current === voice.voiceId;
                  return (
                    <Paper
                      key={voice.voiceId}
                      variant={isSelected ? 'outlined' : 'elevation'}
                      elevation={isSelected ? 0 : 1}
                      sx={{
                        borderColor: isSelected ? 'primary.main' : undefined,
                        px: 1.5,
                        py: 1,
                        cursor: 'pointer',
                        transition: 'border-color 0.2s ease',
                        '&:hover': { borderColor: 'primary.main', boxShadow: '0 0 0 1px rgba(37,115,255,0.24)' },
                      }}
                      onClick={() => {
                        setSelectedVoiceId(voice.voiceId);
                        if (voice.settings) {
                          setVoiceSettings((prev) => ({ ...prev, ...voice.settings }));
                        }
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Radio
                          checked={isSelected}
                          value={voice.voiceId}
                          onChange={() => setSelectedVoiceId(voice.voiceId)}
                          inputProps={{ 'aria-label': voice.name }}
                        />
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {voice.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {voice.voiceId}
                          </Typography>
                        </Box>
                        {voice.previewUrl && (
                          <IconButton
                            aria-label={`Preview ${voice.name}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              handlePreview(voice);
                            }}
                            size="small"
                          >
                            {isPreviewing ? <StopIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
                          </IconButton>
                        )}
                      </Stack>
                    </Paper>
                  );
                })}
                {!voicesQuery.isLoading && filteredVoices.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No voices match your search.
                  </Typography>
                )}
                {voicesQuery.isLoading && (
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" py={2}>
                    <CircularProgress size={18} />
                    <Typography variant="body2">Loading voices…</Typography>
                  </Stack>
                )}
              </Stack>
            </Stack>
            <Divider flexItem orientation="vertical" sx={{ display: { xs: 'none', md: 'block' } }} />
            <Stack spacing={2} flex={1}>
              <Button
                variant="text"
                onClick={() => setAdvancedOpen((prev) => !prev)}
                sx={{ alignSelf: 'flex-start', px: 0 }}
              >
                {showAdvancedHint}
              </Button>
              <Collapse in={advancedOpen} unmountOnExit>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Stability ({voiceSettings.stability?.toFixed(2) ?? '—'})</Typography>
                    <Slider
                      value={voiceSettings.stability ?? DEFAULT_VOICE_SETTINGS.stability ?? 0}
                      onChange={(_, value) =>
                        setVoiceSettings((prev) => ({ ...prev, stability: Array.isArray(value) ? value[0] : value }))
                      }
                      step={0.05}
                      min={0}
                      max={1}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Similarity boost ({voiceSettings.similarity_boost?.toFixed(2) ?? '—'})
                    </Typography>
                    <Slider
                      value={voiceSettings.similarity_boost ?? DEFAULT_VOICE_SETTINGS.similarity_boost ?? 0}
                      onChange={(_, value) =>
                        setVoiceSettings((prev) => ({ ...prev, similarity_boost: Array.isArray(value) ? value[0] : value }))
                      }
                      step={0.05}
                      min={0}
                      max={1}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Style ({voiceSettings.style?.toFixed(2) ?? '—'})</Typography>
                    <Slider
                      value={voiceSettings.style ?? DEFAULT_VOICE_SETTINGS.style ?? 0}
                      onChange={(_, value) =>
                        setVoiceSettings((prev) => ({ ...prev, style: Array.isArray(value) ? value[0] : value }))
                      }
                      step={0.05}
                      min={0}
                      max={1}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Speed ({voiceSettings.speed?.toFixed(2) ?? '—'})</Typography>
                    <Slider
                      value={voiceSettings.speed ?? DEFAULT_VOICE_SETTINGS.speed ?? 1}
                      onChange={(_, value) =>
                        setVoiceSettings((prev) => ({ ...prev, speed: Array.isArray(value) ? value[0] : value }))
                      }
                      step={0.05}
                      min={0.5}
                      max={1.5}
                    />
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Switch
                      checked={voiceSettings.use_speaker_boost ?? DEFAULT_VOICE_SETTINGS.use_speaker_boost ?? false}
                      onChange={(event) =>
                        setVoiceSettings((prev) => ({ ...prev, use_speaker_boost: event.target.checked }))
                      }
                    />
                    <Typography variant="body2">Use speaker boost</Typography>
                  </Stack>
                </Stack>
              </Collapse>
            </Stack>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
            <Button
              variant="contained"
              onClick={handleGenerateAudio}
              disabled={!canGenerate}
              sx={{ minWidth: 200 }}
            >
              {isSubmitting || (job && !isTerminalStatus(job.status)) ? (
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                  <CircularProgress size={18} sx={{ color: 'white' }} />
                  <span>Generating…</span>
                </Stack>
              ) : (
                'Generate audio'
              )}
            </Button>
            {needsRegeneration && (
              <Button variant="outlined" color="warning" onClick={handleReplaceAudio} startIcon={<ReplayIcon />}>
                Regenerate with new transcript
              </Button>
            )}
          </Stack>

          {jobError && (
            <Alert severity="error" ref={bannerRef} tabIndex={-1} sx={{ outline: 'none' }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                <Typography variant="body2">{jobError}</Typography>
                <Button size="small" color="inherit" onClick={handleRetry} startIcon={<ReplayIcon fontSize="small" />}>
                  Retry
                </Button>
              </Stack>
            </Alert>
          )}

          {!jobError && job && !isTerminalStatus(job.status) && (
            <Alert severity="info" ref={bannerRef} tabIndex={-1} icon={<CircularProgress size={16} />} sx={{ outline: 'none' }}>
              <Typography variant="body2">Audio generation in progress… ({job.status})</Typography>
            </Alert>
          )}

          {!job && !audioContent && (
            <Alert severity="info" ref={bannerRef} tabIndex={-1} sx={{ outline: 'none' }}>
              Start the audio job once your transcript looks good. You can regenerate as many times as you like.
            </Alert>
          )}

          {audioContent && (
            <Stack spacing={1.5}>
              <Alert severity={needsRegeneration ? 'warning' : 'success'} ref={bannerRef} tabIndex={-1} sx={{ outline: 'none' }}>
                {needsRegeneration
                  ? 'The transcript changed after this audio was generated. Generate a fresh take to stay in sync.'
                  : 'Audio ready! Preview below and replace it anytime.'}
              </Alert>
              <audio
                controls
                src={audioContent.audioUrl}
                preload="none"
                style={{ width: '100%' }}
              >
                Your browser does not support the audio element.
              </audio>
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Duration: {audioContent.durationSec ? Math.round(audioContent.durationSec) : '—'} sec
                </Typography>
                <Button size="small" variant="text" color="primary" onClick={handleReplaceAudio} startIcon={<ReplayIcon fontSize="small" />}>
                  Replace audio
                </Button>
              </Stack>
            </Stack>
          )}
        </Stack>
      </Paper>

      {currentStatus === 'SUCCEEDED' && !audioContent && !jobError && (
        <Typography variant="body2" color="error">
          Audio job succeeded but preview is unavailable. Please try regenerating.
        </Typography>
      )}
    </Stack>
  );
};

export default ListeningAudioGenerationPanel;

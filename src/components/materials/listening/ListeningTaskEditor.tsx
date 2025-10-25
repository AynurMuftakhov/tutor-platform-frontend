import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '../../../context/AuthContext';
import { useSnackbar } from 'notistack';
import { useDictionary } from '../../../hooks/useVocabulary';
import {
  useCreateListeningTask,
  useUpdateListeningTask,
} from '../../../hooks/useListeningTasks';
import {
  generateListeningTranscript,
  updateListeningTranscript,
  validateListeningTranscript,
  getListeningTranscript,
} from '../../../services/api';
import type {
  ListeningGeneratedAudioContentRef,
  ListeningTranscriptMetadata,
  VocabularyWord,
} from '../../../types';
import type {
  ListeningTask,
  ListeningTaskCreatePayload,
  ListeningTaskPayload,
  ListeningTaskStatus,
  ListeningVoiceConfig,
} from '../../../types/ListeningTask';
import type { Material } from '../../../types/material';
import ListeningAudioGenerationPanel from '../../listening/ListeningAudioGenerationPanel';

interface ListeningTaskEditorProps {
  material: Material;
  open: boolean;
  task?: ListeningTask;
  onClose: () => void;
  onSaved?: () => void;
}

const steps = ['Clip & basics', 'Focus words', 'Transcript', 'Target words', 'Audio & publish'];
const cefrOptions = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const languageOptions = ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'it-IT'];
const styleOptions = ['neutral', 'friendly', 'narrative', 'dramatic', 'conversational'];

const normalizeWord = (word: string) => word.replace(/[^\p{L}\p{N}'-]+/gu, '').toLowerCase();

const getCoverageFlags = (coverage: Record<string, boolean> | undefined, words: VocabularyWord[]): string[] => {
  if (!coverage || !words?.length) return words.map((w) => w.text);
  const missing: string[] = [];
  words.forEach((word) => {
    const keyVariants = [word.text, word.text.toLowerCase(), normalizeWord(word.text)];
    const covered = keyVariants.some((key) => coverage[key]);
    if (!covered) missing.push(word.text);
  });
  return missing;
};

const ListeningTaskEditor: React.FC<ListeningTaskEditorProps> = ({ material, open, task, onClose, onSaved }) => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const createTask = useCreateListeningTask();
  const updateTask = useUpdateListeningTask();
  const { data: dictionary = [], isLoading: vocabLoading } = useDictionary();

  const [activeStep, setActiveStep] = useState(0);
  const [taskId, setTaskId] = useState<string | undefined>(task?.id);
  const [status, setStatus] = useState<ListeningTaskStatus>(task?.status ?? 'DRAFT');

  const [title, setTitle] = useState(task?.title ?? '');
  const [startSec, setStartSec] = useState<number>(task?.startSec ?? 0);
  const [endSec, setEndSec] = useState<number>(task?.endSec ?? Math.max(material.duration ?? 60, 10));
  const [timeLimitSec, setTimeLimitSec] = useState<number | undefined>(task?.timeLimitSec ?? undefined);

  const [wordLimit, setWordLimit] = useState<number>(task?.wordLimit ?? 180);
  const [language, setLanguage] = useState<string>(task?.language ?? 'en-US');
  const [difficulty, setDifficulty] = useState<string>(task?.difficulty ?? 'B1');
  const [theme, setTheme] = useState<string>('');
  const [style, setStyle] = useState<string>('neutral');
  const [notes, setNotes] = useState<string>(task?.notes ?? '');

  const [selectedWords, setSelectedWords] = useState<VocabularyWord[]>([]);
  const selectedWordIds = useMemo(() => selectedWords.map((word) => word.id), [selectedWords]);

  const [transcriptId, setTranscriptId] = useState<string | null>(task?.transcriptId ?? null);
  const [transcriptDraft, setTranscriptDraft] = useState<string>('');
  const [transcriptMetadata, setTranscriptMetadata] = useState<ListeningTranscriptMetadata | undefined>(
    task?.language ? { language: task.language } : undefined,
  );
  const [wordCoverage, setWordCoverage] = useState<Record<string, boolean>>({});
  const [hasUnsavedTranscriptEdits, setHasUnsavedTranscriptEdits] = useState(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [transcriptInfo, setTranscriptInfo] = useState<string | null>(null);

  const [targetWords, setTargetWords] = useState<string[]>(task?.targetWords ?? []);
  const targetWordSet = useMemo(() => {
    const set = new Set<string>();
    (targetWords ?? []).forEach((w) => set.add(normalizeWord(w)));
    return set;
  }, [targetWords]);

  const [audioUrl, setAudioUrl] = useState<string | undefined>(task?.audioUrl);
  const [audioVoice, setAudioVoice] = useState<ListeningVoiceConfig | null>(task?.voice ?? null);
  const [audioContent, setAudioContent] = useState<ListeningGeneratedAudioContentRef | null>(null);
  const [audioStatus, setAudioStatus] = useState<string | null>(null);

  const [savingBasics, setSavingBasics] = useState(false);
  const [savingContext, setSavingContext] = useState(false);
  const [savingTranscript, setSavingTranscript] = useState(false);
  const [savingTargets, setSavingTargets] = useState(false);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (!open) return;
    setActiveStep(0);
    setTaskId(task?.id);
    setStatus(task?.status ?? 'DRAFT');
    setTitle(task?.title ?? '');
    setStartSec(task?.startSec ?? 0);
    setEndSec(task?.endSec ?? Math.max(material.duration ?? 60, 10));
    setTimeLimitSec(task?.timeLimitSec ?? undefined);
    setWordLimit(task?.wordLimit ?? 180);
    setLanguage(task?.language ?? 'en-US');
    setDifficulty(task?.difficulty ?? 'B1');
    setTheme('');
    setStyle('neutral');
    setNotes(task?.notes ?? '');
    setTranscriptId(task?.transcriptId ?? null);
    setTranscriptDraft('');
    setWordCoverage({});
    setTranscriptMetadata(task?.language ? { language: task.language } : undefined);
    setTranscriptError(null);
    setTranscriptInfo(null);
    setHasUnsavedTranscriptEdits(false);
    setTargetWords(task?.targetWords ?? []);
    setAudioUrl(task?.audioUrl);
    setAudioVoice(task?.voice ?? null);
    setAudioContent(null);
    setAudioStatus(null);
  }, [open, task, material.duration]);

  useEffect(() => {
    if (!open) return;
    if (!transcriptId) return;
    if (!user?.id) return;
    (async () => {
      try {
        const result = await getListeningTranscript(user.id, transcriptId);
        setTranscriptDraft(result.transcript ?? '');
        setWordCoverage(result.wordCoverage ?? {});
        setTranscriptMetadata(result.metadata ?? transcriptMetadata);
        setHasUnsavedTranscriptEdits(false);
      } catch (error) {
        // optional: ignore fetch errors here; user can regenerate or retry
      }
    })();
  }, [open, transcriptId, user?.id]);

  useEffect(() => {
    if (!open) return;
    if (!dictionary?.length) return;
    if (selectedWords.length > 0) return;
    if (!task?.targetWords?.length) return;
    const mapped = task.targetWords
      .map((word) => {
        const lower = word.toLowerCase();
        return dictionary.find((entry) => entry.text.toLowerCase() === lower);
      })
      .filter(Boolean) as VocabularyWord[];
    if (mapped.length) {
      setSelectedWords(mapped);
    }
  }, [dictionary, open, task?.targetWords, selectedWords.length]);

  const coverageMissing = useMemo(() => getCoverageFlags(wordCoverage, selectedWords), [wordCoverage, selectedWords]);
  const coverageSatisfied = coverageMissing.length === 0 && selectedWords.length > 0;

  const ensureAuth = () => {
    if (!user?.id) {
      enqueueSnackbar('You need to be signed in to continue.', { variant: 'error' });
      return false;
    }
    return true;
  };

  const patchTask = async (patch: ListeningTaskPayload) => {
    if (!taskId) return;
    try {
      await updateTask.mutateAsync({ materialId: material.id, taskId, taskData: patch });
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to update listening task.';
      enqueueSnackbar(message, { variant: 'error' });
      throw error;
    }
  };

  const handleSaveBasics = async () => {
    if (savingBasics) return;
    if (startSec >= endSec) {
      enqueueSnackbar('End time must be greater than start time.', { variant: 'warning' });
      return false;
    }
    setSavingBasics(true);
    try {
      if (!taskId) {
        const payload: ListeningTaskCreatePayload = {
          title: title.trim() || undefined,
          startSec: Math.max(0, Math.floor(startSec)),
          endSec: Math.max(1, Math.floor(endSec)),
          timeLimitSec: timeLimitSec ? Math.max(1, Math.floor(timeLimitSec)) : undefined,
        };
        const created = await createTask.mutateAsync({ materialId: material.id, taskData: payload });
        setTaskId(created.id);
        setStatus(created.status ?? 'DRAFT');
        enqueueSnackbar('Draft listening task created.', { variant: 'success' });
      } else {
        const payload: ListeningTaskPayload = {
          title: title.trim() || undefined,
          startSec: Math.max(0, Math.floor(startSec)),
          endSec: Math.max(1, Math.floor(endSec)),
          timeLimitSec: timeLimitSec ? Math.max(1, Math.floor(timeLimitSec)) : undefined,
        };
        await patchTask(payload);
        enqueueSnackbar('Clip settings saved.', { variant: 'success' });
      }
      return true;
    } catch {
      return false;
    } finally {
      setSavingBasics(false);
    }
  };

  const handleSaveContext = async () => {
    if (!taskId) {
      enqueueSnackbar('Create the task first before configuring focus words.', { variant: 'warning' });
      return false;
    }
    setSavingContext(true);
    try {
      await patchTask({
        wordLimit: wordLimit ? Math.max(10, Math.floor(wordLimit)) : undefined,
      });
      enqueueSnackbar('Context saved.', { variant: 'success' });
      return true;
    } finally {
      setSavingContext(false);
    }
  };

  const handleGenerateTranscript = async () => {
    if (!ensureAuth()) return;
    if (selectedWordIds.length < 3) {
      enqueueSnackbar('Pick at least 3 focus words before generating a transcript.', { variant: 'warning' });
      return;
    }
    if (!taskId) {
      const created = await handleSaveBasics();
      if (!created) return;
    }
    const payload = {
      wordIds: selectedWordIds,
      maxWords: Math.max(60, wordLimit || 180),
      theme: theme.trim() || undefined,
      cefr: difficulty,
      language,
      style: style,
    };
    setTranscriptError(null);
    setTranscriptInfo('');
    try {
      const result = await generateListeningTranscript(user!.id, payload);
      setTranscriptId(result.transcriptId);
      setTranscriptDraft(result.transcript ?? '');
      setWordCoverage(result.wordCoverage ?? {});
      setTranscriptMetadata(result.metadata ?? { language, theme: theme || undefined, cefr: difficulty, style });
      setTranscriptInfo('Transcript generated. Review and tweak if needed.');
      setHasUnsavedTranscriptEdits(false);
      // Persist transcriptId on the task to avoid keeping transcript text in task
      await patchTask({ transcriptId: result.transcriptId });
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to generate transcript.';
      enqueueSnackbar(message, { variant: 'error' });
      setTranscriptError(message);
    }
  };

  const handleSaveTranscript = async () => {
    if (!ensureAuth() || !transcriptId) return false;
    setSavingTranscript(true);
    try {
      const result = await updateListeningTranscript(user!.id, transcriptId, { transcript: transcriptDraft });
      setWordCoverage(result.wordCoverage ?? {});
      setTranscriptMetadata(result.metadata ?? transcriptMetadata);
      setHasUnsavedTranscriptEdits(false);
      await patchTask({ transcriptId });
      enqueueSnackbar('Transcript saved.', { variant: 'success' });
      return true;
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to save transcript.';
      enqueueSnackbar(message, { variant: 'error' });
      return false;
    } finally {
      setSavingTranscript(false);
    }
  };

  const handleValidateTranscript = async () => {
    if (!selectedWordIds.length) return;
    try {
      const result = await validateListeningTranscript({ transcript: transcriptDraft, wordIds: selectedWordIds });
      setWordCoverage(result.wordCoverage ?? {});
      const missing = result.missing ?? [];
      if (missing.length) {
        setTranscriptInfo(`Some focus words are missing: ${missing.join(', ')}`);
      } else {
        setTranscriptInfo('All focus words are covered.');
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Validation failed.';
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  const toggleTargetWord = (raw: string) => {
    const normalized = normalizeWord(raw);
    if (!normalized) return;
    setTargetWords((prev) => {
      const set = new Set(prev.map(normalizeWord));
      if (set.has(normalized)) {
        return prev.filter((w) => normalizeWord(w) !== normalized);
      }
      return [...prev, raw.trim()];
    });
  };

  const persistTargetWords = async () => {
    if (!taskId) return false;
    setSavingTargets(true);
    try {
      await patchTask({ targetWords });
      enqueueSnackbar('Target words saved.', { variant: 'success' });
      return true;
    } catch {
      return false;
    } finally {
      setSavingTargets(false);
    }
  };

  const handleAudioContentChange = async (content: ListeningGeneratedAudioContentRef | null) => {
    setAudioContent(content);
    if (!content) return;
    setAudioUrl(content.audioUrl);
    const voice: ListeningVoiceConfig | null = content.voiceId
      ? {
          id: content.voiceId,
          speed: content.voiceSettings?.speed,
          pitch: content.voiceSettings?.style,
          style: style,
        }
      : null;
    setAudioVoice(voice);
    if (taskId) {
      await patchTask({ audioUrl: content.audioUrl, voice });
      enqueueSnackbar('Audio linked to task.', { variant: 'success' });
    }
  };

  const handleFinish = async () => {
    if (!taskId) {
      enqueueSnackbar('Create the task before publishing.', { variant: 'warning' });
      return;
    }
    if (!audioUrl) {
      enqueueSnackbar('Generate audio before marking ready.', { variant: 'warning' });
      return;
    }
    setFinishing(true);
    try {
      await patchTask({ status: 'READY' });
      setStatus('READY');
      enqueueSnackbar('Listening task marked ready.', { variant: 'success' });
      onSaved?.();
      onClose();
    } finally {
      setFinishing(false);
    }
  };

  const handleNext = async () => {
    switch (activeStep) {
      case 0: {
        const ok = await handleSaveBasics();
        if (!ok) return;
        break;
      }
      case 1: {
        if (selectedWordIds.length < 3) {
          enqueueSnackbar('Pick at least 3 focus words to continue.', { variant: 'warning' });
          return;
        }
        const ok = await handleSaveContext();
        if (!ok) return;
        break;
      }
      case 2: {
        if (hasUnsavedTranscriptEdits) {
          const saved = await handleSaveTranscript();
          if (!saved) return;
        } else if (!transcriptId) {
          enqueueSnackbar('Generate and save a transcript first.', { variant: 'warning' });
          return;
        }
        break;
      }
      case 3: {
        const ok = await persistTargetWords();
        if (!ok) return;
        break;
      }
      default:
        break;
    }
    setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => setActiveStep((prev) => Math.max(prev - 1, 0));

  const renderClipStep = () => (
    <Stack spacing={2} mt={1}>
      <TextField
        label="Task title"
        fullWidth
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g., Focused listening warm-up"
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          type="number"
          label="Start (sec)"
          value={startSec}
          onChange={(e) => setStartSec(Math.max(0, Number(e.target.value) || 0))}
          inputProps={{ min: 0 }}
        />
        <TextField
          type="number"
          label="End (sec)"
          value={endSec}
          onChange={(e) => setEndSec(Math.max(1, Number(e.target.value) || 1))}
          inputProps={{ min: 1 }}
        />
        <TextField
          type="number"
          label="Time limit (sec)"
          value={timeLimitSec ?? ''}
          onChange={(e) => {
            const next = e.target.value;
            setTimeLimitSec(next === '' ? undefined : Math.max(5, Number(next) || 5));
          }}
          helperText="Optional"
        />
      </Stack>
      <Typography variant="caption" color="text.secondary">
        Source length: {Math.round(material.duration ?? 0)} sec
      </Typography>
    </Stack>
  );

  const renderFocusStep = () => (
    <Stack spacing={2} mt={1}>
      <Autocomplete
        multiple
        options={dictionary}
        value={selectedWords}
        onChange={(_, value) => setSelectedWords(value)}
        loading={vocabLoading}
        getOptionLabel={(option) => option.text}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Focus words"
            placeholder="Search vocabulary…"
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {vocabLoading ? <CircularProgress color="inherit" size={16} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
            helperText="Pick 3 or more words to anchor the transcript"
          />
        )}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          type="number"
          label="Target length (words)"
          value={wordLimit}
          onChange={(e) => setWordLimit(Math.max(60, Number(e.target.value) || 60))}
        />
        <TextField select label="Language" value={language} onChange={(e) => setLanguage(e.target.value)}>
          {languageOptions.map((lang) => (
            <MenuItem key={lang} value={lang}>{lang}</MenuItem>
          ))}
        </TextField>
        <TextField select label="CEFR" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          {cefrOptions.map((level) => (
            <MenuItem key={level} value={level}>{level}</MenuItem>
          ))}
        </TextField>
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          fullWidth
          label="Theme"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          placeholder="e.g., At the airport"
        />
        <TextField select label="Narration style" value={style} onChange={(e) => setStyle(e.target.value)}>
          {styleOptions.map((option) => (
            <MenuItem key={option} value={option}>{option}</MenuItem>
          ))}
        </TextField>
      </Stack>
      <TextField
        label="Internal notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Visible only to tutors"
        multiline
        minRows={2}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
        <Button variant="contained" onClick={handleGenerateTranscript} disabled={selectedWordIds.length < 3}>
          Generate transcript
        </Button>
        <Typography variant="caption" color="text.secondary">
          Generation uses selected words, language, and CEFR level.
        </Typography>
      </Stack>
    </Stack>
  );

  const renderTranscriptStep = () => (
    <Stack spacing={2} mt={1}>
      {transcriptError && <Alert severity="error">{transcriptError}</Alert>}
      {transcriptInfo && <Alert severity="info">{transcriptInfo}</Alert>}
      <TextField
        label="Transcript"
        value={transcriptDraft}
        onChange={(e) => {
          setTranscriptDraft(e.target.value);
          setHasUnsavedTranscriptEdits(true);
        }}
        multiline
        minRows={8}
        fullWidth
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Button variant="contained" onClick={handleSaveTranscript} disabled={savingTranscript}>
          {savingTranscript ? <CircularProgress size={20} color="inherit" /> : 'Save transcript'}
        </Button>
        <Button variant="outlined" onClick={handleValidateTranscript} disabled={!transcriptDraft.trim()}>
          Validate coverage
        </Button>
        {coverageMissing.length > 0 && (
          <Typography variant="caption" color="error">
            Missing focus words: {coverageMissing.join(', ')}
          </Typography>
        )}
      </Stack>
    </Stack>
  );

  const renderTargetStep = () => {
    const tokens = transcriptDraft.split(/(\s+)/);
    return (
      <Stack spacing={2} mt={1}>
        <Typography variant="body2" color="text.secondary">
          Click words to turn them into blanks during the exercise.
        </Typography>
        <Box
          sx={{
            border: (theme) => `1px dashed ${theme.palette.divider}`,
            borderRadius: 2,
            p: 2,
            lineHeight: 1.9,
            fontSize: 16,
            wordBreak: 'break-word',
          }}
        >
          {tokens.map((token, idx) => {
            const trimmed = token.trim();
            const normalized = normalizeWord(trimmed);
            if (!normalized) {
              return <Box key={idx} component="span">{token}</Box>;
            }
            const selected = targetWordSet.has(normalized);
            return (
              <Button
                key={`${normalized}-${idx}`}
                size="small"
                variant={selected ? 'contained' : 'text'}
                color={selected ? 'primary' : 'inherit'}
                sx={{ minWidth: 0, mx: 0.25, textTransform: 'none', fontWeight: selected ? 700 : 400 }}
                onClick={() => toggleTargetWord(trimmed)}
              >
                {trimmed}
              </Button>
            );
          })}
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {targetWords.map((word) => (
            <Chip key={word} label={word} onDelete={() => toggleTargetWord(word)} />
          ))}
        </Stack>
      </Stack>
    );
  };

  const renderAudioStep = () => (
    <Stack spacing={2} mt={1}>
      {audioUrl && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>Current audio</Typography>
          <audio controls src={audioUrl} style={{ width: '100%' }} />
        </Box>
      )}
      <ListeningAudioGenerationPanel
        transcriptId={transcriptId}
        transcriptText={transcriptDraft}
        metadata={transcriptMetadata}
        wordIds={selectedWordIds}
        coverageSatisfied={coverageSatisfied}
        disabled={!transcriptId}
        languageCode={language}
        theme={theme}
        cefr={difficulty}
        hasUnsavedTranscriptEdits={hasUnsavedTranscriptEdits}
        onAudioContentChange={handleAudioContentChange}
        onStatusChange={setAudioStatus}
      />
      {audioStatus && (
        <Typography variant="caption" color="text.secondary">
          Audio job status: {audioStatus}
        </Typography>
      )}
      <Divider />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Button
          variant="contained"
          color="success"
          disabled={finishing || !audioUrl}
          onClick={handleFinish}
        >
          {finishing ? <CircularProgress size={20} color="inherit" /> : 'Mark as ready'}
        </Button>
        <Button variant="outlined" onClick={onClose}>
          Close
        </Button>
      </Stack>
    </Stack>
  );

  const stepContent = useMemo(() => {
    switch (activeStep) {
      case 0:
        return renderClipStep();
      case 1:
        return renderFocusStep();
      case 2:
        return renderTranscriptStep();
      case 3:
        return renderTargetStep();
      case 4:
        return renderAudioStep();
      default:
        return null;
    }
  }, [activeStep, title, startSec, endSec, timeLimitSec, selectedWords, vocabLoading, wordLimit, language, difficulty, theme, style, notes, transcriptDraft, transcriptError, transcriptInfo, coverageMissing, targetWords, targetWordSet, audioUrl, finishing, transcriptId, transcriptMetadata, hasUnsavedTranscriptEdits, selectedWordIds, coverageSatisfied, audioStatus]);

  const showNavigation = activeStep < steps.length - 1;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Listening task builder</DialogTitle>
      <DialogContent dividers>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        {stepContent}
      </DialogContent>
      {showNavigation && (
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleBack} disabled={activeStep === 0}>
            Back
          </Button>
          <Button onClick={handleNext} variant="contained" color="primary">
            Continue
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default ListeningTaskEditor;

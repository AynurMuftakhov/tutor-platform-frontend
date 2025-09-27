import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Slider,
  Stack,
  TextField,
  Typography,
  Checkbox,
  Divider,
} from '@mui/material';
import { CreateAssignmentDto, HomeworkTaskType, SourceKind } from '../../types/homework';
import { useAuth } from '../../context/AuthContext';
import { useCreateAssignment } from '../../hooks/useHomeworks';
import { useAssignWords } from '../../hooks/useAssignments';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toOffsetDateTime } from '../../utils/datetime';
import { fetchStudents, fetchUserById, generateListeningTranscript, updateListeningTranscript, validateListeningTranscript } from '../../services/api';
import { useMutation, useQuery } from '@tanstack/react-query';
import { vocabApi } from '../../services/vocabulary.api';
import VocabularyList from '../../components/vocabulary/VocabularyList';
import type {
  GenerateListeningTranscriptPayload,
  ListeningGeneratedAudioContentRef,
  ListeningTranscriptResponse,
  ValidateListeningTranscriptPayload,
  ValidateListeningTranscriptResponse,
  VocabularyWord,
} from '../../types';
import { ENGLISH_LEVELS } from '../../types/ENGLISH_LEVELS';
import ListeningAudioGenerationPanel from '../../components/listening/ListeningAudioGenerationPanel';

const TeacherHomeworkNewPage: React.FC = () => {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const create = useCreateAssignment(user?.id || '');
  const assignWords = useAssignWords();

  const [studentId, setStudentId] = useState(params.get('studentId') || '');
  const [studentOptions, setStudentOptions] = useState<{ id: string; name: string; email?: string; avatar?: string }[]>([]);
  const [studentQ, setStudentQ] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string; email?: string; avatar?: string } | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [title, setTitle] = useState('Homework');
  const [instructions, setInstructions] = useState('');
  const [dueAt, setDueAt] = useState('');

  // Minimal single-task wizard for MVP
  const [taskTitle, setTaskTitle] = useState('Task 1');
  const [taskType, setTaskType] = useState<HomeworkTaskType>('VIDEO');
  const [sourceKind, setSourceKind] = useState<SourceKind>('EXTERNAL_URL');
  const [sourceUrl, setSourceUrl] = useState('');

  // VOCAB_LIST selection & settings
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([]);
  const [wordSearch, setWordSearch] = useState('');
  const [masteryStreak, setMasteryStreak] = useState<number>(2);
  const [shuffle, setShuffle] = useState<boolean>(true);
  const [timeLimitMin, setTimeLimitMin] = useState<string>('');

  // Listening transcript generation state
  const [listeningDurationSecTarget, setListeningDurationSecTarget] = useState<number>(90);
  const [listeningTheme, setListeningTheme] = useState('');
  const [listeningLanguage, setListeningLanguage] = useState('en-US');
  const [listeningCefr, setListeningCefr] = useState('B1');
  const [listeningStyle, setListeningStyle] = useState('neutral');
  const [listeningSeed, setListeningSeed] = useState('');
  const [listeningMustIncludeAll, setListeningMustIncludeAll] = useState(true);
  const [transcriptId, setTranscriptId] = useState<string | null>(null);
  const [transcriptDraft, setTranscriptDraft] = useState('');
  const [transcriptMetadata, setTranscriptMetadata] = useState<ListeningTranscriptResponse['metadata']>({
    language: listeningLanguage,
    theme: listeningTheme,
    cefr: listeningCefr,
    style: listeningStyle,
  });
  const [estimatedDurationSec, setEstimatedDurationSec] = useState<number | null>(null);
  const [wordCoverage, setWordCoverage] = useState<Record<string, boolean>>({});
  const [coverageMissing, setCoverageMissing] = useState<string[]>([]);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [transcriptInfo, setTranscriptInfo] = useState<string | null>(null);
  const [hasUnsavedTranscriptEdits, setHasUnsavedTranscriptEdits] = useState(false);
  const [audioContentRef, setAudioContentRef] = useState<ListeningGeneratedAudioContentRef | null>(null);

  const isVocabList = taskType === 'VOCAB' && sourceKind === 'VOCAB_LIST';
  const isListeningTask = taskType === 'LISTENING';

  // Load vocabulary words
  const { data: allWords = [] } = useQuery<VocabularyWord[]>({
    queryKey: ['vocabulary', 'words'],
    queryFn: () => vocabApi.listWords(),
    staleTime: 60_000,
  });

  const filteredWords = React.useMemo(() => {
    const q = wordSearch.trim().toLowerCase();
    if (!q) return allWords;
    return allWords.filter(w =>
      w.text.toLowerCase().includes(q) ||
      (w.translation || '').toLowerCase().includes(q)
    );
  }, [allWords, wordSearch]);

  const selectedWordChips = React.useMemo(() => {
    const map = new Map(allWords.map(w => [w.id, w] as const));
    return selectedWordIds.map(id => map.get(id)).filter(Boolean) as VocabularyWord[];
  }, [allWords, selectedWordIds]);

  const listeningWordIds = useMemo(
    () => selectedWordIds.filter((id) => id && id.trim().length > 0),
    [selectedWordIds],
  );

  const listeningWordRequirementMet = listeningWordIds.length >= 3;

  const cefrOptions = useMemo(() => Array.from(new Set(Object.values(ENGLISH_LEVELS).map(level => level.code))), []);
  const languageOptions = useMemo(() => ['en-US', 'en-GB', 'en-AU', 'es-ES', 'fr-FR', 'de-DE'], []);
  const styleOptions = useMemo(() => ['neutral', 'storytelling', 'documentary', 'conversational', 'inspirational'], []);
  const taskTypeOptions: HomeworkTaskType[] = ['VIDEO', 'READING', 'GRAMMAR', 'VOCAB', 'LISTENING', 'LINK'];
  const durationMarks = useMemo(() => (
    [
      { value: 45, label: '0:45' },
      { value: 60, label: '1:00' },
      { value: 90, label: '1:30' },
      { value: 120, label: '2:00' },
    ]
  ), []);
  const sourceKindOptions: SourceKind[] = ['MATERIAL', 'LESSON_CONTENT', 'EXTERNAL_URL', 'VOCAB_LIST', 'GENERATED_AUDIO'];

  const formatDurationLabel = (value: number) => {
    const mins = Math.floor(value / 60);
    const secs = Math.max(0, value % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isVocabSelectionInvalid = selectedWordIds.length < 5 || selectedWordIds.length > 100;
  const createDisabled =
    create.isPending ||
    !studentId ||
    (isVocabList && isVocabSelectionInvalid) ||
    (isListeningTask && (!transcriptId || hasUnsavedTranscriptEdits || !listeningWordRequirementMet || !audioContentRef));

  const generateTranscriptMutation = useMutation<
    ListeningTranscriptResponse,
    Error,
    GenerateListeningTranscriptPayload
  >({
    mutationFn: async (payload) => {
      if (!user?.id) {
        throw new Error('You need to be signed in to generate transcripts.');
      }
      return generateListeningTranscript(user.id, payload);
    },
  });
  const updateTranscriptMutation = useMutation<ListeningTranscriptResponse, Error, { transcriptId: string; transcript: string }>(
    {
      mutationFn: async ({ transcriptId, transcript }) => {
        if (!user?.id) {
          throw new Error('You need to be signed in to save transcripts.');
        }
        return updateListeningTranscript(user.id, transcriptId, { transcript });
      },
    }
  );
  const validateTranscriptMutation = useMutation<ValidateListeningTranscriptResponse, Error, ValidateListeningTranscriptPayload>({
    mutationFn: (payload) => validateListeningTranscript(payload),
  });

  const coverageEntries = useMemo(() => {
    if (selectedWordChips.length === 0) return [] as Array<{ word: string; covered: boolean }>;
    return selectedWordChips.map((word) => {
      const normalized = word.text.trim();
      const lower = normalized.toLowerCase();
      const covered = Boolean(
        wordCoverage[normalized] ?? wordCoverage[lower] ?? wordCoverage[word.text] ?? false,
      );
      return { word: normalized, covered };
    });
  }, [selectedWordChips, wordCoverage]);

  const coverageSatisfied = useMemo(
    () => coverageEntries.length > 0 && coverageEntries.every((entry) => entry.covered),
    [coverageEntries],
  );

  const formattedEstimatedDuration = useMemo(() => {
    if (estimatedDurationSec == null) return null;
    const mins = Math.floor(estimatedDurationSec / 60);
    const secs = Math.max(0, estimatedDurationSec % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, [estimatedDurationSec]);

  const highlightedTranscript = useMemo(() => {
    if (!transcriptDraft) {
      return [] as React.ReactNode[];
    }

    const escapeRegExp = (value: string) => value.replace(/([-\\^$*+?.()|[\]{}])/g, '\\$1');
    const uniqueWords = Array.from(
      new Set(
        selectedWordChips
          .map((word) => word.text.trim())
          .filter((word) => word.length > 0),
      ),
    );

    if (uniqueWords.length === 0) {
      return [transcriptDraft];
    }

    const pattern = new RegExp(
      uniqueWords
        .sort((a, b) => b.length - a.length)
        .map((word) => escapeRegExp(word))
        .join('|'),
      'gi',
    );

    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(transcriptDraft)) !== null) {
      if (match.index > lastIndex) {
        nodes.push(transcriptDraft.slice(lastIndex, match.index));
      }

      const matchedText = match[0];
      nodes.push(
        <Box
          key={`hit-${match.index}-${matchedText}-${nodes.length}`}
          component="strong"
          sx={{ fontWeight: 700, color: '#1d4ed8' }}
        >
          {matchedText}
        </Box>,
      );

      lastIndex = match.index + matchedText.length;
    }

    if (lastIndex < transcriptDraft.length) {
      nodes.push(transcriptDraft.slice(lastIndex));
    }

    if (nodes.length === 0) {
      return [transcriptDraft];
    }

    return nodes;
  }, [selectedWordChips, transcriptDraft]);

  useEffect(() => {
    if (isListeningTask) {
      setSourceKind('GENERATED_AUDIO');
    } else if (sourceKind === 'GENERATED_AUDIO') {
      setSourceKind('EXTERNAL_URL');
    }
  }, [isListeningTask, sourceKind]);

  useEffect(() => {
    if (!isListeningTask) {
      setTranscriptId(null);
      setTranscriptDraft('');
      setWordCoverage({});
      setCoverageMissing([]);
      setEstimatedDurationSec(null);
      setTranscriptError(null);
      setTranscriptInfo(null);
      setHasUnsavedTranscriptEdits(false);
      setAudioContentRef(null);
    }
  }, [isListeningTask]);

  useEffect(() => {
    if (!isListeningTask || transcriptId) return;
    setTranscriptMetadata({
      language: listeningLanguage,
      theme: listeningTheme || undefined,
      cefr: listeningCefr,
      style: listeningStyle,
    });
  }, [isListeningTask, transcriptId, listeningLanguage, listeningTheme, listeningCefr, listeningStyle]);

  const buildCoverageMissing = (coverage: Record<string, boolean> | undefined) =>
    Object.entries(coverage ?? {})
      .filter(([, covered]) => !covered)
      .map(([word]) => word);

  const handleGenerateTranscript = async () => {
    setTranscriptError(null);
    setTranscriptInfo(null);

    if (!isListeningTask) return;

    if (!listeningWordRequirementMet) {
      setTranscriptError('Select at least 3 focus words to guide the story.');
      return;
    }

    const payload: GenerateListeningTranscriptPayload = {
      wordIds: listeningWordIds,
      durationSecTarget: listeningDurationSecTarget,
      theme: listeningTheme || undefined,
      cefr: listeningCefr || undefined,
      language: listeningLanguage || undefined,
      style: listeningStyle || undefined,
      constraints: listeningMustIncludeAll ? { mustIncludeAllWords: true } : undefined,
    };

    if (listeningSeed.trim()) {
      const parsedSeed = Number(listeningSeed.trim());
      if (Number.isNaN(parsedSeed)) {
        setTranscriptError('Seed must be a number.');
        return;
      }
      payload.seed = parsedSeed;
    }

    try {
      const result = await generateTranscriptMutation.mutateAsync(payload);
      setTranscriptId(result.transcriptId);
      setTranscriptDraft(result.transcript ?? '');
      setWordCoverage(result.wordCoverage ?? {});
      setCoverageMissing(buildCoverageMissing(result.wordCoverage));
      setEstimatedDurationSec(result.estimatedDurationSec ?? null);
      setTranscriptMetadata(
        result.metadata ?? {
          language: listeningLanguage,
          theme: listeningTheme || undefined,
          cefr: listeningCefr,
          style: listeningStyle,
        },
      );
      setHasUnsavedTranscriptEdits(false);
      setTranscriptInfo('Transcript generated. Tweak the draft if needed, then save.');
      setAudioContentRef(null);
    } catch (error) {
      console.error('Failed to generate transcript', error);
      setTranscriptError(
        error instanceof Error ? error.message : 'Failed to generate transcript. Please try again.',
      );
    }
  };

  const handleSaveTranscript = async () => {
    if (!transcriptId) return;

    setTranscriptError(null);
    setTranscriptInfo(null);

    try {
      const result = await updateTranscriptMutation.mutateAsync({
        transcriptId,
        transcript: transcriptDraft.trim(),
      });
      setTranscriptDraft(result.transcript ?? transcriptDraft);
      setWordCoverage(result.wordCoverage ?? {});
      setCoverageMissing(buildCoverageMissing(result.wordCoverage));
      setEstimatedDurationSec(result.estimatedDurationSec ?? estimatedDurationSec);
      setTranscriptMetadata(result.metadata ?? transcriptMetadata);
      setHasUnsavedTranscriptEdits(false);
      setTranscriptInfo('Transcript saved.');
    } catch (error) {
      console.error('Failed to save transcript', error);
      setTranscriptError(
        error instanceof Error ? error.message : 'Could not save transcript. Please try again.',
      );
    }
  };

  const handleValidateTranscript = async () => {
    setTranscriptError(null);
    setTranscriptInfo(null);

    if (!transcriptDraft.trim()) {
      setTranscriptError('Transcript text cannot be empty.');
      return;
    }

    if (!listeningWordRequirementMet) {
      setTranscriptError('Make sure you selected enough vocabulary words before validating.');
      return;
    }

    try {
      const result = await validateTranscriptMutation.mutateAsync({
        transcript: transcriptDraft,
        wordIds: listeningWordIds,
      });
      setWordCoverage(result.wordCoverage ?? {});
      setCoverageMissing(buildCoverageMissing(result.wordCoverage));
      setTranscriptInfo(
        result.missing.length === 0
          ? 'Every target word is present. Ready for audio!'
          : 'Some words are still missing. Consider tweaking the text.',
      );
    } catch (error) {
      console.error('Failed to validate transcript', error);
      setTranscriptError(
        error instanceof Error ? error.message : 'Validation failed. Try again in a moment.',
      );
    }
  };

  // fetch student options debounced by query
  useEffect(() => {
    let cancelled = false;
    const h = setTimeout(async () => {
      if (!user?.id) return;
      setStudentLoading(true);
      try {
        const res = await fetchStudents(user.id, studentQ, 0, 10);
        if (!cancelled) setStudentOptions(res.content.map((s: any) => ({ id: s.id, name: s.name, email: s.email, avatar: s.avatar })));
      } finally {
        if (!cancelled) setStudentLoading(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(h); };
  }, [studentQ, user?.id]);

  // initialize selected student from URL param if present
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!studentId) { setSelectedStudent(null); return; }
      try {
        const u = await fetchUserById(studentId);
        if (!cancelled) setSelectedStudent({ id: u.id, name: u.name, email: u.email, avatar: u.avatar });
      } catch {
        if (!cancelled) setSelectedStudent(null);
      }
    })();
    return () => { cancelled = true; };
  }, [studentId]);

  const onSubmit = async () => {
    if (!user?.id || !studentId) return;

    const tasks: CreateAssignmentDto['tasks'] = [];
    if (isVocabList) {
      const settings: any = { masteryStreak, shuffle };
      const tl = parseInt(timeLimitMin, 10);
      if (!isNaN(tl)) settings.timeLimitMin = tl;
      tasks.push({
        title: taskTitle,
        type: 'VOCAB',
        sourceKind: 'VOCAB_LIST',
        instructions: undefined,
        contentRef: { wordIds: selectedWordIds, settings },
        vocabWordIds: selectedWordIds,
      });
    } else if (isListeningTask) {
      setTranscriptError(null);
      setTranscriptInfo(null);
      if (!transcriptId) {
        setTranscriptError('Generate the transcript before creating the homework.');
        return;
      }

      if (hasUnsavedTranscriptEdits) {
        setTranscriptError('Save your transcript edits before continuing.');
        return;
      }

      if (!listeningWordRequirementMet) {
        setTranscriptError('Please verify the selected vocabulary before creating the task.');
        return;
      }

      if (!audioContentRef) {
        setTranscriptError('Generate audio for the transcript before saving this task.');
        return;
      }

      const generatorParams = {
        wordIds: listeningWordIds,
        durationSecTarget: listeningDurationSecTarget,
        theme: listeningTheme || undefined,
        cefr: listeningCefr || undefined,
        language: listeningLanguage || undefined,
        style: listeningStyle || undefined,
        constraints: listeningMustIncludeAll ? { mustIncludeAllWords: true } : undefined,
        seed: listeningSeed.trim() ? Number(listeningSeed.trim()) : undefined,
      };

      const durationSec = audioContentRef?.durationSec ?? estimatedDurationSec ?? listeningDurationSecTarget;
      const transcriptText = audioContentRef?.transcript ?? transcriptDraft.trim();

      const listeningContentRef = {
        generatorRequestId: audioContentRef.generatorRequestId,
        audioMaterialId: audioContentRef.audioMaterialId,
        audioUrl: audioContentRef.audioUrl,
        transcriptId,
        transcript: transcriptText,
        durationSec,
        wordIds: listeningWordIds,
        theme: audioContentRef.theme ?? (listeningTheme || undefined),
        cefr: audioContentRef.cefr ?? (listeningCefr || undefined),
        metadata: transcriptMetadata,
        wordCoverage,
        generatorParams,
        voiceId: audioContentRef.voiceId,
      };

      tasks.push({
        title: taskTitle,
        type: 'LISTENING',
        sourceKind: 'GENERATED_AUDIO',
        instructions: undefined,
        contentRef: listeningContentRef,
        vocabWordIds: selectedWordIds,
      });
    } else {
      tasks.push({
        title: taskTitle,
        type: taskType,
        sourceKind,
        instructions: undefined,
        contentRef: sourceKind === 'EXTERNAL_URL' ? { url: sourceUrl } : {},
      });
    }

    const payload: CreateAssignmentDto = {
      studentId,
      title,
      instructions: instructions || undefined,
      dueAt: toOffsetDateTime(dueAt) || undefined,
      tasks,
    };

    try {
      await create.mutateAsync(payload);
      const vocabWordIds = Array.from(new Set(payload.tasks.flatMap(task => task.vocabWordIds ?? [])));
      if (vocabWordIds.length > 0) {
        try {
          await assignWords.mutateAsync({
            studentId: payload.studentId,
            vocabularyWordIds: vocabWordIds,
          });
        } catch (assignError) {
          console.error('Failed to assign vocabulary words to student', assignError);
        }
      }
      navigate('/t/homework');
    } catch (e) {
      // handled globally
    }
  };

  return (
      <Box
          sx={{
              p: { xs: 1, sm: 1 },
              bgcolor: '#fafbfd',
              height: '100dvh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              position: 'relative'
          }}
      >
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 600, color: '#2573ff' }}>Add Homework</Typography>
      <Grid container spacing={2}>
        <Grid size={{xs:12, md: 6}}>
          <Stack spacing={2}>
            <Autocomplete
              options={studentOptions}
              getOptionLabel={(o) => o?.name || ''}
              value={selectedStudent}
              onChange={(_, val) => { setSelectedStudent(val); setStudentId(val?.id || ''); }}
              onInputChange={(_, val, reason) => { if (reason !== 'reset') setStudentQ(val); }}
              loading={studentLoading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Student"
                  placeholder="Type a name…"
                  required
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {studentLoading ? <CircularProgress color="inherit" size={16} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              isOptionEqualToValue={(o, v) => o.id === v.id}
            />
            <TextField label="Title" value={title} onChange={e => setTitle(e.target.value)} fullWidth required />
            <TextField label="Instructions" value={instructions} onChange={e => setInstructions(e.target.value)} fullWidth multiline minRows={2} />
            <TextField type="datetime-local" label="Due At" value={dueAt} onChange={e => setDueAt(e.target.value)} InputLabelProps={{ shrink: true }} />
          </Stack>
        </Grid>
        <Grid size={{xs:12, md: 6}}>
          <Stack spacing={2}>
            <Typography variant="subtitle1">Task</Typography>
            <TextField label="Task title" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} fullWidth />
            <TextField select label="Task type" value={taskType} onChange={e => setTaskType(e.target.value as HomeworkTaskType)}>
              {taskTypeOptions.map(t => (<MenuItem key={t} value={t}>{t}</MenuItem>))}
            </TextField>
            {!isListeningTask ? (
              <TextField select label="Source kind" value={sourceKind} onChange={e => setSourceKind(e.target.value as SourceKind)}>
                {sourceKindOptions.filter(s => s !== 'GENERATED_AUDIO').map(s => (<MenuItem key={s} value={s}>{s}</MenuItem>))}
              </TextField>
            ) : (
              <TextField label="Source kind" value="GENERATED_AUDIO" InputProps={{ readOnly: true }} disabled />
            )}
            {sourceKind === 'EXTERNAL_URL' && !isListeningTask && (
              <TextField label="Source URL" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} fullWidth />
            )}
            {(isVocabList || isListeningTask) && (
              <Stack spacing={1} sx={{ mt: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button variant="outlined" onClick={() => setPickerOpen(true)}>
                    {isListeningTask ? 'Pick focus words' : 'Select words'}
                  </Button>
                  <Chip
                    size="small"
                    color={
                      isVocabList
                        ? (!isVocabSelectionInvalid ? 'success' : 'warning')
                        : (listeningWordRequirementMet ? 'success' : 'warning')
                    }
                    label={`${selectedWordIds.length} selected`}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {isVocabList ? 'Choose 5–100 words' : 'Pick 3+ words to anchor the transcript'}
                  </Typography>
                </Stack>
                {selectedWordChips.length > 0 && (
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    {selectedWordChips.slice(0,5).map(w => (
                      <Chip key={w.id} size="small" label={w.text} />
                    ))}
                    {selectedWordChips.length > 5 && (
                      <Chip size="small" label={`+${selectedWordChips.length - 5} more`} />
                    )}
                  </Stack>
                )}
                {isVocabList && isVocabSelectionInvalid && (
                  <Typography variant="caption" color="error">Please select between 5 and 100 words.</Typography>
                )}
                {isListeningTask && !listeningWordRequirementMet && (
                  <Typography variant="caption" color="error">
                    Please select at least 3 words to proceed.
                  </Typography>
                )}
                {isVocabList && (
                  <>
                    <TextField type="number" label="Mastery streak" value={masteryStreak}
                               onChange={e => setMasteryStreak(Math.max(1, Math.min(10, Number(e.target.value) || 0)))}
                               InputLabelProps={{ shrink: true }} inputProps={{ min: 1, max: 10 }} />
                    <FormControlLabel control={<Checkbox checked={shuffle} onChange={(e)=> setShuffle(e.target.checked)} />} label="Shuffle words" />
                    <TextField type="number" label="Time limit (minutes)" value={timeLimitMin}
                               onChange={e => setTimeLimitMin(e.target.value)} InputLabelProps={{ shrink: true }}
                               helperText="Optional: leave empty for no timer" />
                  </>
                )}
                {isListeningTask && (
                  <Typography variant="caption" color="text.secondary">
                    Vocabulary mastery settings are ignored for listening tasks.
                  </Typography>
                )}
              </Stack>
            )}
            {isListeningTask && (
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid rgba(37,115,255,0.12)', background: '#ffffff' }}>
                <Stack spacing={2.5}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>AI transcript lab</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Shape the scenario, then let the AI craft a script that weaves in every chosen word.
                    </Typography>
                  </Box>

                  {(transcriptError || transcriptInfo) && (
                    <Stack spacing={1}>
                      {transcriptError && <Alert severity="error">{transcriptError}</Alert>}
                      {transcriptInfo && !transcriptError && <Alert severity="success">{transcriptInfo}</Alert>}
                    </Stack>
                  )}

                  <Stack spacing={2}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="stretch">
                      <Box flex={1}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Target duration</Typography>
                        <Slider
                          value={listeningDurationSecTarget}
                          onChange={(_, value) => setListeningDurationSecTarget(Array.isArray(value) ? value[0] : value)}
                          min={45}
                          max={150}
                          step={15}
                          marks={durationMarks}
                          valueLabelDisplay="on"
                          valueLabelFormat={(value) => formatDurationLabel(value as number)}
                          sx={{ px: 1 }}
                        />
                      </Box>
                      <TextField
                        fullWidth
                        label="Theme"
                        placeholder="Wildlife conservation"
                        value={listeningTheme}
                        onChange={(e) => setListeningTheme(e.target.value)}
                      />
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField select label="Language" value={listeningLanguage} onChange={(e) => setListeningLanguage(e.target.value)} fullWidth>
                        {languageOptions.map(lang => <MenuItem key={lang} value={lang}>{lang}</MenuItem>)}
                      </TextField>
                      <TextField select label="CEFR" value={listeningCefr} onChange={(e) => setListeningCefr(e.target.value)} fullWidth>
                        {cefrOptions.map(level => <MenuItem key={level} value={level}>{level}</MenuItem>)}
                      </TextField>
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField select label="Narration style" value={listeningStyle} onChange={(e) => setListeningStyle(e.target.value)} fullWidth>
                        {styleOptions.map(style => <MenuItem key={style} value={style}>{style}</MenuItem>)}
                      </TextField>
                      <TextField
                        label="Seed (optional)"
                        value={listeningSeed}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (/^-?\d*$/.test(val)) {
                            setListeningSeed(val);
                          }
                        }}
                        placeholder="42"
                        inputProps={{ inputMode: 'numeric', pattern: '-?[0-9]*' }}
                        fullWidth
                      />
                    </Stack>

                    <FormControlLabel
                      control={<Checkbox checked={listeningMustIncludeAll} onChange={(e) => setListeningMustIncludeAll(e.target.checked)} />}
                      label="Force every selected word to appear"
                    />
                  </Stack>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                    <Button
                      variant="contained"
                      onClick={handleGenerateTranscript}
                      disabled={generateTranscriptMutation.isPending}
                      sx={{ minWidth: 200 }}
                    >
                      {generateTranscriptMutation.isPending ? <CircularProgress size={18} sx={{ color: 'white' }} /> : 'Generate transcript'}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleValidateTranscript}
                      disabled={validateTranscriptMutation.isPending || !transcriptDraft}
                    >
                      {validateTranscriptMutation.isPending ? <CircularProgress size={18} /> : 'Validate coverage'}
                    </Button>
                    <Button
                      variant="outlined"
                      color="success"
                      onClick={handleSaveTranscript}
                      disabled={!transcriptId || !hasUnsavedTranscriptEdits || updateTranscriptMutation.isPending}
                    >
                      {updateTranscriptMutation.isPending ? <CircularProgress size={18} /> : 'Save edits'}
                    </Button>
                  </Stack>

                  <Divider sx={{ my: 1 }} />

                  <Stack spacing={1.5}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Transcript draft</Typography>
                    <TextField
                      value={transcriptDraft}
                      onChange={(e) => {
                        setTranscriptDraft(e.target.value);
                        setHasUnsavedTranscriptEdits(true);
                      }}
                      multiline
                      minRows={6}
                      placeholder="The rainforest is a vibrant, sustainable habitat..."
                    />
                    {transcriptDraft && (
                      <Box
                        sx={{
                          borderRadius: 2,
                          border: '1px solid rgba(37,115,255,0.16)',
                          bgcolor: 'rgba(37,115,255,0.04)',
                          px: 2,
                          py: 1.5,
                        }}
                      >
                        <Typography variant="overline" sx={{ letterSpacing: 1, color: '#1d4ed8' }}>
                          Preview with highlighted words
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: '#1a1c1f' }}
                        >
                          {highlightedTranscript}
                        </Typography>
                      </Box>
                    )}
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                      {formattedEstimatedDuration && (
                        <Typography variant="body2" color="text.secondary">
                          Estimated runtime: {formattedEstimatedDuration}
                        </Typography>
                      )}
                      {transcriptMetadata?.language && (
                        <Typography variant="body2" color="text.secondary">
                          {transcriptMetadata.language} • {transcriptMetadata.cefr ?? listeningCefr} • {transcriptMetadata.style ?? listeningStyle}
                        </Typography>
                      )}
                    </Stack>
                    {coverageEntries.length > 0 && (
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        {coverageEntries.map(({ word, covered }) => (
                          <Chip
                            key={word}
                            label={word}
                            size="small"
                            color={covered ? 'success' : 'warning'}
                            variant={covered ? 'filled' : 'outlined'}
                          />
                        ))}
                      </Stack>
                    )}
                    {coverageMissing.length > 0 && (
                      <Typography variant="caption" color="error">
                        Missing words: {coverageMissing.join(', ')}
                      </Typography>
                    )}
                    {hasUnsavedTranscriptEdits && (
                      <Typography variant="caption" color="warning.main">
                        You have unsaved edits. Save before assigning.
                      </Typography>
                    )}

                    <ListeningAudioGenerationPanel
                      transcriptId={transcriptId}
                      transcriptText={transcriptDraft}
                      metadata={transcriptMetadata}
                      wordIds={listeningWordIds}
                      coverageSatisfied={coverageSatisfied}
                      disabled={!transcriptId}
                      languageCode={listeningLanguage}
                      theme={listeningTheme || undefined}
                      cefr={listeningCefr || undefined}
                      hasUnsavedTranscriptEdits={hasUnsavedTranscriptEdits}
                      onAudioContentChange={(content) => setAudioContentRef(content)}
                      onDurationUpdate={(duration) => {
                        if (duration != null) {
                          setEstimatedDurationSec(duration);
                        }
                      }}
                    />
                  </Stack>
                </Stack>
              </Paper>
            )}
          </Stack>
        </Grid>
      </Grid>

      <Box mt={3}>
        <Button variant="contained" onClick={onSubmit} disabled={createDisabled}>Create</Button>
      </Box>

      <Dialog open={pickerOpen} onClose={() => setPickerOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{isListeningTask ? 'Select listening words' : 'Select vocabulary words'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Search" value={wordSearch} onChange={e => setWordSearch(e.target.value)} fullWidth />
            <VocabularyList
              data={filteredWords}
              selectionMode
              selectedWords={selectedWordIds}
              onToggleSelection={(id: string) => {
                setSelectedWordIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
              }}
              readOnly={false}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPickerOpen(false)}>Done</Button>
        </DialogActions>
      </Dialog>
    </Container></Box>
  );
};

export default TeacherHomeworkNewPage;

import React from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  FormControlLabel,
  Checkbox,
  IconButton,
  MenuItem,
  Paper,
  Slider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import {useMutation, useQuery} from '@tanstack/react-query';
import {useAuth} from '../../context/AuthContext';
import {useCreateAssignment} from '../../hooks/useHomeworks';
import {useAssignWords, useAssignments} from '../../hooks/useAssignments';
import {CreateAssignmentDto, HomeworkTaskType, SourceKind, AssignmentDto} from '../../types/homework';
import {toOffsetDateTime} from '../../utils/datetime';
import {
  fetchStudents,
  fetchUserById,
  generateListeningTranscript,
  updateListeningTranscript,
  validateListeningTranscript,
} from '../../services/api';
import {vocabApi} from '../../services/vocabulary.api';
import VocabularyPickerDialog from '../vocabulary/VocabularyPickerDialog';
import type {
  GenerateListeningTranscriptPayload,
  ListeningGeneratedAudioContentRef,
  ListeningTranscriptResponse,
  ValidateListeningTranscriptPayload,
  ValidateListeningTranscriptResponse,
  VocabularyWord,
} from '../../types';
import ListeningAudioGenerationPanel from '../listening/ListeningAudioGenerationPanel';
import { ENGLISH_LEVELS } from '../../types/ENGLISH_LEVELS';

export interface HomeworkComposerDrawerProps {
  open: boolean;
  onClose: () => void;
  // optional prefilled student id from filtered list
  prefillStudentId?: string;
  onSuccess: (assignment: AssignmentDto, studentLabel: string) => void;
  // optional: when user clicks Create & open, consumer can navigate immediately
  onCreateAndOpen?: (assignment: AssignmentDto) => void;
}

const WIDTH = 640; // within 560–680px

const HomeworkComposerDrawer: React.FC<HomeworkComposerDrawerProps> = ({ open, onClose, prefillStudentId, onSuccess, onCreateAndOpen }) => {
  const { user } = useAuth();
  const create = useCreateAssignment(user?.id || '');
  const assignWords = useAssignWords();

  // Assignment fields
  const [studentId, setStudentId] = React.useState<string>('');
  const [studentOptions, setStudentOptions] = React.useState<{ id: string; name: string; email?: string; avatar?: string }[]>([]);
  const [studentQ, setStudentQ] = React.useState('');
  const [selectedStudent, setSelectedStudent] = React.useState<{ id: string; name: string; email?: string; avatar?: string } | null>(null);
  const [studentLoading, setStudentLoading] = React.useState(false);

  const [title, setTitle] = React.useState('Homework-' + new Date().toISOString().slice(0, 10));
  const [instructions, setInstructions] = React.useState('');
  const [dueAt, setDueAt] = React.useState('');

  // Task fields
  const [taskTitle, setTaskTitle] = React.useState('Task 1');
  const [taskType, setTaskType] = React.useState<HomeworkTaskType>('VOCAB');
  const [sourceKind, setSourceKind] = React.useState<SourceKind>('VOCAB_LIST');
  const [sourceUrl, setSourceUrl] = React.useState('');

  // VOCAB_LIST selection & settings
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [selectedWordIds, setSelectedWordIds] = React.useState<string[]>([]);
  const [showAllWords, setShowAllWords] = React.useState<boolean>(false);
  const [masteryStreak, setMasteryStreak] = React.useState<number>(2);
  const [masteryStreakInput, setMasteryStreakInput] = React.useState<string>('2');
  const [shuffle, setShuffle] = React.useState<boolean>(true);
  const [timeLimitMin, setTimeLimitMin] = React.useState<string>('');

  // Listening transcript generation state
  const [listeningDurationSecTarget, setListeningDurationSecTarget] = React.useState<number>(90);
  const [listeningTheme, setListeningTheme] = React.useState('');
  const [listeningLanguage, setListeningLanguage] = React.useState('en-US');
  const [listeningCefr, setListeningCefr] = React.useState('B1');
  const [listeningStyle, setListeningStyle] = React.useState('neutral');
  const [listeningSeed, setListeningSeed] = React.useState('');
  const [listeningMustIncludeAll, setListeningMustIncludeAll] = React.useState(true);
  const [listeningShowTranscript, setListeningShowTranscript] = React.useState(false);
  const [transcriptId, setTranscriptId] = React.useState<string | null>(null);
  const [transcriptDraft, setTranscriptDraft] = React.useState('');
  const [transcriptMetadata, setTranscriptMetadata] = React.useState<ListeningTranscriptResponse['metadata']>({
    language: listeningLanguage,
    theme: listeningTheme,
    cefr: listeningCefr,
    style: listeningStyle,
  });
  const [estimatedDurationSec, setEstimatedDurationSec] = React.useState<number | null>(null);
  const [wordCoverage, setWordCoverage] = React.useState<Record<string, boolean>>({});
  const [coverageMissing, setCoverageMissing] = React.useState<string[]>([]);
  const [transcriptError, setTranscriptError] = React.useState<string | null>(null);
  const [transcriptInfo, setTranscriptInfo] = React.useState<string | null>(null);
  const [hasUnsavedTranscriptEdits, setHasUnsavedTranscriptEdits] = React.useState(false);
  const [audioContentRef, setAudioContentRef] = React.useState<ListeningGeneratedAudioContentRef | null>(null);

  const isVocabList = taskType === 'VOCAB';
  const isListeningTask = taskType === 'LISTENING';

  // Load vocabulary words
  const { data: allWords = [] } = useQuery<VocabularyWord[]>({
    queryKey: ['vocabulary', 'words'],
    queryFn: () => vocabApi.listWords(),
    staleTime: 60_000,
  });
  const assignmentsQuery = useAssignments(studentId);

  const assignedWords = React.useMemo(() => {
    const seen = new Set<string>();
    return (assignmentsQuery.data ?? []).reduce<VocabularyWord[]>((acc, assignment) => {
      if (seen.has(assignment.vocabularyWordId)) return acc;
      const existing = allWords.find(word => word.id === assignment.vocabularyWordId);
      acc.push(existing ?? {
        id: assignment.vocabularyWordId,
        text: assignment.text,
        translation: assignment.translation,
        partOfSpeech: null,
        createdByTeacherId: '',
        definitionEn: '',
        synonymsEn: [],
        phonetic: null,
        audioUrl: null,
        exampleSentenceAudioUrl: null,
      });
      seen.add(assignment.vocabularyWordId);
      return acc;
    }, []);
  }, [assignmentsQuery.data, allWords]);

  const availableWords = React.useMemo(
    () => (showAllWords ? allWords : assignedWords),
    [showAllWords, allWords, assignedWords],
  );

  const wordLookup = React.useMemo(
    () => new Map([...allWords, ...assignedWords].map(w => [w.id, w] as const)),
    [allWords, assignedWords],
  );

  const selectedWordChips = React.useMemo(() => {
    return selectedWordIds.map(id => wordLookup.get(id)).filter(Boolean) as VocabularyWord[];
  }, [selectedWordIds, wordLookup]);

  React.useEffect(() => {
    if (showAllWords) return;
    if (assignmentsQuery.isLoading) return;
    const allowed = new Set(assignedWords.map(w => w.id));
    setSelectedWordIds(prev => prev.filter(id => allowed.has(id)));
  }, [showAllWords, assignedWords, assignmentsQuery.isLoading]);

  const listeningWordIds = React.useMemo(
    () => selectedWordIds.filter((id) => id && id.trim().length > 0),
    [selectedWordIds],
  );

  const listeningWordRequirementMet = listeningWordIds.length >= 3;

  const cefrOptions = React.useMemo(() => Array.from(new Set(Object.values(ENGLISH_LEVELS).map(level => level.code))), []);
  const languageOptions = React.useMemo(() => ['en-US', 'en-GB'], []);
  const styleOptions = React.useMemo(() => ['neutral', 'storytelling', 'documentary', 'conversational', 'inspirational'], []);
  const taskTypeOptions: HomeworkTaskType[] = [/*'VIDEO', 'READING', 'GRAMMAR' 'LINK',*/ 'VOCAB', 'LISTENING', ];
  const sourceKindOptions: SourceKind[] = [/*'MATERIAL', 'LESSON_CONTENT', 'EXTERNAL_URL',*/ 'VOCAB_LIST', 'GENERATED_AUDIO'];


  // fetch student options debounced by query
  React.useEffect(() => {
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

  // initialize selected student from prefill
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!open) return; // run on open
      if (!prefillStudentId) { setSelectedStudent(null); setStudentId(''); return; }
      try {
        const u = await fetchUserById(prefillStudentId);
        if (!cancelled) { setSelectedStudent({ id: u.id, name: u.name, email: u.email, avatar: u.avatar }); setStudentId(prefillStudentId); }
      } catch {
        if (!cancelled) { setSelectedStudent(null); setStudentId(''); }
      }
    })();
    return () => { cancelled = true; };
  }, [prefillStudentId, open]);

  // Reset state when drawer fully closes
  React.useEffect(() => {
    if (!open) {
      // reset draft when closed
      setStudentQ('');
      setTitle('Homework-' + new Date().toISOString().slice(0, 10));
      setInstructions('');
      setDueAt('');
      setTaskTitle('Task 1');
      setTaskType('VIDEO');
      setSourceKind('EXTERNAL_URL');
      setSourceUrl('');
      setPickerOpen(false);
      setSelectedWordIds([]);
      setMasteryStreak(2);
      setMasteryStreakInput('2');
      setShuffle(true);
      setTimeLimitMin('');
      setShowAllWords(false);
      setListeningDurationSecTarget(90);
      setListeningTheme('');
      setListeningLanguage('en-US');
      setListeningCefr('B1');
      setListeningStyle('neutral');
      setListeningSeed('');
      setListeningMustIncludeAll(true);
      setTranscriptId(null);
      setTranscriptDraft('');
      setTranscriptMetadata({
        language: 'en-US',
        theme: undefined,
        cefr: 'B1',
        style: 'neutral',
      });
      setEstimatedDurationSec(null);
      setWordCoverage({});
      setCoverageMissing([]);
      setTranscriptError(null);
      setTranscriptInfo(null);
      setHasUnsavedTranscriptEdits(false);
      setAudioContentRef(null);
    }
  }, [open]);

  const urlValid = React.useMemo(() => {
    if (sourceKind !== 'EXTERNAL_URL') return true;
    if (!sourceUrl.trim()) return false;
    try { new URL(sourceUrl.trim()); return true; } catch { return false; }
  }, [sourceKind, sourceUrl]);

  const isVocabSelectionInvalid = selectedWordIds.length < 5 || selectedWordIds.length > 100;

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

  const updateTranscriptMutation = useMutation<
    ListeningTranscriptResponse,
    Error,
    { transcriptId: string; transcript: string }
  >({
    mutationFn: async ({ transcriptId, transcript }) => {
      if (!user?.id) {
        throw new Error('You need to be signed in to save transcripts.');
      }
      return updateListeningTranscript(user.id, transcriptId, { transcript });
    },
  });

  const validateTranscriptMutation = useMutation<
    ValidateListeningTranscriptResponse,
    Error,
    ValidateListeningTranscriptPayload
  >({
    mutationFn: (payload) => validateListeningTranscript(payload),
  });

  const coverageEntries = React.useMemo(() => {
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

  const coverageSatisfied = React.useMemo(
    () => coverageEntries.length > 0 && coverageEntries.every(entry => entry.covered),
    [coverageEntries],
  );

  const formattedEstimatedDuration = React.useMemo(() => {
    if (estimatedDurationSec == null) return null;
    const mins = Math.floor(estimatedDurationSec / 60);
    const secs = Math.max(0, estimatedDurationSec % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, [estimatedDurationSec]);

  const highlightedTranscript = React.useMemo(() => {
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

  React.useEffect(() => {
    if (isListeningTask) {
      setSourceKind('GENERATED_AUDIO');
    } else if (sourceKind === 'GENERATED_AUDIO') {
      setSourceKind('EXTERNAL_URL');
    } else if (isVocabList){
        setSourceKind('VOCAB_LIST');
    }
  }, [isListeningTask, sourceKind]);

  React.useEffect(() => {
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

  React.useEffect(() => {
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
      maxWords: listeningDurationSecTarget,
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

  const isValid = React.useMemo(() => {
    if (!studentId || !title.trim()) return false;
    if (isVocabList) {
      return !isVocabSelectionInvalid;
    }
    if (isListeningTask) {
      if (
        !transcriptId ||
        hasUnsavedTranscriptEdits ||
        !listeningWordRequirementMet ||
        !audioContentRef
      ) {
        return false;
      }
      return true;
    }
    if (sourceKind === 'EXTERNAL_URL') {
      return urlValid;
    }
    return true;
  }, [
    studentId,
    title,
    isVocabList,
    isVocabSelectionInvalid,
    isListeningTask,
    transcriptId,
    hasUnsavedTranscriptEdits,
    listeningWordRequirementMet,
    audioContentRef,
    sourceKind,
    urlValid,
  ]);

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setSourceUrl(text);
    } catch {
      // ignore
    }
  };

  const buildTasks = (): CreateAssignmentDto['tasks'] => {
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
    } else if (isListeningTask && transcriptId && audioContentRef) {
      const generatorParams = {
        wordIds: listeningWordIds,
        maxWords: listeningDurationSecTarget,
        theme: listeningTheme || undefined,
        cefr: listeningCefr || undefined,
        language: listeningLanguage || undefined,
        style: listeningStyle || undefined,
        constraints: listeningMustIncludeAll ? { mustIncludeAllWords: true } : undefined,
        seed: listeningSeed.trim() ? Number(listeningSeed.trim()) : undefined,
      };

      const durationSec = audioContentRef?.durationSec ?? estimatedDurationSec ?? listeningDurationSecTarget;
      //const transcriptText = audioContentRef?.transcript ?? transcriptDraft.trim();

      const vocabularySettings: any = { masteryStreak, shuffle };
      const vocabularyTimeLimit = parseInt(timeLimitMin, 10);
      if (!isNaN(vocabularyTimeLimit)) vocabularySettings.timeLimitMin = vocabularyTimeLimit;

      const baseTitle = taskTitle.trim() || 'Listening task';
      if (listeningWordIds.length > 0) {
        tasks.push({
          title: `${baseTitle} · Vocabulary`,
          type: 'VOCAB',
          sourceKind: 'VOCAB_LIST',
          instructions: undefined,
          contentRef: { wordIds: selectedWordIds, settings: vocabularySettings },
          vocabWordIds: selectedWordIds,
        });
      }

      const transcriptText = listeningShowTranscript ? (audioContentRef?.transcriptId ?? transcriptDraft.trim()) : undefined;
      const listeningContentRef: Record<string, any> = {
        generatorRequestId: audioContentRef.generatorRequestId,
        audioMaterialId: audioContentRef.audioMaterialId,
        audioUrl: audioContentRef.audioUrl,
        transcriptId,
        ...(listeningShowTranscript && transcriptText ? { transcript: transcriptText } : {}),
        showTranscript: listeningShowTranscript,
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
        title: `${baseTitle} · Listening`,
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
    return tasks;
  };

  const submit = async (openAfterCreate: boolean) => {
    if (!user?.id || !isValid) return;

    if (isListeningTask) {
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
    }

    const payload: CreateAssignmentDto = {
      studentId,
      title,
      instructions: instructions || undefined,
      dueAt: toOffsetDateTime(dueAt) || undefined,
      tasks: buildTasks(),
    };
    try {
      const res = await create.mutateAsync(payload);
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
      const studentLabel = selectedStudent?.name || studentId;
      onSuccess(res, studentLabel);
      if (openAfterCreate && onCreateAndOpen) onCreateAndOpen(res);
    } catch (e) {
      // global error boundary/snackbar should show errors
    }
  };

  // focus management: autoFocus on the Student field when opening
  const studentAutoFocus = open;

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ elevation: 0, sx: { width: WIDTH, borderRadius: 0 } }}>
      <Box role="dialog" aria-label="New homework composer" sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }} onKeyDown={(e) => {
        if (e.key === 'Enter' && isValid) { e.preventDefault(); submit(false); }
      }}>
        {/* Header */}
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">New homework</Typography>
          <IconButton aria-label="Close" onClick={onClose}><CloseIcon /></IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pb: 10 /* space for sticky bar */ }}>
          {/* Assignment card */}
          <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Assignment</Typography>
            <Stack>
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
                    autoFocus={studentAutoFocus}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {studentLoading ? <CircularProgress color="inherit" size={16} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                    error={!studentId}
                    helperText={!studentId ? 'Required' : ' '}
                  />
                )}
                isOptionEqualToValue={(o, v) => o.id === v.id}
              />
              <TextField label="Title" value={title} onChange={e => setTitle(e.target.value)} fullWidth required error={!title.trim()} helperText={!title.trim() ? 'Required' : ' '}/>
              <TextField label="Instructions" value={instructions} onChange={e => setInstructions(e.target.value)} fullWidth multiline minRows={2} />
              <TextField type="datetime-local" label="Due At (Optional)" value={dueAt } sx={{mt: 2}} onChange={e => setDueAt(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Stack>
          </Paper>

          {/* Task card */}
          <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Task</Typography>
            <Stack gap={2}>
              <TextField
                select
                label="Type"
                value={taskType}
                onChange={e => setTaskType(e.target.value as HomeworkTaskType)}
              >
                {taskTypeOptions.map(t => (<MenuItem key={t} value={t}>{t}</MenuItem>))}
              </TextField>

              {sourceKind === 'EXTERNAL_URL' && (
                <Stack direction="row" gap={1} alignItems="center">
                  <TextField label="Source URL" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} fullWidth error={!urlValid} helperText={!urlValid ? 'Enter a valid URL' : ' '} />
                  <IconButton aria-label="Paste from clipboard" onClick={handlePasteFromClipboard}><ContentPasteIcon /></IconButton>
                </Stack>
              )}

              {(isVocabList || isListeningTask) && (
                <Stack gap={isListeningTask ? 2 : 1} sx={{ mt: 1 }}>
                  <Stack direction="row" gap={1} alignItems="center">
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
                  <Stack direction="row" gap={1} alignItems="center">
                    <FormControlLabel
                      control={<Checkbox checked={showAllWords} onChange={e => setShowAllWords(e.target.checked)} />}
                      label="Show all words"
                    />
                    {!showAllWords && !studentId && (
                      <Typography variant="caption" color="text.secondary">
                        Select a student to load assigned words
                      </Typography>
                    )}
                  </Stack>
                  {selectedWordChips.length > 0 && (
                    <Stack direction="row" gap={1} useFlexGap flexWrap="wrap">
                      {selectedWordChips.slice(0,5).map(w => (
                        <Chip key={w.id} size="small" label={w.text} />
                      ))}
                      {selectedWordChips.length > 5 && (
                        <Chip size="small" label={`+${selectedWordChips.length - 5} more`} />
                      )}
                    </Stack>
                  )}
                  {isListeningTask && (
                    <Typography variant="caption" color="text.secondary">
                      We&#39;ll also add a matching vocabulary practice task for these focus words.
                    </Typography>
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
                    <TextField
                      type="number"
                      label="Mastery streak"
                      value={masteryStreakInput}
                      onChange={(e) => {
                        const v = e.target.value;
                        setMasteryStreakInput(v);
                        if (v === '') return; // allow clearing while editing
                        const n = Math.floor(Number(v));
                        if (!Number.isNaN(n)) {
                          const clamped = Math.max(1, Math.min(10, n));
                          setMasteryStreak(clamped);
                        }
                      }}
                      onBlur={() => {
                        // on blur, if empty revert to last known valid value
                        if (masteryStreakInput === '') {
                          setMasteryStreakInput(String(masteryStreak));
                          return;
                        }
                        const n = Math.floor(Number(masteryStreakInput));
                        const clamped = Number.isNaN(n) ? masteryStreak : Math.max(1, Math.min(10, n));
                        setMasteryStreak(clamped);
                        setMasteryStreakInput(String(clamped));
                      }}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ min: 1, max: 10 }}
                      sx={{ mt: 1 }}
                    />
                  )}

                  {isListeningTask && (
                    <>
                      <Divider flexItem sx={{ borderStyle: 'dashed', opacity: 0.6 }} />

                      <Stack gap={1.5}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Generation preferences</Typography>
                        <Box>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }} gutterBottom>
                            Target max words
                          </Typography>
                          <TextField
                            type="number"
                            value={listeningDurationSecTarget}
                            onChange={(e) => setListeningDurationSecTarget(Math.max(1, Number(e.target.value) || 0))}
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ min: 1 }}
                            placeholder="e.g., 120"
                            fullWidth
                          />
                        </Box>
                        <TextField
                          fullWidth
                          label="Theme"
                          placeholder="General Topic"
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
                      </Stack>

                      <FormControlLabel
                        control={<Checkbox checked={listeningMustIncludeAll} onChange={(e) => setListeningMustIncludeAll(e.target.checked)} />}
                        label="Force every selected word to appear"
                      />

                      <FormControlLabel
                        control={<Checkbox checked={listeningShowTranscript} onChange={(e) => setListeningShowTranscript(e.target.checked)} />}
                        label="Show transcript to student"
                      />

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

                      {transcriptError && <Alert severity="error">{transcriptError}</Alert>}
                      {transcriptInfo && <Alert severity="info">{transcriptInfo}</Alert>}

                      <Stack spacing={1.5}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Transcript draft</Typography>
                        <TextField
                          value={transcriptDraft}
                          onChange={(e) => {
                            setTranscriptDraft(e.target.value);
                            setHasUnsavedTranscriptEdits(true);
                          }}
                          multiline
                          minRows={5}
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
                              variant="body2"
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
                          {transcriptId && (
                            <Typography variant="body2" color="text.secondary">
                              Draft saved as #{transcriptId.slice(0, 8)}
                            </Typography>
                          )}
                        </Stack>
                      {coverageEntries.length > 0 && (
                        <Stack spacing={0.5}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Word coverage</Typography>
                          <Stack spacing={0.5}>
                            {coverageEntries.map(entry => (
                                <Typography key={entry.word} variant="body2" sx={{ color: entry.covered ? '#047857' : '#b91c1c' }}>
                                  {entry.covered ? '✔︎' : '✕'} {entry.word}
                                </Typography>
                              ))}
                            </Stack>
                            {coverageMissing.length > 0 && (
                              <Typography variant="caption" color="error">
                                Missing: {coverageMissing.join(', ')}
                              </Typography>
                          )}
                        </Stack>
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
                  </>
                )}
                </Stack>
              )}
            </Stack>
          </Paper>
        </Box>

        {/* Sticky action bar */}
        <Paper variant="outlined" square sx={{ position: 'sticky', bottom: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 0 }}>
          <Stack direction="row" gap={1}>
            <Button onClick={onClose} color="inherit">Cancel</Button>
            <Button onClick={() => submit(true)} disabled={!isValid || create.isPending}>Create & open</Button>
          </Stack>
          <Button variant="contained" onClick={() => submit(false)} disabled={!isValid || create.isPending}>Create</Button>
        </Paper>
      </Box>

      <VocabularyPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        words={availableWords}
        selectedWordIds={selectedWordIds}
        onChange={(ids) => setSelectedWordIds(ids)}
        title={`${isListeningTask ? 'Select focus words' : 'Select vocabulary words'}${showAllWords ? '' : ' (assigned only)'}`}
      />
    </Drawer>
  );
};

export default HomeworkComposerDrawer;

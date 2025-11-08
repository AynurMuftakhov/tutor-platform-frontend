import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert, Autocomplete,
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
    DialogActions,
    DialogContent,
    Divider,
    FormControl,
    FormControlLabel,
    FormHelperText,
    InputLabel,
    MenuItem,
    Select,
    Slider,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { vocabApi } from '../../../services/vocabulary.api';
import {
  createListeningTask as apiCreateListeningTask,
  createManualListeningTranscript,
  createMaterial as apiCreateMaterial,
  deleteMaterial as apiDeleteMaterial,
  fetchListeningTasks,
  generateListeningTranscript,
  getListeningTranscript as apiGetListeningTranscript,
  updateListeningTask as apiUpdateListeningTask,
  updateListeningTranscript,
  updateMaterial as apiUpdateMaterial,
  validateListeningTranscript,
} from '../../../services/api';
import ListeningAudioGenerationPanel from '../../listening/ListeningAudioGenerationPanel';
import VocabularyPickerDialog from '../../vocabulary/VocabularyPickerDialog';
import type {
  GenerateListeningTranscriptPayload,
  ListeningAudioJobStatus,
  ListeningGeneratedAudioContentRef,
  ListeningTranscriptMetadata,
  ListeningVoiceConfig,
  VocabularyWord,
} from '../../../types';
import type { Material } from '../../../types/material';
import type { MaterialFolderTree } from '../../../types/MaterialFolder';
import type { ListeningTask, ListeningTaskCreatePayload, ListeningTaskPayload } from '../../../types/ListeningTask';
import { ENGLISH_LEVELS } from '../../../types/ENGLISH_LEVELS';
import { resolveUrl } from '../../../services/assets';

interface ListeningMaterialBuilderProps {
  onCancel: () => void;
  onMaterialCreated: (material?: Material) => void;
  materialToEdit?: Material | null;
  currentFolderId?: string;
  folderTree: MaterialFolderTree[];
  foldersLoading: boolean;
  availableTags: string[];
  tagsLoading: boolean;
}

const DEFAULT_WORD_TARGET = 160;
const styleOptions = ['neutral', 'storytelling', 'documentary', 'conversational', 'inspirational'];

const buildFolderOptions = (folders: MaterialFolderTree[], level = 0): React.ReactNode[] =>
  folders.flatMap((folder) => {
    const indent = level > 0 ? `${'\u2014'.repeat(level)} ` : '';
    const option = (
      <MenuItem key={folder.id} value={folder.id}>
        {indent}
        {folder.name}
      </MenuItem>
    );
    const children = folder.children ? buildFolderOptions(folder.children, level + 1) : [];
    return [option, ...children];
  });

const countWords = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

type CoverageEntry = {
  word: string;
  wordId: string;
  covered: boolean;
  manual: boolean;
  manualText?: string;
};

const ListeningMaterialBuilder: React.FC<ListeningMaterialBuilderProps> = ({
  onCancel,
  onMaterialCreated,
  materialToEdit,
  currentFolderId,
  folderTree,
  foldersLoading,
  availableTags,
  tagsLoading,
}) => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [title, setTitle] = useState(materialToEdit?.title ?? 'Listening');
  const [folderId, setFolderId] = useState(materialToEdit?.folderId ?? currentFolderId ?? '');
  const [selectedTags, setSelectedTags] = useState<string[]>(materialToEdit?.tags ?? []);
  const [tagInputValue, setTagInputValue] = useState('');

  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([]);
  const [listeningLanguage, setListeningLanguage] = useState('en-US');
  const [listeningCefr, setListeningCefr] = useState('B1');
  const [listeningTheme, setListeningTheme] = useState('');
  const [listeningStyle, setListeningStyle] = useState('neutral');
  const [wordTarget, setWordTarget] = useState(DEFAULT_WORD_TARGET);

  const [transcriptId, setTranscriptId] = useState<string | null>(null);
  const [transcriptDraft, setTranscriptDraft] = useState('');
  const [transcriptMetadata, setTranscriptMetadata] = useState<ListeningTranscriptMetadata | undefined>(undefined);
  const [estimatedDurationSec, setEstimatedDurationSec] = useState<number | null>(null);
  const [wordCoverage, setWordCoverage] = useState<Record<string, boolean>>({});
  const [transcriptInfo, setTranscriptInfo] = useState<string | null>(null);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [hasUnsavedTranscriptEdits, setHasUnsavedTranscriptEdits] = useState(false);
  const [isTranscriptSaving, setIsTranscriptSaving] = useState(false);
  const [isGeneratingTranscript, setIsGeneratingTranscript] = useState(false);
  const [isValidatingTranscript, setIsValidatingTranscript] = useState(false);
  const transcriptInputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const [manualCoverageLinks, setManualCoverageLinks] = useState<Record<string, string>>({});
  const [linkTargetWordId, setLinkTargetWordId] = useState('');
  const [selectionPreview, setSelectionPreview] = useState('');

  const [audioStatus, setAudioStatus] = useState<ListeningAudioJobStatus | null>(null);
  const [audioSourceUrl, setAudioSourceUrl] = useState<string>(materialToEdit?.sourceUrl ?? '');
  const [audioDurationSec, setAudioDurationSec] = useState<number | null>(materialToEdit?.duration ?? null);
  const [existingVoice, setExistingVoice] = useState<ListeningVoiceConfig | null>(null);

  const [existingTask, setExistingTask] = useState<ListeningTask | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingTask, setLoadingTask] = useState<boolean>(!!materialToEdit);

  const initialTargetWordsRef = useRef<string[] | null>(null);
  const hasInitializedRef = useRef(false);

  const cefrOptions = useMemo(
    () => Array.from(new Set(Object.values(ENGLISH_LEVELS).map((level) => level.code))),
    [],
  );

  const { data: allWords = [], isLoading: vocabLoading } = useQuery<VocabularyWord[]>({
    queryKey: ['vocabulary', 'words'],
    queryFn: () => vocabApi.listWords(),
    staleTime: 60_000,
  });

  const { data: listeningTasks = [], isLoading: listeningTasksLoading } = useQuery<ListeningTask[]>({
    queryKey: ['listening-tasks', materialToEdit?.id ?? ''],
    queryFn: () => fetchListeningTasks(materialToEdit!.id),
    enabled: !!materialToEdit?.id,
    staleTime: 10_000,
  });

  const selectedWords = useMemo(() => {
    if (!selectedWordIds.length) {
      return [];
    }
    const wordsById = new Map(allWords.map((word) => [word.id, word] as const));
    return selectedWordIds
      .map((wordId) => wordsById.get(wordId))
      .filter((word): word is VocabularyWord => Boolean(word));
  }, [allWords, selectedWordIds]);

  const coverageEntries: CoverageEntry[] = useMemo(() => {
    if (!selectedWords.length) return [];
    return selectedWords.map((word) => {
      const normalized = word.text.trim();
      const lower = normalized.toLowerCase();
      const autoCovered = Boolean(
        wordCoverage[normalized] ?? wordCoverage[lower] ?? wordCoverage[word.text] ?? false,
      );
      const manualText = manualCoverageLinks[word.id];
      return {
        word: normalized,
        wordId: word.id,
        covered: autoCovered || Boolean(manualText),
        manual: Boolean(manualText),
        manualText: manualText || undefined,
      };
    });
  }, [selectedWords, wordCoverage, manualCoverageLinks]);

  const missingCoverageEntries = useMemo(
    () => coverageEntries.filter((entry) => !entry.covered),
    [coverageEntries],
  );
  const coverageSatisfied =
    selectedWordIds.length === 0 || missingCoverageEntries.length === 0;
  const missingCoverage = missingCoverageEntries.map((entry) => entry.word);

  useEffect(() => {
    if (!missingCoverageEntries.length) {
      if (linkTargetWordId) {
        setLinkTargetWordId('');
      }
      return;
    }
    const stillValid = missingCoverageEntries.some((entry) => entry.wordId === linkTargetWordId);
    if (!linkTargetWordId || !stillValid) {
      setLinkTargetWordId(missingCoverageEntries[0].wordId);
    }
  }, [missingCoverageEntries, linkTargetWordId]);

  useEffect(() => {
    setManualCoverageLinks((prev) => {
      if (!Object.keys(prev).length) return prev;
      const next: Record<string, string> = {};
      selectedWordIds.forEach((wordId) => {
        if (prev[wordId]) {
          next[wordId] = prev[wordId];
        }
      });
      if (Object.keys(next).length === Object.keys(prev).length) {
        return prev;
      }
      return next;
    });
  }, [selectedWordIds]);

  useEffect(() => {
    if (!selectedWords.length) return;
    setManualCoverageLinks((prev) => {
      if (!Object.keys(prev).length) return prev;
      let updated = false;
      const next = { ...prev };
      selectedWords.forEach((word) => {
        const normalized = word.text.trim();
        const lower = normalized.toLowerCase();
        const autoCovered = Boolean(
          wordCoverage[normalized] ?? wordCoverage[lower] ?? wordCoverage[word.text] ?? false,
        );
        if (autoCovered && next[word.id]) {
          delete next[word.id];
          updated = true;
        }
      });
      return updated ? next : prev;
    });
  }, [selectedWords, wordCoverage]);

  useEffect(() => {
    setManualCoverageLinks({});
    setSelectionPreview('');
  }, [transcriptId]);

  const getCurrentTranscriptSelection = () => {
    const input = transcriptInputRef.current;
    if (!input) return '';
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    if (start === end) return '';
    return input.value.substring(start, end).trim();
  };

  const handleTranscriptSelectionChange = (
    event: React.SyntheticEvent<HTMLTextAreaElement | HTMLInputElement>,
  ) => {
    const target = event.currentTarget;
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? 0;
    if (start === end) {
      setSelectionPreview('');
      return;
    }
    setSelectionPreview(target.value.substring(start, end).trim());
  };

  const handleLinkSelectionToWord = () => {
    if (!linkTargetWordId) {
      enqueueSnackbar('Choose a target word to link.', { variant: 'info' });
      return;
    }
    const selection = getCurrentTranscriptSelection();
    if (!selection) {
      enqueueSnackbar('Select text in the transcript before linking.', { variant: 'warning' });
      return;
    }
    const targetWord = selectedWords.find((word) => word.id === linkTargetWordId);
    if (!targetWord) {
      enqueueSnackbar('Selected target word is no longer available.', { variant: 'warning' });
      return;
    }
    setManualCoverageLinks((prev) => ({
      ...prev,
      [linkTargetWordId]: selection,
    }));
    setSelectionPreview(selection);
    enqueueSnackbar(`Linked selection to "${targetWord.text}".`, { variant: 'success' });
  };

  const handleManualLinkClear = (wordId: string) => {
    setManualCoverageLinks((prev) => {
      if (!prev[wordId]) return prev;
      const next = { ...prev };
      delete next[wordId];
      return next;
    });
  };

  const ensureTeacher = () => {
    if (!user?.id) {
      enqueueSnackbar('You need to be signed in to continue.', { variant: 'error' });
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (!materialToEdit?.id) {
      setLoadingTask(false);
      return;
    }
    if (listeningTasksLoading) return;
    if (hasInitializedRef.current) return;
    if (!listeningTasks.length) {
      setLoadingTask(false);
      hasInitializedRef.current = true;
      return;
    }

    const task = listeningTasks[0];
    setExistingTask(task);
    setTranscriptId(task.transcriptId ?? null);
    setTranscriptDraft(task.transcriptText ?? '');
    setWordCoverage({});
    setTranscriptInfo(null);
    setTranscriptError(null);
    setHasUnsavedTranscriptEdits(false);
    initialTargetWordsRef.current = task.targetWords ?? [];
    setListeningLanguage(task.language || 'en-US');
    setListeningCefr(task.difficulty || 'B1');
    setListeningTheme(task.notes ?? '');
    setExistingVoice(task.voice ?? null);

    const taskDuration =
      typeof task.startSec === 'number' && typeof task.endSec === 'number'
        ? Math.max(1, task.endSec - task.startSec)
        : materialToEdit.duration ?? null;
    setAudioDurationSec(taskDuration);

    const existingAudio = task.audioUrl || materialToEdit.sourceUrl || '';
    setAudioSourceUrl(existingAudio);

    const init = async () => {
      if (task.transcriptId && user?.id) {
        try {
          const transcript = await apiGetListeningTranscript(user.id, task.transcriptId);
          setTranscriptDraft(transcript.transcript ?? task.transcriptText ?? '');
          setTranscriptMetadata(transcript.metadata ?? undefined);
          setWordCoverage(transcript.wordCoverage ?? {});
          setEstimatedDurationSec(transcript.estimatedDurationSec ?? taskDuration);
        } catch {
          setTranscriptDraft(task.transcriptText ?? '');
          setTranscriptMetadata(undefined);
          setWordCoverage({});
          setEstimatedDurationSec(taskDuration);
        }
      } else {
        setTranscriptDraft(task.transcriptText ?? '');
        setTranscriptMetadata(undefined);
        setEstimatedDurationSec(taskDuration);
      }
      setLoadingTask(false);
      hasInitializedRef.current = true;
    };

    init().catch(() => {
      setLoadingTask(false);
      hasInitializedRef.current = true;
    });
  }, [materialToEdit?.id, listeningTasks, listeningTasksLoading, materialToEdit, user]);

  useEffect(() => {
    if (!allWords.length) return;
    if (!initialTargetWordsRef.current || !initialTargetWordsRef.current.length) return;
    const matched = initialTargetWordsRef.current
      .map((wordText) => {
        const lower = wordText.toLowerCase();
        return allWords.find((word) => word.text.toLowerCase() === lower);
      })
      .filter(Boolean) as VocabularyWord[];
    setSelectedWordIds(matched.map((word) => word.id));
    initialTargetWordsRef.current = null;
  }, [allWords]);

  const handleGenerateTranscript = async () => {
    if (!ensureTeacher()) return;
    if (selectedWordIds.length < 3) {
      enqueueSnackbar('Pick at least 3 target words before generating a transcript.', {
        variant: 'warning',
      });
      return;
    }
    setIsGeneratingTranscript(true);
    setTranscriptError(null);
    setTranscriptInfo(null);
    try {
      const payload: GenerateListeningTranscriptPayload = {
        wordIds: selectedWordIds,
        maxWords: wordTarget,
        theme: listeningTheme || undefined,
        cefr: listeningCefr || undefined,
        language: listeningLanguage || undefined,
        style: listeningStyle || undefined
      };
      const result = await generateListeningTranscript(user!.id, payload);
      setTranscriptId(result.transcriptId);
      setTranscriptDraft(result.transcript ?? '');
      setTranscriptMetadata(result.metadata ?? {});
      setWordCoverage(result.wordCoverage ?? {});
      setEstimatedDurationSec(result.estimatedDurationSec ?? null);
      setHasUnsavedTranscriptEdits(false);
      setTranscriptInfo('Transcript generated. Review and tweak if needed.');
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || 'Failed to generate transcript.';
      setTranscriptError(message);
      enqueueSnackbar(message, { variant: 'error' });
    } finally {
      setIsGeneratingTranscript(false);
    }
  };

  const handleSaveTranscript = async () => {
    if (!ensureTeacher()) return;
    if (!transcriptDraft.trim()) {
      enqueueSnackbar('Write or generate the transcript before saving.', { variant: 'warning' });
      return;
    }
    setIsTranscriptSaving(true);
    setTranscriptError(null);
    try {
      if (transcriptId) {
        const result = await updateListeningTranscript(user!.id, transcriptId, {
          transcript: transcriptDraft,
        });
        setWordCoverage(result.wordCoverage ?? {});
        setTranscriptMetadata(result.metadata ?? transcriptMetadata);
        setEstimatedDurationSec(result.estimatedDurationSec ?? estimatedDurationSec);
        setTranscriptInfo('Transcript saved.');
        setHasUnsavedTranscriptEdits(false);
      } else {
        const result = await createManualListeningTranscript(user!.id, {
          transcript: transcriptDraft,
          wordIds: selectedWordIds.length ? selectedWordIds : undefined,
          language: listeningLanguage || undefined,
          theme: listeningTheme || undefined,
          cefr: listeningCefr || undefined,
          style: listeningStyle || undefined,
        });
        setTranscriptId(result.transcriptId);
        setWordCoverage(result.wordCoverage ?? {});
        setTranscriptMetadata(result.metadata ?? {});
        setEstimatedDurationSec(result.estimatedDurationSec ?? null);
        setTranscriptInfo('Transcript saved.');
        setHasUnsavedTranscriptEdits(false);
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || 'Failed to save transcript.';
      setTranscriptError(message);
      enqueueSnackbar(message, { variant: 'error' });
    } finally {
      setIsTranscriptSaving(false);
    }
  };

  const handleValidateTranscript = async () => {
    if (!selectedWordIds.length) {
      enqueueSnackbar('Select target words to validate coverage.', { variant: 'info' });
      return;
    }
    setIsValidatingTranscript(true);
    try {
      const result = await validateListeningTranscript({
        transcript: transcriptDraft,
        wordIds: selectedWordIds,
      });
      setWordCoverage(result.wordCoverage ?? {});
      if (result.missing?.length) {
        setTranscriptInfo(`Missing words: ${result.missing.join(', ')}`);
      } else {
        setTranscriptInfo('All target words are covered.');
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || 'Failed to validate transcript.';
      enqueueSnackbar(message, { variant: 'error' });
    } finally {
      setIsValidatingTranscript(false);
    }
  };

  const handleAudioContentChange = (content: ListeningGeneratedAudioContentRef | null) => {
    if (!content) {
      setAudioStatus(null);
      return;
    }
    setAudioSourceUrl(content.audioUrl);
    setAudioDurationSec(content.durationSec ?? null);
    const voice: ListeningVoiceConfig | null = content.voiceId
      ? {
          id: content.voiceId,
          speed: content.voiceSettings?.speed,
          pitch: content.voiceSettings?.style,
          style: listeningStyle,
        }
      : null;
    setExistingVoice(voice);
  };

  const handleDurationUpdate = (durationSec: number | null) => {
    if (durationSec && durationSec > 0) {
      setAudioDurationSec(durationSec);
    }
  };

  const finalDurationSec = useMemo(() => {
    if (audioDurationSec && audioDurationSec > 0) return Math.round(audioDurationSec);
    if (estimatedDurationSec && estimatedDurationSec > 0) return Math.round(estimatedDurationSec);
    return undefined;
  }, [audioDurationSec, estimatedDurationSec]);

  const canSave =
    Boolean(title.trim()) &&
    Boolean(transcriptDraft.trim()) &&
    Boolean(transcriptId) &&
    !hasUnsavedTranscriptEdits &&
    Boolean(audioSourceUrl) &&
    !isTranscriptSaving &&
    !isGeneratingTranscript &&
    !loadingTask;

  const handleSaveMaterial = async () => {
    if (!ensureTeacher()) return;
    if (!canSave) {
      if (!transcriptId) {
        enqueueSnackbar('Save the transcript before continuing.', { variant: 'warning' });
      } else if (hasUnsavedTranscriptEdits) {
        enqueueSnackbar('Save transcript edits before continuing.', { variant: 'warning' });
      } else if (!audioSourceUrl) {
        enqueueSnackbar('Generate audio before saving the material.', { variant: 'warning' });
      }
      return;
    }

    const finalTags = [...selectedTags];
    const trimmedInput = tagInputValue.trim();
    if (trimmedInput && !finalTags.includes(trimmedInput)) {
      finalTags.push(trimmedInput);
    }

    const materialPayload = {
      title: title.trim(),
      type: 'LISTENING',
      sourceUrl: audioSourceUrl,
      durationSec: finalDurationSec,
      folderId: folderId || undefined,
      tags: finalTags,
    };

    const transcriptText = transcriptDraft.trim();
    const wordLimit = countWords(transcriptText) || undefined;
    const durationForTask = finalDurationSec ?? Math.max(60, wordTarget);
    const timeLimitSec = finalDurationSec ? Math.max(30, finalDurationSec + 15) : undefined;

    const baseTaskPayload: ListeningTaskPayload = {
      title: title.trim(),
      startSec: 0,
      endSec: durationForTask,
      wordLimit,
      timeLimitSec,
      transcriptId: transcriptId || undefined,
      transcriptText,
      targetWords: selectedWords.map((word) => word.text),
      audioUrl: audioSourceUrl,
      voice: existingVoice,
      language: listeningLanguage,
      difficulty: listeningCefr,
      status: 'READY',
    };

    let materialResult: Material | null = null;
    setIsSaving(true);
    try {
      const savedMaterial = materialToEdit
        ? await apiUpdateMaterial(materialToEdit.id, materialPayload)
        : await apiCreateMaterial(materialPayload);
      materialResult = savedMaterial;

      const materialId = savedMaterial.id;

      if (existingTask?.id) {
        await apiUpdateListeningTask(materialId, existingTask.id, baseTaskPayload);
      } else {
        const createPayload: ListeningTaskCreatePayload = {
          ...baseTaskPayload,
          startSec: 0,
          endSec: durationForTask,
        };
        await apiCreateListeningTask(materialId, createPayload);
      }

      enqueueSnackbar(
        materialToEdit ? 'Listening material updated.' : 'Listening material created.',
        { variant: 'success' },
      );
      onMaterialCreated(savedMaterial);
      onCancel();
    } catch (error: any) {
      if (!materialToEdit && materialResult?.id) {
        try {
          await apiDeleteMaterial(materialResult.id);
        } catch {
          // best effort
        }
      }
      const message =
        error?.response?.data?.message || error?.message || 'Failed to save listening material.';
      enqueueSnackbar(message, { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingTask || listeningTasksLoading) {
    return (
      <>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCancel}>Cancel</Button>
          <Button disabled variant="contained">
            {materialToEdit ? 'Update' : 'Save'}
          </Button>
        </DialogActions>
      </>
    );
  }

  return (
    <>
      <DialogContent dividers>
        <Stack spacing={3}>
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            required
          />
            <Autocomplete
                multiple
                options={availableTags}
                loading={tagsLoading}
                value={selectedTags}
                onChange={(_, value) => setSelectedTags(value)}
                inputValue={tagInputValue}
                onInputChange={(_, value) => setTagInputValue(value)}
                freeSolo
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label="Tags"
                        placeholder="Add tags"
                        helperText="Select existing tags or add new ones"
                    />
                )}
            />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl fullWidth disabled={foldersLoading}>
              <InputLabel id="listening-folder-label">Folder</InputLabel>
              <Select
                labelId="listening-folder-label"
                label="Folder"
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
              >
                <MenuItem value="">Uncategorized</MenuItem>
                {buildFolderOptions(folderTree)}
              </Select>
              <FormHelperText>Select a folder to organise this material</FormHelperText>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="listening-cefr-label">CEFR</InputLabel>
              <Select
                labelId="listening-cefr-label"
                label="CEFR"
                value={listeningCefr}
                onChange={(e) => setListeningCefr(e.target.value)}
              >
                {cefrOptions.map((code) => (
                  <MenuItem key={code} value={code}>
                    {code}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <TextField
            label="Theme (optional)"
            value={listeningTheme}
            onChange={(e) => setListeningTheme(e.target.value)}
            fullWidth
            placeholder="e.g., Travelling to London"
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel id="listening-style-label">Narration style</InputLabel>
              <Select
                labelId="listening-style-label"
                label="Narration style"
                value={listeningStyle}
                onChange={(e) => setListeningStyle(e.target.value)}
              >
                {styleOptions.map((style) => (
                  <MenuItem key={style} value={style}>
                    {style}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Target words (optional)
            </Typography>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
            >
              <Button
                variant="outlined"
                onClick={() => setPickerOpen(true)}
                disabled={vocabLoading}
              >
                {selectedWordIds.length ? 'Edit target words' : 'Select target words'}
              </Button>
              {vocabLoading && <CircularProgress size={18} />}
              <Chip size="small" label={`${selectedWordIds.length} selected`} />
              <Typography variant="caption" color="text.secondary">
                Pick 3+ words to guide transcript generation.
              </Typography>
            </Stack>
            {selectedWords.length > 0 && (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                {selectedWords.map((word) => (
                  <Chip key={word.id} label={word.text} />
                ))}
              </Stack>
            )}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
              <Box sx={{ flex: 1 }}>
              <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }} gutterBottom>
                      Target max words
                  </Typography>
                  <TextField
                      type="number"
                      value={wordTarget}
                      onChange={(e) => setWordTarget(Math.max(1, Number(e.target.value) || 0))}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ min: 1 }}
                      placeholder="e.g., 120"
                      fullWidth
                  />
              </Box>
              </Box>
            </Stack>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button
              variant="outlined"
              onClick={handleGenerateTranscript}
              disabled={isGeneratingTranscript || selectedWordIds.length < 3}
            >
              {isGeneratingTranscript ? <CircularProgress size={18} /> : 'Generate transcript'}
            </Button>
            <Button
              variant="outlined"
              onClick={handleValidateTranscript}
              disabled={isValidatingTranscript || !selectedWordIds.length}
            >
              {isValidatingTranscript ? <CircularProgress size={18} /> : 'Validate coverage'}
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveTranscript}
              disabled={isTranscriptSaving}
            >
              {isTranscriptSaving ? <CircularProgress size={18} /> : 'Save transcript'}
            </Button>
          </Stack>

          {transcriptError && <Alert severity="error">{transcriptError}</Alert>}
          {transcriptInfo && <Alert severity={missingCoverage.length ? 'warning' : 'info'}>{transcriptInfo}</Alert>}

          <TextField
            label="Transcript"
            value={transcriptDraft}
            onChange={(e) => {
              setTranscriptDraft(e.target.value);
              setHasUnsavedTranscriptEdits(true);
            }}
            multiline
            minRows={6}
            fullWidth
            placeholder="Write or generate the listening transcript here"
            inputRef={transcriptInputRef}
            inputProps={{
              onSelect: handleTranscriptSelectionChange,
            }}
          />

          {selectedWordIds.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Coverage
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {coverageEntries.map((entry) => {
                  const chip = (
                    <Chip
                      label={entry.word}
                      color={entry.manual ? 'info' : entry.covered ? 'success' : 'warning'}
                      variant={entry.covered ? 'filled' : 'outlined'}
                      onDelete={entry.manual ? () => handleManualLinkClear(entry.wordId) : undefined}
                    />
                  );
                  return (
                    <Box component="span" key={entry.wordId}>
                      {entry.manualText ? (
                        <Tooltip title={`Manual link: "${entry.manualText}"`}>
                          {chip}
                        </Tooltip>
                      ) : (
                        chip
                      )}
                    </Box>
                  );
                })}
              </Stack>
              {!coverageSatisfied && (
                <>
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    Some target words are still missing, but you can continue if you&apos;re comfortable with the coverage or link them manually below.
                  </Alert>
                  {missingCoverageEntries.length > 0 && (
                    <Box
                      sx={{
                        mt: 2,
                        p: 2,
                        borderRadius: 1,
                        border: (theme) => `1px dashed ${theme.palette.divider}`,
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Link coverage manually
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Highlight transcript text, choose the target word it satisfies, then link them if validation missed it.
                      </Typography>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                        <TextField
                          select
                          fullWidth
                          label="Target word"
                          value={linkTargetWordId}
                          onChange={(e) => setLinkTargetWordId(e.target.value)}
                        >
                          {missingCoverageEntries.map((entry) => (
                            <MenuItem key={entry.wordId} value={entry.wordId}>
                              {entry.word}
                            </MenuItem>
                          ))}
                        </TextField>
                        <Button
                          variant="outlined"
                          onClick={handleLinkSelectionToWord}
                          disabled={!linkTargetWordId}
                        >
                          Link selection
                        </Button>
                      </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        {selectionPreview
                          ? `Selection: "${selectionPreview.length > 80 ? `${selectionPreview.slice(0, 77)}…` : selectionPreview}"`
                          : 'Select text in the transcript to link it.'}
                      </Typography>
                    </Box>
                  )}
                </>
              )}
            </Box>
          )}

          {audioSourceUrl && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Current audio
              </Typography>
              <audio controls src={resolveUrl(audioSourceUrl)} style={{ width: '100%' }} />
            </Box>
          )}

          <ListeningAudioGenerationPanel
            transcriptId={transcriptId}
            transcriptText={transcriptDraft}
            metadata={transcriptMetadata}
            wordIds={selectedWordIds}
            coverageSatisfied={coverageSatisfied}
            disabled={!transcriptId || hasUnsavedTranscriptEdits}
            languageCode={listeningLanguage}
            theme={listeningTheme || undefined}
            cefr={listeningCefr || undefined}
            hasUnsavedTranscriptEdits={hasUnsavedTranscriptEdits}
            onAudioContentChange={handleAudioContentChange}
            onDurationUpdate={handleDurationUpdate}
            onStatusChange={setAudioStatus}
          />

          {audioStatus && (
            <Typography variant="caption" color="text.secondary">
              Audio job status: {audioStatus}
            </Typography>
          )}

          <Divider />

          <Stack direction="row" spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Final duration (sec)
              </Typography>
              <Typography variant="body2">
                {finalDurationSec ? `${finalDurationSec}s` : 'Not available yet'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Word count
              </Typography>
              <Typography variant="body2">{countWords(transcriptDraft)}</Typography>
            </Box>
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSaveMaterial}
          disabled={!canSave || isSaving}
        >
          {isSaving ? <CircularProgress size={18} /> : materialToEdit ? 'Update' : 'Save'}
        </Button>
      </DialogActions>
      <VocabularyPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        words={allWords}
        selectedWordIds={selectedWordIds}
        onChange={setSelectedWordIds}
        title="Select target words"
        searchLabel="Search vocabulary"
      />
    </>
  );
};

export default ListeningMaterialBuilder;

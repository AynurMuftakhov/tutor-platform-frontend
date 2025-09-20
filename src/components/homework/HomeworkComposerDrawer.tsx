import React from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  FormControlLabel,
  Checkbox,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import {useQuery} from '@tanstack/react-query';
import {useAuth} from '../../context/AuthContext';
import {useCreateAssignment} from '../../hooks/useHomeworks';
import {useAssignWords} from '../../hooks/useAssignments';
import {CreateAssignmentDto, HomeworkTaskType, SourceKind, AssignmentDto} from '../../types/homework';
import {toOffsetDateTime} from '../../utils/datetime';
import {fetchStudents, fetchUserById} from '../../services/api';
import {vocabApi} from '../../services/vocabulary.api';
import VocabularyList from '../vocabulary/VocabularyList';
import type {VocabularyWord} from '../../types';

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

  const [title, setTitle] = React.useState('Homework');
  const [instructions, setInstructions] = React.useState('');
  const [dueAt, setDueAt] = React.useState('');

  // Task fields
  const [taskTitle, setTaskTitle] = React.useState('Task 1');
  const [taskType, setTaskType] = React.useState<HomeworkTaskType>('VIDEO');
  const [sourceKind, setSourceKind] = React.useState<SourceKind>('EXTERNAL_URL');
  const [sourceUrl, setSourceUrl] = React.useState('');

  // VOCAB_LIST selection & settings
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [selectedWordIds, setSelectedWordIds] = React.useState<string[]>([]);
  const [wordSearch, setWordSearch] = React.useState('');
  const [masteryStreak, setMasteryStreak] = React.useState<number>(2);
  const [shuffle, setShuffle] = React.useState<boolean>(true);
  const [timeLimitMin, setTimeLimitMin] = React.useState<string>('');

  const isVocabList = taskType === 'VOCAB' && sourceKind === 'VOCAB_LIST';

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
      setTitle('Homework');
      setInstructions('');
      setDueAt('');
      setTaskTitle('Task 1');
      setTaskType('VIDEO');
      setSourceKind('EXTERNAL_URL');
      setSourceUrl('');
      setPickerOpen(false);
      setSelectedWordIds([]);
      setWordSearch('');
      setMasteryStreak(2);
      setShuffle(true);
      setTimeLimitMin('');
    }
  }, [open]);

  const urlValid = React.useMemo(() => {
    if (sourceKind !== 'EXTERNAL_URL') return true;
    if (!sourceUrl.trim()) return false;
    try { new URL(sourceUrl.trim()); return true; } catch { return false; }
  }, [sourceKind, sourceUrl]);

  const isValid = React.useMemo(() => {
    if (!studentId || !title.trim()) return false;
    if (isVocabList) {
      return selectedWordIds.length >= 5 && selectedWordIds.length <= 100;
    }
    if (sourceKind === 'EXTERNAL_URL') {
      return urlValid;
    }
    // other combinations considered valid for now (MATERIAL/LESSON_CONTENT pickers are future work)
    return true;
  }, [studentId, title, isVocabList, selectedWordIds.length, sourceKind, urlValid]);

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
            <Stack gap={2}>
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
              <TextField type="datetime-local" label="Due At" value={dueAt} onChange={e => setDueAt(e.target.value)} InputLabelProps={{ shrink: true }} helperText="Optional" />
            </Stack>
          </Paper>

          {/* Task card */}
          <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Task</Typography>
            <Stack gap={2}>
              {/*<TextField label="Task title" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} fullWidth />*/}
              <TextField select label="Task type" value={taskType} onChange={e => setTaskType(e.target.value as HomeworkTaskType)}>
                {['VOCAB'].map(t => (<MenuItem key={t} value={t}>{t}</MenuItem>))}
              </TextField>
              <TextField select label="Source kind" value={sourceKind} onChange={e => setSourceKind(e.target.value as SourceKind)}>
                {['VOCAB_LIST'].map(s => (<MenuItem key={s} value={s}>{s}</MenuItem>))}
              </TextField>

              {sourceKind === 'EXTERNAL_URL' && (
                <Stack direction="row" gap={1} alignItems="center">
                  <TextField label="Source URL" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} fullWidth error={!urlValid} helperText={!urlValid ? 'Enter a valid URL' : ' '} />
                  <IconButton aria-label="Paste from clipboard" onClick={handlePasteFromClipboard}><ContentPasteIcon /></IconButton>
                </Stack>
              )}

              {isVocabList && (
                <Stack gap={1} sx={{ mt: 1 }}>
                  <Stack direction="row" gap={1} alignItems="center">
                    <Button variant="outlined" onClick={() => setPickerOpen(true)}>Select words</Button>
                    <Chip size="small" color={selectedWordIds.length >= 5 ? 'success' : 'warning'} label={`${selectedWordIds.length} selected`} />
                    <Typography variant="caption" color="text.secondary">Choose 5–100 words</Typography>
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
                  {(selectedWordIds.length < 5 || selectedWordIds.length > 100) && (
                    <Typography variant="caption" color="error">Please select between 5 and 100 words.</Typography>
                  )}
                  <TextField type="number" label="Mastery streak" value={masteryStreak}
                             onChange={e => setMasteryStreak(Math.max(1, Math.min(10, Number(e.target.value) || 0)))}
                             InputLabelProps={{ shrink: true }} inputProps={{ min: 1, max: 10 }} />
                  {/*<FormControlLabel control={<Checkbox checked={shuffle} onChange={(e)=> setShuffle(e.target.checked)} />} label="Shuffle words" />*/}
     {/*             <TextField type="number" label="Time limit (minutes)" value={timeLimitMin}
                             onChange={e => setTimeLimitMin(e.target.value)} InputLabelProps={{ shrink: true }}
                             helperText="Optional" />*/}
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

      {/* Nested vocabulary selector dialog */}
      <Dialog open={pickerOpen} onClose={() => setPickerOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Select vocabulary words</DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ mt: 1 }}>
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
    </Drawer>
  );
};

export default HomeworkComposerDrawer;

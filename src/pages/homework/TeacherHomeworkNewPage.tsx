import React, { useEffect, useState } from 'react';
import { Box, Button, Container, Grid, MenuItem, Stack, TextField, Typography, Autocomplete, CircularProgress, Chip, Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel, Checkbox } from '@mui/material';
import { CreateAssignmentDto, HomeworkTaskType, SourceKind } from '../../types/homework';
import { useAuth } from '../../context/AuthContext';
import { useCreateAssignment } from '../../hooks/useHomeworks';
import { useAssignWords } from '../../hooks/useAssignments';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toOffsetDateTime } from '../../utils/datetime';
import { fetchStudents, fetchUserById } from '../../services/api';
import { useQuery } from '@tanstack/react-query';
import { vocabApi } from '../../services/vocabulary.api';
import VocabularyList from '../../components/vocabulary/VocabularyList';
import type { VocabularyWord } from '../../types';

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
              {['VIDEO','READING','GRAMMAR','VOCAB','LINK'].map(t => (<MenuItem key={t} value={t}>{t}</MenuItem>))}
            </TextField>
            <TextField select label="Source kind" value={sourceKind} onChange={e => setSourceKind(e.target.value as SourceKind)}>
              {['MATERIAL','LESSON_CONTENT','EXTERNAL_URL','VOCAB_LIST'].map(s => (<MenuItem key={s} value={s}>{s}</MenuItem>))}
            </TextField>
            {sourceKind === 'EXTERNAL_URL' && (
              <TextField label="Source URL" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} fullWidth />
            )}
            {isVocabList && (
              <Stack spacing={1} sx={{ mt: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button variant="outlined" onClick={() => setPickerOpen(true)}>Select words</Button>
                  <Chip size="small" color={selectedWordIds.length >= 5 ? 'success' : 'warning'} label={`${selectedWordIds.length} selected`} />
                  <Typography variant="caption" color="text.secondary">Choose 5–100 words</Typography>
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
                {(selectedWordIds.length < 5 || selectedWordIds.length > 100) && (
                  <Typography variant="caption" color="error">Please select between 5 and 100 words.</Typography>
                )}
                <TextField type="number" label="Mastery streak" value={masteryStreak}
                           onChange={e => setMasteryStreak(Math.max(1, Math.min(10, Number(e.target.value) || 0)))}
                           InputLabelProps={{ shrink: true }} inputProps={{ min: 1, max: 10 }} />
                <FormControlLabel control={<Checkbox checked={shuffle} onChange={(e)=> setShuffle(e.target.checked)} />} label="Shuffle words" />
                <TextField type="number" label="Time limit (minutes)" value={timeLimitMin}
                           onChange={e => setTimeLimitMin(e.target.value)} InputLabelProps={{ shrink: true }}
                           helperText="Optional: leave empty for no timer" />
              </Stack>
            )}
          </Stack>
        </Grid>
      </Grid>

      <Box mt={3}>
        <Button variant="contained" onClick={onSubmit} disabled={create.isPending || !studentId || (isVocabList && (selectedWordIds.length < 5 || selectedWordIds.length > 100))}>Create</Button>
      </Box>

      <Dialog open={pickerOpen} onClose={() => setPickerOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Select vocabulary words</DialogTitle>
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

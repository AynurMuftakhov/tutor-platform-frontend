import React, { useEffect, useState } from 'react';
import { Box, Button, Container, Grid, MenuItem, Stack, TextField, Typography, Autocomplete, CircularProgress } from '@mui/material';
import { CreateAssignmentDto, HomeworkTaskType, SourceKind } from '../../types/homework';
import { useAuth } from '../../context/AuthContext';
import { useCreateAssignment } from '../../hooks/useHomeworks';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toOffsetDateTime } from '../../utils/datetime';
import { fetchStudents, fetchUserById } from '../../services/api';

const TeacherHomeworkNewPage: React.FC = () => {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const create = useCreateAssignment(user?.id || '');

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
    const payload: CreateAssignmentDto = {
      studentId,
      title,
      instructions: instructions || undefined,
      dueAt: toOffsetDateTime(dueAt) || undefined,
      tasks: [
        {
          title: taskTitle,
          type: taskType,
          sourceKind,
          instructions: undefined,
          contentRef: sourceKind === 'EXTERNAL_URL' ? { url: sourceUrl } : {},
        },
      ],
    };

    try {
      const res = await create.mutateAsync(payload);
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
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 600, color: '#2573ff' }}>New Homework</Typography>
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
          </Stack>
        </Grid>
      </Grid>

      <Box mt={3}>
        <Button variant="contained" onClick={onSubmit} disabled={create.isPending || !studentId}>Create</Button>
      </Box>
    </Container></Box>
  );
};

export default TeacherHomeworkNewPage;

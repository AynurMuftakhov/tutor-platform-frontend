import React, { useState } from 'react';
import { Box, Button, Container, Grid, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { CreateAssignmentDto, HomeworkTaskType, SourceKind } from '../../types/homework';
import { useAuth } from '../../context/AuthContext';
import { useCreateAssignment } from '../../hooks/useHomeworks';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toOffsetDateTime } from '../../utils/datetime';

const TeacherHomeworkNewPage: React.FC = () => {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const create = useCreateAssignment(user?.id || '');

  const [studentId, setStudentId] = useState(params.get('studentId') || '');
  const [title, setTitle] = useState('Homework');
  const [instructions, setInstructions] = useState('');
  const [dueAt, setDueAt] = useState('');

  // Minimal single-task wizard for MVP
  const [taskTitle, setTaskTitle] = useState('Task 1');
  const [taskType, setTaskType] = useState<HomeworkTaskType>('VIDEO');
  const [sourceKind, setSourceKind] = useState<SourceKind>('EXTERNAL_URL');
  const [sourceUrl, setSourceUrl] = useState('');

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
              bgcolor: '#fafbfd',
              height: '100%',
          }}
      >
    <Container sx={{ py: 4, bgcolor: 'background.paper'}}>
      <Typography variant="h5" sx={{ mb: 2 }}>New Homework</Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md:6 }}>
          <Stack spacing={2}>
            <TextField label="Title" value={title} onChange={e => setTitle(e.target.value)} fullWidth required />
            <TextField label="Instructions" value={instructions} onChange={e => setInstructions(e.target.value)} fullWidth multiline minRows={2} />
            <TextField type="datetime-local" label="Due At" value={dueAt} onChange={e => setDueAt(e.target.value)} InputLabelProps={{ shrink: true }} />
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md:6 }}>
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
        <Button variant="contained" onClick={onSubmit} disabled={create.isPending}>Create</Button>
      </Box>
    </Container></Box>
  );
};

export default TeacherHomeworkNewPage;

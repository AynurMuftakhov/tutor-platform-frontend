import React, { useEffect, useMemo, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Box, Button, Card, CardContent, Chip, Container, Divider, Grid, Stack, Typography } from '@mui/material';
import { useAssignmentById, useStartTask, useCompleteTask } from '../../hooks/useHomeworks';
import { AssignmentDto, TaskDto } from '../../types/homework';
import { useAuth } from '../../context/AuthContext';
import HomeworkTaskFrame from '../../components/homework/HomeworkTaskFrame';

const StudentAssignmentDetailPage: React.FC = () => {
  const { assignmentId } = useParams();
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const role = (user?.role || '').toLowerCase();
  const isTeacher = role === 'tutor' || role === 'teacher';
  const { data: assignment, isLoading, isError } = useAssignmentById(assignmentId, { studentId: !isTeacher ? (user?.id || undefined) : undefined });

  const currentTaskId = useMemo(() => {
    const fromUrl = params.get('taskId');
    if (fromUrl) return fromUrl;
    const next = assignment?.tasks.find(t => t.status !== 'COMPLETED');
    return next?.id || assignment?.tasks[0]?.id;
  }, [params, assignment]);

  const currentTask = useMemo(() => assignment?.tasks.find(t => t.id === currentTaskId), [assignment, currentTaskId]);

  const setTaskId = (id: string) => {
    const p = new URLSearchParams(params);
    if (id) p.set('taskId', id); else p.delete('taskId');
    setParams(p, { replace: true });
  };

  const goNext = () => {
    if (!assignment || !currentTask) return;
    const sorted = [...assignment.tasks].sort((a,b)=>a.ordinal-b.ordinal);
    const idx = sorted.findIndex(t => t.id === currentTask.id);
    // next incomplete task after current; if none, find any incomplete; else stay
    const after = sorted.slice(idx+1).find(t => t.status !== 'COMPLETED');
    const anyIncomplete = sorted.find(t => t.status !== 'COMPLETED');
    const target = after || anyIncomplete || currentTask;
    if (target) setTaskId(target.id);
  };

  // Lifecycle integrations
  const startTask = useStartTask(!isTeacher ? (user?.id || '') : '');
  const completeTask = useCompleteTask(!isTeacher ? (user?.id || '') : '');
  const startedOnceRef = useRef(false);

  useEffect(() => {
    if (isTeacher) return;
    if (!assignment || startedOnceRef.current) return;
    const sorted = [...assignment.tasks].sort((a,b)=>a.ordinal-b.ordinal);
    const firstIncomplete = sorted.find(t => t.status !== 'COMPLETED');
    if (firstIncomplete && firstIncomplete.status === 'NOT_STARTED') {
      startTask.mutate(firstIncomplete.id);
      startedOnceRef.current = true;
    }
  }, [assignment, isTeacher, startTask]);

  const allDone = useMemo(() => assignment ? assignment.tasks.every(t => t.status === 'COMPLETED') : false, [assignment]);
  const [completing, setCompleting] = React.useState(false);

  const onMarkAssignmentComplete = async () => {
    if (isTeacher || !assignment) return;
    const incompletes = assignment.tasks.filter(t => t.status !== 'COMPLETED');
    if (incompletes.length === 0) return;
    try {
      setCompleting(true);
      await Promise.all(incompletes.map(t => completeTask.mutateAsync({ taskId: t.id })));
    } finally {
      setCompleting(false);
    }
  };

  if (isLoading) return <Container sx={{ py: 4 }}><Typography>Loading...</Typography></Container>;
  if (isError) return <Container sx={{ py: 4 }}><Typography color="error">Failed to load.</Typography></Container>;
  if (!assignment || !currentTask) return <Container sx={{ py: 4 }}><Typography>No assignment found.</Typography></Container>;

  return (
      <Box
          sx={{
              p: { xs: 1, sm: 1 },
              bgcolor: '#fafbfd',
              height: '100dvh',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative'
          }}
      >
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 600, color: '#2573ff' }}>{assignment.title}</Typography>
      {assignment.instructions && <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>{assignment.instructions}</Typography>}
      <Divider sx={{ mb: 2 }} />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md:4, lg:3 }}>
          <Stack spacing={1}>
            {[...assignment.tasks].sort((a,b)=>a.ordinal-b.ordinal).map(t => (
              <Card key={t.id} variant={t.id===currentTaskId? 'elevation':'outlined'} sx={{ cursor:'pointer' }} onClick={()=>setTaskId(t.id)}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="subtitle2">{t.ordinal}. {t.title}</Typography>
                      <Typography variant="caption" color="text.secondary">{t.type} • {t.sourceKind}</Typography>
                    </Box>
                    <Chip size="small" label={t.status.replace('_',' ').toLowerCase()} color={t.status==='COMPLETED'?'success':t.status==='IN_PROGRESS'?'warning':undefined} />
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md:8, lg:9 }} >
          <HomeworkTaskFrame assignment={assignment as AssignmentDto} task={currentTask as TaskDto} readOnly={isTeacher} />
          <Box mt={2} display="flex" justifyContent="space-between">
            {!isTeacher && (
              <Button variant="outlined" color="success" onClick={onMarkAssignmentComplete} disabled={allDone || completing}>
                {allDone ? 'Completed' : completing ? 'Completing…' : 'Mark homework as done'}
              </Button>
            )}
            {assignment.tasks.length > 1 && (
              <Button variant="contained" onClick={goNext}>Continue</Button>
            )}
          </Box>
        </Grid>
      </Grid>
    </Container>
      </Box>
  );
};

export default StudentAssignmentDetailPage;

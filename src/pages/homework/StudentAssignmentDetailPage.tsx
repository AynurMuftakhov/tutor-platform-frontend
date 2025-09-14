import React, { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Box, Button, Card, CardContent, Chip, Container, Divider, Grid, Stack, Typography } from '@mui/material';
import { useStudentAssignments, useTeacherAssignments } from '../../hooks/useHomeworks';
import { AssignmentDto, TaskDto } from '../../types/homework';
import { useAuth } from '../../context/AuthContext';
import HomeworkTaskFrame from '../../components/homework/HomeworkTaskFrame';

const StudentAssignmentDetailPage: React.FC = () => {
  const { assignmentId } = useParams();
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const role = (user?.role || '').toLowerCase();
  const isTeacher = role === 'tutor' || role === 'teacher';
  const sQ = useStudentAssignments(!isTeacher ? (user?.id || '') : '', undefined);
  const tQ = useTeacherAssignments(isTeacher ? (user?.id || '') : '', undefined);
  const isLoading = isTeacher ? tQ.isLoading : sQ.isLoading;
  const isError = isTeacher ? tQ.isError : sQ.isError;
  const data = isTeacher ? tQ.data : sQ.data;

  const assignment = useMemo(() => data?.content.find(a => a.id === assignmentId), [data, assignmentId]);

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
            {assignment.tasks.sort((a,b)=>a.ordinal-b.ordinal).map(t => (
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
          <Box mt={2} display="flex" justifyContent="flex-end">
            <Button variant="contained" onClick={goNext}>Continue</Button>
          </Box>
        </Grid>
      </Grid>
    </Container>
      </Box>
  );
};

export default StudentAssignmentDetailPage;

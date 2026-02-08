import React, { useEffect, useMemo, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Autocomplete, Box, Button, Card, CardContent, Chip, CircularProgress, Container, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Grid, Stack, TextField, Typography } from '@mui/material';
import { useAssignmentById, useCompleteTask, useReassignHomework, useStartTask } from '../../hooks/useHomeworks';
import { AssignmentDto, TaskDto } from '../../types/homework';
import { useAuth } from '../../context/AuthContext';
import HomeworkTaskFrame from '../../components/homework/HomeworkTaskFrame';
import { activityEmitter } from '../../services/tracking/activityEmitter';
import { fetchStudents } from '../../services/api';
import { toOffsetDateTime } from '../../utils/datetime';

const StudentAssignmentDetailPage: React.FC = () => {
  const { assignmentId } = useParams();
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const role = (user?.role || '').toLowerCase();
  const isTeacher = role === 'tutor' || role === 'teacher';
  const { data: assignment, isLoading, isError } = useAssignmentById(assignmentId, { studentId: !isTeacher ? (user?.id || undefined) : undefined });

  // Activity emitter: homework_start/end lifecycle for students
  React.useEffect(() => {
    if (isTeacher) return;
    activityEmitter.emit('homework_start', '/homework');

    const onVis = () => {
      if (document.hidden) activityEmitter.emit('homework_end', '/homework', { reason: 'hidden' });
      else activityEmitter.emit('homework_start', '/homework', { reason: 'visible' });
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      document.removeEventListener('visibilitychange', onVis);
      activityEmitter.emit('homework_end', '/homework', { reason: 'unmount' });
    };
  }, [isTeacher]);

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
  const reassignHomework = useReassignHomework(user?.id || '');
  const startedOnceRef = useRef(false);
  const [reassignOpen, setReassignOpen] = React.useState(false);
  const [studentOptions, setStudentOptions] = React.useState<Array<{ id: string; name: string; email?: string; avatar?: string }>>([]);
  const [studentQ, setStudentQ] = React.useState('');
  const [selectedStudents, setSelectedStudents] = React.useState<Array<{ id: string; name: string; email?: string; avatar?: string }>>([]);
  const [studentLoading, setStudentLoading] = React.useState(false);
  const [dueAt, setDueAt] = React.useState('');
  const [dueAtByStudentId, setDueAtByStudentId] = React.useState<Record<string, string>>({});

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

  useEffect(() => {
    if (!reassignOpen || !user?.id || !isTeacher) return;
    let cancelled = false;
    const h = setTimeout(async () => {
      setStudentLoading(true);
      try {
        const res = await fetchStudents(user.id, studentQ, 0, 10);
        if (!cancelled) {
          setStudentOptions(
            res.content
              .map((s: any) => ({ id: s.id, name: s.name, email: s.email, avatar: s.avatar }))
              .filter((s: { id: string }) => s.id !== assignment?.studentId),
          );
        }
      } finally {
        if (!cancelled) setStudentLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(h);
    };
  }, [reassignOpen, user?.id, studentQ, isTeacher, assignment?.studentId]);

  const submitReassign = async () => {
    if (!assignmentId || !assignment || selectedStudents.length === 0) return;
    try {
      const studentIds = selectedStudents.map((s) => s.id);
      const mapped = studentIds.reduce<Record<string, string>>((acc, id) => {
        const iso = toOffsetDateTime(dueAtByStudentId[id]);
        if (iso) acc[id] = iso;
        return acc;
      }, {});
      await reassignHomework.mutateAsync({
        assignmentId,
        payload: {
          studentIds,
          dueAt: toOffsetDateTime(dueAt) || undefined,
          dueAtByStudentId: Object.keys(mapped).length ? mapped : undefined,
        },
      });
      setReassignOpen(false);
      setSelectedStudents([]);
      setStudentQ('');
      setDueAt('');
      setDueAtByStudentId({});
    } catch {
      // handled globally
    }
  };

  useEffect(() => {
    setDueAtByStudentId((prev) => {
      const allowed = new Set(selectedStudents.map((s) => s.id));
      const next = Object.fromEntries(Object.entries(prev).filter(([id]) => allowed.has(id)));
      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });
  }, [selectedStudents]);

  if (isLoading) return <Container sx={{ py: 4 }}><Typography>Loading...</Typography></Container>;
  if (isError) return <Container sx={{ py: 4 }}><Typography color="error">Failed to load.</Typography></Container>;
  if (!assignment || !currentTask) return <Container sx={{ py: 4 }}><Typography>No assignment found.</Typography></Container>;

  return (
      <Box
          sx={{
              p: { xs: 1, sm: 1 },
              bgcolor: '#fafbfd',
              height: '100%',
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
            {isTeacher && (
              <Button variant="outlined" onClick={() => setReassignOpen(true)}>
                Reassign
              </Button>
            )}
            {assignment.tasks.length > 1 && (
              <Button variant="contained" onClick={goNext}>Continue</Button>
            )}
          </Box>
        </Grid>
      </Grid>
    </Container>
        <Dialog open={reassignOpen} onClose={() => setReassignOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Reassign homework</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                type="datetime-local"
                label="Default due date (Optional)"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <Autocomplete
                multiple
                filterSelectedOptions
                options={studentOptions}
                getOptionLabel={(o) => o?.name || ''}
                value={selectedStudents}
                onChange={(_, values) => setSelectedStudents(values)}
                onInputChange={(_, val, reason) => {
                  if (reason !== 'reset') setStudentQ(val);
                }}
                loading={studentLoading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Students"
                    placeholder="Type names…"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {studentLoading ? <CircularProgress color="inherit" size={16} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                    helperText={selectedStudents.length === 0 ? 'Select at least one student' : ' '}
                  />
                )}
                isOptionEqualToValue={(o, v) => o.id === v.id}
              />
              {selectedStudents.length > 0 && (
                <Stack spacing={1}>
                  <Typography variant="subtitle2">Per-student due date overrides</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Leave empty to use the default due date.
                  </Typography>
                  {selectedStudents.map((student) => (
                    <Stack key={student.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                      <Typography variant="body2" sx={{ minWidth: 180 }}>{student.name}</Typography>
                      <TextField
                        type="datetime-local"
                        size="small"
                        fullWidth
                        value={dueAtByStudentId[student.id] || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setDueAtByStudentId((prev) => {
                            const next = { ...prev };
                            if (!value) delete next[student.id];
                            else next[student.id] = value;
                            return next;
                          });
                        }}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Stack>
                  ))}
                </Stack>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReassignOpen(false)} disabled={reassignHomework.isPending}>Cancel</Button>
            <Button
              variant="contained"
              onClick={submitReassign}
              disabled={selectedStudents.length === 0 || reassignHomework.isPending}
            >
              {reassignHomework.isPending ? 'Reassigning…' : 'Reassign'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
  );
};

export default StudentAssignmentDetailPage;

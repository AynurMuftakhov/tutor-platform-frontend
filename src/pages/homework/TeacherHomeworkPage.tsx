import React, { useMemo, useState } from 'react';
import { Avatar, Box, Button, Chip, Container, Grid, IconButton, MenuItem, Select, Stack, TextField, Tooltip, Typography, Autocomplete, CircularProgress, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Snackbar } from '@mui/material';
import HomeworkComposerDrawer from '../../components/homework/HomeworkComposerDrawer';
import { useTeacherAssignments, useDeleteAssignment } from '../../hooks/useHomeworks';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchStudents, fetchUserById } from '../../services/api';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import { useQuery } from '@tanstack/react-query';
import {AssignmentDto} from "../../types/homework";

type StatusFilter = 'ALL' | 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

const TeacherHomeworkPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const studentId = params.get('studentId') || '';
  const statusParam = (params.get('status') as StatusFilter) || 'ALL';
  const [studentFilter, setStudentFilter] = useState(studentId);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(statusParam);

  const { data, isLoading, isError, refetch } = useTeacherAssignments(user?.id || '', studentId || undefined, undefined);

  // composer + snackbar state
  const [composerOpen, setComposerOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [lastCreated, setLastCreated] = useState<AssignmentDto | null>(null);

  // manual refresh handler
  const onRefresh = () => refetch();

  // student autocomplete state
  const [studentOptions, setStudentOptions] = useState<{ id: string; name: string; email?: string; avatar?: string }[]>([]);
  const [studentQ, setStudentQ] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string; email?: string; avatar?: string } | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const h = setTimeout(async () => {
      if (!user?.id) return;
      setStudentLoading(true);
      try {
        const res = await fetchStudents(user.id, studentQ, 0, 10);
        if (!cancelled) setStudentOptions(res.content.map((s:any) => ({ id: s.id, name: s.name, email: s.email, avatar: s.avatar })));
      } finally {
        if (!cancelled) setStudentLoading(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(h); };
  }, [studentQ, user?.id]);

  // initialize selectedStudent from URL studentId for display
  React.useEffect(() => {
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

  // Auto-apply filters when either student or status changes
  React.useEffect(() => {
    const p = new URLSearchParams(params);
    const curStudent = p.get('studentId') || '';
    const curStatus = (p.get('status') as StatusFilter) || 'ALL';

    const nextStudent = studentFilter || '';
    const nextStatus = statusFilter || 'ALL';

    // Only update if something actually changed to avoid loops
    if (curStudent !== nextStudent || curStatus !== nextStatus) {
      if (nextStudent) p.set('studentId', nextStudent); else p.delete('studentId');
      if (nextStatus && nextStatus !== 'ALL') p.set('status', nextStatus); else p.delete('status');
      setParams(p, { replace: true });
    }
  }, [studentFilter, statusFilter]);

  const filtered = useMemo(() => {
    const list = data?.content || [];
    if (statusFilter === 'ALL') return list;
    return list.filter(a => {
      const total = a.tasks.length;
      const done = a.tasks.filter(t => t.status === 'COMPLETED').length;
      if (statusFilter === 'COMPLETED') return done === total && total > 0;
      if (statusFilter === 'NOT_STARTED') return a.tasks.every(t => t.status === 'NOT_STARTED');
      // IN_PROGRESS: some started or partial but not all complete
      return done < total && a.tasks.some(t => t.status !== 'NOT_STARTED');
    });
  }, [data, statusFilter]);

  const copyDeepLink = (assignmentId: string, firstIncompleteTaskId?: string) => {
    const url = new URL(window.location.origin + `/homework/${assignmentId}${firstIncompleteTaskId ? `?taskId=${firstIncompleteTaskId}` : ''}`);
    navigator.clipboard.writeText(url.toString());
  };

  const del = useDeleteAssignment();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState<{ id: string; title: string } | null>(null);

  const askDelete = (id: string, title: string) => {
    setToDelete({ id, title });
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await del.mutateAsync(toDelete.id);
      setConfirmOpen(false);
      setToDelete(null);
    } catch (e) {
      // global error handler will show snackbar/toast
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
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: '#2573ff' }}>Students Homework</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Autocomplete
            size="small"
            options={studentOptions}
            getOptionLabel={(o) => o?.name || ''}
            value={selectedStudent}
            onChange={(_, val) => {
              setSelectedStudent(val);
              setStudentFilter(val?.id || '');
            }}
            onInputChange={(_, val, reason) => {
              if (reason !== 'reset') setStudentQ(val);
            }}
            loading={studentLoading}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Filter by student"
                placeholder="Type a name..."
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {studentLoading ? <CircularProgress color="inherit" size={16} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
                sx={{ minWidth: 240 }}
              />
            )}
            isOptionEqualToValue={(o, v) => o.id === v.id}
          />
          <Select size="small" value={statusFilter} onChange={(e)=> setStatusFilter(e.target.value as StatusFilter)}>
            <MenuItem value="ALL">All</MenuItem>
            <MenuItem value="NOT_STARTED">Not started</MenuItem>
            <MenuItem value="IN_PROGRESS">In progress</MenuItem>
            <MenuItem value="COMPLETED">Completed</MenuItem>
          </Select>
            <Tooltip title="Refresh">
                <IconButton onClick={onRefresh} aria-label="Refresh"><RefreshIcon /></IconButton>
            </Tooltip>
          <Button variant="contained" onClick={() => setComposerOpen(true)}>Add Homework</Button>
        </Stack>
      </Stack>

      {isLoading && <Typography>Loading...</Typography>}
      {isError && <Typography color="error">Failed to load.</Typography>}

      <Grid container spacing={2}>
          {filtered && filtered.length > 0 ? (
              filtered.map(a => {
                  const total = a.tasks.length;
                  const completed = a.tasks.filter(t => t.status === 'COMPLETED').length;
                  const notStarted = a.tasks.filter(t => t.status === 'NOT_STARTED').length;
                  const inProgress = total - notStarted - completed;
                  const firstIncomplete = a.tasks.find(t => t.status !== 'COMPLETED');
                  return (
                      <Grid size={{xs:12}} key={a.id}>
                          <Box
                              border={1}
                              borderColor="divider"
                              borderRadius={1}
                              p={2}
                              display="flex"
                              alignItems="center"
                              justifyContent="space-between"
                              gap={2}
                              sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                              role="button"
                              tabIndex={0}
                              bgcolor={'background.paper'}
                              onClick={() => navigate(`/homework/${a.id}${firstIncomplete ? `?taskId=${firstIncomplete.id}` : ''}`)}
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      navigate(`/homework/${a.id}${firstIncomplete ? `?taskId=${firstIncomplete.id}` : ''}`);
                                  }
                              }}
                          >
                              <Box sx={{ minWidth: 0 }}>
                                  <Typography variant="subtitle1" noWrap>{a.title}</Typography>
                                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                                      <StudentMeta userId={a.studentId} />
                                      <Typography variant="caption" color="text.secondary">• Created {new Date(a.createdAt).toLocaleString()}</Typography>
                                      {a.dueAt && <Chip size="small" label={`Due ${new Date(a.dueAt).toLocaleDateString()}`}/>}
                                  </Stack>
                                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                      <Chip size="small" color="success" label={`Done ${completed}/${total}`} />
                                      {inProgress>0 && <Chip size="small" color="warning" label={`In progress ${inProgress}`} />}
                                      {notStarted>0 && <Chip size="small" label={`Not started ${notStarted}`} />}
                                  </Stack>
                              </Box>
                              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
                                  <Tooltip title="Copy deep link to first incomplete section">
                                      <IconButton onClick={(e)=> { e.stopPropagation(); copyDeepLink(a.id, firstIncomplete?.id); }}><ContentCopyIcon fontSize="small" /></IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete assignment">
                    <span>
                      <IconButton color="error" onClick={(e)=> { e.stopPropagation(); askDelete(a.id, a.title); }} disabled={del.isPending}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </span>
                                  </Tooltip>
                              </Stack>
                          </Box>
                      </Grid>
                  );
              })
          ) : (
              <Grid size ={{xs: 12}}>
                  <Box textAlign="center" py={6}>
                      <Typography variant="h6">No homework yet</Typography>
                      <Typography variant="body2" color="text.secondary">Please add homework manually or assign from Learning Materials or Lesson Contents </Typography>
                  </Box>
              </Grid>
          )}
      </Grid>
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Delete assignment</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {toDelete ? `Are you sure you want to delete "${toDelete.title}"? This action cannot be undone.` : 'Are you sure?'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={del.isPending}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" disabled={del.isPending}>{del.isPending ? 'Deleting…' : 'Delete'}</Button>
        </DialogActions>
      </Dialog>

      <HomeworkComposerDrawer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        prefillStudentId={studentFilter || undefined}
        onSuccess={(assignment, studentLabel) => {
          setLastCreated(assignment);
          setSnackbarMsg(`Homework assigned to ${studentLabel}`);
          setComposerOpen(false);
          setSnackbarOpen(true);
        }}
        onCreateAndOpen={(assignment) => {
          setComposerOpen(false);
          navigate(`/homework/${assignment.id}`);
        }}
      />

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMsg}
        action={
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={() => { if (lastCreated) navigate(`/homework/${lastCreated.id}`); setSnackbarOpen(false); }}>Open</Button>
            <Button size="small" onClick={() => { setSnackbarOpen(false); setComposerOpen(true); }}>Assign another</Button>
          </Stack>
        }
      />
    </Container>
  </Box>
  );
};

const StudentMeta: React.FC<{ userId: string }> = ({ userId }) => {
  const { data } = useQuery({ queryKey: ['user', userId], queryFn: () => fetchUserById(userId), staleTime: 60_000 });
  return (
    <Stack direction="row" spacing={0.5} alignItems="center" minWidth={0}>
      <Avatar src={data?.avatar} sx={{ width: 24, height: 24 }} />
      <Typography variant="caption" noWrap>{data?.name || userId}</Typography>
    </Stack>
  );
};

export default TeacherHomeworkPage;

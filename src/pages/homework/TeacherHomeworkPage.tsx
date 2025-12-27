import React, { useMemo, useState } from 'react';
import { Avatar, Box, Button, Chip, Container, Grid, IconButton, MenuItem, Select, Stack, TextField, Tooltip, Typography, Autocomplete, CircularProgress, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Snackbar, Pagination, LinearProgress } from '@mui/material';
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
import FiltersBar, { FiltersState } from '../../components/homework/FiltersBar';
import AddIcon from '@mui/icons-material/Add';
import { Fab } from '@mui/material';
import { getTaskTypeLabels } from '../../utils/homeworkTaskTypes';

const TeacherHomeworkPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const studentId = params.get('studentId') || '';
  const [studentFilter, setStudentFilter] = useState(studentId);

    const [filters, setFilters] = useState<FiltersState>({
        status: 'all',
        range: 'custom',
        hideCompleted: true,
        sort: 'assignedDesc',
    });
    const [filtersApplied, setFiltersApplied] = useState(false);

    const computeRange = (f: FiltersState) => {
        const now = new Date();
        const toYMD = (d: Date) => d.toISOString().slice(0,10);
        const presetToRange = (preset: string) => {
            const end = toYMD(now);
            if (preset === 'thisMonth') {
                const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
                return { from: toYMD(d), to: end };
            }
            const days = preset === 'last14' ? 13 : preset === 'last30' ? 29 : 6;
            const startMs = Date.now() - days * 24 * 60 * 60 * 1000;
            return { from: toYMD(new Date(startMs)), to: end };
        };
        if (f.range === 'custom' && f.from && f.to) return { from: f.from, to: f.to };
        if (f.range !== 'custom') return presetToRange(f.range);
        return presetToRange('last7');
    };

  const { from, to } = computeRange(filters);
  const sortMap: Record<string, 'assigned_desc' | 'assigned_asc' | 'due_asc' | 'due_desc'> = {
    assignedDesc: 'assigned_desc',
    assignedAsc: 'assigned_asc',
    dueAsc: 'due_asc',
    dueDesc: 'due_desc',
  };

  const [page, setPage] = useState<number>(Number(params.get('page') || '1'));
  const [size, setSize] = useState<number>(Number(params.get('size') || '10'));


  // reset to first page when filters or student changes
  React.useEffect(() => {
    setPage(1);
  }, [studentFilter, filters?.status, filters?.range, filters?.from, filters?.to, filters?.hideCompleted, filters?.sort]);

  const effectiveParams = React.useMemo(() => {
    if (!filtersApplied) {
      return {
        studentId: studentFilter || undefined,
        status: 'all' as const,
        includeOverdue: true,
        sort: 'assigned_desc' as const,
        view: 'full' as const,
        page: page - 1,
        size,
      };
    }
    return {
      studentId: studentFilter || undefined,
      status: (filters?.status || 'all') as any,
      from,
      to,
      includeOverdue: true,
      hideCompleted: !!filters?.hideCompleted,
      sort: sortMap[filters?.sort || 'assignedDesc'],
      view: 'full' as const,
      page: page - 1,
      size,
    };
  }, [filtersApplied, studentFilter, filters?.status, filters?.hideCompleted, from, to, page, size, filters?.sort]);

  const { data, isError, refetch } = useTeacherAssignments(user?.id || '', effectiveParams);

  // Keep previous data to avoid list flashing during refetch
  const [prevData, setPrevData] = useState<typeof data>(undefined);
  React.useEffect(() => {
    if (data) setPrevData(data);
  }, [data]);

  const visible = useMemo(() => {
    return (data?.content ?? prevData?.content) || [];
  }, [data, prevData]);

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
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              position: 'relative'
          }}
      >
     <Container sx={{ py: 4, height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'flex-start', md: 'center' }}
        justifyContent="space-between"
      >
        <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.02em', color: '#2573ff' }}>
          Students Homework
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
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
                sx={{ minWidth: 260 }}
              />
            )}
            isOptionEqualToValue={(o, v) => o.id === v.id}
          />

          <Tooltip title="Refresh">
            <IconButton onClick={onRefresh} aria-label="Refresh">
              <RefreshIcon />
            </IconButton>
          </Tooltip>

            <Button
                variant="contained"
                onClick={() => setComposerOpen(true)}
                sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
            >
                Add Homework
            </Button>
        </Stack>
      </Stack>

      <FiltersBar value={filters} onChange={(f) => { setFiltersApplied(true); setFilters(f); }} sticky />

      {isError && <Typography color="error">Failed to load.</Typography>}

      <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5,  pb: { xs: 8, sm: 0 },   scrollbarWidth: 'none', msOverflowStyle: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
        <Grid container spacing={2}>
            {visible && visible.length > 0 ? (
                visible.map(a => {
                    const total = a.totalTasks;
                    const completed = a.completedTasks;
                    const inProgress = a.inProgressTasks;
                    const taskTypes = getTaskTypeLabels(a.tasks);
                    return (
                        <Grid size={{xs:12}} key={a.id}>
                            <Box
                                border={1}
                                borderColor="divider"
                                borderRadius={1}
                                p={{xs: 1.5, sm: 2}}
                                display="flex"
                                alignItems="center"
                                justifyContent="space-between"
                                gap={2}
                                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                                role="button"
                                tabIndex={0}
                                bgcolor={'background.paper'}
                                onClick={() => navigate(`/homework/${a.id}`)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        navigate(`/homework/${a.id}`);
                                    }
                                }}
                            >
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="subtitle1" noWrap>{a.title}</Typography>
                                    {taskTypes.length > 0 && (
                                        <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" sx={{ mt: 0.5 }}>
                                            {taskTypes.map((label) => (
                                                <Chip key={label} size="small" variant="outlined" label={label} />
                                            ))}
                                        </Stack>
                                    )}
                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                                        {a.studentId && <StudentMeta userId={a.studentId} />}
                                        <Typography variant="caption" color="text.secondary">• Created {new Date(a.createdAt).toLocaleString()}</Typography>
                                        {a.dueAt && <Chip size="small" label={`Due ${new Date(a.dueAt).toLocaleDateString()}`}/>}
                                        {a.overdue && <Chip size="small" color="error" label="Overdue" />}
                                    </Stack>
                                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                        {completed == total && (
                                        <Chip size="small" color="success" label={`Done ${completed}/${total}`} />)}
                                        {inProgress>0 && <Chip size="small" color="warning" label={`In progress ${inProgress}/${total}`} />}
                                        {inProgress == 0 && completed != total&& <Chip size="small" color="info" label={`Not started `} />}
                                    </Stack>
                                </Box>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
                                    <Tooltip title="Copy link to assignment">
                                        <IconButton onClick={(e)=> { e.stopPropagation(); copyDeepLink(a.id); }}><ContentCopyIcon fontSize="small" /></IconButton>
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
      </Box>

      {data?.totalPages && data.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
          <Pagination
            count={data.totalPages}
            page={page}
            onChange={(_, p) => setPage(p)}
            size="small"
            color="primary"
          />
        </Box>
      )}

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
         <Fab
             color="primary"
             aria-label="Add homework"
             onClick={() => setComposerOpen(true)}
             sx={{
                 position: 'fixed',
                 right: 16,
                 bottom: 16,
                 display: { xs: 'flex', sm: 'none' },  // mobile only
                 zIndex: 1300
             }}
         >
             <AddIcon />
         </Fab>
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

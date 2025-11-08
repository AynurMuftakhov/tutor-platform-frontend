import React, { useMemo, useState } from 'react';
import {
    Box, Button, Chip, Container, Grid, Typography, Pagination, Stack,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useStudentAssignments } from '../../hooks/useHomeworks';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import FiltersBar, { FiltersState } from '../../components/homework/FiltersBar';

const StudentHomeworkPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = (user?.role || '').toLowerCase();
  const isTeacher = role === 'tutor' || role === 'teacher';

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

  const studentId = !isTeacher ? (user?.id || '') : '';

  const [page, setPage] = useState<number>(1);
  const [size] = useState<number>(10);

  // reset to first page when filters change
  React.useEffect(() => {
    setPage(1);
  }, [filters.status, filters.range, filters.from, filters.to, filters.hideCompleted, filters.sort]);

  const effectiveParams = React.useMemo(() => {
    if (!filtersApplied) {
      return {
        status: 'all' as const,
        includeOverdue: true,
        sort: 'assigned_desc' as const,
        view: 'full' as const,
        page: page - 1,
        size,
      };
    }
    return {
      status: filters.status,
      from,
      to,
      includeOverdue: true,
      hideCompleted: filters.hideCompleted,
      sort: sortMap[filters.sort],
      view: 'full' as const,
      page: page - 1,
      size,
    };
  }, [filtersApplied, filters.status, filters.hideCompleted, from, to, page, size, filters.sort]);

  const { data, isError} = useStudentAssignments(studentId, effectiveParams);

  // Keep previous data to avoid list flashing during refetch
  const [prevData, setPrevData] = useState<typeof data>(undefined);
  React.useEffect(() => {
    if (data) setPrevData(data);
  }, [data]);

  const visible = useMemo(() => (data?.content ?? prevData?.content) || [], [data, prevData]);

  if (isTeacher) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>This page is for students.</Typography>
        <Button component={RouterLink} to="/t/homework" variant="contained">Go to Teacher Homework</Button>
      </Container>
    );
  }

  if (isError) return <Container sx={{ py: 4 }}><Typography color="error">Failed to load homework.</Typography></Container>;

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
    <Container sx={{ py: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 600, color: '#2573ff' }}>Here is your homework</Typography>
      <Box sx={{ mb: 2 }}>
        <FiltersBar value={filters} onChange={(f) => { setFiltersApplied(true); setFilters(f); }} sticky />
      </Box>
      <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5, scrollbarWidth: 'none', msOverflowStyle: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
          <Grid container spacing={2}>
              {visible && visible.length > 0 ? (
                  visible.map(a => {
                      const total = a.totalTasks;
                      const completed = a.completedTasks;
                      const inProgress =  a.inProgressTasks;
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
                                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
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
    </Container>
      </Box>
  );
};

export default StudentHomeworkPage;

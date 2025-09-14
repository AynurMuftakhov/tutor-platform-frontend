import React, { useState } from 'react';
import { Box, Button, Stack, Typography, Divider, Container, Paper, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Autocomplete, RadioGroup, FormControlLabel, Radio } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { motion } from 'framer-motion';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchStudents, getLessonContent } from '../../services/api';
import StudentRenderer from '../../features/lessonContent/student/StudentRenderer';
import type { LessonContent, BlockContentPayload, PageModel } from '../../types/lessonContent';
import { CreateAssignmentDto } from '../../types/homework';
import { toOffsetDateTime } from '../../utils/datetime';
import { useAuth } from '../../context/AuthContext';
import { useCreateAssignment } from '../../hooks/useHomeworks';

const LessonContentViewPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError } = useQuery<LessonContent>({
    queryKey: ['lesson-content', id],
    queryFn: () => getLessonContent(id!),
    enabled: !!id,
  });

  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const qc = useQueryClient();
  const create = useCreateAssignment(user?.id || '');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [studentQuery, setStudentQuery] = useState('');
  const [studentOptions, setStudentOptions] = useState<{ id: string; name: string; email?: string }[]>([]);
  const [studentLoading, setStudentLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null);
  const [dueAt, setDueAt] = useState('');
  const [granularity, setGranularity] = useState<'SINGLE' | 'AUTO'>('SINGLE');

  React.useEffect(() => {
    if (params.get('assign') === '1') setDialogOpen(true);
  }, [params]);

  const searchStudents = async (q: string) => {
    if (!user?.id) return;
    setStudentLoading(true);
    try {
      const res = await fetchStudents(user.id, q, 0, 10);
      setStudentOptions(res.content.map(s => ({ id: s.id as any, name: s.name, email: s.email })));
    } catch (e) {
      // noop
    } finally {
      setStudentLoading(false);
    }
  };

  React.useEffect(() => {
    const h = setTimeout(() => searchStudents(studentQuery), 300);
    return () => clearTimeout(h);
  }, [studentQuery]);

  const buildTasksFromContent = (contentId: string, layout: PageModel, content: Record<string, BlockContentPayload>) => {
    const tasks: any[] = [];
    const readingCandidate = { type: 'READING', sourceKind: 'LESSON_CONTENT', title: 'Reading', contentRef: { lessonContentId: contentId } };
    let hasReading = false;

    const eachBlock = (cb: (type: string, refId: string) => void) => {
      (layout.sections || []).forEach(sec => (sec.rows || []).forEach(row => (row.columns || []).forEach(col => (col.blocks || []).forEach(b => cb(b.type, b.id)))));
    };

    eachBlock((type, refId) => {
      const payload = content[refId] as any;
      if (!payload) return;
      if (type === 'video' && payload.materialId) {
        tasks.push({ type: 'VIDEO', sourceKind: 'MATERIAL', title: payload.title || 'Watch the video', contentRef: { materialId: payload.materialId } });
      } else if (type === 'grammarMaterial' && payload.materialId) {
        tasks.push({ type: 'GRAMMAR', sourceKind: 'MATERIAL', title: payload.title || 'Grammar practice', contentRef: { materialId: payload.materialId, itemIds: payload.itemIds || undefined } });
      } else if (type === 'text' || type === 'image') {
        hasReading = true;
      }
    });

    if (hasReading) tasks.unshift({ ...readingCandidate, title: data?.title ? `Read: ${data.title}` : 'Reading' });

    // ensure ordinals
    return tasks.map((t, idx) => ({ ...t, ordinal: idx + 1 }));
  };

  const onOpenAssign = () => setDialogOpen(true);
  const onCloseAssign = () => setDialogOpen(false);

  const onSubmitAssign = async () => {
    if (!data || !selectedStudent || !user?.id) return;
    let tasks: any[] = [];
    if (granularity === 'SINGLE') {
      tasks = [{ type: 'READING', sourceKind: 'LESSON_CONTENT', title: data.title || 'Reading', contentRef: { lessonContentId: data.id }, ordinal: 1 }];
    } else {
      tasks = buildTasksFromContent(data.id, data.layout, data.content);
      if (!tasks.length) {
        tasks = [{ type: 'READING', sourceKind: 'LESSON_CONTENT', title: data.title || 'Reading', contentRef: { lessonContentId: data.id }, ordinal: 1 }];
      }
    }

    const payload: CreateAssignmentDto = {
      studentId: selectedStudent.id,
      title: `HW • ${data.title}`,
      dueAt: toOffsetDateTime(dueAt) || undefined,
      idempotencyKey: (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      tasks,
    };

    try {
      await create.mutateAsync(payload);
      await qc.invalidateQueries({ queryKey: ['homeworks', 'tutor'] });
      window.alert('Assigned successfully');
      navigate('/t/homework');
    } catch (e) {
      // handled globally
    }
  };

  return (
    <Box p={3}  sx={{
        bgcolor: '#fafbfd',
    }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h5">Lesson Content</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={onOpenAssign}>Assign as homework</Button>
          <Button variant="text" startIcon={<ArrowBackIcon />} onClick={() => navigate('/lesson-contents')}>
            Back to Library
          </Button>
        </Stack>
      </Stack>

      {isLoading && <Typography color="text.secondary">Loading…</Typography>}
      {isError && <Typography color="error">Failed to load lesson content.</Typography>}

      {data && (
        <Container maxWidth="md" disableGutters>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Paper sx={{ p: 4, borderRadius: 2 }}>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="h4">{data.title || 'Untitled composition'}</Typography>
                  <Stack direction="row" spacing={1} mt={1} flexWrap="wrap" alignItems="center">
                    <Chip size="small" label={data.status} color={data.status === 'PUBLISHED' ? 'success' : 'default'} />
                    {data.tags?.map((tag) => (
                      <Chip key={tag} size="small" label={tag} />
                    ))}
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      Updated {new Date(data.updatedAt).toLocaleString()}
                    </Typography>
                  </Stack>
                </Box>
                <Divider />
                <StudentRenderer layout={data.layout} content={data.content} />
              </Stack>
            </Paper>
          </motion.div>
        </Container>
      )}

      {/* Assign Dialog */}
      <Dialog open={dialogOpen} onClose={onCloseAssign} maxWidth="sm" fullWidth>
        <DialogTitle>Assign as homework</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <Autocomplete
              options={studentOptions}
              loading={studentLoading}
              getOptionLabel={(opt) => `${opt.name}${opt.email ? ` (${opt.email})` : ''}`}
              onInputChange={(_, v) => setStudentQuery(v)}
              onChange={(_, v) => setSelectedStudent(v as any)}
              renderInput={(params) => (
                <TextField {...params} label="Student" placeholder="Search by name/email" />
              )}
            />
            <TextField type="datetime-local" label="Due At (optional)" InputLabelProps={{ shrink: true }} value={dueAt} onChange={e => setDueAt(e.target.value)} />
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Granularity</Typography>
              <RadioGroup row value={granularity} onChange={(_, v) => setGranularity(v as any)}>
                <FormControlLabel value="SINGLE" control={<Radio />} label="Single task (READING)" />
                <FormControlLabel value="AUTO" control={<Radio />} label="Auto-split by blocks" />
              </RadioGroup>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCloseAssign}>Cancel</Button>
          <Button variant="contained" onClick={onSubmitAssign} disabled={!selectedStudent || create.isPending}>Assign</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LessonContentViewPage;

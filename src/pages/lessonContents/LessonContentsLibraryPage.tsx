import React, { useMemo, useState } from 'react';
import { Box, Button, Chip, Divider, IconButton, InputAdornment, MenuItem, Select, Stack, TextField, ToggleButton, ToggleButtonGroup, Pagination, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PageHeader from '../../components/PageHeader';
import SearchIcon from '@mui/icons-material/Search';
import ViewListIcon from '@mui/icons-material/ViewList';
import GridViewIcon from '@mui/icons-material/GridView';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import { useAuth } from '../../context/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createLessonContent, getLessonContents, deleteLessonContent } from '../../services/api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { LessonContent, PageModel, BlockContentPayload, LessonContentListResponse } from '../../types/lessonContent';
import EditIcon from "@mui/icons-material/Edit";
import {ContentContainer} from "@fullcalendar/core/internal";
import {Image} from "@mui/icons-material";

const LessonContentsLibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'ALL' | 'DRAFT' | 'PUBLISHED'>('ALL');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1);
  const size = Math.max(1, Number.parseInt(params.get('size') || '12', 10) || 12);
  const setPageParam = (p: number) => {
    const sp = new URLSearchParams(params);
    sp.set('page', String(p));
    setParams(sp, { replace: true });
  };
  const setSizeParam = (s: number) => {
    const sp = new URLSearchParams(params);
    sp.set('size', String(s));
    sp.set('page', '1');
    setParams(sp, { replace: true });
  };

  const { data, isLoading } = useQuery<LessonContentListResponse>({
    queryKey: ['lesson-contents', { q, status, page, size }],
    queryFn: () => getLessonContents({ ownerId: user!.id, q: q || undefined, status: status === 'ALL' ? undefined : status, page: page - 1, size }),
    staleTime: 10_000,
    placeholderData: (prev) => prev
  });

  const genId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
  const buildInitialComposition = (): { layout: PageModel; content: Record<string, BlockContentPayload> } => {
    const textId = genId('blk');
    const page: PageModel = {
      sections: [
        {
          id: genId('sec'),
          rows: [
            {
              id: genId('row'),
              columns: [
                {
                  id: genId('col'),
                  span: 12,
                  blocks: [{ id: textId, type: 'text' }]
                }
              ]
            }
          ]
        }
      ]
    };
    const content: Record<string, BlockContentPayload> = {
      [textId]: { id: textId, html: 'Start writing…' } as BlockContentPayload
    };
    return { layout: page, content };
  };

  const createMutation = useMutation({
    mutationFn: () => {
      const { layout, content } = buildInitialComposition();
      return createLessonContent({ ownerId: user!.id, title: 'Untitled Lesson Material', tags: [], layout: layout, content });
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['lesson-contents'] });
      navigate(`/lesson-contents/${created.id}/editor`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLessonContent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lesson-contents'] });
    }
  });

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this Lesson Material? This action cannot be undone.')) {
      deleteMutation.mutate(id);
    }
  };

  const items: LessonContent[] = useMemo(() => data?.content ?? [], [data]);
  const total: number = data?.totalElements ?? 0;
  const totalPages: number = data?.totalPages ?? 0;
  const from: number = total === 0 ? 0 : (page - 1) * size + 1;
  const to: number = Math.min(page * size, total);

  return (
    <Box p={2}  sx={{
        bgcolor: '#fafbfd',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative'
    }}>
      <PageHeader
        title="Lesson Contents"
        icon={<Image />}
        titleColor="primary"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => createMutation.mutate()}>
            New Lesson Content
          </Button>
        }
        secondaryRow={
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
            <TextField
              size="small"
              placeholder="Search"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPageParam(1); }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
              sx={{ minWidth: 260 }}
            />
            <Select size="small" value={status} onChange={(e) => { setStatus(e.target.value as any); setPageParam(1); }} sx={{ width: 180 }}>
              <MenuItem value="ALL">All</MenuItem>
              <MenuItem value="DRAFT">Draft</MenuItem>
              <MenuItem value="PUBLISHED">Published</MenuItem>
            </Select>
            <ToggleButtonGroup size="small" exclusive value={view} onChange={(_, v) => v && setView(v)}>
              <ToggleButton value="grid"><GridViewIcon fontSize="small" /></ToggleButton>
              <ToggleButton value="list"><ViewListIcon fontSize="small" /></ToggleButton>
            </ToggleButtonGroup>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: 'auto' }}>
              <Select size="small" value={String(size)} onChange={(e) => setSizeParam(parseInt(String(e.target.value), 10))} sx={{ width: 100 }}>
                <MenuItem value={8}>8</MenuItem>
                <MenuItem value={12}>12</MenuItem>
                <MenuItem value={24}>24</MenuItem>
                <MenuItem value={48}>48</MenuItem>
              </Select>
            </Stack>
          </Stack>
        }
        showDivider
        mb={2}
      />

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {isLoading ? (
          <Typography variant="body2" color="text.secondary">Loading…</Typography>
        ) : items.length === 0 ? (
          <Box textAlign="center" py={6}>
            <Typography variant="body1" color="text.secondary">No Lesson Material yet.</Typography>
            <Button sx={{ mt: 2 }} variant="outlined" onClick={() => createMutation.mutate()}>Create your first</Button>
          </Box>
        ) : view === 'grid' ? (
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }} gap={2}>
            {items.map((it) => (
              <Box key={it.id} p={2} borderRadius={2} border={(theme) => `1px solid ${theme.palette.divider}`}
              sx={{ bgcolor: '#ffffff'}}>
                <Typography variant="subtitle1" noWrap>{it.title || 'Untitled composition'}</Typography>
                <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                  <Chip size="small" label={it.status} color={it.status === 'PUBLISHED' ? 'success' : 'default'} />
                  <Typography variant="caption" color="text.secondary">Updated {new Date(it.updatedAt).toLocaleString()}</Typography>
                </Stack>
                <Stack direction="row" spacing={1} mt={2}>
                  <Button size="small" variant="text" onClick={() => navigate(`/lesson-contents/${it.id}/editor`)}>Edit</Button>
                  <Button size="small" variant="text" onClick={() => navigate(`/lesson-contents/${it.id}/view`)}>View</Button>
                  <Button size="small" variant="outlined" onClick={() => navigate(`/lesson-contents/${it.id}/view?assign=1`)}>Assign</Button>
                  <Button size="small" variant="text" color="error" startIcon={<DeleteOutline fontSize="small" />} onClick={() => handleDelete(it.id)}>Delete</Button>
                </Stack>
              </Box>
            ))}
          </Box>
        ) : (
          <Stack spacing={1}>
            {items.map((it) => (
              <Box key={it.id} p={2} sx={{ bgcolor: '#ffffff'}}
                   borderRadius={2} border={(theme) => `1px solid ${theme.palette.divider}`} display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="subtitle1">{it.title || 'Untitled composition'}</Typography>
                  <Typography variant="caption" color="text.secondary">Updated {new Date(it.updatedAt).toLocaleString()}</Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip size="small" label={it.status} color={it.status === 'PUBLISHED' ? 'success' : 'default'} />
                  <IconButton size="small" onClick={() => navigate(`/lesson-contents/${it.id}/editor`)} aria-label="Edit"><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={() => navigate(`/lesson-contents/${it.id}/view`)} aria-label="View"><ViewListIcon fontSize="small" /></IconButton>
                  <Button size="small" variant="outlined" onClick={() => navigate(`/lesson-contents/${it.id}/view?assign=1`)}>Assign</Button>
                  <IconButton size="small" color="error" onClick={() => handleDelete(it.id)} aria-label="Delete" disabled={false}><DeleteOutline fontSize="small" /></IconButton>
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </Box>

      <Divider sx={{ mt: 2 }} />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" mt={2}>
        <Typography variant="body2" color="text.secondary">
          {total > 0 ? `Showing ${from}–${to} of ${total}` : 'No results'}
        </Typography>
        <Pagination color="primary" shape="rounded" count={Math.max(1, totalPages)} page={page} onChange={(_, v) => setPageParam(v)} />
      </Stack>
    </Box>
  );
};

export default LessonContentsLibraryPage;

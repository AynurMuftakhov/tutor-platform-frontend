import React, { useMemo, useState } from 'react';
import { Box, Button, Chip, Divider, IconButton, InputAdornment, MenuItem, Select, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ViewListIcon from '@mui/icons-material/ViewList';
import GridViewIcon from '@mui/icons-material/GridView';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import { useAuth } from '../../context/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createLessonContent, getLessonContents, deleteLessonContent } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import type { LessonContent, PageModel, BlockContentPayload } from '../../types/lessonContent';
import EditIcon from "@mui/icons-material/Edit";

const LessonContentsLibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'ALL' | 'DRAFT' | 'PUBLISHED'>('ALL');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const { data, isLoading } = useQuery({
    queryKey: ['lesson-contents', { q, status }],
    queryFn: () => getLessonContents({ownerId: user!.id, q: q || undefined, status: status === 'ALL' ? undefined : status }),
    staleTime: 10_000,
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
      return createLessonContent({ ownerId: user!.id, title: 'Untitled composition', tags: [], layout: layout, content });
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
    if (window.confirm('Delete this composition? This action cannot be undone.')) {
      deleteMutation.mutate(id);
    }
  };

  const items: LessonContent[] = useMemo(() => data?.content ?? [], [data]);

  return (
    <Box p={3}  sx={{
        bgcolor: '#fafbfd',
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative'
    }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5">Lesson Contents</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => createMutation.mutate()}>
          New Composition
        </Button>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} mb={2}>
        <TextField
          size="small"
          placeholder="Search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
          sx={{ minWidth: 260 }}
        />
        <Select size="small" value={status} onChange={(e) => setStatus(e.target.value as any)} sx={{ width: 180 }}>
          <MenuItem value="ALL">All</MenuItem>
          <MenuItem value="DRAFT">Draft</MenuItem>
          <MenuItem value="PUBLISHED">Published</MenuItem>
        </Select>
        <ToggleButtonGroup size="small" exclusive value={view} onChange={(_, v) => v && setView(v)}>
          <ToggleButton value="grid"><GridViewIcon fontSize="small" /></ToggleButton>
          <ToggleButton value="list"><ViewListIcon fontSize="small" /></ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {isLoading ? (
        <Typography variant="body2" color="text.secondary">Loading…</Typography>
      ) : items.length === 0 ? (
        <Box textAlign="center" py={6}>
          <Typography variant="body1" color="text.secondary">No compositions yet.</Typography>
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
  );
};

export default LessonContentsLibraryPage;

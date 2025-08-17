import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Stack,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  CircularProgress,
  Alert,
  Divider,
  Autocomplete
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createLessonContent,
  deleteLessonContent,
  getLessonContents,
  LessonContentDto,
  LessonContentStatus,
  PagedResponse
} from '../../services/api';

const statusColor = (status: LessonContentStatus) =>
  status === 'PUBLISHED' ? 'success' : 'warning';

const formatDate = (iso?: string) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
};

const LessonContentsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | LessonContentStatus>('ALL');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { data, isLoading, isError, refetch, isFetching } = useQuery<PagedResponse<LessonContentDto>>({
    queryKey: ['lesson-contents', { ownerId: user?.id, search, status, selectedTags }],
    queryFn: () =>
      getLessonContents({
        ownerId: user?.id,
        search: search || undefined,
        status,
        tags: selectedTags.length ? selectedTags : undefined,
        page: 0,
        size: 50,
      }),
    enabled: !!user?.id,
    staleTime: 10_000,
  });

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    data?.content.forEach(item => item.tags?.forEach(t => set.add(t)));
    return Array.from(set);
  }, [data]);

  const createMutation = useMutation({
    mutationFn: () => createLessonContent({ title: 'Untitled', status: 'DRAFT', ownerId: user?.id, layout: { gridUnit: 8, snapToGrid: true, frames: {}, nodes: {} }, content: {} }),
    onSuccess: (created) => {
      // Invalidate list (optional; we navigate away)
      queryClient.invalidateQueries({ queryKey: ['lesson-contents'] });
      navigate(`/lesson-contents/${created.id}/editor`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLessonContent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-contents'] });
    }
  });

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this composition? This action cannot be undone.')) {
      deleteMutation.mutate(id);
    }
  };

  const items = data?.content ?? [];

  return (
    <Box display="flex" flexDirection="column" gap={3} p={3}>
      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" gap={2}>
        <Stack direction="row" alignItems="center" gap={2}>
          <Typography variant="h4" fontWeight={700}>Lesson Contents</Typography>
          <Chip label={`${data?.totalElements ?? 0}`} size="small" />
        </Stack>
        <Stack direction="row" gap={1} alignItems="center" justifyContent="flex-end">
          <ToggleButtonGroup size="small" value={view} exclusive onChange={(_, v) => v && setView(v)}>
            <ToggleButton value="grid" aria-label="grid view"><GridViewIcon fontSize="small" /></ToggleButton>
            <ToggleButton value="list" aria-label="list view"><ViewListIcon fontSize="small" /></ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating…' : 'New Composition'}
          </Button>
        </Stack>
      </Stack>

      {/* Filters */}
      <Stack direction={{ xs: 'column', md: 'row' }} gap={2} alignItems={{ xs: 'stretch', md: 'center' }}>
        <TextField
          placeholder="Search titles…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            )
          }}
        />
        <ToggleButtonGroup
          size="small"
          value={status}
          exclusive
          onChange={(_, v) => v && setStatus(v)}
        >
          <ToggleButton value="ALL">All</ToggleButton>
          <ToggleButton value="DRAFT">Draft</ToggleButton>
          <ToggleButton value="PUBLISHED">Published</ToggleButton>
        </ToggleButtonGroup>
        <Autocomplete
          multiple
          size="small"
          options={availableTags}
          value={selectedTags}
          onChange={(_, v) => setSelectedTags(v)}
          disableCloseOnSelect
          renderInput={(params) => <TextField {...params} placeholder="Filter tags" />}
          sx={{ minWidth: 240 }}
        />
      </Stack>

      {/* States */}
      {isLoading || isFetching ? (
        <Box display="flex" alignItems="center" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : isError ? (
        <Stack gap={2} alignItems="center" py={6}>
          <Alert severity="error" sx={{ maxWidth: 520, width: '100%' }}>
            Failed to load lesson contents. Please try again.
          </Alert>
          <Button variant="outlined" onClick={() => refetch()}>Retry</Button>
        </Stack>
      ) : items.length === 0 ? (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          gap={2}
          sx={{
            border: '1px dashed rgba(0,0,0,0.12)',
            borderRadius: 2,
            bgcolor: 'background.paper',
            p: { xs: 4, md: 6 },
            textAlign: 'center'
          }}
        >
          <DashboardCustomizeIcon color="primary" sx={{ fontSize: 64, opacity: 0.9 }} />
          <Typography variant="h6" color="text.primary">Design your first composition</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560 }}>
            Design your first composition — drag blocks like in draw.io.
          </Typography>
          <Button variant="contained" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating…' : 'Create Composition'}
          </Button>
        </Box>
      ) : (
        view === 'grid' ? (
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }} gap={2}>
            {items.map(item => (
              <Card key={item.id} variant="outlined" sx={{ overflow: 'hidden' }}>
                {item.coverUrl && (
                  <Box sx={{ height: 120, backgroundImage: `url(${item.coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                )}
                <CardHeader
                  avatar={<Avatar>{(item.title || 'U')[0]}</Avatar>}
                  title={<Typography variant="subtitle1" fontWeight={600}>{item.title || 'Untitled'}</Typography>}
                  subheader={
                                    <Typography variant="caption" color="text.secondary">
                                      {item.ownerName ? `by ${item.ownerName} • ` : ''}Updated {formatDate(item.updatedAt)}
                                    </Typography>
                                  }
                  action={<Chip size="small" label={item.status} color={statusColor(item.status)} />}
                />
                <CardContent>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {item.tags?.map(t => (
                      <Chip key={t} label={t} size="small" variant="outlined" />
                    ))}
                  </Stack>
                </CardContent>
                <Divider />
                <Stack direction="row" justifyContent="space-between" alignItems="center" px={2} py={1.5}>
                  <Stack direction="row" gap={1}>
                    <Button size="small" startIcon={<EditIcon />} onClick={() => navigate(`/lesson-contents/${item.id}/editor`)}>Edit</Button>
                    <Button size="small" startIcon={<VisibilityIcon />} onClick={() => navigate(`/lesson-contents/${item.id}/view`)}>View</Button>
                  </Stack>
                  <IconButton color="error" onClick={() => handleDelete(item.id)} disabled={deleteMutation.isPending}>
                    <DeleteOutlineIcon />
                  </IconButton>
                </Stack>
              </Card>
            ))}
          </Box>
        ) : (
          <Stack divider={<Divider flexItem />}>
            {items.map(item => (
              <Stack key={item.id} direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" gap={1} py={1.5}>
                <Stack direction="row" alignItems="center" gap={2}>
                  <Avatar>{(item.title || 'U')[0]}</Avatar>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>{item.title || 'Untitled'}</Typography>
                    <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                      <Chip size="small" label={item.status} color={statusColor(item.status)} />
                      <Typography variant="caption" color="text.secondary">{item.ownerName ? `by ${item.ownerName} • ` : ''}Updated {formatDate(item.updatedAt)}</Typography>
                      {item.tags?.map(t => <Chip key={t} size="small" variant="outlined" label={t} />)}
                    </Stack>
                  </Box>
                </Stack>
                <Stack direction="row" gap={1}>
                  <Button size="small" startIcon={<EditIcon />} onClick={() => navigate(`/lesson-contents/${item.id}/editor`)}>Edit</Button>
                  <Button size="small" startIcon={<VisibilityIcon />} onClick={() => navigate(`/lesson-contents/${item.id}/view`)}>View</Button>
                  <IconButton color="error" onClick={() => handleDelete(item.id)} disabled={deleteMutation.isPending}>
                    <DeleteOutlineIcon />
                  </IconButton>
                </Stack>
              </Stack>
            ))}
          </Stack>
        )
      )}
    </Box>
  );
};

export default LessonContentsListPage;

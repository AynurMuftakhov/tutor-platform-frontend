import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  Skeleton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import MovieIcon from '@mui/icons-material/OndemandVideo';
import AudioIcon from '@mui/icons-material/Audiotrack';
import DescriptionIcon from '@mui/icons-material/Description';
import RuleIcon from '@mui/icons-material/Rule';
import FolderSidebar, { SIDEBAR_WIDTH } from '../folders/FolderSidebar';
import { ROOT_FOLDER_ID } from '../folders/FolderTree';
import { useFolderTree, useMaterials } from '../../hooks/useMaterials';
import { Material } from '../materials/MaterialCard';

export type MaterialPickerType = 'ALL' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'GRAMMAR';

export interface PickedMaterial {
  materialId: string;
  type: 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'GRAMMAR';
  title: string;
  sourceUrl?: string;
  thumbnailUrl?: string;
  durationSec?: number;
}

interface MaterialsPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onPick: (m: PickedMaterial | null) => void; // null => clear
  allowedTypes?: MaterialPickerType[]; // default ALL
}

const typeIcon = (t: string) => {
  switch (t) {
    case 'VIDEO': return <MovieIcon fontSize="small" />;
    case 'AUDIO': return <AudioIcon fontSize="small" />;
    case 'GRAMMAR': return <RuleIcon fontSize="small" />;
    default: return <DescriptionIcon fontSize="small" />;
  }
}

const MaterialsPickerDialog: React.FC<MaterialsPickerDialogProps> = ({ open, onClose, onPick, allowedTypes = ['ALL'] }) => {
  const [search, setSearch] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>(ROOT_FOLDER_ID);
  const [type, setType] = useState<MaterialPickerType>(allowedTypes.includes('ALL') ? 'ALL' : (allowedTypes[0] || 'ALL'));
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // folders
  const { data: folderTree = [], isLoading: foldersLoading } = useFolderTree();

  // materials
  const { data: materialsData, isLoading, isError, refetch } = useMaterials({
    folderId: selectedFolderId === ROOT_FOLDER_ID || selectedFolderId === 'all' ? undefined : selectedFolderId,
    search: search || undefined,
    type: type === 'ALL' ? undefined : type,
    page: 0,
    size: 50,
  });
  const materials: Material[] = Array.isArray(materialsData) ? (materialsData as any) : (materialsData?.content || []);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setSelectedFolderId(ROOT_FOLDER_ID);
      setSelectedId(null);
    }
  }, [open]);

  const handleConfirm = () => {
    if (!selectedId) return;
    const m = materials.find(mm => mm.id === selectedId);
    if (!m) return;
    onPick({
      materialId: m.id,
      type: m.type,
      title: m.title,
      sourceUrl: m.sourceUrl,
      thumbnailUrl: m.thumbnailUrl,
      durationSec: m.duration,
    });
  };

  const handleClear = () => {
    setSelectedId(null);
    onPick(null);
  };

  // Keyboard navigation
  const listRef = useRef<HTMLUListElement | null>(null);
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!listRef.current) return;
    const items = Array.from(listRef.current.querySelectorAll('[role="option"]')) as HTMLElement[];
    const idx = items.findIndex(el => el.getAttribute('data-id') === selectedId);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = items[Math.min(items.length - 1, Math.max(0, idx + 1))];
      next?.focus();
      setSelectedId(next?.getAttribute('data-id') || null);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = items[Math.max(0, idx - 1)];
      prev?.focus();
      setSelectedId(prev?.getAttribute('data-id') || null);
    } else if (e.key === 'Enter' && selectedId) {
      handleConfirm();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">Choose Material</Typography>
        <IconButton onClick={onClose} aria-label="Close"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: `${SIDEBAR_WIDTH}px 1fr` }, gap: 2 }}>
        {/* Folder tree */}
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          {foldersLoading ? (
            <Stack gap={1}>
              <Skeleton variant="rounded" height={24} />
              <Skeleton variant="rounded" height={24} />
              <Skeleton variant="rounded" height={24} />
            </Stack>
          ) : (
            <FolderSidebar folderTree={folderTree} onFolderSelect={setSelectedFolderId} selectedFolderId={selectedFolderId} onAddFolder={()=>{}} />
          )}
        </Box>

        {/* Right: filters + list */}
        <Stack gap={1}>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
            <TextField
              size="small"
              placeholder="Search materials"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) }}
              fullWidth
            />
            <ToggleButtonGroup size="small" value={type} exclusive onChange={(_, v) => v && setType(v)}>
              {(allowedTypes.includes('ALL') ? ['ALL','VIDEO','AUDIO','DOCUMENT','GRAMMAR'] : allowedTypes).map((t) => (
                <ToggleButton key={t} value={t} aria-label={t.toLowerCase()}>{t}</ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Button startIcon={<FilterListIcon />} variant="outlined" size="small" disabled>More filters</Button>
          </Stack>

          <Divider />

          {isLoading ? (
            <Stack gap={1}>
              {[...Array(6)].map((_, i) => (<Skeleton key={i} variant="rounded" height={56} />))}
            </Stack>
          ) : isError ? (
            <Stack alignItems="center" gap={1} py={4}>
              <Typography color="error">Failed to load materials.</Typography>
              <Button onClick={() => refetch()} variant="outlined">Retry</Button>
            </Stack>
          ) : (
            <List ref={listRef} onKeyDown={onKeyDown} dense sx={{ maxHeight: 420, overflow: 'auto' }}>
              {materials.map((m) => (
                <ListItem
                  key={m.id}
                  role="option"
                  data-id={m.id}
                  tabIndex={0}
                  selected={selectedId === m.id}
                  onClick={() => setSelectedId(m.id)}
                  secondaryAction={m.tags && m.tags.length > 0 ? (
                    <Stack direction="row" gap={0.5}>
                      {m.tags.slice(0,4).map(tag => <Chip key={tag} size="small" label={tag} />)}
                    </Stack>
                  ) : undefined}
                >
                  <ListItemAvatar>
                    <Avatar variant="rounded" src={m.thumbnailUrl}>
                      {typeIcon(m.type)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={<Stack direction="row" gap={1} alignItems="center"><Typography fontWeight={600}>{m.title}</Typography><Chip size="small" label={m.type} /></Stack>}
                    secondary={<Typography variant="caption" color="text.secondary">{m.duration ? `${Math.floor((m.duration||0)/60)}:${String((m.duration||0)%60).padStart(2,'0')}` : '—'} • {m.sourceUrl || ''}</Typography>}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={handleClear}>Clear selection</Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleConfirm} variant="contained" disabled={!selectedId}>Use Selected</Button>
      </DialogActions>
    </Dialog>
  );
};

export default MaterialsPickerDialog;

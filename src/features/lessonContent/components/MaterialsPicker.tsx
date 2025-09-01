import React, { useMemo, useState } from 'react';
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, InputAdornment, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import { useQuery } from '@tanstack/react-query';
import { getMaterials } from '../../../services/api';

export type PickerMaterialType = 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'GRAMMAR';

export interface PickedMaterial {
  id: string;
  type: PickerMaterialType;
  title: string;
  sourceUrl?: string;
  thumbnailUrl?: string;
  durationSec?: number;
}

interface MaterialsPickerProps {
  open: boolean;
  onClose: () => void;
  allowedTypes?: PickerMaterialType[];
  onSelect: (m: PickedMaterial) => void;
}

const MaterialsPicker: React.FC<MaterialsPickerProps> = ({ open, onClose, allowedTypes, onSelect }) => {
  const [q, setQ] = useState('');
  const [type, setType] = useState<PickerMaterialType | 'ALL'>(allowedTypes && allowedTypes.length === 1 ? allowedTypes[0] : 'ALL');
  const [tags, setTags] = useState<string>('');

  const canType = useMemo(() => allowedTypes && allowedTypes.length ? allowedTypes : (['AUDIO','VIDEO','DOCUMENT','GRAMMAR'] as PickerMaterialType[]), [allowedTypes]);

  const { data, isLoading } = useQuery({
    queryKey: ['materials-picker', { q, type, tags }],
    queryFn: () => getMaterials({ search: q || undefined, type: type === 'ALL' ? undefined : type, tags: tags.trim() ? tags.split(',').map(s => s.trim()).filter(Boolean) : undefined, size: 40, page: 0 }),
    enabled: open,
    staleTime: 5_000,
  });

  const items: any[] = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray((data as any).content)) return (data as any).content;
    return [];
  }, [data]);

  const select = (m: any) => {
    const mapped: PickedMaterial = {
      id: m.id,
      type: m.type,
      title: m.title,
      sourceUrl: m.sourceUrl,
      thumbnailUrl: m.thumbnailUrl,
      durationSec: m.duration ?? m.durationSec,
    };
    onSelect(mapped);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        Select material
        <IconButton onClick={onClose} size="small" sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }} mb={2}>
          <TextField size="small" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} sx={{ minWidth: 240 }} />
          <Select size="small" value={type} onChange={(e) => setType(e.target.value as any)} sx={{ minWidth: 160 }}>
            <MenuItem value="ALL">All types</MenuItem>
            {canType.map(t => (<MenuItem key={t} value={t}>{t}</MenuItem>))}
          </Select>
          <TextField size="small" placeholder="tags,comma,separated" value={tags} onChange={(e) => setTags(e.target.value)} sx={{ minWidth: 220 }} />
        </Stack>

        {isLoading ? (
          <Typography variant="body2" color="text.secondary">Loading…</Typography>
        ) : items.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No materials found.</Typography>
        ) : (
          <Grid container spacing={2}>
            {items.map((m) => (
              <Grid size={{ xs: 12, sm: 6, md:4 }} key={m.id}>
                <Box p={1.5} border={(t) => `1px solid ${t.palette.divider}`} borderRadius={1.5}>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                      <Typography variant="subtitle2" noWrap title={m.title}>{m.title}</Typography>
                      <Chip size="small" label={m.type} />
                    </Stack>
                    {m.thumbnailUrl && (
                      <Box component="img" src={m.thumbnailUrl} alt="thumb" sx={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 1 }} />
                    )}
                    {m.duration ? <Typography variant="caption" color="text.secondary">Duration: {m.duration}s</Typography> : null}
                    <Box textAlign="right">
                      <Button size="small" variant="contained" onClick={() => select(m)}>Select</Button>
                    </Box>
                  </Stack>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default MaterialsPicker;

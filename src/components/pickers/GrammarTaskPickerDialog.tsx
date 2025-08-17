import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  Checkbox,
  ListItemText,
  Stack,
  TextField,
  Typography,
  Skeleton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import { useGrammarItems } from '../../hooks/useGrammarItems';

interface GrammarTaskPickerDialogProps {
  materialId: string; // GRAMMAR material id
  open: boolean;
  onClose: () => void;
  onPick: (itemIds: string[] | null) => void; // null => clear
}

const GrammarTaskPickerDialog: React.FC<GrammarTaskPickerDialogProps> = ({ materialId, open, onClose, onPick }) => {
  const { data: items = [], isLoading, isError, refetch } = useGrammarItems(materialId);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      setSelected([]);
      setSearch('');
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(it => it.text?.toLowerCase().includes(q));
  }, [items, search]);

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // keyboard nav
  const listRef = useRef<HTMLUListElement | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!listRef.current) return;
    const itemsEl = Array.from(listRef.current.querySelectorAll('[role="option"]')) as HTMLElement[];
    const idx = itemsEl.findIndex(el => el.getAttribute('data-id') === focusId);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = itemsEl[Math.min(itemsEl.length - 1, Math.max(0, idx + 1))];
      next?.focus();
      setFocusId(next?.getAttribute('data-id'));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = itemsEl[Math.max(0, idx - 1)];
      prev?.focus();
      setFocusId(prev?.getAttribute('data-id'));
    } else if (e.key === ' ') {
      e.preventDefault();
      if (focusId) toggle(focusId);
    } else if (e.key === 'Enter') {
      onPick(selected);
    }
  };

  const handleClear = () => onPick(null);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">Choose Grammar Tasks</Typography>
        <IconButton onClick={onClose} aria-label="Close"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack gap={1}>
          <TextField size="small" placeholder="Search tasks" value={search} onChange={(e)=>setSearch(e.target.value)} InputProps={{ startAdornment: (<SearchIcon fontSize="small" />) }} />
          {isLoading ? (
            <Stack gap={1}>{[...Array(6)].map((_,i)=>(<Skeleton key={i} variant="rounded" height={48}/>))}</Stack>
          ) : isError ? (
            <Stack alignItems="center" gap={1} py={4}>
              <Typography color="error">Failed to load grammar items.</Typography>
              <Button onClick={()=>refetch()} variant="outlined">Retry</Button>
            </Stack>
          ) : (
            <List ref={listRef} onKeyDown={onKeyDown} dense sx={{ maxHeight: 420, overflow: 'auto' }}>
              {filtered.map((it) => (
                <ListItem key={it.id} role="option" data-id={it.id} tabIndex={0} onClick={()=>toggle(it.id)} selected={selected.includes(it.id)}>
                  <ListItemIcon>
                    <Checkbox edge="start" tabIndex={-1} checked={selected.includes(it.id)} disableRipple />
                  </ListItemIcon>
                  <ListItemText
                    primary={<Stack direction="row" gap={1} alignItems="center"><Chip size="small" label={`#${it.sortOrder}`} /> <Typography fontWeight={600}>{(it.text||'').slice(0,80)}</Typography></Stack>}
                    secondary={<Typography variant="caption" color="text.secondary">Preview: {(it.text||'').slice(0,140)}</Typography>}
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
        <Button variant="contained" onClick={()=>onPick(selected)} disabled={selected.length===0}>Use Selected</Button>
      </DialogActions>
    </Dialog>
  );
};

export default GrammarTaskPickerDialog;

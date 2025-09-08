import React, { useMemo, useState } from 'react';
import { Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useQuery } from '@tanstack/react-query';
import { fetchGrammarItems, GrammarItemDto } from '../../../services/api';

interface GrammarTaskPickerProps {
  open: boolean;
  materialId: string;
  onClose: () => void;
  onConfirm: (itemIds: string[]) => void;
  initiallySelected?: string[];
}

const GrammarTaskPicker: React.FC<GrammarTaskPickerProps> = ({ open, materialId, onClose, onConfirm, initiallySelected }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['grammar-items', materialId],
    queryFn: () => fetchGrammarItems(materialId),
    enabled: open && Boolean(materialId),
    staleTime: 10_000,
  });

  const [selected, setSelected] = useState<Set<string>>(new Set(initiallySelected ?? []));

  const items: GrammarItemDto[] = useMemo(() => Array.isArray(data) ? data : [], [data]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const confirm = () => {
    onConfirm(Array.from(selected));
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Choose grammar tasks
        <IconButton onClick={onClose} size="small" sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {isLoading ? (
          <Typography variant="body2" color="text.secondary">Loading…</Typography>
        ) : items.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No tasks found for this material.</Typography>
        ) : (
          <List dense>
            {items.map(it => (
              <ListItem key={it.id} divider secondaryAction={
                <FormControlLabel control={<Checkbox checked={selected.has(it.id)} onChange={() => toggle(it.id)} />} label="Select" />
              }>
                <ListItemText
                  primary={`#${it.sortOrder + 1} • ${it.type}`}
                  secondary={<Box sx={{ whiteSpace: 'pre-wrap' }}>{it.text}</Box>}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={confirm} disabled={selected.size === 0}>Confirm</Button>
      </DialogActions>
    </Dialog>
  );
};

export default GrammarTaskPicker;

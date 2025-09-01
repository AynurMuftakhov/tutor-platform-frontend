import React, { useMemo, useState } from 'react';
import { Box, Button, IconButton, Paper, Popover, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { BlockRegistry } from '../blocks/registry';
import { useEditorStore } from '../editorStore';

interface Props {
  sectionId: string;
  rowId: string;
  columnId: string;
  index: number; // insertion index within column.blocks (0..length)
  visible?: boolean;
  empty?: boolean; // render centered CTA for empty columns
}

const InsertionRail: React.FC<Props> = ({ sectionId, rowId, columnId, index, visible = true, empty = false }) => {
  const { actions } = useEditorStore();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const entries = useMemo(() => BlockRegistry.all(), []);

  if (!visible) return null;

  const openMenu = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };
  const closeMenu = () => setAnchorEl(null);

  const insert = (type: string) => {
    const def = BlockRegistry.get(type as any);
    if (!def) return;
    const id = `blk_${Math.random().toString(36).slice(2, 9)}`;
    const content = { id, ...(def.defaultContent() as any) };
    actions.insertBlockAt(sectionId, rowId, columnId, index, type, content as any);
    closeMenu();
  };

  if (empty) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" sx={{ py: 2 }}>
        <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={openMenu}>Add block</Button>
        <Popover open={Boolean(anchorEl)} anchorEl={anchorEl} onClose={closeMenu} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Paper sx={{ p: 1 }}>
            <Stack spacing={0.5}>
              {entries.map(({ type, def }) => (
                <Button key={type} onClick={() => insert(type)} startIcon={def.icon as any} sx={{ justifyContent: 'flex-start' }}>
                  {def.label}
                </Button>
              ))}
            </Stack>
          </Paper>
        </Popover>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', py: 0.5 }}>
      <Box sx={{ flex: 1, borderTop: (t) => `1px dashed ${t.palette.divider}` }} />
      <IconButton size="small" onClick={openMenu} sx={{ mx: 1 }} aria-label="Add block here">
        <AddIcon fontSize="inherit" />
      </IconButton>
      <Box sx={{ flex: 1, borderTop: (t) => `1px dashed ${t.palette.divider}` }} />
      <Popover open={Boolean(anchorEl)} anchorEl={anchorEl} onClose={closeMenu} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Paper sx={{ p: 1 }}>
          <Stack spacing={0.5}>
            {entries.map(({ type, def }) => (
              <Button key={type} onClick={() => insert(type)} startIcon={def.icon as any} sx={{ justifyContent: 'flex-start' }}>
                {def.label}
              </Button>
            ))}
          </Stack>
        </Paper>
      </Popover>
    </Box>
  );
};

export default InsertionRail;

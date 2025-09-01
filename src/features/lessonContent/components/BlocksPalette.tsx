import React from 'react';
import { List, ListItemButton, ListItemIcon, ListItemText, Paper, Typography } from '@mui/material';
import { useEditorStore } from '../editorStore';
import {BlockRegistry} from "../blocks/registry";

const DRAG_TYPE = 'application/lesson-block-type';

const BlocksPalette: React.FC = () => {
  const { state, actions } = useEditorStore();

  const handleClick = (type: string) => {
    const sel = state.selectedColumnPath;
    if (!sel) {
      window.alert('Select a column on the canvas, then choose a block to insert.');
      return;
    }
    const def = BlockRegistry.get(type as any);
    if (!def) return;
    const id = `blk_${Math.random().toString(36).slice(2,9)}`;
    const content = { id, ...(def.defaultContent() as any) };
    actions.insertBlock(sel.sectionId, sel.rowId, sel.columnId, type, content);
  };

  const onDragStart = (ev: React.DragEvent, type: string) => {
    ev.dataTransfer.setData(DRAG_TYPE, type);
    ev.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <Paper variant="outlined" sx={{ width: 260, p: 1.5, position: 'sticky', top: 16, alignSelf: 'flex-start' }}>
      <Typography variant="overline" color="text.secondary">Block Palette</Typography>
      <List dense>
        {BlockRegistry.all().map(({ type, def }) => (
          <ListItemButton
            key={type}
            onClick={() => handleClick(type)}
            draggable
            onDragStart={(e) => onDragStart(e, type)}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>{def.icon}</ListItemIcon>
            <ListItemText primary={def.label} />
          </ListItemButton>
        ))}
      </List>
    </Paper>
  );
};

export const BLOCK_DRAG_TYPE = DRAG_TYPE;
export default BlocksPalette;

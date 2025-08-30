import React from 'react';
import { Box, Chip, IconButton, Stack, Typography, Tooltip } from '@mui/material';
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIosNew from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIos from '@mui/icons-material/ArrowForwardIos';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import type { Column } from '../../../types/lessonContent';
import { useEditorStore } from '../editorStore';
import { BLOCK_DRAG_TYPE } from './BlocksPalette';
import { BlockRegistry } from '../blocks/registry';

interface Props {
  sectionId: string;
  rowId: string;
  column: Column;
  index: number;
  columnsLength: number;
}

const ColumnCell: React.FC<Props> = ({ sectionId, rowId, column, index, columnsLength }) => {
  const { state, actions } = useEditorStore();

  const isSelected = state.selectedColumnPath?.columnId === column.id;
  const selectThis = () => actions.setSelectedColumn({ sectionId, rowId, columnId: column.id });

  const dec = () => actions.setColumnSpan(sectionId, rowId, column.id, Math.max(1, column.span - 1));
  const inc = () => actions.setColumnSpan(sectionId, rowId, column.id, Math.min(12, column.span + 1));

  const moveLeft = () => index > 0 && actions.moveColumn(sectionId, rowId, index, index - 1);
  const moveRight = () => index < columnsLength - 1 && actions.moveColumn(sectionId, rowId, index, index + 1);

  const deleteCol = () => actions.deleteColumn(sectionId, rowId, column.id);

  const onDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(BLOCK_DRAG_TYPE)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };
  const onDrop = (e: React.DragEvent) => {
    const type = e.dataTransfer.getData(BLOCK_DRAG_TYPE);
    const def = BlockRegistry.get(type as any);
    if (!def) return;
    const id = `blk_${Math.random().toString(36).slice(2,9)}`;
    const content = { id, ...(def.defaultContent() as any) };
    actions.insertBlock(sectionId, rowId, column.id, type, content);
  };

  return (
    <Box
      onClick={selectThis}
      onDragOver={onDragOver}
      onDrop={onDrop}
      sx={{
        border: (theme) => `1px dashed ${isSelected ? theme.palette.primary.main : theme.palette.divider}`,
        boxShadow: isSelected ? (theme) => `0 0 0 2px ${theme.palette.primary.main}33 inset` : 'none',
        borderRadius: 1,
        p: 1,
        bgcolor: (theme) => theme.palette.background.paper,
        minHeight: 80,
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Tooltip title="Decrease span"><span><IconButton size="small" onClick={dec}><RemoveIcon fontSize="inherit" /></IconButton></span></Tooltip>
          <Typography variant="caption" sx={{ minWidth: 36, textAlign: 'center' }}>{column.span} / 12</Typography>
          <Tooltip title="Increase span"><span><IconButton size="small" onClick={inc}><AddIcon fontSize="inherit" /></IconButton></span></Tooltip>
        </Stack>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Move left"><span><IconButton size="small" onClick={moveLeft} disabled={index === 0}><ArrowBackIosNew fontSize="inherit" /></IconButton></span></Tooltip>
          <Tooltip title="Move right"><span><IconButton size="small" onClick={moveRight} disabled={index === columnsLength - 1}><ArrowForwardIos fontSize="inherit" /></IconButton></span></Tooltip>
          <Tooltip title="Delete column"><IconButton size="small" color="error" onClick={deleteCol}><DeleteOutline fontSize="inherit" /></IconButton></Tooltip>
        </Stack>
      </Stack>
      <Box mt={1} flex={1}>
        {column.blocks && column.blocks.length > 0 ? (
          <Stack spacing={0.5}>
            {column.blocks.map((b) => {
              const def = BlockRegistry.get(b.type as any);
              const onSelectBlock = (e: React.MouseEvent) => { e.stopPropagation(); actions.setSelectedBlock(b.id); };
              return (
                <Chip key={b.id} size="small" label={def ? def.label : b.type} onClick={onSelectBlock} sx={{ alignSelf: 'flex-start', cursor: 'pointer' }} />
              );
            })}
          </Stack>
        ) : (
          <Box display="flex" alignItems="center" justifyContent="center" sx={{ color: 'text.secondary', minHeight: 48 }}>
            <Typography variant="caption">Drop blocks here</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ColumnCell;

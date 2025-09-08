import React from 'react';
import { Box, Button, IconButton, Stack, Typography, Alert } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import type { Row } from '../../../types/lessonContent';
import ColumnCell from './ColumnCell';
import { useEditorStore } from '../editorStore';
import { DndContext, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';

interface Props {
  sectionId: string;
  row: Row;
  rowIndex: number;
  rowsLength: number;
  rowError?: string;
}

const RowStrip: React.FC<Props> = ({ sectionId, row, rowIndex, rowsLength, rowError }) => {
  const { actions } = useEditorStore();

  const addColumn = () => actions.addColumn(sectionId, row.id, 12);
  const moveUp = () => rowIndex > 0 && actions.moveRow(sectionId, rowIndex, rowIndex - 1);
  const moveDown = () => rowIndex < rowsLength - 1 && actions.moveRow(sectionId, rowIndex, rowIndex + 1);
  const removeRow = () => actions.deleteRow(sectionId, row.id);

  // KeyboardSensor intentionally omitted to avoid conflicts with contentEditable (e.g., TipTap using Space)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const onDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : undefined;
    if (!overId || activeId === overId) return;
    const findPos = (blockId: string) => {
      for (const c of row.columns || []) {
        const idx = (c.blocks || []).findIndex(b => b.id === blockId);
        if (idx !== -1) return { columnId: c.id, index: idx };
      }
      return undefined;
    };
    const fromPos = findPos(activeId);
    const toPos = findPos(overId);
    if (!fromPos || !toPos) return;
    actions.moveBlock(
      { sectionId, rowId: row.id, columnId: fromPos.columnId, index: fromPos.index },
      { sectionId, rowId: row.id, columnId: toPos.columnId, index: toPos.index }
    );
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={addColumn}>
            + Column
          </Button>
          <Button size="small" variant="text" onClick={() => actions.setSelectedRow({ sectionId, rowId: row.id })}>Select row</Button>
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            {(row.columns || []).reduce((acc, c) => acc + (c.span || 0), 0)} / 12 used
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.5}>
          <IconButton size="small" onClick={moveUp} disabled={rowIndex === 0} aria-label="Move row up"><ArrowUpward fontSize="inherit" /></IconButton>
          <IconButton size="small" onClick={moveDown} disabled={rowIndex === rowsLength - 1} aria-label="Move row down"><ArrowDownward fontSize="inherit" /></IconButton>
          <IconButton size="small" color="error" onClick={removeRow} aria-label="Delete row"><DeleteOutline fontSize="inherit" /></IconButton>
        </Stack>
      </Stack>

      {rowError && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {rowError}
        </Alert>
      )}

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            gap: 1,
            background: (theme) => `repeating-linear-gradient(90deg, ${theme.palette.action.hover}, ${theme.palette.action.hover} 1px, transparent 1px, transparent 8.3333%)`,
            p: 1,
            borderRadius: 1,
          }}
        >
          {(row.columns || []).length === 0 ? (
            <Box gridColumn="span 12" sx={{ border: (t) => `1px dashed ${t.palette.divider}`, borderRadius: 1, p: 2, textAlign: 'center', color: 'text.secondary' }}>
              <Typography variant="caption">No columns yet. Click + Column to add one.</Typography>
            </Box>
          ) : (
            (row.columns || []).map((col, idx) => (
              <Box key={col.id} sx={{ gridColumn: `span ${Math.max(1, Math.min(12, col.span || 1))}` }}>
                <ColumnCell sectionId={sectionId} rowId={row.id} column={col} index={idx} columnsLength={row.columns.length} />
              </Box>
            ))
          )}
        </Box>
      </DndContext>
    </Box>
  );
};

export default RowStrip;

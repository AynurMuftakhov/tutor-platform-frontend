import React from 'react';
import { Box, Button, IconButton, Stack, Typography, Alert } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import type { Row } from '../../../types/lessonContent';
import ColumnCell from './ColumnCell';
import { useEditorStore } from '../editorStore';

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

  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={addColumn}>
            + Column
          </Button>
          <Button size="small" variant="text" onClick={() => actions.setSelectedRow({ sectionId, rowId: row.id })}>Select row</Button>
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
    </Box>
  );
};

export default RowStrip;

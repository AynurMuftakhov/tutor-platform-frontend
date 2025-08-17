import React, { useState } from 'react';
import { Box, Button, Checkbox, FormControlLabel, MenuItem, Stack, TextField, Typography } from '@mui/material';
import RuleIcon from '@mui/icons-material/Rule';
import { BlockDefinition, BlockEditorProps, BlockStudentProps } from './registry';
import MaterialsPickerDialog, { PickedMaterial } from '../components/pickers/MaterialsPickerDialog';
import GrammarTaskPickerDialog from '../components/pickers/GrammarTaskPickerDialog';

export type GrammarContent = {
  materialId?: string;
  mode?: 'all' | 'subset';
  itemIds?: string[];
  shuffle?: boolean;
};

const GrammarEditor: React.FC<BlockEditorProps<GrammarContent>> = ({ content, onChange }) => {
  const c = content || {};
  const [openMat, setOpenMat] = useState(false);
  const [openTasks, setOpenTasks] = useState(false);
  const itemIdsStr = (c.itemIds || []).join(',');

  const handlePickedMaterial = (m: PickedMaterial | null) => {
    setOpenMat(false);
    if (m) {
      onChange({ ...c, materialId: m.materialId });
    }
  };

  const handlePickedTasks = (ids: string[] | null) => {
    setOpenTasks(false);
    if (ids) onChange({ ...c, itemIds: ids });
  };

  return (
    <Box sx={{ p: 1 }} onPointerDown={(e) => e.stopPropagation()}>
      <Stack spacing={1}>
        <Stack direction="row" gap={1}>
          <TextField size="small" label="Grammar Material ID" value={c.materialId || ''} onChange={(e) => onChange({ ...c, materialId: e.target.value })} />
          <Button size="small" variant="outlined" onClick={()=>setOpenMat(true)}>Choose Material</Button>
          {c.materialId && <Button size="small" color="inherit" onClick={()=>onChange({ ...c, materialId: '', itemIds: [] })}>Clear</Button>}
        </Stack>
        <TextField select size="small" label="Mode" value={c.mode || 'all'} onChange={(e) => onChange({ ...c, mode: e.target.value as any })} sx={{ maxWidth: 200 }}>
          <MenuItem value="all">All items</MenuItem>
          <MenuItem value="subset">Subset</MenuItem>
        </TextField>
        {(c.mode || 'all') === 'subset' && (
          <Stack direction="row" gap={1} alignItems="center">
            <TextField size="small" label="Item IDs (comma-separated)" value={itemIdsStr}
                       onChange={(e) => onChange({ ...c, itemIds: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
            <Button size="small" variant="outlined" disabled={!c.materialId} onClick={()=>setOpenTasks(true)}>Choose Tasks</Button>
          </Stack>
        )}
        <FormControlLabel control={<Checkbox checked={!!c.shuffle} onChange={(e) => onChange({ ...c, shuffle: e.target.checked })} />} label="Shuffle" />
        <Typography variant="body2" color="text.secondary">
          Pick a Grammar material to get started.
        </Typography>
      </Stack>
      <MaterialsPickerDialog open={openMat} onClose={()=>setOpenMat(false)} onPick={handlePickedMaterial} allowedTypes={['GRAMMAR']} />
      {c.materialId && (
        <GrammarTaskPickerDialog materialId={c.materialId} open={openTasks} onClose={()=>setOpenTasks(false)} onPick={handlePickedTasks} />
      )}
    </Box>
  );
};

const GrammarStudent: React.FC<BlockStudentProps<GrammarContent>> = ({ content }) => {
  const c = content || {};
  if (!c.materialId) return <Typography variant="body2" color="text.secondary">No grammar selected</Typography> as any;
  return (
    <Box>
      <Typography variant="subtitle2">Grammar Material</Typography>
      <Typography variant="body2" color="text.secondary">
        Material: {c.materialId} • Mode: {c.mode || 'all'} {c.shuffle ? '• Shuffled' : ''}
      </Typography>
    </Box>
  );
};

export const GrammarBlockDef: BlockDefinition<GrammarContent> = {
  type: 'GRAMMAR',
  icon: <RuleIcon />,
  label: 'Grammar',
  description: 'Select a grammar material; optionally limit to specific items',
  defaultContent: { materialId: '', mode: 'all', itemIds: [], shuffle: false },
  defaultSize: { w: 280, h: 140 },
  EditorComponent: GrammarEditor,
  StudentComponent: GrammarStudent,
  ajvSchema: {
    type: 'object',
    properties: {
      materialId: { type: 'string' },
      mode: { type: 'string', enum: ['all', 'subset'] },
      itemIds: { type: 'array', items: { type: 'string' } },
      shuffle: { type: 'boolean' },
    },
    additionalProperties: false,
  },
};

import React, { useState } from 'react';
import { Box, Checkbox, FormControlLabel, Stack, TextField, Typography, Button } from '@mui/material';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import { BlockDefinition, BlockEditorProps, BlockStudentProps } from './registry';
import MaterialsPickerDialog, { PickedMaterial } from '../components/pickers/MaterialsPickerDialog';

export type AudioContent = {
  materialId?: string; // lessons-service material id (AUDIO)
  url?: string; // fallback URL
  start?: number; // seconds
  end?: number; // seconds
  autoplay?: boolean;
};

const AudioEditor: React.FC<BlockEditorProps<AudioContent>> = ({ content, onChange }) => {
  const c = content || {};
  const [openPicker, setOpenPicker] = useState(false);
  const updateNum = (key: 'start'|'end', val: string) => {
    const num = val === '' ? undefined : Number(val);
    onChange({ ...c, [key]: Number.isFinite(num as number) ? (num as number) : undefined });
  };
  const handlePicked = (m: PickedMaterial | null) => {
    setOpenPicker(false);
    if (m) {
      onChange({ ...c, materialId: m.materialId, url: m.sourceUrl || c.url });
    }
  };
  return (
    <Box sx={{ p: 1 }} onPointerDown={(e) => e.stopPropagation()}>
      <Stack spacing={1}>
        <Stack direction="row" gap={1}>
          <TextField size="small" label="Material ID (Audio)" value={c.materialId || ''} onChange={(e) => onChange({ ...c, materialId: e.target.value })} />
          <Button size="small" variant="outlined" onClick={()=>setOpenPicker(true)}>Choose Material</Button>
          {c.materialId && <Button size="small" color="inherit" onClick={()=>onChange({ ...c, materialId: '', url: '' })}>Clear</Button>}
        </Stack>
        <TextField size="small" label="Or Audio URL" value={c.url || ''} onChange={(e) => onChange({ ...c, url: e.target.value })} />
        <Stack direction="row" spacing={1}>
          <TextField size="small" label="Start (s)" value={c.start ?? ''} onChange={(e) => updateNum('start', e.target.value)} sx={{ maxWidth: 120 }} />
          <TextField size="small" label="End (s)" value={c.end ?? ''} onChange={(e) => updateNum('end', e.target.value)} sx={{ maxWidth: 120 }} />
        </Stack>
        <FormControlLabel control={<Checkbox checked={!!c.autoplay} onChange={(e) => onChange({ ...c, autoplay: e.target.checked })} />} label="Autoplay" />
        <Box sx={{ border: '1px dashed rgba(0,0,0,0.2)', borderRadius: 1, p: 1, textAlign: 'center' }}>
          {c.url ? (
            <audio src={c.url} controls style={{ width: '100%' }} />
          ) : (
            <Typography variant="body2" color="text.secondary">Pick a material or paste an audio URL to preview</Typography>
          )}
        </Box>
      </Stack>
      <MaterialsPickerDialog open={openPicker} onClose={()=>setOpenPicker(false)} onPick={handlePicked} allowedTypes={['AUDIO']} />
    </Box>
  );
};

const AudioStudent: React.FC<BlockStudentProps<AudioContent>> = ({ content }) => {
  const c = content || {};
  if (!c.url) return <Typography variant="body2" color="text.secondary">Audio not selected</Typography> as any;
  return <audio src={c.url} controls autoPlay={!!c.autoplay} style={{ width: '100%' }} />;
};

export const AudioBlockDef: BlockDefinition<AudioContent> = {
  type: 'AUDIO',
  icon: <AudiotrackIcon />,
  label: 'Audio',
  description: 'Play an audio clip with optional start/end',
  defaultContent: { materialId: '', url: '', start: undefined, end: undefined, autoplay: false },
  defaultSize: { w: 320, h: 80 },
  EditorComponent: AudioEditor,
  StudentComponent: AudioStudent,
  ajvSchema: {
    type: 'object',
    properties: {
      materialId: { type: 'string' },
      url: { type: 'string' },
      start: { type: 'number' },
      end: { type: 'number' },
      autoplay: { type: 'boolean' }
    },
    additionalProperties: false,
  },
};

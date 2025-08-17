import React, { useState } from 'react';
import { Box, Checkbox, FormControlLabel, Stack, TextField, Tooltip, Typography, Button } from '@mui/material';
import OndemandVideoIcon from '@mui/icons-material/OndemandVideo';
import { BlockDefinition, BlockEditorProps, BlockStudentProps } from './registry';
import MaterialsPickerDialog, { PickedMaterial } from '../components/pickers/MaterialsPickerDialog';

export type VideoContent = {
  materialId?: string; // lessons-service material id (VIDEO)
  url?: string; // fallback URL
  start?: number;
  end?: number;
  autoplay?: boolean;
  muted?: boolean;
};

const VideoEditor: React.FC<BlockEditorProps<VideoContent>> = ({ content, onChange }) => {
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
          <TextField size="small" label="Material ID (Video)" value={c.materialId || ''} onChange={(e) => onChange({ ...c, materialId: e.target.value })} />
          <Button size="small" variant="outlined" onClick={()=>setOpenPicker(true)}>Choose Material</Button>
          {c.materialId && <Button size="small" color="inherit" onClick={()=>onChange({ ...c, materialId: '', url: '' })}>Clear</Button>}
        </Stack>
        <TextField size="small" label="Or Video URL" value={c.url || ''} onChange={(e) => onChange({ ...c, url: e.target.value })} />
        <Stack direction="row" spacing={1}>
          <TextField size="small" label="Start (s)" value={c.start ?? ''} onChange={(e) => updateNum('start', e.target.value)} sx={{ maxWidth: 120 }} />
          <TextField size="small" label="End (s)" value={c.end ?? ''} onChange={(e) => updateNum('end', e.target.value)} sx={{ maxWidth: 120 }} />
        </Stack>
        <FormControlLabel control={<Checkbox checked={!!c.autoplay} onChange={(e) => onChange({ ...c, autoplay: e.target.checked })} />} label="Autoplay" />
        <FormControlLabel control={<Checkbox checked={!!c.muted} onChange={(e) => onChange({ ...c, muted: e.target.checked })} />} label="Muted" />
        <Tooltip title="Video: synced playback supported in live lessons (coming from existing LiveKit logic)">
          <Typography variant="caption" color="text.secondary">Video: synced playback supported</Typography>
        </Tooltip>
        <Box sx={{ border: '1px dashed rgba(0,0,0,0.2)', borderRadius: 1, p: 1, textAlign: 'center' }}>
          {c.url ? (
            <video src={c.url} controls style={{ width: '100%' }} />
          ) : (
            <Typography variant="body2" color="text.secondary">Pick a material or paste a video URL to preview</Typography>
          )}
        </Box>
      </Stack>
      <MaterialsPickerDialog open={openPicker} onClose={()=>setOpenPicker(false)} onPick={handlePicked} allowedTypes={['VIDEO']} />
    </Box>
  );
};

const VideoStudent: React.FC<BlockStudentProps<VideoContent>> = ({ content }) => {
  const c = content || {};
  if (!c.url) return <Typography variant="body2" color="text.secondary">Video not selected</Typography> as any;
  return <video src={c.url} controls autoPlay={!!c.autoplay} muted={!!c.muted} style={{ width: '100%' }} />;
};

export const VideoBlockDef: BlockDefinition<VideoContent> = {
  type: 'VIDEO',
  icon: <OndemandVideoIcon />,
  label: 'Video',
  description: 'Play a video; synced playback supported',
  defaultContent: { materialId: '', url: '', start: undefined, end: undefined, autoplay: false, muted: false },
  defaultSize: { w: 320, h: 180 },
  EditorComponent: VideoEditor,
  StudentComponent: VideoStudent,
  ajvSchema: {
    type: 'object',
    properties: {
      materialId: { type: 'string' },
      url: { type: 'string' },
      start: { type: 'number' },
      end: { type: 'number' },
      autoplay: { type: 'boolean' },
      muted: { type: 'boolean' },
    },
    additionalProperties: false,
  },
};

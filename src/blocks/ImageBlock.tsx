import React, { useState } from 'react';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import { BlockDefinition, BlockEditorProps, BlockStudentProps } from './registry';
import MaterialsPickerDialog, { PickedMaterial } from '../components/pickers/MaterialsPickerDialog';

export type ImageContent = {
  materialId?: string;
  url?: string;
  alt?: string;
  caption?: string;
};

const ImageEditor: React.FC<BlockEditorProps<ImageContent>> = ({ content, onChange }) => {
  const c = content || {};
  const [openPicker, setOpenPicker] = useState(false);
  const handlePicked = (m: PickedMaterial | null) => {
    setOpenPicker(false);
    if (m) {
      onChange({ ...c, materialId: m.materialId, url: m.sourceUrl || m.thumbnailUrl || c.url });
    }
  };
  return (
    <Box sx={{ width: '100%', height: '100%', p: 1 }} onPointerDown={(e) => e.stopPropagation()}>
      <Stack spacing={1}>
        <Stack direction="row" gap={1}>
          <TextField size="small" label="Material ID (Image)" value={c.materialId || ''} onChange={(e) => onChange({ ...c, materialId: e.target.value })} fullWidth />
          <Button size="small" variant="outlined" onClick={()=>setOpenPicker(true)}>Choose Image</Button>
          {c.materialId && <Button size="small" color="inherit" onClick={()=>onChange({ ...c, materialId: '', url: '' })}>Clear</Button>}
        </Stack>
        <TextField size="small" label="Or Image URL" value={c.url || ''} onChange={(e) => onChange({ ...c, url: e.target.value })} fullWidth />
        <TextField size="small" label="Alt text" value={c.alt || ''} onChange={(e) => onChange({ ...c, alt: e.target.value })} fullWidth />
        <TextField size="small" label="Caption (optional)" value={c.caption || ''} onChange={(e) => onChange({ ...c, caption: e.target.value })} fullWidth />
        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 120, border: '1px dashed rgba(0,0,0,0.2)', borderRadius: 1 }}>
          {c.url ? (
            <img src={c.url} alt={c.alt || ''} style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }} />
          ) : (
            <Typography variant="body2" color="text.secondary">Pick a material or paste an image URL</Typography>
          )}
        </Box>
      </Stack>
      <MaterialsPickerDialog open={openPicker} onClose={()=>setOpenPicker(false)} onPick={handlePicked} allowedTypes={['DOCUMENT']} />
    </Box>
  );
};

const ImageStudent: React.FC<BlockStudentProps<ImageContent>> = ({ content }) => {
  const c = content || {};
  if (!c.url) return <Typography variant="body2" color="text.secondary">No image selected</Typography> as any;
  return (
    <Box>
      <img src={c.url} alt={c.alt || ''} style={{ maxWidth: '100%', height: 'auto' }} />
      {c.caption && <Typography variant="caption" color="text.secondary">{c.caption}</Typography>}
    </Box>
  );
};

export const ImageBlockDef: BlockDefinition<ImageContent> = {
  type: 'IMAGE',
  icon: <ImageIcon />,
  label: 'Image',
  description: 'Display an image from material or URL',
  defaultContent: { url: '', alt: '', caption: '' },
  defaultSize: { w: 240, h: 180 },
  EditorComponent: ImageEditor,
  StudentComponent: ImageStudent,
  ajvSchema: {
    type: 'object',
    properties: {
      url: { type: 'string' },
      alt: { type: 'string', minLength: 1 },
      caption: { type: 'string' },
    },
    required: ['alt'],
    additionalProperties: false,
  },
};

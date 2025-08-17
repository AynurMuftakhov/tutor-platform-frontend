import React, { useEffect, useRef } from 'react';
import { Stack, Typography, Chip, TextField, Divider, MenuItem, FormControlLabel, Switch, FormHelperText } from '@mui/material';
import DOMPurify from 'dompurify';
import { useForm } from 'react-hook-form';
import { ajvResolver } from '@hookform/resolvers/ajv';
import { BlockDefinition, getBlock } from '../../blocks';
import { Frame, Node as LCNode } from '../../store/lessonContentEditorStore';

export interface InspectorPanelProps {
  node: LCNode;
  frames: Record<string, Frame>;
  content: Record<string, any>;
  setNodeRect: (id: string, rect: { x: number; y: number; w: number; h: number }) => void;
  setNodeMeta: (id: string, patch: Partial<Pick<LCNode, 'z' | 'frameId' | 'ariaLabel' | 'locked'>>) => void;
  setNodeContent: (id: string, next: any) => void;
}

const InspectorPanel: React.FC<InspectorPanelProps> = ({ node: n, frames, content, setNodeRect, setNodeMeta, setNodeContent }) => {
  const def: BlockDefinition<any> | undefined = getBlock(n.type as any);
  const schema = def?.ajvSchema;
  const defaultValues = (content[n.id] ?? def?.defaultContent) as any;

  // RHF form for block-specific content
  const form = schema ? useForm({ defaultValues, resolver: ajvResolver(schema), mode: 'onChange' }) : null;

  useEffect(() => {
    if (form) {
      form.reset(defaultValues, { keepErrors: false, keepDirty: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n.id]);

  // Debounce helpers
  const geomTimer = useRef<number | null>(null);
  const scheduleGeom = (fn: () => void) => {
    if (geomTimer.current) window.clearTimeout(geomTimer.current);
    geomTimer.current = window.setTimeout(fn, 150);
  };

  const contentTimer = useRef<number | null>(null);
  const scheduleContent = (fn: () => void) => {
    if (contentTimer.current) window.clearTimeout(contentTimer.current);
    contentTimer.current = window.setTimeout(fn, 150);
  };

  // Live update content on change
  useEffect(() => {
    if (!form) return;
    const sub = form.watch((vals) => {
      if (!vals) return;
      const next = n.type === 'TEXT' && (vals as any).html ? { ...vals, html: DOMPurify.sanitize((vals as any).html) } : vals;
      scheduleContent(() => setNodeContent(n.id, next));
    });
    return () => { if (typeof sub === 'function') sub(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, n.id]);

  const handleNum = (label: 'x'|'y'|'w'|'h', val: string) => {
    const num = Number(val);
    if (!Number.isFinite(num)) return;
    const rect = { x: n.x, y: n.y, w: n.w, h: n.h } as any;
    rect[label] = num;
    scheduleGeom(() => setNodeRect(n.id, rect));
  };
  const handleZ = (val: string) => {
    const z = Number(val);
    if (!Number.isFinite(z)) return;
    scheduleGeom(() => setNodeMeta(n.id, { z }));
  };
  const handleFrame = (frameId?: string) => scheduleGeom(() => setNodeMeta(n.id, { frameId }));
  const handleLock = (locked: boolean) => scheduleGeom(() => setNodeMeta(n.id, { locked }));
  const handleAria = (ariaLabel: string) => scheduleGeom(() => setNodeMeta(n.id, { ariaLabel }));

  return (
    <Stack gap={1}>
      <Chip size="small" label={n.type} sx={{ alignSelf: 'flex-start' }} />
      <Typography variant="overline" color="text.secondary">Position & Size</Typography>
      <Stack direction="row" gap={1}>
        <TextField size="small" label="X" defaultValue={n.x} onChange={(e)=>handleNum('x', e.target.value)} sx={{ maxWidth: 110 }} />
        <TextField size="small" label="Y" defaultValue={n.y} onChange={(e)=>handleNum('y', e.target.value)} sx={{ maxWidth: 110 }} />
      </Stack>
      <Stack direction="row" gap={1}>
        <TextField size="small" label="W" defaultValue={n.w} onChange={(e)=>handleNum('w', e.target.value)} sx={{ maxWidth: 110 }} />
        <TextField size="small" label="H" defaultValue={n.h} onChange={(e)=>handleNum('h', e.target.value)} sx={{ maxWidth: 110 }} />
      </Stack>
      <Stack direction="row" gap={1}>
        <TextField size="small" label="zIndex" defaultValue={n.z ?? 0} onChange={(e)=>handleZ(e.target.value)} sx={{ maxWidth: 140 }} />
        <TextField size="small" select label="Frame" value={n.frameId || ''} onChange={(e)=>handleFrame(e.target.value || undefined)} sx={{ minWidth: 140 }}>
          <MenuItem value="">None</MenuItem>
          {Object.values(frames).map(f => (
            <MenuItem key={f.id} value={f.id}>{f.name || f.id}</MenuItem>
          ))}
        </TextField>
      </Stack>
      <FormControlLabel control={<Switch checked={!!n.locked} onChange={(e)=>handleLock(e.target.checked)} />} label="Locked" />
      <TextField size="small" label="Aria label" defaultValue={n.ariaLabel || ''} onChange={(e)=>handleAria(e.target.value)} />

      {def && (
        <>
          <Divider sx={{ my: 1 }} />
          <Typography variant="overline" color="text.secondary">{def.label} Settings</Typography>
          {form ? (
            <Stack gap={1}>
              {n.type === 'TEXT' && (
                <>
                  <TextField size="small" label="HTML" multiline minRows={3} {...form.register('html' as any)} error={!!form.formState.errors?.html} helperText={(form.formState.errors as any)?.html?.message as any} />
                  <Typography variant="caption" color="text.secondary">Characters: {(form.getValues('html' as any) || '').length}</Typography>
                </>
              )}
              {n.type === 'IMAGE' && (
                <>
                  <TextField size="small" label="Image URL" {...form.register('url' as any)} error={!!form.formState.errors?.url} helperText={(form.formState.errors as any)?.url?.message as any} />
                  <TextField required size="small" label="Alt" {...form.register('alt' as any)} error={!!form.formState.errors?.alt} helperText={(form.formState.errors as any)?.alt?.message as any || 'Required for accessibility'} />
                  <TextField size="small" label="Caption" {...form.register('caption' as any)} />
                </>
              )}
              {n.type === 'AUDIO' && (
                <>
                  <TextField size="small" label="Material ID" {...form.register('materialId' as any)} />
                  <TextField size="small" label="URL" {...form.register('url' as any)} />
                  <Stack direction="row" gap={1}>
                    <TextField size="small" label="Start (s)" type="number" {...form.register('start' as any)} />
                    <TextField size="small" label="End (s)" type="number" {...form.register('end' as any)} />
                  </Stack>
                  {(() => {
                    const s = Number(form.getValues('start' as any));
                    const e = Number(form.getValues('end' as any));
                    const invalid = Number.isFinite(s) && Number.isFinite(e) && s >= e;
                    return invalid ? <FormHelperText error>Start must be less than End</FormHelperText> : null;
                  })()}
                  <FormControlLabel control={<Switch {...form.register('autoplay' as any)} />} label="Autoplay" />
                </>
              )}
              {n.type === 'VIDEO' && (
                <>
                  <TextField size="small" label="Material ID" {...form.register('materialId' as any)} />
                  <TextField size="small" label="URL" {...form.register('url' as any)} />
                  <Stack direction="row" gap={1}>
                    <TextField size="small" label="Start (s)" type="number" {...form.register('start' as any)} />
                    <TextField size="small" label="End (s)" type="number" {...form.register('end' as any)} />
                  </Stack>
                  {(() => {
                    const s = Number(form.getValues('start' as any));
                    const e = Number(form.getValues('end' as any));
                    const invalid = Number.isFinite(s) && Number.isFinite(e) && s >= e;
                    return invalid ? <FormHelperText error>Start must be less than End</FormHelperText> : null;
                  })()}
                  <FormControlLabel control={<Switch {...form.register('autoplay' as any)} />} label="Autoplay" />
                </>
              )}
              {n.type === 'GRAMMAR' && (
                <>
                  <TextField size="small" label="Material ID" {...form.register('materialId' as any)} />
                  <TextField size="small" select label="Mode" defaultValue={defaultValues?.mode || 'all'} {...form.register('mode' as any)}>
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="subset">Subset</MenuItem>
                  </TextField>
                  {form.getValues('mode' as any) === 'subset' && (
                    <TextField size="small" label="Item IDs (comma-separated)" {...form.register('itemIdsStr' as any)} helperText="e.g., id1,id2,id3" />
                  )}
                  <FormControlLabel control={<Switch {...form.register('shuffle' as any)} />} label="Shuffle" />
                </>
              )}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">No configurable settings</Typography>
          )}
        </>
      )}
    </Stack>
  );
};

export default InspectorPanel;

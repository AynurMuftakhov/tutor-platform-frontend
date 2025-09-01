import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, Chip, FormControl, FormControlLabel, FormHelperText, InputLabel, MenuItem, Radio, RadioGroup, Select, Stack, Switch, TextField, Typography } from '@mui/material';
import { useEditorStore } from '../editorStore';
import type { BlockRef, Column, Row, Section } from '../../../types/lessonContent';
import MaterialsPicker, { PickerMaterialType } from './MaterialsPicker';
import GrammarTaskPicker from './GrammarTaskPicker';

function sanitizeHtml(input: string): string {
  // Minimal sanitizer: remove <script>...</script> tags
  return input.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
}

const NumberField: React.FC<{ label: string; value?: number; onChange: (n?: number) => void; min?: number }>
  = ({ label, value, onChange, min = 0 }) => (
  <TextField
    type="number"
    size="small"
    label={label}
    value={value ?? ''}
    onChange={(e) => {
      const v = e.target.value;
      onChange(v === '' ? undefined : Math.max(min, Number(v)));
    }}
    sx={{ maxWidth: 160 }}
  />
);

const InspectorPanel: React.FC = () => {
  const { state, actions } = useEditorStore();
  const [formError, setFormError] = useState<string | undefined>(undefined);

  const selected = useMemo(() => {
    // Find selected column and block ref if any
    let section: Section | undefined;
    let row: Row | undefined;
    let column: Column | undefined;
    let blockRef: BlockRef | undefined;

    if (state.selectedColumnPath) {
      section = state.layout.sections.find(s => s.id === state.selectedColumnPath!.sectionId);
      row = section?.rows.find(r => r.id === state.selectedColumnPath!.rowId);
      column = row?.columns.find(c => c.id === state.selectedColumnPath!.columnId);
      if (state.selectedBlockId && column) {
        blockRef = column.blocks.find(b => b.id === state.selectedBlockId);
      }
    } else if (state.selectedRowPath) {
      section = state.layout.sections.find(s => s.id === state.selectedRowPath!.sectionId);
      row = section?.rows.find(r => r.id === state.selectedRowPath!.rowId);
    } else if (state.selectedSectionId) {
      section = state.layout.sections.find(s => s.id === state.selectedSectionId);
    }
    return { section, row, column, blockRef };
  }, [state.selectedColumnPath, state.selectedRowPath, state.selectedSectionId, state.selectedBlockId, state.layout.sections]);

  useEffect(() => {
    // expose validation result to store (for Publish disable)
    actions.setInspectorInvalid(Boolean(formError));
  }, [formError]);

  if (!selected.section && !selected.row && !selected.column) {
    return (
      <Box sx={{ width: 320, p: 2, position: 'sticky', top: 16 }}>
        <Typography variant="overline" color="text.secondary">Inspector</Typography>
        <Typography variant="body2" color="text.secondary">Select a section, row, column, or block to edit properties.</Typography>
      </Box>
    );
  }

  const blockPayload = selected.blockRef ? state.content[selected.blockRef.id] : undefined;

  return (
    <Box sx={{ width: 320, p: 2, position: 'sticky', top: 16, borderLeft: (t) => `1px solid ${t.palette.divider}` }}>
      <Typography variant="overline" color="text.secondary">Inspector</Typography>
      <Stack spacing={2} mt={1}>
        {selected.blockRef && blockPayload && (
          <BlockForm
            key={selected.blockRef.id}
            type={selected.blockRef.type}
            payloadId={selected.blockRef.id}
            value={blockPayload as any}
            onErrorChange={setFormError}
            onChange={(patch) => actions.upsertBlock(selected.blockRef!.id, patch as any)}
          />
        )}

        {!selected.blockRef && selected.column && (
          <ColumnForm
            column={selected.column}
            onChange={(patch) => actions.updateColumnMeta(state.selectedColumnPath!.sectionId, state.selectedColumnPath!.rowId, state.selectedColumnPath!.columnId, patch)}
            onSpanChange={(span) => actions.setColumnSpan(state.selectedColumnPath!.sectionId, state.selectedColumnPath!.rowId, state.selectedColumnPath!.columnId, span)}
          />
        )}

        {!selected.blockRef && !selected.column && selected.row && state.selectedRowPath && (
          <RowForm
            row={selected.row}
            onChange={(patch) => actions.updateRowMeta(state.selectedRowPath!.sectionId, state.selectedRowPath!.rowId, patch)}
          />
        )}

        {!selected.blockRef && !selected.column && !selected.row && selected.section && (
          <SectionForm
            section={selected.section}
            onChange={(patch) => selected.section && actions.updateSectionMeta(selected.section.id, patch)}
          />
        )}
      </Stack>
    </Box>
  );
};

const SectionForm: React.FC<{ section: Section; onChange: (patch: { title?: string; ariaLabel?: string }) => void }>
  = ({ section, onChange }) => (
  <Stack spacing={1.5}>
    <Typography variant="subtitle2">Section</Typography>
    <TextField size="small" label="Title" value={section.title || ''} onChange={(e) => onChange({ title: e.target.value })} />
    <TextField size="small" label="ARIA label" value={section.ariaLabel || ''} onChange={(e) => onChange({ ariaLabel: e.target.value })} />
  </Stack>
);

const RowForm: React.FC<{ row: Row; onChange: (patch: { ariaLabel?: string }) => void }>
  = ({ row, onChange }) => (
  <Stack spacing={1.5}>
    <Typography variant="subtitle2">Row</Typography>
    <TextField size="small" label="ARIA label" value={row.ariaLabel || ''} onChange={(e) => onChange({ ariaLabel: e.target.value })} />
  </Stack>
);

const ColumnForm: React.FC<{ column: Column; onChange: (patch: { ariaLabel?: string }) => void; onSpanChange: (span: number) => void }>
  = ({ column, onChange, onSpanChange }) => (
  <Stack spacing={1.5}>
    <Typography variant="subtitle2">Column</Typography>
    <Stack direction="row" spacing={1} alignItems="center">
      <Typography variant="caption">Span</Typography>
      <Button size="small" variant="outlined" onClick={() => onSpanChange(Math.max(1, column.span - 1))}>-</Button>
      <Typography variant="body2">{column.span} / 12</Typography>
      <Button size="small" variant="outlined" onClick={() => onSpanChange(Math.min(12, column.span + 1))}>+</Button>
    </Stack>
    <TextField size="small" label="ARIA label" value={column.ariaLabel || ''} onChange={(e) => onChange({ ariaLabel: e.target.value })} />
  </Stack>
);

// Block forms

type AnyBlock = any;

const BlockForm: React.FC<{ type: string; payloadId: string; value: AnyBlock; onChange: (patch: AnyBlock) => void; onErrorChange: (err?: string) => void }>
  = ({ type, value, onChange, onErrorChange }) => {
  const [source, setSource] = useState<'material'|'url'>((value && value.materialId) ? 'material' : 'url');
  const [error, setError] = useState<string | undefined>(undefined);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTypes, setPickerTypes] = useState<PickerMaterialType[]>([]);
  const [materialPreview, setMaterialPreview] = useState<{ title: string; type: string } | undefined>(undefined);
  const [tasksOpen, setTasksOpen] = useState(false);

  useEffect(() => { onErrorChange(error); }, [error]);

  if (type === 'text') {
    return (
      <Stack spacing={1.5}>
        <Typography variant="subtitle2">Text</Typography>
        <TextField
          size="small"
          label="HTML"
          multiline minRows={4}
          value={value?.html ?? ''}
          onChange={(e) => {
            const html = sanitizeHtml(e.target.value);
            onChange({ html });
          }}
        />
      </Stack>
    );
  }
  if (type === 'image') {
    const altError = source === 'url' && (!value?.alt || value.alt.trim() === '');
    const urlError = source === 'url' && (!value?.url || value.url.trim() === '');
    useEffect(() => {
      const e = altError ? 'Alt is required' : urlError ? 'URL is required' : undefined;
      setError(e);
    }, [altError, urlError]);
    return (
      <Stack spacing={1.5}>
        <Typography variant="subtitle2">Image</Typography>
        <FormControl size="small">
          <RadioGroup row value={source} onChange={(e) => setSource(e.target.value as any)}>
            <FormControlLabel value="material" control={<Radio />} label="Material" />
            <FormControlLabel value="url" control={<Radio />} label="URL" />
          </RadioGroup>
        </FormControl>
        {source === 'url' ? (
          <>
            <TextField size="small" label="Image URL" value={value?.url ?? ''} onChange={(e) => onChange({ url: e.target.value })} error={urlError} helperText={urlError ? 'Required' : ''} />
            <TextField size="small" label="Alt (required)" value={value?.alt ?? ''} onChange={(e) => onChange({ alt: e.target.value })} error={altError} helperText={altError ? 'Required' : ''} />
            <TextField size="small" label="Caption" value={value?.caption ?? ''} onChange={(e) => onChange({ caption: e.target.value })} />
          </>
        ) : (
          <>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button variant="outlined" size="small" onClick={() => { setPickerTypes(['DOCUMENT']); setPickerOpen(true); }}>Choose Material…</Button>
              {materialPreview && <Chip size="small" label={`${materialPreview.title} • ${materialPreview.type}`} />}
            </Stack>
            <TextField size="small" label="Alt (required)" value={value?.alt ?? ''} onChange={(e) => onChange({ alt: e.target.value })} />
            <TextField size="small" label="Caption" value={value?.caption ?? ''} onChange={(e) => onChange({ caption: e.target.value })} />
            <MaterialsPicker open={pickerOpen} allowedTypes={pickerTypes} onClose={() => setPickerOpen(false)} onSelect={(m) => { onChange({ materialId: m.id, url: undefined }); setMaterialPreview({ title: m.title, type: m.type }); setSource('material'); }} />
          </>
        )}
      </Stack>
    );
  }
  if (type === 'audio' || type === 'video') {
    const start = value?.startSec ?? 0;
    const end = value?.endSec ?? undefined;
    const nonNegative = (start ?? 0) >= 0 && (end === undefined || end >= 0);
    const rangeOk = end === undefined || end >= start;
    useEffect(() => {
      setError(nonNegative && rangeOk ? undefined : 'Time fields invalid');
    }, [start, end]);
    return (
      <Stack spacing={1.5}>
        <Typography variant="subtitle2">{type === 'audio' ? 'Audio' : 'Video'}</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="outlined" size="small" onClick={() => { setPickerTypes([type === 'audio' ? 'AUDIO' : 'VIDEO']); setPickerOpen(true); }}>Choose Material…</Button>
          {materialPreview && <Chip size="small" label={`${materialPreview.title} • ${materialPreview.type}`} />}
        </Stack>
        <MaterialsPicker open={pickerOpen} allowedTypes={pickerTypes} onClose={() => setPickerOpen(false)} onSelect={(m) => { onChange({ materialId: m.id }); setMaterialPreview({ title: m.title, type: m.type }); }} />
        {type === 'audio' && (
          <FormControlLabel control={<Switch checked={Boolean(value?.autoplay)} onChange={(e) => onChange({ autoplay: e.target.checked })} />} label="Autoplay" />
        )}
        <Stack direction="row" spacing={1}>
          <NumberField label="Start (sec)" value={value?.startSec} onChange={(n) => onChange({ startSec: n })} min={0} />
          <NumberField label="End (sec)" value={value?.endSec} onChange={(n) => onChange({ endSec: n })} min={0} />
        </Stack>
        {(!nonNegative || !rangeOk) && <FormHelperText error>End must be ≥ start; both non-negative.</FormHelperText>}
      </Stack>
    );
  }
  if (type === 'grammarMaterial') {
    const hasMaterial = Boolean(value?.materialId);
    return (
      <Stack spacing={1.5}>
        <Typography variant="subtitle2">Grammar Material</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="outlined" size="small" onClick={() => { setPickerTypes(['GRAMMAR']); setPickerOpen(true); }}>Choose Material…</Button>
          {materialPreview && <Chip size="small" label={`${materialPreview.title} • ${materialPreview.type}`} />}
        </Stack>
        <MaterialsPicker open={pickerOpen} allowedTypes={pickerTypes} onClose={() => setPickerOpen(false)} onSelect={(m) => { onChange({ materialId: m.id }); setMaterialPreview({ title: m.title, type: m.type }); }} />

        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="outlined" size="small" disabled={!hasMaterial} onClick={() => setTasksOpen(true)}>Choose tasks…</Button>
          {Array.isArray(value?.itemIds) && value.itemIds.length > 0 && (
            <Chip size="small" label={`${value.itemIds.length} selected`} />
          )}
        </Stack>
        <GrammarTaskPicker open={tasksOpen} materialId={value?.materialId || ''} onClose={() => setTasksOpen(false)} onConfirm={(ids) => onChange({ itemIds: ids })} initiallySelected={value?.itemIds} />

        <FormControl fullWidth size="small">
          <InputLabel id="mode-label">Mode</InputLabel>
          <Select labelId="mode-label" label="Mode" value={value?.mode ?? 'all'} onChange={(e) => onChange({ mode: e.target.value })}>
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="subset">Subset</MenuItem>
          </Select>
        </FormControl>
        <FormControlLabel control={<Switch checked={Boolean(value?.shuffle)} onChange={(e) => onChange({ shuffle: e.target.checked })} />} label="Shuffle" />
      </Stack>
    );
  }

  return (
    <Typography variant="body2" color="text.secondary">No editor for this block type yet.</Typography>
  );
};

export default InspectorPanel;

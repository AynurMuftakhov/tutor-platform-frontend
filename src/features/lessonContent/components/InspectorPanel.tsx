import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import type { AutocompleteRenderInputParams } from '@mui/material/Autocomplete';
import { useEditorStore } from '../editorStore';
import type { BlockRef, Column, ImageBlockPayload, ListeningTaskBlockPayload, Row, Section } from '../../../types/lessonContent';
import MaterialsPicker, { PickerMaterialType, PickedMaterial } from './MaterialsPicker';
import GrammarTaskPicker from './GrammarTaskPicker';
import { useQuery } from '@tanstack/react-query';
import type { ImageAsset, ImageAssetPage } from '../../../types/assets';
import { fetchImageAssets, uploadImageAsset, validateImageFile, resolveUrl } from '../../../services/assets';
import type { ListeningTask } from '../../../types';
import { fetchListeningTasks } from '../../../services/api';

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

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

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
  = ({ row, onChange }) => {
  const { state, actions } = useEditorStore();
  const handleDelete = () => {
    const sectionId = state.selectedRowPath?.sectionId || state.selectedColumnPath?.sectionId || state.selectedSectionId;
    if (!sectionId) return;
    actions.deleteRow(sectionId, row.id);
  };
  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2">Row</Typography>
      <TextField size="small" label="ARIA label" value={row.ariaLabel || ''} onChange={(e) => onChange({ ariaLabel: e.target.value })} />
      <Divider />
      <Button variant="outlined" color="error" size="small" onClick={handleDelete}>Delete row</Button>
    </Stack>
  );
};

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
  = ({ type, value, onChange, onErrorChange, payloadId }) => {
  const [error, setError] = useState<string | undefined>(undefined);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTypes, setPickerTypes] = useState<PickerMaterialType[]>([]);
  const [materialPreview, setMaterialPreview] = useState<{ title: string; type: string } | undefined>(undefined);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [listeningPickerOpen, setListeningPickerOpen] = useState(false);

  const listeningPayload = type === 'listeningTask' ? (value as ListeningTaskBlockPayload) : undefined;
  const {
    data: listeningTasks = [],
    isLoading: listeningTasksLoading,
  } = useQuery({
    queryKey: ['listening-block-tasks', listeningPayload?.materialId],
    queryFn: () => fetchListeningTasks(listeningPayload!.materialId),
    enabled: type === 'listeningTask' && Boolean(listeningPayload?.materialId),
  });

  useEffect(() => { onErrorChange(error); }, [error]);

  const { actions } = useEditorStore();

  const deleteThisBlock = () => {
    if (!payloadId) return;
    actions.deleteByIds([payloadId]);
  };

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
        <Divider />
        <Button variant="outlined" color="error" size="small" onClick={deleteThisBlock}>Delete block</Button>
      </Stack>
    );
  }
  if (type === 'image') {
    return (
      <Stack spacing={1.5}>
        <ImageBlockForm
          value={value}
          onChange={onChange}
          onUploadError={setError}
        />
        <Divider />
        <Button variant="outlined" color="error" size="small" onClick={deleteThisBlock}>Delete block</Button>
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
        <Divider />
        <Button variant="outlined" color="error" size="small" onClick={deleteThisBlock}>Delete block</Button>
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
        <Divider />
        <Button variant="outlined" color="error" size="small" onClick={deleteThisBlock}>Delete block</Button>
      </Stack>
    );
  }

  if (type === 'listeningTask') {
    const payload = value as ListeningTaskBlockPayload;
    const selectedTask = listeningTasks.find((task) => task.id === payload.taskId);
    const hasSingleTask = !listeningTasksLoading && listeningTasks.length === 1;

    useEffect(() => {
      if (!payload.materialId) return;
      if (payload.taskId) return;
      if (hasSingleTask) {
        onChange({ taskId: listeningTasks[0].id });
      }
    }, [hasSingleTask, listeningTasks, onChange, payload.materialId, payload.taskId]);

    const handleMaterialSelect = (material: PickedMaterial) => {
      onChange({ materialId: material.id, taskId: '', showTranscript: payload.showTranscript, showFocusWords: payload.showFocusWords });
      setListeningPickerOpen(false);
    };

    const handleTaskSelect = (_: any, task: ListeningTask | null) => {
      onChange({ taskId: task?.id || '' });
    };

    return (
      <Stack spacing={1.5}>
        <Typography variant="subtitle2">Listening task</Typography>
        <Button variant="outlined" size="small" onClick={() => setListeningPickerOpen(true)}>
          {payload.materialId ? 'Change material' : 'Choose material'}
        </Button>
        {payload.materialId && (
          <Stack spacing={1}>
            {listeningTasksLoading ? (
              <Typography variant="body2" color="text.secondary">Loading tasks…</Typography>
            ) : listeningTasks.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No listening tasks found for this material.
              </Typography>
            ) : hasSingleTask ? (
              <Stack spacing={0.5}>
                <Typography variant="body2">Using the only available task:</Typography>
                <Typography variant="caption" color="text.secondary">
                  {listeningTasks[0].title || `${formatTime(listeningTasks[0].startSec)} – ${formatTime(listeningTasks[0].endSec)}`}
                </Typography>
              </Stack>
            ) : (
              <Autocomplete<ListeningTask>
                options={listeningTasks}
                value={selectedTask ?? null}
                getOptionLabel={(option: ListeningTask) => option.title || `${formatTime(option.startSec)} – ${formatTime(option.endSec)}`}
                onChange={handleTaskSelect}
                renderInput={(params: AutocompleteRenderInputParams) => (
                  <TextField {...params} label="Task" placeholder="Pick a saved listening task" size="small" />
                )}
              />
            )}
            {selectedTask && (
              <Typography variant="caption" color="text.secondary">
                {formatTime(selectedTask.startSec)} – {formatTime(selectedTask.endSec)}
              </Typography>
            )}
            <FormControlLabel
              control={(
                <Switch
                  size="small"
                  checked={Boolean(payload.showTranscript)}
                  onChange={(e) => onChange({ showTranscript: e.target.checked })}
                />
              )}
              label="Show transcript"
            />
            <FormControlLabel
              control={(
                <Switch
                  size="small"
                  checked={payload.showFocusWords !== false}
                  onChange={(e) => onChange({ showFocusWords: e.target.checked })}
                />
              )}
              label="Show focus words"
            />
          </Stack>
        )}
        <MaterialsPicker
          open={listeningPickerOpen}
          onClose={() => setListeningPickerOpen(false)}
          allowedTypes={['AUDIO', 'VIDEO']}
          onSelect={handleMaterialSelect}
        />
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">No editor for this block type yet.</Typography>
      <Divider />
      <Button variant="outlined" color="error" size="small" onClick={deleteThisBlock}>Delete block</Button>
    </Stack>
  );
};

interface PendingImageSelection {
  id?: string;
  url: string;
  alt?: string;
  caption?: string;
}

const IMAGE_LIBRARY_PAGE_SIZE = 20;
const ACCEPTED_IMAGE_TYPES = 'image/png,image/jpeg,image/webp,image/gif';

function deriveAltFromFilename(filename?: string | null): string {
  if (!filename) return '';
  const decoded = decodeURIComponent(filename);
  const withoutExt = decoded.replace(/\.[^./]+$/, '');
  return withoutExt.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function deriveAltFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return deriveAltFromFilename(parsed.pathname.split('/').pop() || undefined);
  } catch {
    return deriveAltFromFilename(url.split('/').pop() || undefined);
  }
}

function sanitizeOptional(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function shouldLoadMore(page: ImageAssetPage, currentLength: number): boolean {
  const count = page.items?.length ?? 0;
  if (count === 0) return false;
  if (count < IMAGE_LIBRARY_PAGE_SIZE) return false;
  if (typeof page.total === 'number') {
    return currentLength < page.total;
  }
  return true;
}

const ImageBlockForm: React.FC<{ value: ImageBlockPayload | undefined; onChange: (patch: Partial<ImageBlockPayload>) => void; onUploadError: (message?: string) => void }>
  = ({ value, onChange, onUploadError }) => {
  const [tab, setTab] = useState<'upload' | 'library'>('upload');
  const [pendingImage, setPendingImage] = useState<PendingImageSelection | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | undefined>(undefined);
  const [uploadingFileName, setUploadingFileName] = useState<string | undefined>(undefined);
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState<string | undefined>(undefined);
  const [libraryOffset, setLibraryOffset] = useState(0);
  const [libraryItems, setLibraryItems] = useState<ImageAsset[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  useEffect(() => {
    onUploadError(uploadError);
  }, [uploadError, onUploadError]);

  useEffect(() => {
    if (tab === 'library') {
      setLibraryOffset(0);
      setLibraryItems([]);
      setHasMore(true);
    }
  }, [tab]);

  const libraryQuery = useQuery<ImageAssetPage>({
    queryKey: ['assets', 'images', { offset: libraryOffset, limit: IMAGE_LIBRARY_PAGE_SIZE }],
    queryFn: () => fetchImageAssets({ offset: libraryOffset, limit: IMAGE_LIBRARY_PAGE_SIZE }),
    enabled: tab === 'library',
  });

  useEffect(() => {
    if (!libraryQuery.data) return;
    const page = libraryQuery.data;
    setLibraryItems((prev) => {
      const incoming = page.items ?? [];
      if (libraryOffset === 0) {
        setHasMore(shouldLoadMore(page, incoming.length));
        return incoming;
      }
      const existing = new Set(prev.map((item) => item.id ?? item.url));
      const appended = incoming.filter((item) => !existing.has(item.id ?? item.url));
      if (appended.length === 0) {
        setHasMore(false);
        return prev;
      }
      const next = [...prev, ...appended];
      setHasMore(shouldLoadMore(page, next.length));
      return next;
    });
  }, [libraryQuery.data, libraryOffset]);

  useEffect(() => {
    if (tab !== 'library') return;
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (!entry?.isIntersecting) return;
      if (!hasMore || libraryQuery.isFetching) return;
      setLibraryOffset((prev) => prev + IMAGE_LIBRARY_PAGE_SIZE);
    }, { rootMargin: '200px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [tab, hasMore, libraryQuery.isFetching]);

  const handleFileSelect = useCallback((file: File) => {
    if (isUploading) return;
    const validationError = validateImageFile(file);
    if (validationError) {
      setUploadError(validationError);
      setPendingImage(null);
      return;
    }
    setUploadError(undefined);
    setUrlError(undefined);
    setUploadingFileName(file.name);
    setIsUploading(true);
    setUploadProgress(0);
    uploadImageAsset({
      file,
      onUploadProgress: (evt) => {
        if (!evt.total) return;
        const percent = Math.round((evt.loaded / evt.total) * 100);
        setUploadProgress(percent);
      },
    })
      .then((res) => {
        setUploadProgress(100);
        const derivedAlt = sanitizeOptional(res.alt) ?? sanitizeOptional(deriveAltFromFilename(file.name));
        const derivedCaption = sanitizeOptional(res.caption);
        setPendingImage({ url: res.url, alt: derivedAlt, caption: derivedCaption });
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Upload failed. Try again.';
        setUploadError(message);
        setPendingImage(null);
      })
      .finally(() => {
        setIsUploading(false);
        setUploadingFileName(undefined);
      });
  }, [isUploading]);

  const handleUrlApply = useCallback(() => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setUrlError('URL is required');
      return;
    }
    setUrlError(undefined);
    setUploadError(undefined);
    setPendingImage({ url: resolveUrl(trimmed), alt: sanitizeOptional(deriveAltFromUrl(trimmed)) });
  }, [urlInput]);

  const handleInsert = useCallback(() => {
    if (!pendingImage || isUploading) return;
    onChange({
      url: pendingImage.url,
      alt: pendingImage.alt ?? '',
      caption: pendingImage.caption ?? '',
      materialId: undefined,
    });
    setPendingImage(null);
    setUrlInput('');
    setUploadError(undefined);
  }, [pendingImage, isUploading, onChange]);

  const handleLibrarySelect = useCallback((asset: ImageAsset) => {
    setUploadError(undefined);
    setUrlError(undefined);
    setPendingImage({
      id: asset.id,
      url: asset.url,
      alt: sanitizeOptional(asset.alt) ?? sanitizeOptional(deriveAltFromFilename(asset.filename ?? undefined)),
      caption: sanitizeOptional(asset.caption),
    });
  }, []);

  const pendingKey = pendingImage ? pendingImage.id ?? pendingImage.url : undefined;
  const insertDisabled = !pendingImage || isUploading;

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2">Image</Typography>
      <Stack spacing={1}>
        {value?.url ? (
          <Box component="img" src={resolveUrl(value.url || '')} alt={value.alt || ''} loading="lazy" sx={{ width: '100%', borderRadius: 1, border: (t) => `1px solid ${t.palette.divider}` }} />
        ) : (
          <Box sx={{ border: (t) => `1px dashed ${t.palette.divider}`, borderRadius: 1, p: 2, textAlign: 'center', color: 'text.secondary' }}>
            <Typography variant="caption">No image inserted</Typography>
          </Box>
        )}
        <TextField size="small" label="Alt text" value={value?.alt ?? ''} onChange={(e) => onChange({ alt: e.target.value })} />
        <TextField size="small" label="Caption" value={value?.caption ?? ''} onChange={(e) => onChange({ caption: e.target.value })} />
      </Stack>
      <Divider />
      <Tabs value={tab} onChange={(_, newValue) => setTab(newValue)} aria-label="Image source tabs" variant="fullWidth">
        <Tab label="Upload" value="upload" />
        <Tab label="My images" value="library" />
      </Tabs>
      {tab === 'upload' && (
        <Stack spacing={1.5}>
          <Box
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragActive(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragActive(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragActive(false);
              const file = event.dataTransfer?.files?.[0];
              if (file) handleFileSelect(file);
            }}
            onClick={() => fileInputRef.current?.click()}
            sx={{
              border: (t) => `1px dashed ${isDragActive ? t.palette.primary.main : t.palette.divider}`,
              backgroundColor: (t) => (isDragActive ? t.palette.action.hover : 'transparent'),
              borderRadius: 1,
              p: 2,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'border-color 0.2s ease, background-color 0.2s ease',
            }}
          >
            <Typography variant="body2">Drag and drop an image</Typography>
            <Typography variant="caption" color="text.secondary">PNG, JPG, WEBP, GIF up to 10&nbsp;MB</Typography>
            <Button
              variant="outlined"
              size="small"
              sx={{ mt: 1 }}
              onClick={(event) => {
                event.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Select file
            </Button>
          </Box>
          <input
            type="file"
            ref={fileInputRef}
            hidden
            accept={ACCEPTED_IMAGE_TYPES}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleFileSelect(file);
              if (event.target) {
                event.target.value = '';
              }
            }}
          />
          {isUploading && (
            <Stack spacing={0.5}>
              <LinearProgress variant={uploadProgress > 0 ? 'determinate' : 'indeterminate'} value={uploadProgress} />
              {uploadingFileName && (
                <Typography variant="caption" color="text.secondary">
                  Uploading {uploadingFileName}
                </Typography>
              )}
            </Stack>
          )}
          {uploadError && <Alert severity="error">{uploadError}</Alert>}
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <TextField
              fullWidth
              size="small"
              label="Image URL"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleUrlApply();
                }
              }}
              error={Boolean(urlError)}
              helperText={urlError ?? ''}
            />
            <Button variant="outlined" size="small" onClick={handleUrlApply} disabled={!urlInput.trim()}>
              Use URL
            </Button>
          </Stack>
        </Stack>
      )}
      {tab === 'library' && (
        <Stack spacing={1.5}>
          {libraryQuery.isError && (
            <Alert severity="error" action={<Button size="small" onClick={() => libraryQuery.refetch()}>Retry</Button>}>
              Failed to load images.
            </Alert>
          )}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 1 }}>
            {libraryItems.map((asset) => {
              const key = asset.id ?? asset.url;
              const selected = pendingKey === key;
              return (
                <Box
                  key={key}
                  onClick={() => handleLibrarySelect(asset)}
                  sx={{
                    border: (t) => `2px solid ${selected ? t.palette.primary.main : t.palette.divider}`,
                    borderRadius: 1,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  <Box component="img" src={asset.url} alt={asset.alt || ''} loading="lazy" sx={{ width: '100%', height: 96, objectFit: 'cover' }} />
                </Box>
              );
            })}
          </Box>
          {libraryItems.length === 0 && !libraryQuery.isFetching && !libraryQuery.isError && (
            <Typography variant="body2" color="text.secondary">No images yet.</Typography>
          )}
          {libraryQuery.isFetching && (
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
              <CircularProgress size={16} />
              <Typography variant="caption" color="text.secondary">Loading…</Typography>
            </Stack>
          )}
          <Box ref={loadMoreRef} sx={{ height: 1 }} />
        </Stack>
      )}
      {pendingImage && (
        <Stack spacing={0.5}>
          <Typography variant="subtitle2">Selected image</Typography>
          <Box component="img" src={pendingImage.url} alt={pendingImage.alt || ''} loading="lazy" sx={{ width: '100%', borderRadius: 1, border: (t) => `1px solid ${t.palette.divider}` }} />
          <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>{pendingImage.url}</Typography>
        </Stack>
      )}
      <Button variant="contained" size="small" onClick={handleInsert} disabled={insertDisabled}>
        Insert
      </Button>
    </Stack>
  );
};

export default InspectorPanel;

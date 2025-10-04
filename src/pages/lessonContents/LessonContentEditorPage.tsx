import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, FormControlLabel, Snackbar, Stack, Switch, TextField, Typography, Tooltip } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getLessonContent, updateLessonContent, publishLessonContent } from '../../services/api';
import { EditorProvider, useEditorStore } from '../../features/lessonContent/editorStore';
import SectionCard from '../../features/lessonContent/components/SectionCard';
import BlocksPalette from '../../features/lessonContent/components/BlocksPalette';
import InspectorPanel from '../../features/lessonContent/components/InspectorPanel';
import StudentRenderer from '../../features/lessonContent/student/StudentRenderer';

const InnerEditor: React.FC<{ id: string }> = ({ id }) => {
  const navigate = useNavigate();
  const { state, actions } = useEditorStore();
  const [showStale, setShowStale] = useState(false);
  const [preview, setPreview] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['lesson-content', id],
    queryFn: () => getLessonContent(id),
  });

  useEffect(() => {
    if (data) {
      actions.initFromServer({
        id: data.id,
        ownerId: data.ownerId,
        title: data.title ?? '',
        status: data.status,
        tags: data.tags ?? [],
        coverImageUrl: data.coverImageUrl,
        layout: data.layout,
        content: data.content,
      });
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: (payload: { title?: string; tags?: string[]; layout: any; content: Record<string, any>; updatedAt?: string }) => updateLessonContent(id, payload),
    onError: (err: any) => {
      if (err?.response?.status === 409) {
        actions.setError('This draft changed elsewhere.');
        setShowStale(true);
      }
    },
    onSettled: () => {
      actions.setSaving(false);
    },
    onSuccess: () => {
      actions.markDirty(false);
      actions.setSavedAt(new Date().toISOString());
    }
  });

  const publishMutation = useMutation({
    mutationFn: () => publishLessonContent(id),
    onError: () => {
      actions.setError?.('Failed to publish. Please try again.');
    },
    onSuccess: () => {
      navigate(`/lesson-contents/${id}/view`);
    },
  });

  // Debounced autosave (waits until layout is valid)
  useEffect(() => {
    if (!state.id || state.status !== 'DRAFT') return;
    if (!state.isDirty) return;
    if (!state.isLayoutValid) return; // do not autosave invalid layout
    actions.setSaving(true);
    const t = setTimeout(() => {
      mutation.mutate({
        title: state.title,
        tags: state.tags,
        layout: state.layout,
        content: state.content,
      });
    }, 1500);
    return () => clearTimeout(t);
  }, [state.title, state.tags, state.layout, state.content, state.isDirty, state.status, state.id, state.isLayoutValid]);

  const savedBanner = useMemo(() => {
    if (state.isSaving) return 'Saving…';
    if (state.lastSavedAt) return `Saved • ${new Date(state.lastSavedAt).toLocaleTimeString()}`;
    return '';
  }, [state.isSaving, state.lastSavedAt]);

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5">Lesson Content Editor</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <FormControlLabel control={<Switch checked={!state.overlaysVisible} onChange={(e) => actions.setOverlaysVisible(!e.target.checked)} />} label="Clean Mode" />
          <FormControlLabel control={<Switch checked={preview} onChange={(e) => setPreview(e.target.checked)} />} label="Preview" />
          {(() => {
            const issues = Object.entries(state.invalidById || {}).filter(([, msg]) => Boolean(msg)).slice(0, 5).map(([id, msg]) => `• ${msg as string} (block ${id})`);
            const disabled = !state.isLayoutValid || Boolean(state.inspectorInvalid) || (state.invalidCount ?? 0) > 0;
            const tip = !state.isLayoutValid ? 'Fix layout: columns exceed 12 in some rows.' : (state.invalidCount ?? 0) > 0 ? `Fix invalid blocks (${state.invalidCount}).\n${issues.join('\n')}` : (state.inspectorInvalid ? 'Fix inspector errors.' : '');
            return (
              <Tooltip title={disabled ? tip : 'publish content when you finished with this page'} disableHoverListener={!disabled}>
                <span>
                  <Button
                    variant="contained"
                    disabled={disabled || publishMutation.isPending}
                    onClick={() => publishMutation.mutate()}
                  >
                    {publishMutation.isPending ? 'Publishing…' : 'Publish'}
                  </Button>
                </span>
              </Tooltip>
            );
          })()}
          <Button variant="text" onClick={() => navigate('/lesson-contents')}>Back to Library</Button>
        </Stack>
      </Stack>

      {savedBanner && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>{savedBanner}</Typography>
      )}

      {isLoading && <Typography color="text.secondary">Loading…</Typography>}
      {isError && <Typography color="error">Failed to load lesson content.</Typography>}

      {data && (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
          <BlocksPalette />
          {preview ? (
            <Box flex={1} minWidth={0}>
              <Typography variant="overline" color="text.secondary">Preview</Typography>
              <StudentRenderer layout={state.layout} content={state.content} />
            </Box>
          ) : (
            <Stack spacing={2} flex={1} minWidth={0}>
              <TextField
                label="Title"
                value={state.title}
                onChange={(e) => actions.setTitle(e.target.value)}
                size="small"
                sx={{ maxWidth: 520 }}
              />
              {!state.isLayoutValid && (
                <Alert severity="error">Fix layout errors before saving. Column spans must not exceed 12 per row.</Alert>
              )}
              <Button variant="outlined" onClick={() => actions.addSection()}>+ Section</Button>
              <Typography variant="body2" color="text.secondary">
                Sections: {state.layout.sections.length}
              </Typography>

              <Box>
                {(state.layout.sections || []).map((sec, idx) => (
                  <SectionCard key={sec.id} section={sec as any} index={idx} total={state.layout.sections.length} rowErrors={state.rowErrors} />
                ))}
              </Box>
            </Stack>
          )}
          <InspectorPanel />
        </Stack>
      )}

      <Snackbar open={showStale} onClose={() => setShowStale(false)} autoHideDuration={6000}>
        <Alert severity="warning" onClose={() => setShowStale(false)} sx={{ width: '100%' }}
          action={<Button color="inherit" size="small" onClick={() => window.location.reload()}>Reload</Button>}>
          This draft changed elsewhere.
        </Alert>
      </Snackbar>
    </Box>
  );
};

const LessonContentEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return (
    <Box p={3} sx={{ minHeight: 0, pb: 6, bgcolor: '#fafbfd',}}>
            <EditorProvider>
                <InnerEditor id={id} />
          </EditorProvider>
    </Box>
  );
};

export default LessonContentEditorPage;

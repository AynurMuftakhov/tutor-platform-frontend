import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import type {
  PageModel,
  BlockContentPayload,
  TextBlockPayload,
  ImageBlockPayload,
  AudioBlockPayload,
  VideoBlockPayload,
  GrammarMaterialBlockPayload,
  Section,
  Row,
  Column,
} from '../../../types/lessonContent';
import { useQuery } from '@tanstack/react-query';
import { fetchGrammarItems, GrammarItemDto } from '../../../services/api';

function sanitizeHtml(input: string): string {
  // Minimal sanitizer: strip scripts. For production, integrate DOMPurify.
  return (input || '').replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
}

// Block renderers
const TextBlockView: React.FC<{ payload: TextBlockPayload }> = ({ payload }) => {
  const safe = sanitizeHtml(payload.html || '');
  return (
    <Box sx={{ '& p': { m: 0, mb: 1.25 }, '& ul, & ol': { pl: 3 } }} dangerouslySetInnerHTML={{ __html: safe }} />
  );
};

const ImageBlockView: React.FC<{ payload: ImageBlockPayload }> = ({ payload }) => {
  const { url, alt, caption, materialId } = payload;
  if (!url) {
    return (
      <Box sx={{ border: (t) => `1px dashed ${t.palette.divider}`, p: 2, borderRadius: 1, color: 'text.secondary' }}>
        <Typography variant="caption">{materialId ? 'Image material selected — preview requires URL support.' : 'No image selected'}</Typography>
      </Box>
    );
  }
  return (
    <Stack spacing={0.5}>
      <Box component="img" src={url} alt={alt || ''} sx={{ width: '100%', height: 'auto', borderRadius: 1 }} />
      {caption && (
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>{caption}</Typography>
      )}
    </Stack>
  );
};

const AudioBlockView: React.FC<{ payload: AudioBlockPayload }> = ({ payload }) => {
  // We only have materialId; no URL resolution yet.
  return (
    <Box sx={{ border: (t) => `1px dashed ${t.palette.divider}`, p: 2, borderRadius: 1, color: 'text.secondary' }}>
      <Typography variant="caption">Audio preview unavailable — select a material and preview in class.</Typography>
    </Box>
  );
};

const VideoBlockView: React.FC<{ payload: VideoBlockPayload }> = ({ payload }) => {
  return (
    <Box sx={{ border: (t) => `1px dashed ${t.palette.divider}`, p: 2, borderRadius: 1, color: 'text.secondary' }}>
      <Typography variant="caption">Video preview unavailable — select a material and preview in class.</Typography>
    </Box>
  );
};

const GrammarView: React.FC<{ payload: GrammarMaterialBlockPayload }> = ({ payload }) => {
  const hasMaterial = Boolean(payload.materialId);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['grammar-items', payload.materialId],
    queryFn: () => fetchGrammarItems(payload.materialId),
    enabled: hasMaterial,
    staleTime: 10_000,
  });

  if (!hasMaterial) {
    return <Typography variant="caption" color="text.secondary">No grammar material selected.</Typography>;
  }
  if (isLoading) return <Typography variant="caption" color="text.secondary">Loading grammar…</Typography>;
  if (isError) return <Typography variant="caption" color="error">Failed to load grammar tasks.</Typography>;

  const items: GrammarItemDto[] = Array.isArray(data) ? data : [];
  let shown = items;
  if (Array.isArray(payload.itemIds) && payload.itemIds.length > 0) {
    shown = items.filter(it => payload.itemIds!.includes(it.id));
  }

  return (
    <Stack spacing={1}>
      {shown.map((it, idx) => (
        <Box key={it.id} sx={{ p: 1.25, border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">Task {idx + 1}</Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{it.text}</Typography>
        </Box>
      ))}
      {shown.length === 0 && (
        <Typography variant="caption" color="text.secondary">No tasks to show.</Typography>
      )}
    </Stack>
  );
};

const BlockView: React.FC<{ refId: string; type: string; content: Record<string, BlockContentPayload> }> = ({ refId, type, content }) => {
  const payload = content[refId];
  if (!payload) return null;
  switch (type) {
    case 'text':
      return <TextBlockView payload={payload as TextBlockPayload} />;
    case 'image':
      return <ImageBlockView payload={payload as ImageBlockPayload} />;
    case 'audio':
      return <AudioBlockView payload={payload as AudioBlockPayload} />;
    case 'video':
      return <VideoBlockView payload={payload as VideoBlockPayload} />;
    case 'grammarMaterial':
      return <GrammarView payload={payload as GrammarMaterialBlockPayload} />;
    default:
      return <Typography variant="caption" color="text.secondary">Unsupported block: {type}</Typography>;
  }
};

const ColumnView: React.FC<{ column: Column; content: Record<string, BlockContentPayload> }> = ({ column, content }) => {
  return (
    <Stack spacing={1.25} aria-label={column.ariaLabel}>
      {(column.blocks || []).map((b) => (
        <BlockView key={b.id} refId={b.id} type={b.type} content={content} />
      ))}
    </Stack>
  );
};

const RowView: React.FC<{ row: Row; content: Record<string, BlockContentPayload> }> = ({ row, content }) => {
  return (
    <Box role="group" aria-label={row.ariaLabel}
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
        gap: 2,
      }}
    >
      {(row.columns || []).map((col) => (
        <Box key={col.id} sx={{ gridColumn: `span ${Math.max(1, Math.min(12, col.span || 1))}` }}>
          <ColumnView column={col} content={content} />
        </Box>
      ))}
    </Box>
  );
};

const SectionView: React.FC<{ section: Section; content: Record<string, BlockContentPayload> }> = ({ section, content }) => {
  return (
    <Stack spacing={1.5} aria-label={section.ariaLabel}>
      {section.title && (
        <Typography variant="h6" sx={{ mt: 1 }}>{section.title}</Typography>
      )}
      {(section.rows || []).map((row) => (
        <RowView key={row.id} row={row} content={content} />
      ))}
    </Stack>
  );
};

const StudentRenderer: React.FC<{ layout: PageModel; content: Record<string, BlockContentPayload> }> = ({ layout, content }) => {
  const sections = layout?.sections || [];
  return (
    <Stack spacing={3}>
      {sections.map((sec) => (
        <SectionView key={sec.id} section={sec} content={content} />
      ))}
    </Stack>
  );
};

export default StudentRenderer;

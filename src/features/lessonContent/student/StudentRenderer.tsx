import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import SmartDisplayIcon from '@mui/icons-material/SmartDisplay';
import ReactPlayer from 'react-player';
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
import { getMaterial } from '../../../services/api';
import type { Material } from '../../../types/material';
import GrammarPlayer from '../../../components/grammar/GrammarPlayer';

function sanitizeHtml(input: string): string {
  if (!input) return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(input, 'text/html');
  doc.querySelectorAll('script,style').forEach((el) => el.remove());
  doc.querySelectorAll('*').forEach((el) => {
    [...el.attributes].forEach((attr) => {
      if (/^on/i.test(attr.name)) {
        el.removeAttribute(attr.name);
      }
    });
  });
  return doc.body.innerHTML;
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
      <Stack spacing={1} alignItems="center" sx={{ border: (t) => `1px dashed ${t.palette.divider}`, p: 2, borderRadius: 1, color: 'text.secondary', textAlign: 'center' }}>
        <ImageIcon fontSize="small" color="disabled" />
        <Typography variant="caption">
          {materialId ? 'Image material selected — preview requires URL support.' : 'No image selected'}
        </Typography>
      </Stack>
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
  const hasMaterial = Boolean(payload.materialId);
  const { data, isLoading, isError } = useQuery<Material>({
    queryKey: ['material', payload.materialId],
    queryFn: () => getMaterial(payload.materialId),
    enabled: hasMaterial,
  });

  if (!hasMaterial) {
    return (
      <Stack spacing={1} alignItems="center" sx={{ border: (t) => `1px dashed ${t.palette.divider}`, p: 2, borderRadius: 1, color: 'text.secondary', textAlign: 'center' }}>
        <AudiotrackIcon fontSize="small" color="disabled" />
        <Typography variant="caption">No audio material selected.</Typography>
      </Stack>
    );
  }
  if (isLoading) return <Typography variant="caption" color="text.secondary">Loading audio…</Typography>;
  if (isError || !data?.sourceUrl) return <Typography variant="caption" color="error">Failed to load audio.</Typography>;

  return <ReactPlayer url={data.sourceUrl} controls width="100%" height="80px" playing={payload.autoplay} />;
};

const VideoBlockView: React.FC<{ payload: VideoBlockPayload }> = ({ payload }) => {
  const hasMaterial = Boolean(payload.materialId);
  const { data, isLoading, isError } = useQuery<Material>({
    queryKey: ['material', payload.materialId],
    queryFn: () => getMaterial(payload.materialId),
    enabled: hasMaterial,
  });

  if (!hasMaterial) {
    return (
      <Stack spacing={1} alignItems="center" sx={{ border: (t) => `1px dashed ${t.palette.divider}`, p: 2, borderRadius: 1, color: 'text.secondary', textAlign: 'center' }}>
        <SmartDisplayIcon fontSize="small" color="disabled" />
        <Typography variant="caption">No video material selected.</Typography>
      </Stack>
    );
  }
  if (isLoading) return <Typography variant="caption" color="text.secondary">Loading video…</Typography>;
  if (isError || !data?.sourceUrl) return <Typography variant="caption" color="error">Failed to load video.</Typography>;

  return (
    <Box sx={{ position: 'relative', pt: '56.25%' }}>
      <ReactPlayer
        url={data.sourceUrl}
        controls
        width="100%"
        height="100%"
        style={{ position: 'absolute', top: 0, left: 0 }}
      />
    </Box>
  );
};

const GrammarView: React.FC<{ payload: GrammarMaterialBlockPayload }> = ({ payload }) => {
  if (!payload.materialId) {
    return <Typography variant="caption" color="text.secondary">No grammar material selected.</Typography>;
  }
  return (
    <Box sx={{ mt: 1 }}>
      <GrammarPlayer materialId={payload.materialId} itemIds={payload.itemIds} />
    </Box>
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

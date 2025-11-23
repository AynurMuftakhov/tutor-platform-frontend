import React from 'react';
import { Box, Chip, Stack, Typography, Dialog, DialogContent, IconButton, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import SmartDisplayIcon from '@mui/icons-material/SmartDisplay';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ReactPlayer from 'react-player';
import type { OnProgressProps } from 'react-player/base';
import type { DailyCall, DailyEventObjectAppMessage } from '@daily-co/daily-js';
import type { SyncedContentState } from '../../../hooks/useSyncedContent';

type ContentSyncController = {
  state: SyncedContentState;
  syncScroll?: (ratio: number) => void;
};

type ContentSyncContext = {
  call: DailyCall | null;
  isTutor: boolean;
  contentId: string;
  controller?: ContentSyncController;
};
import type {
  PageModel,
  BlockContentPayload,
  TextBlockPayload,
  ImageBlockPayload,
  AudioBlockPayload,
  VideoBlockPayload,
  GrammarMaterialBlockPayload,
  ListeningTaskBlockPayload,
  Section,
  Row,
  Column,
} from '../../../types/lessonContent';
import { useQuery } from '@tanstack/react-query';
import { fetchListeningTasks, getMaterial, getListeningTranscript } from '../../../services/api';
import type { Material } from '../../../types/material';
import type { ListeningTask } from '../../../types';
import GrammarPlayer from '../../../components/grammar/GrammarPlayer';
import { resolveUrl } from '../../../services/assets';
import { useAuth } from '../../../context/AuthContext';

function useThrottled<T extends (...args: any[]) => void>(fn: T, ms: number): T {
    const lastArgs = React.useRef<any[] | null>(null);
    const timer = React.useRef<number | null>(null);
    return React.useCallback(((...args: any[]) => {
        lastArgs.current = args;
        if (timer.current != null) return;
        timer.current = window.setTimeout(() => {
            if (lastArgs.current) fn(...(lastArgs.current as any[]));
            lastArgs.current = null;
            timer.current = null;
        }, ms) as unknown as number;
    }) as T, [fn, ms]);
}

export function sanitizeHtml(input: string): string {
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
    <Box
      sx={{
        color: '#000',
        '& *': { color: '#000' },
        '& p': { m: 0, mb: 1.25 },
        '& ul, & ol': { pl: 3 },
      }}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
};

const ImageBlockView: React.FC<{ payload: ImageBlockPayload; contentSync?: ContentSyncContext }> = ({ payload, contentSync }) => {
  const { url, alt, caption } = payload;
  const [open, setOpen] = React.useState(false);
  const call = contentSync?.call ?? null;
  const isTutor = contentSync?.isTutor ?? false;

  const sendImageState = React.useCallback((action: 'open' | 'close') => {
    if (!isTutor || !call || !contentSync?.contentId || !payload.id) return;
    try {
      call.sendAppMessage({ t: 'CONTENT_IMAGE', action, contentId: contentSync.contentId, blockId: payload.id }, 'all');
    } catch (err) {
      console.warn('Failed to sync image state via Daily', err);
    }
  }, [isTutor, call, contentSync?.contentId, payload.id]);

  const handleOpen = React.useCallback(() => {
    if (!url) return;
    setOpen(true);
    sendImageState('open');
  }, [url, sendImageState]);

  const handleClose = React.useCallback(() => {
    setOpen(false);
    sendImageState('close');
  }, [sendImageState]);

  useEffect(() => {
    if (!call || isTutor || !payload.id || !contentSync?.contentId) return;
    let localId: string | undefined;
    try {
      localId = call.participants().local?.session_id;
    } catch {
      localId = undefined;
    }
    const handler = (event: DailyEventObjectAppMessage) => {
      if (event.fromId && event.fromId === localId) return;
      const payloadData = event.data;
      let msg: any = null;
      if (typeof payloadData === 'string') {
        try {
          msg = JSON.parse(payloadData);
        } catch {
          msg = null;
        }
      } else {
        msg = payloadData;
      }
      if (!msg || msg?.t !== 'CONTENT_IMAGE') return;
      if (msg?.contentId !== contentSync.contentId || msg?.blockId !== payload.id) return;
      if (msg?.action === 'open') {
        setOpen(true);
      } else if (msg?.action === 'close') {
        setOpen(false);
      }
    };
    call.on('app-message', handler);
    return () => {
      call.off('app-message', handler);
    };
  }, [call, isTutor, payload.id, contentSync?.contentId]);

  if (!url) {
    return (
      <Stack spacing={1} alignItems="center" sx={{ border: (t) => `1px dashed ${t.palette.divider}`, p: 2, borderRadius: 1, color: 'text.secondary', textAlign: 'center' }}>
        <ImageIcon fontSize="small" color="disabled" />
        <Typography variant="caption">No image selected</Typography>
      </Stack>
    );
  }
  return (
    <>
      <Stack spacing={0.5}>
        <Box
          component="img"
          src={resolveUrl(url || '')}
          alt={alt || ''}
          loading="lazy"
          onClick={handleOpen}
          sx={{ width: '100%', height: 'auto', borderRadius: 1, cursor: 'zoom-in' }}
        />
        {caption && (
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>{caption}</Typography>
        )}
      </Stack>
      {/* Lightbox dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="lg">
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ position: 'relative' }}>
            <Box component="img" src={resolveUrl(url || '')} alt={alt || ''} loading="lazy" sx={{ maxWidth: '90vw', maxHeight: '85vh', display: 'block' }} />
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};

import { useEffect, useRef } from 'react';
import { useSyncedMediaBlock } from '../../../hooks/useSyncedMediaBlock';

const AudioBlockView: React.FC<{ payload: AudioBlockPayload; contentSync?: ContentSyncContext }> = ({ payload, contentSync }) => {
  const hasMaterial = Boolean(payload.materialId);
  const { data, isLoading, isError } = useQuery<Material>({
    queryKey: ['material', payload.materialId],
    queryFn: () => getMaterial(payload.materialId),
    enabled: hasMaterial,
  });

  // Hooks must be declared unconditionally (top-level)
  const playerRef = useRef<ReactPlayer>(null);
  const suppressSeekRef = useRef(false);
  const skipProgressSeekRef = useRef(false);
  const lastProgressRef = useRef<number | null>(null);
  const sync = useSyncedMediaBlock({
    call: contentSync?.call,
    isTutor: contentSync?.isTutor ?? false,
    contentId: contentSync?.contentId ?? '',
    blockId: payload.id,
    materialId: payload.materialId ?? '',
  });

  useEffect(() => {
    // Guard inside the effect instead of skipping the hook call
    if (!contentSync || !payload.id) return;
    const handler = (evt: any) => {
      const { contentId, blockId, t } = evt.detail || {};
      if (contentId === contentSync.contentId && blockId === payload.id) {
        const end = Number.isFinite(payload.endSec ?? Infinity) ? (payload.endSec as number) : Infinity;
        const start = payload.startSec ?? 0;
        const clamped = Math.max(start, Math.min(end, Math.max(0, Number(t))));
        suppressSeekRef.current = true;
        skipProgressSeekRef.current = true;
        lastProgressRef.current = clamped;
        playerRef.current?.seekTo(clamped, 'seconds');
      }
    };
    window.addEventListener('MEDIA_BLOCK_SEEK', handler as any);
    return () => window.removeEventListener('MEDIA_BLOCK_SEEK', handler as any);
  }, [contentSync?.contentId, payload.id, payload.startSec, payload.endSec]);

  const clampSeconds = React.useCallback((sec: number) => {
    const end = Number.isFinite(payload.endSec ?? Infinity) ? (payload.endSec as number) : Infinity;
    const start = payload.startSec ?? 0;
    return Math.max(start, Math.min(end, Math.max(0, Number(sec))));
  }, [payload.startSec, payload.endSec]);

  const playing = contentSync ? sync.playing : !!payload.autoplay;
  const onPlay = contentSync ? sync.onPlay : undefined;
  const onPause = contentSync ? sync.onPause : undefined;

  const handleSeek = React.useCallback((sec: number) => {
    if (!contentSync) return;
    const clamped = clampSeconds(sec);
    if (suppressSeekRef.current) {
      suppressSeekRef.current = false;
      lastProgressRef.current = clamped;
      return;
    }
    lastProgressRef.current = clamped;
    sync.onSeek(clamped);
    skipProgressSeekRef.current = true;
  }, [clampSeconds, contentSync, sync]);

  const handleProgress = React.useCallback((state: OnProgressProps) => {
    if (!contentSync?.isTutor) return;
    const clamped = clampSeconds(state.playedSeconds);
    if (skipProgressSeekRef.current) {
      skipProgressSeekRef.current = false;
      lastProgressRef.current = clamped;
      return;
    }
    if (suppressSeekRef.current) {
      suppressSeekRef.current = false;
      lastProgressRef.current = clamped;
      return;
    }
    const prev = lastProgressRef.current;
    lastProgressRef.current = clamped;
    if (prev === null) return;
    const delta = clamped - prev;
    const threshold = sync.playing ? 1.2 : 0.4;
    if (Math.abs(delta) > threshold) {
      sync.onSeek(clamped);
      skipProgressSeekRef.current = true;
    }
  }, [clampSeconds, contentSync?.isTutor, sync]);

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

  return (
    <ReactPlayer
      ref={playerRef}
      url={data.sourceUrl}
      controls
      width="100%"
      height="80px"
      playing={playing}
      onPlay={onPlay}
      onPause={onPause}
      onSeek={contentSync ? handleSeek : undefined}
      onProgress={contentSync ? handleProgress : undefined}
    />
  );
};

const VideoBlockView: React.FC<{ payload: VideoBlockPayload; contentSync?: ContentSyncContext }> = ({ payload, contentSync }) => {
  const hasMaterial = Boolean(payload.materialId);
  const { data, isLoading, isError } = useQuery<Material>({
    queryKey: ['material', payload.materialId],
    queryFn: () => getMaterial(payload.materialId),
    enabled: hasMaterial,
  });

  // Hooks must be declared unconditionally (top-level)
  const playerRef = useRef<ReactPlayer>(null);
  const suppressSeekRef = useRef(false);
  const skipProgressSeekRef = useRef(false);
  const lastProgressRef = useRef<number | null>(null);
  const sync = useSyncedMediaBlock({
    call: contentSync?.call,
    isTutor: contentSync?.isTutor ?? false,
    contentId: contentSync?.contentId ?? '',
    blockId: payload.id,
    materialId: payload.materialId ?? '',
  });

  useEffect(() => {
    if (!contentSync || !payload.id) return;
    const handler = (evt: any) => {
      const { contentId, blockId, t } = evt.detail || {};
      if (contentId === contentSync.contentId && blockId === payload.id) {
        const end = Number.isFinite(payload.endSec ?? Infinity) ? (payload.endSec as number) : Infinity;
        const start = payload.startSec ?? 0;
        const clamped = Math.max(start, Math.min(end, Math.max(0, Number(t))));
        suppressSeekRef.current = true;
        skipProgressSeekRef.current = true;
        lastProgressRef.current = clamped;
        playerRef.current?.seekTo(clamped, 'seconds');
      }
    };
    window.addEventListener('MEDIA_BLOCK_SEEK', handler as any);
    return () => window.removeEventListener('MEDIA_BLOCK_SEEK', handler as any);
  }, [contentSync?.contentId, payload.id, payload.startSec, payload.endSec]);

  const clampSeconds = React.useCallback((sec: number) => {
    const end = Number.isFinite(payload.endSec ?? Infinity) ? (payload.endSec as number) : Infinity;
    const start = payload.startSec ?? 0;
    return Math.max(start, Math.min(end, Math.max(0, Number(sec))));
  }, [payload.startSec, payload.endSec]);

  const playing = contentSync ? sync.playing : false;
  const onPlay = contentSync ? sync.onPlay : undefined;
  const onPause = contentSync ? sync.onPause : undefined;

  const handleSeek = React.useCallback((sec: number) => {
    if (!contentSync) return;
    const clamped = clampSeconds(sec);
    if (suppressSeekRef.current) {
      suppressSeekRef.current = false;
      lastProgressRef.current = clamped;
      return;
    }
    lastProgressRef.current = clamped;
    sync.onSeek(clamped);
    skipProgressSeekRef.current = true;
  }, [clampSeconds, contentSync, sync]);

  const handleProgress = React.useCallback((state: OnProgressProps) => {
    if (!contentSync?.isTutor) return;
    const clamped = clampSeconds(state.playedSeconds);
    if (skipProgressSeekRef.current) {
      skipProgressSeekRef.current = false;
      lastProgressRef.current = clamped;
      return;
    }
    if (suppressSeekRef.current) {
      suppressSeekRef.current = false;
      lastProgressRef.current = clamped;
      return;
    }
    const prev = lastProgressRef.current;
    lastProgressRef.current = clamped;
    if (prev === null) return;
    const delta = clamped - prev;
    const threshold = sync.playing ? 1.2 : 0.4;
    if (Math.abs(delta) > threshold) {
      sync.onSeek(clamped);
      skipProgressSeekRef.current = true;
    }
  }, [clampSeconds, contentSync?.isTutor, sync]);

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
        ref={playerRef}
        url={data.sourceUrl}
        controls
        width="100%"
        height="100%"
        style={{ position: 'absolute', top: 0, left: 0 }}
        playing={playing}
        onPlay={onPlay}
        onPause={onPause}
        onSeek={contentSync ? handleSeek : undefined}
        onProgress={contentSync ? handleProgress : undefined}
      />
    </Box>
  );
};

import { useSyncedGrammarBlock } from '../../../hooks/useSyncedGrammarBlock';

const normalizeListeningWord = (word: string) => word.replace(/[^\p{L}\p{N}'-]+/gu, '').toLowerCase();

const ListeningTaskBlockView: React.FC<{ payload: ListeningTaskBlockPayload; contentSync?: ContentSyncContext }> = ({ payload, contentSync }) => {
  const hasMaterial = Boolean(payload.materialId);
  const { data: material, isLoading: materialLoading } = useQuery<Material>({
    queryKey: ['material', payload.materialId],
    queryFn: () => getMaterial(payload.materialId),
    enabled: hasMaterial,
  });
  const { data: tasks = [], isLoading, isError } = useQuery<ListeningTask[]>({
    queryKey: ['listening-block', payload.materialId],
    queryFn: () => fetchListeningTasks(payload.materialId),
    enabled: hasMaterial,
  });

  const { user } = useAuth();
  const taskCandidate = tasks.find((item) => item.id === payload.taskId);
  const { data: transcriptData } = useQuery({
    queryKey: ['listening-transcript', taskCandidate?.transcriptId],
    queryFn: () => getListeningTranscript(user!.id, taskCandidate!.transcriptId!),
    enabled: hasMaterial && !!taskCandidate?.transcriptId && !!user?.id,
  });

  const audioRef = useRef<HTMLAudioElement>(null);
  const suppressSeek = useRef(false);
  const mediaSync = useSyncedMediaBlock({
    call: contentSync?.call,
    isTutor: contentSync?.isTutor ?? false,
    contentId: contentSync?.contentId ?? '',
    blockId: payload.id ?? '',
    materialId: payload.materialId ?? '',
  });

  useEffect(() => {
    if (!contentSync || !payload.id) return;
    const handler = (evt: any) => {
      const { contentId, blockId, t } = evt.detail || {};
      if (!audioRef.current) return;
      if (contentId === contentSync.contentId && blockId === payload.id) {
        suppressSeek.current = true;
        const duration = audioRef.current.duration || Infinity;
        audioRef.current.currentTime = Math.max(0, Math.min(duration, t ?? 0));
      }
    };
    window.addEventListener('MEDIA_BLOCK_SEEK', handler as any);
    return () => window.removeEventListener('MEDIA_BLOCK_SEEK', handler as any);
  }, [contentSync?.contentId, payload.id]);

  useEffect(() => {
    if (!contentSync || contentSync.isTutor) return;
    if (!audioRef.current) return;
    if (mediaSync.playing) {
      audioRef.current.play().catch(() => undefined);
    } else {
      audioRef.current.pause();
    }
  }, [contentSync?.isTutor, mediaSync.playing]);

  if (!payload.materialId) {
    return <Typography variant="caption" color="text.secondary">Select a material to bind this block.</Typography>;
  }
  if (materialLoading || isLoading) {
    return <Typography variant="caption" color="text.secondary">Loading listening task…</Typography>;
  }
  if (isError) {
    return <Typography variant="caption" color="error">Failed to load listening task.</Typography>;
  }

  const task = taskCandidate;
  if (!task) {
    return <Typography variant="caption" color="text.secondary">Pick a task to show in this block.</Typography>;
  }

  const audioSrc = task.audioUrl || material?.sourceUrl || '';
  const targetSet = new Set((task.targetWords || []).map(normalizeListeningWord));
  const transcriptText = transcriptData?.transcript || '';
  const transcriptTokens = transcriptText.split(/(\s+)/);
  const showFocusWords = payload.showFocusWords !== false;

  return (
    <Stack spacing={1.5} sx={{ border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 2, p: 2 }}>
      {audioSrc ? (
        <audio
          ref={audioRef}
          controls
          src={resolveUrl(audioSrc)}
          style={{ width: '100%' }}
          onPlay={() => mediaSync?.onPlay()}
          onPause={() => mediaSync?.onPause()}
          onSeeked={() => {
            if (!mediaSync || !audioRef.current) return;
            if (suppressSeek.current) {
              suppressSeek.current = false;
              return;
            }
            mediaSync.onSeek(audioRef.current.currentTime);
          }}
        />
      ) : (
        <Typography variant="body2" color="text.secondary">Audio not available.</Typography>
      )}
          {payload.showTranscript && (
        <Accordion sx={{ mt: 0.5 }} defaultExpanded={false}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Transcript</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {transcriptText ? (
              <Typography component="div" sx={{ lineHeight: 1.8 }}>
                {transcriptTokens.map((token, idx) => {
                  const normalized = normalizeListeningWord(token);
                  if (!normalized) {
                    return <Box component="span" key={idx}>{token}</Box>;
                  }
                  const isFocus = targetSet.has(normalized);
                  return (
                    <Box
                      component="span"
                      key={`${normalized}-${idx}`}
                      sx={{ fontWeight: isFocus ? 600 : 400, color: isFocus ? 'primary.main' : 'inherit' }}
                    >
                      {token}
                    </Box>
                  );
                })}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">Transcript coming soon.</Typography>
            )}
          </AccordionDetails>
        </Accordion>
      )}
      {showFocusWords && task.targetWords && task.targetWords.length > 0 && (
        <Stack spacing={0.5}>
          <Typography variant="subtitle2">Focus words</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {task.targetWords.map((word) => (
              <Chip key={word} size="small" label={word} />
            ))}
          </Stack>
        </Stack>
      )}
    </Stack>
  );
};

const GrammarView: React.FC<{ payload: GrammarMaterialBlockPayload; contentSync?: ContentSyncContext }> = ({ payload, contentSync }) => {
  if (!payload.materialId) {
    return <Typography variant="caption" color="text.secondary">No grammar material selected.</Typography>;
  }
  // Wire live sync if contentSync is provided (in live lesson)
  const sync = useSyncedGrammarBlock({
    call: contentSync?.call,
    isTutor: contentSync?.isTutor ?? false,
    contentId: contentSync?.contentId ?? '',
    blockId: payload.id,
    materialId: payload.materialId,
  });

    const emitAttemptThrottled = useThrottled(
        (itemId: string, gapIndex: number, value: string) => {
            // Only students publish
            if (!contentSync?.isTutor) {
                sync.emitAttempt(itemId, gapIndex, value);
            }
        },
        50 // ~20 msgs/sec max; feels realtime
    );

    return (
    <Box sx={{ mt: 1 }}>
      <GrammarPlayer
        materialId={payload.materialId}
        itemIds={payload.itemIds}
        onAttempt={(itemId, gapIndex, value) => {
            emitAttemptThrottled(itemId, gapIndex, value);
        }}
        onScore={(score) => {
            // Either party can publish score so the other mirrors
            sync.emitScore({
              materialId: score.materialId,
              totalItems: score.totalItems,
              correctItems: score.correctItems,
              totalGaps: score.totalGaps,
              correctGaps: score.correctGaps,
              details: score.details.map(d => ({
                grammarItemId: d.grammarItemId,
                gapResults: d.gapResults.map(gr => ({ index: gr.index, student: gr.student, correct: gr.correct, isCorrect: gr.isCorrect })),
                itemCorrect: d.itemCorrect,
              })),
            });
        }}
      />
    </Box>
  );
};

const BlockView: React.FC<{ refId: string; type: string; content: Record<string, BlockContentPayload>; contentSync?: ContentSyncContext }> = ({ refId, type, content, contentSync }) => {
  const payload = content[refId];
  if (!payload) return null;
  let inner: React.ReactNode;
  switch (type) {
    case 'text':
      inner = <TextBlockView payload={payload as TextBlockPayload} />; break;
    case 'image':
      inner = <ImageBlockView payload={payload as ImageBlockPayload} contentSync={contentSync} />; break;
    case 'audio':
      inner = <AudioBlockView payload={payload as AudioBlockPayload} contentSync={contentSync} />; break;
    case 'video':
      inner = <VideoBlockView payload={payload as VideoBlockPayload} contentSync={contentSync} />; break;
    case 'grammarMaterial':
      inner = <GrammarView payload={payload as GrammarMaterialBlockPayload} contentSync={contentSync as any} />; break;
    case 'listeningTask':
      inner = <ListeningTaskBlockView payload={payload as ListeningTaskBlockPayload} contentSync={contentSync} />; break;
    default:
      inner = <Typography variant="caption" color="text.secondary">Unsupported block: {type}</Typography>;
  }
  return <Box data-block-id={refId}>{inner}</Box>;
};

const ColumnView: React.FC<{ column: Column; content: Record<string, BlockContentPayload>; contentSync?: ContentSyncContext }> = ({ column, content, contentSync }) => {
  return (
    <Stack spacing={1.25} aria-label={column.ariaLabel}>
      {(column.blocks || []).map((b) => (
        <BlockView key={b.id} refId={b.id} type={b.type} content={content} contentSync={contentSync} />
      ))}
    </Stack>
  );
};

const RowView: React.FC<{ row: Row; content: Record<string, BlockContentPayload>; contentSync?: ContentSyncContext }> = ({ row, content, contentSync }) => {
  return (
    <Box role="group" aria-label={row.ariaLabel} data-row-id={row.id}
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
        gap: 2,
      }}
    >
      {(row.columns || []).map((col) => (
        <Box key={col.id} sx={{ gridColumn: `span ${Math.max(1, Math.min(12, col.span || 1))}` }}>
          <ColumnView column={col} content={content} contentSync={contentSync} />
        </Box>
      ))}
    </Box>
  );
};

const SectionView: React.FC<{ section: Section; content: Record<string, BlockContentPayload>; contentSync?: ContentSyncContext }> = ({ section, content, contentSync }) => {
  return (
    <Stack spacing={1.5} aria-label={section.ariaLabel} data-section-id={section.id}>
      {section.title && (
        <Typography variant="h6" sx={{ mt: 1 }}>{section.title}</Typography>
      )}
      {(section.rows || []).map((row) => (
        <RowView key={row.id} row={row} content={content} contentSync={contentSync} />
      ))}
    </Stack>
  );
};
const StudentRenderer: React.FC<{ layout: PageModel; content: Record<string, BlockContentPayload>; contentSync?: ContentSyncContext; }> = ({ layout, content, contentSync }) => {
  const sections = layout?.sections || [];
  return (
    <Stack spacing={3}>
      {sections.map((sec) => (
        <SectionView key={sec.id} section={sec} content={content} contentSync={contentSync} />
      ))}
    </Stack>
  );
};

export default StudentRenderer;
export { BlockView };

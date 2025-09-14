import React, { useEffect, useMemo, useRef } from 'react';
import { Box, Button, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import type { AssignmentDto, TaskDto } from '../../types/homework';
import useHomeworkTaskLifecycle from '../../hooks/useHomeworkTaskLifecycle';
import { useQuery } from '@tanstack/react-query';
import { getLessonContent } from '../../services/api';
import StudentRenderer from '../../features/lessonContent/student/StudentRenderer';
import GrammarPlayer from '../grammar/GrammarPlayer';

interface Props {
  assignment: AssignmentDto;
  task: TaskDto;
  readOnly?: boolean;
}

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

const HomeworkTaskFrame: React.FC<Props> = ({ assignment, task, readOnly }) => {
  const { markStarted, reportProgress, markCompleted } = useHomeworkTaskLifecycle(task.id);

  // VIDEO handling: either materialId via StudentRenderer video block not directly accessible here.
  // For simplicity, support EXTERNAL_URL video via HTML5/ReactPlayer-like basic <video>.
  const url: string | undefined = (task.contentRef as any)?.url;

  // READING: fetch lesson content if lessonContentId provided
  const lessonContentId: string | undefined = (task.contentRef as any)?.lessonContentId;
  const { data: lessonData, isLoading: lessonLoading } = useQuery({
    queryKey: ['lesson-content', lessonContentId],
    queryFn: () => getLessonContent(lessonContentId!),
    enabled: !!lessonContentId && task.type === 'READING',
  });

  // Scroll observer for READING
  useEffect(() => {
    if (task.type !== 'READING') return;
    const handler = () => {
      const el = document.scrollingElement || document.documentElement;
      const total = el.scrollHeight - el.clientHeight;
      if (total <= 0) return;
      const pct = clamp(Math.round((el.scrollTop / total) * 100));
      if (!readOnly && [30, 60, 90].includes(pct)) reportProgress({ progressPct: pct });
      if (pct >= 90 && !readOnly) markCompleted();
    };
    window.addEventListener('scroll', handler, { passive: true } as any);
    return () => window.removeEventListener('scroll', handler as any);
  }, [task.type, reportProgress, markCompleted]);

  // GRAMMAR callbacks
  const onGrammarScore = (res: any) => {
    const pct = res && res.totalGaps ? Math.round((100 * res.correctGaps) / res.totalGaps) : 0;
    reportProgress({ progressPct: pct, meta: { score: res.correctGaps, maxScore: res.totalGaps } });
    if (res.totalGaps > 0 && res.correctGaps === res.totalGaps) {
      markCompleted({ meta: { score: res.correctGaps, maxScore: res.totalGaps } });
    }
  };

  const onGrammarAttempt = () => {
    if (!readOnly) markStarted();
  };

  // Render by type
  if (task.type === 'VIDEO') {
    if (url) {
      return (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>{task.title}</Typography>
            <Box sx={{ position: 'relative', pt: '56.25%' }}>
              <video
                src={url}
                controls
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                onPlay={() => { if (!readOnly) markStarted(); }}
                onTimeUpdate={(e) => {
                  const v = e.currentTarget as HTMLVideoElement;
                  const pct = v.duration ? Math.round((v.currentTime / v.duration) * 100) : 0;
                  if (!readOnly) reportProgress({ progressPct: pct, meta: { playedSec: Math.floor(v.currentTime), durationSec: Math.floor(v.duration || 0) } });
                  if (pct >= 90 && !readOnly) {
                    markCompleted({ meta: { playedSec: Math.floor(v.currentTime), durationSec: Math.floor(v.duration || 0) } });
                  }
                }}
              />
            </Box>
          </CardContent>
        </Card>
      );
    }
    // If not EXTERNAL_URL, show fallback
    return (
      <Card variant="outlined"><CardContent><Typography>Video task. Player not available for this source.</Typography></CardContent></Card>
    );
  }

  if (task.type === 'READING') {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>{task.title}</Typography>
          {lessonLoading && <Stack alignItems="center" py={4}><CircularProgress size={24} /></Stack>}
          {!lessonLoading && lessonData && (
            <StudentRenderer layout={lessonData.layout} content={lessonData.content} />
          )}
        </CardContent>
      </Card>
    );
  }

  if (task.type === 'GRAMMAR') {
    const materialId: string | undefined = (task.contentRef as any)?.materialId;
    const itemIds: string[] | undefined = (task.contentRef as any)?.itemIds;
    if (!materialId) {
      return <Card variant="outlined"><CardContent><Typography>No grammar material selected.</Typography></CardContent></Card>;
    }
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>{task.title}</Typography>
          <GrammarPlayer
            materialId={materialId}
            itemIds={itemIds}
            onAttempt={() => onGrammarAttempt()}
            onScore={onGrammarScore}
          />
          <Box mt={2}>
            <Button variant="contained" onClick={() => !readOnly && markCompleted()} disabled={!!readOnly}>
              Submit / Mark complete
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (task.type === 'LINK') {
    const href: string | undefined = (task.contentRef as any)?.url;
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>{task.title}</Typography>
          {href ? (
            <Typography variant="body2" sx={{ mb: 2 }}>
              External link: <a href={href} target="_blank" rel="noreferrer">{href}</a>
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>No URL provided.</Typography>
          )}
          <Button variant="contained" onClick={() => !readOnly && markCompleted()} disabled={!!readOnly}>Mark done</Button>
        </CardContent>
      </Card>
    );
  }

  // VOCAB or others - basic placeholder
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>{task.title}</Typography>
        <Typography variant="body2" color="text.secondary">This task type is not yet supported in player.</Typography>
        <Box mt={2}>
          <Button variant="contained" onClick={() => markCompleted()}>Mark complete</Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default HomeworkTaskFrame;

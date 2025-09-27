import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Card, CardContent, CircularProgress, Stack, Typography, LinearProgress, Chip, Pagination } from '@mui/material';
import type { AssignmentDto, TaskDto, UpdateProgressPayload } from '../../types/homework';
import useHomeworkTaskLifecycle from '../../hooks/useHomeworkTaskLifecycle';
import { useQuery } from '@tanstack/react-query';
import { getLessonContent } from '../../services/api';
import StudentRenderer from '../../features/lessonContent/student/StudentRenderer';
import GrammarPlayer from '../grammar/GrammarPlayer';
import QuizMode from '../vocabulary/QuizMode';
import VocabularyRoundSetup from '../vocabulary/VocabularyRoundSetup';
import { vocabApi } from '../../services/vocabulary.api';
import VocabularyList from '../vocabulary/VocabularyList';

interface Props {
  assignment: AssignmentDto;
  task: TaskDto;
  readOnly?: boolean;
}

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));
const toFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const LIST_PAGE_SIZE = 10;
const REVEAL_TRANSCRIPT_AFTER_COMPLETION = import.meta.env.VITE_REVEAL_TRANSCRIPT_AFTER_COMPLETION === 'true';

interface TaskLifecycleHandlers {
  markStarted: () => void;
  reportProgress: (payload: UpdateProgressPayload) => void;
  markCompleted: (payload?: UpdateProgressPayload) => void;
}

interface ListeningTaskPlayerProps extends TaskLifecycleHandlers {
  task: TaskDto;
  readOnly?: boolean;
}

interface VocabListTaskContentProps extends TaskLifecycleHandlers {
  assignment: AssignmentDto;
  task: TaskDto;
  readOnly?: boolean;
}

const HomeworkTaskFrame: React.FC<Props> = ({ assignment, task, readOnly }) => {
  const { markStarted, reportProgress, markCompleted } = useHomeworkTaskLifecycle(task.id, { minIntervalMs: 400 });

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
      markCompleted({ progressPct: pct, meta: { score: res.correctGaps, maxScore: res.totalGaps } });
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
                    markCompleted({
                      progressPct: Math.min(100, pct),
                      meta: { playedSec: Math.floor(v.currentTime), durationSec: Math.floor(v.duration || 0) }
                    });
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

  if (task.type === 'LISTENING') {
    const content = (task.contentRef as any) || {};
    const audioUrl: string | undefined = content.audioUrl;
    const transcript: string | undefined = content.transcript;
    const initialDuration = toFiniteNumber(content.durationSec) ?? toFiniteNumber(content.estimatedDurationSec);
    const [listenedPct, setListenedPct] = useState(() => clamp(toFiniteNumber(task.progressPct) ?? 0));
    const [durationSeconds, setDurationSeconds] = useState<number>(initialDuration ?? 0);
    const [playedSeconds, setPlayedSeconds] = useState<number>(Math.round(((initialDuration ?? 0) * listenedPct) / 100));
    const [isComplete, setIsComplete] = useState(task.status === 'COMPLETED');
    const [transcriptRevealed, setTranscriptRevealed] = useState(
      !REVEAL_TRANSCRIPT_AFTER_COMPLETION || task.status === 'COMPLETED',
    );
    const lastReportRef = useRef<{ pct: number; ts: number }>({ pct: listenedPct, ts: Date.now() });

    useEffect(() => {
      if (task.status === 'COMPLETED') {
        setIsComplete(true);
        setTranscriptRevealed(true);
        setListenedPct(100);
      }
    }, [task.status]);

    useEffect(() => {
      if (isComplete) {
        setTranscriptRevealed(true);
      }
    }, [isComplete]);

    const formatTime = (seconds: number) => {
      const safe = Math.max(0, seconds || 0);
      const mins = Math.floor(safe / 60);
      const secs = Math.floor(safe % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleLoadedMetadata = (event: React.SyntheticEvent<HTMLAudioElement, Event>) => {
      const element = event.currentTarget;
      const mediaDuration = element.duration || durationSeconds || 0;
      if (mediaDuration > 0) {
        setDurationSeconds(mediaDuration);
        const resumePct = clamp(toFiniteNumber(task.progressPct) ?? 0);
        if (resumePct > 0 && resumePct < 100) {
          element.currentTime = Math.min(mediaDuration * (resumePct / 100), Math.max(0, mediaDuration - 1));
        }
        setPlayedSeconds(element.currentTime);
      }
    };

    const reportIfNeeded = (pct: number, audio: HTMLAudioElement) => {
      if (readOnly) return;
      const now = Date.now();
      const last = lastReportRef.current;
      if (pct >= last.pct + 5 || now - last.ts > 4_000) {
        const duration = Math.floor(audio.duration || durationSeconds || 0);
        reportProgress({
          progressPct: pct,
          meta: { playedSec: Math.floor(audio.currentTime), durationSec: duration },
        });
        lastReportRef.current = { pct, ts: now };
      }
    };

    const handleTimeUpdate = (event: React.SyntheticEvent<HTMLAudioElement, Event>) => {
      const element = event.currentTarget;
      const duration = element.duration || durationSeconds || 0;
      if (!duration) return;
      const pct = clamp(Math.round((element.currentTime / duration) * 100));
      setListenedPct(pct);
      setPlayedSeconds(element.currentTime);
      reportIfNeeded(pct, element);
      if (!readOnly && pct >= 90 && !isComplete) {
        setIsComplete(true);
        markCompleted({
          progressPct: Math.min(100, pct),
          meta: {
            playedSec: Math.floor(element.currentTime),
            durationSec: Math.floor(duration),
          },
        });
      }
    };

    const handleEnded = (event: React.SyntheticEvent<HTMLAudioElement, Event>) => {
      const element = event.currentTarget;
      const duration = Math.floor(element.duration || durationSeconds || 0);
      setListenedPct(100);
      setPlayedSeconds(element.duration || durationSeconds || 0);
      if (!readOnly) {
        markCompleted({
          progressPct: 100,
          meta: { playedSec: duration, durationSec: duration },
        });
      }
    };

    if (!audioUrl) {
      return (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>{task.title}</Typography>
            <Typography color="text.secondary">Audio preview is unavailable for this task.</Typography>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>{task.title}</Typography>
          <Stack spacing={2}>
            <Box>
              <audio
                controls
                src={audioUrl}
                onPlay={() => {
                  if (!readOnly) markStarted();
                }}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
                preload="auto"
                aria-label="Listening task audio"
                style={{ width: '100%' }}
              >
                Your browser does not support the audio element.
              </audio>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {formatTime(playedSeconds)} / {formatTime(durationSeconds)}
              </Typography>
            </Box>
            <Stack spacing={1}>
              <LinearProgress variant="determinate" value={listenedPct} />
              <Typography variant="caption" color="text.secondary">
                {listenedPct}% listened
              </Typography>
            </Stack>

            {REVEAL_TRANSCRIPT_AFTER_COMPLETION && transcript && !transcriptRevealed && (
              <Button
                variant="outlined"
                onClick={() => setTranscriptRevealed(true)}
                disabled={!isComplete}
              >
                {isComplete ? 'Reveal transcript' : 'Listen to at least 90% to reveal the transcript'}
              </Button>
            )}

            {transcript && (!REVEAL_TRANSCRIPT_AFTER_COMPLETION || transcriptRevealed) && (
              <Box
                sx={{
                  borderRadius: 2,
                  border: '1px solid rgba(37,115,255,0.16)',
                  bgcolor: 'rgba(37,115,255,0.04)',
                  px: 2,
                  py: 1.5,
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Transcript
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {transcript}
                </Typography>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (task.type === 'LISTENING') {
    return (
      <ListeningTaskPlayer
        task={task}
        readOnly={readOnly}
        markStarted={markStarted}
        reportProgress={reportProgress}
        markCompleted={markCompleted}
      />
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

  // VOCAB LIST task
  if (task.type === 'VOCAB' && task.sourceKind === 'VOCAB_LIST') {
    return (
      <VocabListTaskContent
        assignment={assignment}
        task={task}
        readOnly={readOnly}
        markStarted={markStarted}
        reportProgress={reportProgress}
        markCompleted={markCompleted}
      />
    );
  }

  // Default fallback
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

const ListeningTaskPlayer: React.FC<ListeningTaskPlayerProps> = ({
  task,
  readOnly,
  markStarted,
  reportProgress,
  markCompleted,
}) => {
  const content = (task.contentRef as any) || {};
  const audioUrl: string | undefined = content.audioUrl;
  const transcript: string | undefined = content.transcript;
  const initialDuration = toFiniteNumber(content.durationSec) ?? toFiniteNumber(content.estimatedDurationSec);
  const initialProgress = clamp(toFiniteNumber(task.progressPct) ?? 0);

  const [listenedPct, setListenedPct] = useState(initialProgress);
  const [durationSeconds, setDurationSeconds] = useState<number>(initialDuration ?? 0);
  const [playedSeconds, setPlayedSeconds] = useState<number>(Math.round(((initialDuration ?? 0) * initialProgress) / 100));
  const [isComplete, setIsComplete] = useState(task.status === 'COMPLETED');
  const [transcriptRevealed, setTranscriptRevealed] = useState(
    !REVEAL_TRANSCRIPT_AFTER_COMPLETION || task.status === 'COMPLETED',
  );
  const lastReportRef = useRef<{ pct: number; ts: number }>({ pct: initialProgress, ts: Date.now() });

  useEffect(() => {
    const progress = clamp(toFiniteNumber(task.progressPct) ?? 0);
    const baseDuration = toFiniteNumber(content.durationSec) ?? toFiniteNumber(content.estimatedDurationSec) ?? 0;
    setListenedPct(progress);
    setDurationSeconds(baseDuration);
    setPlayedSeconds(Math.round((baseDuration * progress) / 100));
    const completed = task.status === 'COMPLETED';
    setIsComplete(completed);
    setTranscriptRevealed(!REVEAL_TRANSCRIPT_AFTER_COMPLETION || completed);
    lastReportRef.current = { pct: progress, ts: Date.now() };
  }, [task.id]);

  useEffect(() => {
    if (task.status === 'COMPLETED') {
      setIsComplete(true);
      setTranscriptRevealed(true);
      setListenedPct(100);
    }
  }, [task.status]);

  useEffect(() => {
    if (isComplete) {
      setTranscriptRevealed(true);
    }
  }, [isComplete]);

  const formatTime = (seconds: number) => {
    const safe = Math.max(0, seconds || 0);
    const mins = Math.floor(safe / 60);
    const secs = Math.floor(safe % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLoadedMetadata = (event: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    const element = event.currentTarget;
    const mediaDuration = element.duration || durationSeconds || 0;
    if (mediaDuration > 0) {
      setDurationSeconds(mediaDuration);
      const resumePct = clamp(toFiniteNumber(task.progressPct) ?? 0);
      if (resumePct > 0 && resumePct < 100) {
        element.currentTime = Math.min(mediaDuration * (resumePct / 100), Math.max(0, mediaDuration - 1));
      }
      setPlayedSeconds(element.currentTime);
    }
  };

  const reportIfNeeded = (pct: number, audio: HTMLAudioElement) => {
    if (readOnly) return;
    const now = Date.now();
    const last = lastReportRef.current;
    if (pct >= last.pct + 5 || now - last.ts > 4_000) {
      const duration = Math.floor(audio.duration || durationSeconds || 0);
      reportProgress({
        progressPct: pct,
        meta: { playedSec: Math.floor(audio.currentTime), durationSec: duration },
      });
      lastReportRef.current = { pct, ts: now };
    }
  };

  const handleTimeUpdate = (event: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    const element = event.currentTarget;
    const duration = element.duration || durationSeconds || 0;
    if (!duration) return;
    const pct = clamp(Math.round((element.currentTime / duration) * 100));
    setListenedPct(pct);
    setPlayedSeconds(element.currentTime);
    reportIfNeeded(pct, element);
    if (!readOnly && pct >= 90 && !isComplete) {
      setIsComplete(true);
      markCompleted({
        progressPct: Math.min(100, pct),
        meta: {
          playedSec: Math.floor(element.currentTime),
          durationSec: Math.floor(duration),
        },
      });
    }
  };

  const handleEnded = (event: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    const element = event.currentTarget;
    const duration = Math.floor(element.duration || durationSeconds || 0);
    setListenedPct(100);
    setPlayedSeconds(element.duration || durationSeconds || 0);
    if (!readOnly) {
      markCompleted({
        progressPct: 100,
        meta: { playedSec: duration, durationSec: duration },
      });
    }
  };

  if (!audioUrl) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>{task.title}</Typography>
          <Typography color="text.secondary">Audio preview is unavailable for this task.</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>{task.title}</Typography>
        <Stack spacing={2}>
          <Box>
            <audio
              controls
              src={audioUrl}
              onPlay={() => {
                if (!readOnly) markStarted();
              }}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleEnded}
              preload="auto"
              aria-label="Listening task audio"
              style={{ width: '100%' }}
            >
              Your browser does not support the audio element.
            </audio>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {formatTime(playedSeconds)} / {formatTime(durationSeconds)}
            </Typography>
          </Box>
          <Stack spacing={1}>
            <LinearProgress variant="determinate" value={listenedPct} />
            <Typography variant="caption" color="text.secondary">
              {listenedPct}% listened
            </Typography>
          </Stack>

          {REVEAL_TRANSCRIPT_AFTER_COMPLETION && transcript && !transcriptRevealed && (
            <Button
              variant="outlined"
              onClick={() => setTranscriptRevealed(true)}
              disabled={!isComplete}
            >
              {isComplete ? 'Reveal transcript' : 'Listen to at least 90% to reveal the transcript'}
            </Button>
          )}

          {transcript && (!REVEAL_TRANSCRIPT_AFTER_COMPLETION || transcriptRevealed) && (
            <Box
              sx={{
                borderRadius: 2,
                border: '1px solid rgba(37,115,255,0.16)',
                bgcolor: 'rgba(37,115,255,0.04)',
                px: 2,
                py: 1.5,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Transcript
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {transcript}
              </Typography>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

const VocabListTaskContent: React.FC<VocabListTaskContentProps> = ({
  assignment,
  task,
  readOnly,
  markStarted,
  reportProgress,
  markCompleted,
}) => {
  const { studentId } = assignment;
  const content = (task.contentRef as any) || {};
  const wordIds: string[] = Array.isArray(content.wordIds) ? content.wordIds.slice(0, 100) : [];
  const settings = content.settings || {};
  const masteryStreak: number = Number.isFinite(settings.masteryStreak) ? settings.masteryStreak : 2;
  const masteryPct: number = Number.isFinite(settings.masteryPct) ? settings.masteryPct : 100;
  const shuffle: boolean = settings.shuffle !== false;

  const [quizOpen, setQuizOpen] = useState(false);
  const [quizQuestionWords, setQuizQuestionWords] = useState<any[] | null>(null);
  const [initialSessionSize, setInitialSessionSize] = useState<number | undefined>(undefined);
  const [setupOpen, setSetupOpen] = useState(false);
  const [repeatLearnedMode, setRepeatLearnedMode] = useState(false);
  const [allowAnyCount, setAllowAnyCount] = useState(false);
  const [listPage, setListPage] = useState(1);
  const [streaks, setStreaks] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem(`vocabTaskStreaks:${task.id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed as Record<string, number>;
      }
    } catch {
      // ignore storage quota or access errors
    }
    return {};
  });

  const serverStreaks = useMemo(() => {
    const rawMeta = (task.meta || {}) as any;
    const candidate = rawMeta?.streaks || rawMeta?.streak_map;
    const out: Record<string, number> = {};
    if (candidate && typeof candidate === 'object') {
      const allow = new Set(wordIds);
      Object.entries(candidate as Record<string, unknown>).forEach(([k, v]) => {
        if (allow.has(k)) {
          const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : undefined;
          if (typeof n === 'number' && Number.isFinite(n)) out[k] = Math.max(0, Math.floor(n));
        }
      });
    }
    return out;
  }, [task.meta, wordIds]);

  useEffect(() => {
    const allow = new Set(wordIds);
    const merged: Record<string, number> = {};
    const allKeys = new Set<string>([...Object.keys(streaks), ...Object.keys(serverStreaks)]);
    allKeys.forEach((k) => {
      if (!allow.has(k)) return;
      const a = streaks[k] ?? 0;
      const b = serverStreaks[k] ?? 0;
      const m = Math.max(0, Math.max(a, b));
      if (m > 0) merged[k] = m;
    });
    const keysA = Object.keys(streaks);
    const keysB = Object.keys(merged);
    const sameLength = keysA.length === keysB.length;
    const identical = sameLength && keysA.every((k) => streaks[k] === merged[k]);
    if (!identical) {
      setStreaks(merged);
    }
  }, [task.id, JSON.stringify(serverStreaks), JSON.stringify(wordIds)]);

  const [masteredSet, setMasteredSet] = useState<Set<string>>(() => {
    const key = `vocabTaskProgress:${task.id}`;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved.masteredWordIds)) return new Set<string>(saved.masteredWordIds);
      }
    } catch (e) {
      // ignore JSON parse errors for local progress
    }
    return new Set<string>();
  });

  const serverMasteredSet = useMemo(() => {
    const raw = (task.meta || {}) as any;
    const ids = Array.isArray(raw?.masteredWordIds)
      ? raw.masteredWordIds
      : Array.isArray(raw?.mastered_word_ids)
        ? raw.mastered_word_ids
        : [];
    if (!ids.length) return new Set<string>();
    const allowed = new Set(wordIds);
    const filtered: string[] = [];
    ids.forEach((id: unknown) => {
      if (typeof id === 'string' && allowed.has(id)) {
        filtered.push(id);
      }
    });
    return new Set<string>(filtered);
  }, [task.meta, wordIds]);

  const serverStats = useMemo(() => {
    const raw = (task.meta || {}) as any;
    const statsCandidate = raw?.stats;
    if (!statsCandidate || typeof statsCandidate !== 'object') return undefined;
    return {
      total: toFiniteNumber((statsCandidate as any).total),
      attemptedCount: toFiniteNumber((statsCandidate as any).attemptedCount),
      correctCount: toFiniteNumber((statsCandidate as any).correctCount),
      masteredCount: toFiniteNumber((statsCandidate as any).masteredCount),
    };
  }, [task.meta]);

  const [attemptedCount, setAttemptedCount] = useState<number>(() => serverStats?.attemptedCount ?? 0);
  const [correctCount, setCorrectCount] = useState<number>(() => serverStats?.correctCount ?? 0);

  useEffect(() => {
    setAttemptedCount(serverStats?.attemptedCount ?? 0);
    setCorrectCount(serverStats?.correctCount ?? 0);
  }, [task.id, serverStats?.attemptedCount, serverStats?.correctCount]);

  const { data: allWords } = useQuery({
    queryKey: ['vocabulary', 'words'],
    queryFn: () => vocabApi.listWords(),
    staleTime: 60_000,
  });

  const { data: assignments } = useQuery({
    queryKey: ['vocabulary', 'assignments', studentId],
    queryFn: () => vocabApi.listAssignments(studentId),
    enabled: !!studentId,
    staleTime: 60_000,
  });

  const words = useMemo(() => {
    const list = (allWords || []).filter((w: any) => wordIds.includes(w.id));
    const order = new Map(wordIds.map((id, idx) => [id, idx] as const));
    return list.sort((a: any, b: any) => (order.get(a.id)! - order.get(b.id)!));
  }, [allWords, wordIds]);

  const totalListPages = Math.max(1, Math.ceil(words.length / LIST_PAGE_SIZE));

  useEffect(() => {
    setListPage((prev) => {
      if (prev < 1) return 1;
      if (prev > totalListPages) return totalListPages;
      return prev;
    });
  }, [totalListPages]);

  useEffect(() => {
    setListPage(1);
  }, [task.id]);

  const pagedWords = useMemo(() => {
    const start = (listPage - 1) * LIST_PAGE_SIZE;
    return words.slice(start, start + LIST_PAGE_SIZE);
  }, [words, listPage]);

  const preMastered = useMemo(() => {
    const set = new Set<string>();
    if (!assignments) return set;
    assignments.forEach((a: any) => {
      if (a.status === 'LEARNED' || a.status === 'COMPLETED') set.add(a.vocabularyWordId);
    });
    return set;
  }, [assignments]);

  const mergedMastered = useMemo(() => {
    const cur = new Set<string>();
    wordIds.forEach((id) => {
      if (masteredSet.has(id)) cur.add(id);
      if (serverMasteredSet.has(id)) cur.add(id);
      if (preMastered.has(id)) cur.add(id);
    });
    return cur;
  }, [wordIds, masteredSet, serverMasteredSet, preMastered]);

  const total = Math.max(wordIds.length, serverStats?.total ?? 0);
  const statsMasteredCount = serverStats?.masteredCount ?? 0;
  const masteredCount = Math.min(total, Math.max(mergedMastered.size, statsMasteredCount));
  const computedPct = total > 0 ? clamp(Math.round((masteredCount / total) * 100)) : 0;
  const progressPct = readOnly
    ? clamp(Number.isFinite(task.progressPct) ? Math.round(task.progressPct) : computedPct)
    : computedPct;

  useEffect(() => {
    const key = `vocabTaskProgress:${task.id}`;
    try {
      localStorage.setItem(key, JSON.stringify({ masteredWordIds: Array.from(mergedMastered) }));
    } catch (e) {
      // ignore storage quota or access errors
    }
  }, [mergedMastered, task.id]);

  useEffect(() => {
    try {
      localStorage.setItem(`vocabTaskStreaks:${task.id}`, JSON.stringify(streaks));
    } catch {
      // ignore storage quota or access errors
    }
  }, [streaks, task.id]);

  const unmasteredWords = useMemo(() => words.filter((w: any) => !mergedMastered.has(w.id)), [words, mergedMastered]);

  const handleAnswer = (wordId: string, correct: boolean) => {
    if (readOnly) return;
    markStarted();

    const current = streaks;
    const nextMap: Record<string, number> = { ...current };
    const nextVal = correct ? (nextMap[wordId] || 0) + 1 : 0;
    nextMap[wordId] = nextVal;

    if (nextVal >= masteryStreak) {
      setMasteredSet((set) => new Set(set).add(wordId));
    }
    setStreaks(nextMap);

    const newlyMastered = correct && !mergedMastered.has(wordId) && nextVal >= masteryStreak;
    const nextMasteredCount = Math.min(total, masteredCount + (newlyMastered ? 1 : 0));
    const nextAttemptedCount = attemptedCount + 1;
    const nextCorrectCount = correctCount + (correct ? 1 : 0);
    setAttemptedCount(nextAttemptedCount);
    setCorrectCount(nextCorrectCount);
    const stats = {
      total,
      attemptedCount: nextAttemptedCount,
      correctCount: nextCorrectCount,
      masteredCount: nextMasteredCount,
    };
    const nextProgressPct = total > 0 ? clamp(Math.round((nextMasteredCount / total) * 100)) : 0;
    const masteredWordIds = new Set(mergedMastered);
    if (newlyMastered) masteredWordIds.add(wordId);
    reportProgress({
      progressPct: nextProgressPct,
      stats,
      masteredWordIds: Array.from(masteredWordIds),
      lastEvent: { wordId, correct },
      meta: { lastProgressAt: new Date().toISOString(), streaks: nextMap },
    });
  };

  useEffect(() => {
    if (readOnly) return;
    if (total > 0 && (masteredCount >= total || progressPct >= masteryPct)) {
      markCompleted({
        progressPct,
        stats: { total, attemptedCount, correctCount, masteredCount },
        masteredWordIds: Array.from(mergedMastered),
        meta: { lastProgressAt: new Date().toISOString(), streaks },
      });
    }
  }, [readOnly, total, masteredCount, progressPct, masteryPct, mergedMastered, markCompleted, attemptedCount, correctCount, streaks]);

  return (
    <Card variant="outlined" elevation={0} sx={{ p: 2, borderRadius: 2, borderColor: 'divider' }}>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Learn the words</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Streak each word correctly {masteryStreak === 1 ? 'once' : `${masteryStreak} times`} in a row (as assigned by your teacher) to mark it as learned.
        </Typography>
        <Box sx={{ mt: 2 }}>
          {words.length > 0 ? (
            <>
              <Box sx={{ maxHeight: 360, overflowY: 'auto', pr: 1 }}>
                <VocabularyList
                  data={pagedWords}
                  readOnly
                  learnedWords={mergedMastered}
                />
              </Box>
              {totalListPages > 1 && (
                <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
                  <Pagination
                    count={totalListPages}
                    page={listPage}
                    onChange={(_, value) => setListPage(value)}
                    size="small"
                    color="primary"
                    showFirstButton
                    showLastButton
                  />
                </Stack>
              )}
            </>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
              No words selected for this task.
            </Typography>
          )}
          {total > 0 && (
            <>
              <Chip
                sx={{ mt: 2 }}
                size="small"
                color={masteredCount === total ? 'success' : 'warning'}
                label={`${masteredCount}/${total} mastered`}
              />
              <LinearProgress
                variant="determinate"
                value={progressPct}
                sx={{ height: 8, borderRadius: 4, mt: 1.5, mb: 2 }}
              />
            </>
          )}
        </Box>
        {!readOnly && (
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Button
              variant="contained"
              onClick={() => {
                if (readOnly) return;
                markStarted();
                const expanded: any[] = [];
                unmasteredWords.forEach((w: any) => {
                  const have = streaks[w.id] || 0;
                  const needed = Math.max(1, masteryStreak - have);
                  for (let i = 0; i < needed; i++) expanded.push(w);
                });
                if (expanded.length < 4) {
                  const learnedPool = words.filter((w: any) => mergedMastered.has(w.id));
                  let idx = 0;
                  while (expanded.length < 4 && learnedPool.length > 0) {
                    expanded.push(learnedPool[idx % learnedPool.length]);
                    idx++;
                  }
                }
                if (shuffle) {
                  for (let i = expanded.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [expanded[i], expanded[j]] = [expanded[j], expanded[i]];
                  }
                }
                setQuizQuestionWords(expanded);
                setRepeatLearnedMode(false);
                setAllowAnyCount(expanded.length < 4);
                setSetupOpen(true);
              }}
              disabled={total === 0 || !!readOnly}
            >
              {masteredCount === 0 ? 'Start' : masteredCount < total ? 'Resume' : 'Review'}
            </Button>
            {masteredCount > 0 && masteredCount !== total && (
              <Button
                variant="outlined"
                onClick={() => {
                  if (readOnly) return;
                  markStarted();
                  const learnedOnly = words.filter((w: any) => mergedMastered.has(w.id));
                  setQuizQuestionWords(learnedOnly);
                  setRepeatLearnedMode(true);
                  setAllowAnyCount(true);
                  setSetupOpen(true);
                }}
                disabled={mergedMastered.size === 0 || !!readOnly}
              >
                Repeat learned
              </Button>
            )}
          </Stack>
        )}
        <VocabularyRoundSetup
          open={setupOpen}
          onClose={() => setSetupOpen(false)}
          words={words}
          questionWords={quizQuestionWords || unmasteredWords}
          onStart={({ sessionSize }) => {
            setInitialSessionSize(sessionSize);
            setSetupOpen(false);
            setQuizOpen(true);
          }}
          allowAnyCount={allowAnyCount}
        />
        <QuizMode
          open={quizOpen}
          onClose={() => { setQuizOpen(false); setQuizQuestionWords(null); setInitialSessionSize(undefined); setRepeatLearnedMode(false); setAllowAnyCount(false); }}
          words={words}
          questionWords={quizQuestionWords || unmasteredWords}
          onAnswer={handleAnswer}
          onComplete={() => {
            setQuizQuestionWords(null);
          }}
          initialSessionSize={initialSessionSize}
          allowAnyCount={allowAnyCount}
        />
        {preMastered.size > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Some words are already mastered globally.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default HomeworkTaskFrame;

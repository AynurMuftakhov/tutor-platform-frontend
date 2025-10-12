/* eslint-disable no-empty */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Drawer, Box, Typography, Button, Stack, Divider, Chip, IconButton, TextField } from '@mui/material';
import { Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import PauseOutlinedIcon from '@mui/icons-material/PauseOutlined';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import { DailyProvider, useTranscription } from '@daily-co/daily-react';
import { useFocusWords } from '../../context/FocusWordsContext';
import { useSnackbar } from 'notistack';
import { collectHitsFromRaw, extractSegmentKey, mergeOrAppendSegment, renderHighlightedByStem } from './highlight';
import type { TranscriptSegment } from './types';
import { useAuth } from '../../context/AuthContext';
import HomeworkWordPicker from './HomeworkWordPicker';

type Props = {
  open?: boolean;
  onClose?: () => void;
  embedded?: boolean;
  call: any; // Daily call object (used by DailyProvider)
  studentSessionId?: string;
  studentId?: string; // for homework picker
  homeworkWords: string[];
};

function TranscriptionPanelInner({
  open,
  onClose,
  embedded,
  studentSessionId,
  studentId,
  homeworkWords,
  call,
}: Props) {
  const { user } = useAuth();
  const isTutor = user?.role === 'tutor';
  const { enqueueSnackbar } = useSnackbar();

  // Meeting/connection state
  const [meetingState, setMeetingState] = useState<'idle' | 'joining' | 'joined' | 'left' | 'error'>('idle');
  const [hasRemote, setHasRemote] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false); // hidden by default; teachers can open
  const { isTranscribing, transcriptions, startTranscription, stopTranscription, error } = useTranscription();

  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const lastCountRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  // Track which participantId has been applied to transcription filter
  const lastAppliedPidRef = useRef<string | undefined>(undefined);
  // UI indicator of currently applied participant filter (undefined => ALL)
  const [appliedPid, setAppliedPid] = useState<string | undefined>(undefined);

  // Utilities: pause/autoscroll and renderedSegments
  const [autoscroll, setAutoscroll] = useState(true);
  const [paused, setPaused] = useState(false);
  const pausedSnapshotRef = useRef<TranscriptSegment[] | null>(null);
  const [menuEl, setMenuEl] = useState<null | HTMLElement>(null);
  const openMenu = (e: React.MouseEvent<HTMLElement>) => setMenuEl(e.currentTarget);
  const closeMenu = () => setMenuEl(null);
  // Manual entry for focus words
  const [manualInput, setManualInput] = useState('');
  const [homeworkPickerOpen, setHomeworkPickerOpen] = useState(false);
  const seededRef = useRef(false);

  const togglePause = () => {
    if (!paused) {
      pausedSnapshotRef.current = segments.slice();
      setPaused(true);
    } else {
      pausedSnapshotRef.current = null;
      setPaused(false);
    }
  };

  const renderedSegments = paused && pausedSnapshotRef.current
    ? pausedSnapshotRef.current
    : segments;

  // ---- RAW DEBUG (bypass daily-react; talk to call object directly) ----
  const [rawActive, setRawActive] = useState(false);
  const [rawLogs, setRawLogs] = useState<string[]>([]);
  const rawHandlersRef = useRef<{ onStarted?: (e:any)=>void; onMsg?: (e:any)=>void; onErr?: (e:any)=>void; onStopped?: (e:any)=>void } | null>(null);

    // Participants snapshot (Daily ждёт participantId = КЛЮЧ из participants(), не user_id)
    const [ptList, setPtList] = useState<Array<{ id: string; label: string }>>([]);
    const [selectedPid, setSelectedPid] = useState<string | undefined>(undefined);

    const refreshParticipants = React.useCallback(() => {
        if (!call || !call.participants) return;
        try {
            const parts = call.participants();
            const entries = Object.entries(parts)
                .filter(([id, p]) => id !== 'local' && p && typeof p === 'object') as Array<[string, any]>;
            const mapped = entries.map(([id, p]) => ({
                id,
                label: `${id.slice(0,8)}…  ${p?.user_name || ''} ${p?.user_id ? '('+p.user_id+')' : ''}`.trim(),
            }));
            setPtList(mapped);
            setHasRemote(mapped.length > 0);
            // Приоритет выбора: уже выбранный -> переданный studentSessionId -> первый в списке
            setSelectedPid(prev => prev ?? (studentSessionId ?? mapped[0]?.id));
        } catch {/* noop */}
    }, [call, studentSessionId]);
  useEffect(() => {
    if (!call) return;
    // initial snapshot
    try {
      const ms = typeof call.meetingState === 'function' ? call.meetingState() : undefined;
      if (ms === 'joined-meeting') setMeetingState('joined');
      else if (ms === 'joining-meeting') setMeetingState('joining');
      else if (ms === 'left-meeting') setMeetingState('left');
      else setMeetingState('idle');
    } catch { setMeetingState('idle'); }

    const onJoining = () => setMeetingState('joining');
    const onJoined = () => setMeetingState('joined');
    const onLeft = () => setMeetingState('left');
    const onErr = () => setMeetingState('error');

    call.on('joining-meeting', onJoining);
    call.on('joined-meeting', onJoined);
    call.on('left-meeting', onLeft);
    call.on('error', onErr);

    return () => {
      try { call.off('joining-meeting', onJoining); } catch {}
      try { call.off('joined-meeting', onJoined); } catch {}
      try { call.off('left-meeting', onLeft); } catch {}
      try { call.off('error', onErr); } catch {}
    };
  }, [call]);
  // Derived human-friendly statuses
  const connectionChip = (() => {
    switch (meetingState) {
      case 'joining': return { label: 'Connecting…', color: 'info' as const };
      case 'joined':  return { label: 'Connected',   color: 'success' as const };
      case 'left':    return { label: 'Left call',    color: 'default' as const };
      case 'error':   return { label: 'Error',        color: 'error' as const };
      default:        return { label: 'Idle',         color: 'default' as const };
    }
  })();

  const studentChip = hasRemote
    ? { label: 'Student joined', color: 'success' as const }
    : { label: 'Waiting for student…', color: 'default' as const };

  const transcriptionChip = (!isTranscribing)
    ? { label: 'Idle', color: 'default' as const }
    : (appliedPid
        ? { label: 'Listening to student', color: 'success' as const }
        : { label: 'Listening (all)', color: 'info' as const });

  const pushLog = (msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setRawLogs((prev) => [`${ts}  ${msg}`, ...prev].slice(0, 200));
  };

  // Focus words come from context; used for stem-aware highlighting
  const { words: focusWords, meta: focusMeta, setWords: setFocusWords, clear: clearFocusWords } = useFocusWords();
  const lastBroadcastRef = useRef<string>('');

  useEffect(() => {
    lastBroadcastRef.current = '';
  }, [call]);

  useEffect(() => {
    if (!isTutor) return;
    if (!call || typeof call.sendAppMessage !== 'function') return;
    const payload = {
      t: 'FOCUS_WORDS',
      words: focusWords,
      meta: focusMeta,
    };
    const serialized = JSON.stringify(payload);
    if (lastBroadcastRef.current === serialized) return;
    lastBroadcastRef.current = serialized;
    try {
      call.sendAppMessage(payload);
    } catch (err) {
      console.warn('Failed to broadcast focus words', err);
    }
  }, [call, focusWords, focusMeta, isTutor]);

    // Seed focus words from props.homeworkWords if context is empty
    useEffect(() => {
      if (seededRef.current) return;
      if (focusWords.length === 0 && Array.isArray(homeworkWords) && homeworkWords.length > 0) {
        try {
          setFocusWords(homeworkWords, { source: 'homework', label: 'Latest homework' }, 'replace');
          seededRef.current = true;
        } catch {/* ignore */}
      }
    }, [focusWords.length, homeworkWords, setFocusWords]);

    useEffect(() => {
        if (!call) return;
        refreshParticipants();
        const onP = () => refreshParticipants();
        call.on('participant-joined', onP);
        call.on('participant-updated', onP);
        call.on('participant-left', onP);
        return () => {
            try { call.off('participant-joined', onP); } catch {}
            try { call.off('participant-updated', onP); } catch {}
            try { call.off('participant-left', onP); } catch {}
        };
    }, [call, refreshParticipants]);

  const applyManualWords = () => {
    const parts = manualInput.split(/[\s,]+/).map((entry) => entry.trim()).filter(Boolean);
    if (parts.length === 0) return;
    const { applied, trimmed } = setFocusWords(parts, { source: 'manual' }, 'merge');
    enqueueSnackbar(`${applied} word${applied === 1 ? '' : 's'} added`, { variant: 'success' });
    if (trimmed > 0) {
      enqueueSnackbar('Trimmed to 30 words', { variant: 'warning' });
    }
    setManualInput('');
  };

  const handleManualKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    applyManualWords();
  };

  const handleOpenHomeworkPicker = () => {
    if (!studentId) {
      enqueueSnackbar('Select a student to load homework vocabulary.', { variant: 'warning' });
      return;
    }
    setHomeworkPickerOpen(true);
  };

  const handleCloseHomeworkPicker = () => {
    setHomeworkPickerOpen(false);
  };

  const handleApplyHomeworkWords = ({
    words,
    assignmentId,
    assignmentTitle,
  }: {
    words: string[];
    assignmentId: string;
    assignmentTitle?: string;
  }) => {
    if (!Array.isArray(words) || words.length === 0) return;
    const { applied, trimmed } = setFocusWords(
      words,
      {
        source: 'homework',
        assignmentId,
        label: assignmentTitle,
      },
      'replace',
    );
    seededRef.current = true;
    enqueueSnackbar(
      `Loaded ${applied} word${applied === 1 ? '' : 's'} from ${assignmentTitle || 'homework'}`,
      { variant: 'success' },
    );
    if (trimmed > 0) {
      enqueueSnackbar('Trimmed to 30 words', { variant: 'warning' });
    }
    setHomeworkPickerOpen(false);
  };

  // Append new messages into our persistent segments & counters
  useEffect(() => {
    if (!transcriptions || transcriptions.length <= lastCountRef.current) return;
    const newMsgs = transcriptions.slice(lastCountRef.current);
    lastCountRef.current = transcriptions.length;

    setSegments((prev) => {
      let acc = prev;
      for (const ev of newMsgs as any[]) {
        const text: string = ev?.text ?? '';
        const raw = ev?.rawResponse;
        const isFinal = !!(ev?.is_final ?? ev?.final);
        const segId = extractSegmentKey({ data: { rawResponse: raw, ...ev } });
        const hits = collectHitsFromRaw(raw, focusWords, text);

        acc = mergeOrAppendSegment(acc, {
          id: segId,
          text,
          isFinal,
          startMs: raw?.start ?? ev?.start,
          endMs: raw?.end ?? ev?.end,
          hits,
        });

        if (hits?.length) {
          // update totals
          setTotals((t) => {
            const copy = { ...t };
            for (const h of hits) {
              const k = h.word.toLowerCase();
              copy[k] = (copy[k] ?? 0) + 1;
            }
            return copy;
          });
        }
      }
      return acc.slice();
    });
  }, [transcriptions, focusWords]);

  // Auto-scroll to bottom when new segments arrive (respect autoscroll toggle)
  useEffect(() => {
    if (!autoscroll) return;
    const el = listRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [renderedSegments.length, autoscroll]);

  const handleStart = async () => {
    // Start for ALL first to avoid races; then narrow to student when ready
    await startTranscription({
      includeRawResponse: true,
      extra: {
        search: focusWords,
        keywords: focusWords.map((w) => `${w}:1.5`),
      },
    });
    // If we already know the student's participantId, narrow immediately
    if (call && studentSessionId) {
      try {
        await call.updateTranscription({ participants: [studentSessionId] });
        lastAppliedPidRef.current = studentSessionId;
        setAppliedPid(studentSessionId);
      } catch (e) {
        // non-fatal: we will retry via the effect below when pid stabilizes
      }
    }
  };

  const handleStop = async () => {
    await stopTranscription();
    lastAppliedPidRef.current = undefined;
    setAppliedPid(undefined);
  };
  // Auto-apply/update participants filter when studentSessionId becomes available or changes
  useEffect(() => {
    const maybeUpdate = async () => {
      if (!isTranscribing || !call) return;
      if (!studentSessionId) return;
      if (lastAppliedPidRef.current === studentSessionId) return;
      try {
        await call.updateTranscription({ participants: [studentSessionId] });
        lastAppliedPidRef.current = studentSessionId;
        setAppliedPid(studentSessionId);
        pushLog?.(`[AUTO] updateTranscription → [${studentSessionId}]`);
      } catch {/* swallow; will retry on next change */}
    };
    void maybeUpdate();
  }, [isTranscribing, call, studentSessionId]);

  // Update transcription extras when focus words change
  useEffect(() => {
    if (!isTranscribing || !call) return;
    try {
      call.updateTranscription({
        extra: {
          search: focusWords,
          keywords: focusWords.map((w) => `${w}:1.5`),
        },
      });
      pushLog?.(`[AUTO] updateTranscription keywords (${focusWords.length})`);
    } catch {
      /* ignore */
    }
  }, [isTranscribing, call, focusWords]);

  const handleClear = () => {
    setSegments([]);
    setTotals({});
    lastCountRef.current = transcriptions?.length ?? 0;
  };

    const handleRawStartAll = async () => {
        if (!call || rawActive) return;
        const onStarted = () => { setRawActive(true); pushLog('[RAW] STARTED'); };
        const onMsg     = (e:any) => { const txt = e?.data?.text ?? e?.text ?? ''; pushLog(`[RAW] MSG ${txt ? '— ' + txt : ''}`); };
        const onErr     = (e:any) => { pushLog(`[RAW] ERROR ${e?.errorMsg ?? e?.message ?? ''}`); };
        const onStopped = () => { setRawActive(false); pushLog('[RAW] STOPPED'); };
        rawHandlersRef.current = { onStarted, onMsg, onErr, onStopped };
        try {
            call.on('transcription-started', onStarted);
            call.on('transcription-message', onMsg);
            call.on('transcription-error', onErr);
            call.on('transcription-stopped', onStopped);
            pushLog('[RAW] calling startTranscription() — ALL');
            await call.startTranscription({ includeRawResponse: true });
            pushLog('[RAW] startTranscription resolved (ALL)');
            setAppliedPid(undefined);
        } catch (e:any) {
            pushLog(`[RAW] startTranscription threw: ${e?.message || String(e)}`);
            try { call.off('transcription-started', onStarted); } catch {}
            try { call.off('transcription-message', onMsg); } catch {}
            try { call.off('transcription-error', onErr); } catch {}
            try { call.off('transcription-stopped', onStopped); } catch {}
            rawHandlersRef.current = null;
        }
    };

    const handleRawStartSelected = async () => {
        if (!call || rawActive) return;
        const pid = selectedPid ?? studentSessionId;
        if (!pid) { pushLog('[RAW] No participantId selected'); return; }
        const onStarted = () => { setRawActive(true); pushLog('[RAW] STARTED'); };
        const onMsg     = (e:any) => { const txt = e?.data?.text ?? e?.text ?? ''; pushLog(`[RAW] MSG — ${txt}`); };
        const onErr     = (e:any) => { pushLog(`[RAW] ERROR ${e?.errorMsg ?? e?.message ?? ''}`); };
        const onStopped = () => { setRawActive(false); pushLog('[RAW] STOPPED'); };
        rawHandlersRef.current = { onStarted, onMsg, onErr, onStopped };
        try {
            call.on('transcription-started', onStarted);
            call.on('transcription-message', onMsg);
            call.on('transcription-error', onErr);
            call.on('transcription-stopped', onStopped);
            pushLog(`[RAW] calling startTranscription() — participants:[${pid}]`);
            await call.startTranscription({ includeRawResponse: true, participants: [pid] });
            pushLog('[RAW] startTranscription resolved (SELECTED)');
            setAppliedPid(pid);
        } catch (e:any) {
            pushLog(`[RAW] startTranscription threw: ${e?.message || String(e)}`);
            try { call.off('transcription-started', onStarted); } catch {}
            try { call.off('transcription-message', onMsg); } catch {}
            try { call.off('transcription-error', onErr); } catch {}
            try { call.off('transcription-stopped', onStopped); } catch {}
            rawHandlersRef.current = null;
        }
    };

    const handleRawStartAllThenUpdate = async () => {
        await handleRawStartAll(); // стартуем всех, чтобы не ловить гонки
        const pid = selectedPid ?? studentSessionId;
        if (!pid) { pushLog('[RAW] No participantId to update'); return; }
        setTimeout(async () => {
            try {
                pushLog(`[RAW] calling updateTranscription() — participants:[${pid}]`);
                await call.updateTranscription({ participants: [pid] });
                pushLog('[RAW] updateTranscription resolved');
                setAppliedPid(pid);
            } catch (e:any) {
                pushLog(`[RAW] updateTranscription threw: ${e?.message || String(e)}`);
            }
        }, 800);
    };

    const handleRawUpdateSelected = async () => {
        const pid = selectedPid ?? studentSessionId;
        if (!pid) { pushLog('[RAW] No participantId to update'); return; }
        try {
            pushLog(`[RAW] calling updateTranscription() — participants:[${pid}]`);
            await call.updateTranscription({ participants: [pid] });
            pushLog('[RAW] updateTranscription resolved');
            setAppliedPid(pid);
        } catch (e:any) {
            pushLog(`[RAW] updateTranscription threw: ${e?.message || String(e)}`);
        }
    };

    const handleRawStop = async () => {
        if (!call) return;
        try {
            pushLog('[RAW] calling stopTranscription()');
            await call.stopTranscription();
            pushLog('[RAW] stopTranscription resolved');
            setAppliedPid(undefined);
        } catch (e:any) {
            pushLog(`[RAW] stopTranscription threw: ${e?.message || String(e)}`);
        } finally {
            const h = rawHandlersRef.current;
            if (h) {
                try { call.off('transcription-started', h.onStarted as any); } catch {}
                try { call.off('transcription-message', h.onMsg as any); } catch {}
                try { call.off('transcription-error', h.onErr as any); } catch {}
                try { call.off('transcription-stopped', h.onStopped as any); } catch {}
            }
            rawHandlersRef.current = null;
            setRawActive(false);
        }
    };

    const dumpEnv = () => {
        try {
            const me = call?.participants?.().local;
            pushLog(`[RAW] owner=${!!me?.owner} canAdmin=${JSON.stringify(me?.permissions?.canAdmin)}`);
            const ids = Object.keys(call?.participants?.() || {});
            pushLog(`[RAW] participant keys: ${ids.join(', ') || '(none)'}`);
        } catch { pushLog('[RAW] dump failed'); }
    };

  // Cleanup on unmount or call change
  useEffect(() => {
    return () => {
      const h = rawHandlersRef.current;
      if (!call || !h) return;
      try { call.off('transcription-started', h.onStarted as any); } catch {}
      try { call.off('transcription-message', h.onMsg as any); } catch {}
      try { call.off('transcription-error', h.onErr as any); } catch {}
      try { call.off('transcription-stopped', h.onStopped as any); } catch {}
      rawHandlersRef.current = null;
    };
  }, [call]);
    const paragraphs = useMemo(() => toParagraphs(renderedSegments), [renderedSegments]);
    type Seg = { id: string; text: string; isFinal?: boolean; startMs?: number; endMs?: number };

    function toParagraphs(
        segments: Seg[],
        { gapMs = 900, maxChars = 260 }: { gapMs?: number; maxChars?: number } = {}
    ) {
        const finals = segments.filter(s => s.isFinal && s.text?.trim());
        const out: Array<{ text: string; startMs: number; endMs: number }> = [];
        let buf = '';
        let start = finals[0]?.startMs ?? 0;
        let lastEnd = start;

        const flush = () => {
            if (!buf.trim()) return;
            out.push({ text: buf.trim(), startMs: start, endMs: lastEnd ?? start });
            buf = '';
        };

        for (const s of finals) {
            const gap = s.startMs != null && lastEnd != null ? s.startMs - lastEnd : 0;
            const punctEnd = /[.!?]\s*$/.test(buf);
            const tooLong = buf.length >= maxChars;

            if (gap > gapMs || punctEnd || tooLong) {
                flush();
                start = s.startMs ?? start;
            }

            buf += (buf ? ' ' : '') + s.text.trim();
            lastEnd = s.endMs ?? s.startMs ?? lastEnd;
        }
        flush();
        return out;
    }

  const focusAssignmentId = focusMeta.source === 'homework' ? focusMeta.assignmentId : undefined;

  const homeworkPickerElement = (
    <HomeworkWordPicker
      open={homeworkPickerOpen}
      studentId={studentId}
      currentAssignmentId={focusAssignmentId}
      onClose={handleCloseHomeworkPicker}
      onApply={handleApplyHomeworkWords}
    />
  );

  const content = (
      <Box
          ref={listRef}
          sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}
      >
        {/* Header */}
          {!embedded && (
              <Typography variant="h6" sx={{ flex: 1, fontWeight: 700 }}>
                  Live Transcript
              </Typography>
          )}
          {isTutor && (<Box
              sx={{
                  position: 'sticky', top: 0, zIndex: 1,
                  bgcolor: 'background.paper',
                  p: 1.5,
                  borderBottom: '1px solid', borderColor: 'divider',
                  boxShadow: (t) => t.shadows[1],
              }}
          >
          <Stack direction="row" alignItems="center" spacing={1}>
          {isTranscribing ? (
              <Button variant="outlined" color="primary" onClick={handleStop} startIcon={<StopIcon/>}>
                  Stop
              </Button>
          ) : (
              <Button variant="contained" color="primary" onClick={handleStart} startIcon={<PlayArrowIcon/>} disabled={!call}>
                  Start
              </Button>
          )}
          <Button onClick={handleClear}>Clear transcript</Button>
        <IconButton aria-label="More" onClick={openMenu}>
          <MoreVertIcon />
        </IconButton>
        <Menu anchorEl={menuEl} open={Boolean(menuEl)} onClose={closeMenu}>
          <MenuItem onClick={() => { setDebugOpen(v => !v); closeMenu(); }}>
            <ListItemIcon><MoreVertIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary={debugOpen ? 'Hide developer tools' : 'Show developer tools'} />
          </MenuItem>
          <MenuItem onClick={() => { copyAllText(segments); closeMenu(); }}>
            <ListItemIcon><ContentCopyOutlinedIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Copy transcript" />
          </MenuItem>
          <MenuItem onClick={() => { downloadTxt(segments); closeMenu(); }}>
            <ListItemIcon><FileDownloadOutlinedIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Export .txt" />
          </MenuItem>
          <MenuItem onClick={() => { setAutoscroll(v => !v); closeMenu(); }}>
            <ListItemIcon>{/* iconless toggle */}</ListItemIcon>
            <ListItemText primary={autoscroll ? 'Autoscroll: On' : 'Autoscroll: Off'} />
          </MenuItem>
          <MenuItem onClick={() => { togglePause(); closeMenu(); }}>
            <ListItemIcon>{paused ? <PlayCircleOutlineIcon fontSize="small" /> : <PauseOutlinedIcon fontSize="small" />}</ListItemIcon>
            <ListItemText primary={paused ? 'Resume stream' : 'Pause stream'} />
          </MenuItem>
        </Menu>
          {/* Status row */}
          <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
              <Chip size="small" variant="outlined" color={connectionChip.color} label={connectionChip.label} />
              <Chip size="small" variant="outlined" color={studentChip.color} label={studentChip.label} />
              <Chip
                  size="small"
                  variant={isTranscribing ? 'filled' : 'outlined'}
                  color={transcriptionChip.color}
                  label={transcriptionChip.label}
              />
          </Stack>

          </Stack>
        </Box>)}

        <Box sx={{ mt: isTutor? 2 : 0, mb: 1 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="subtitle2">Keywords</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip size="small" variant="outlined" label={`${focusWords.length} words`} />
                <Chip size="small" variant="outlined" label={`Source: ${focusMeta.source === 'homework' ? `Homework${focusMeta.label ? ' — ' + focusMeta.label : ''}` : 'Manual'}`} />
                {isTutor && (
                  <Button size="small" onClick={() => { clearFocusWords(); enqueueSnackbar('Focus words cleared', { variant: 'info' }); }}>Clear</Button>
                )}
              </Stack>
            </Stack>
            {isTutor && (
              <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
                <Button size="small" variant="outlined" onClick={handleOpenHomeworkPicker}>
                  Pick from homework
                </Button>
                <TextField
                  size="small"
                  placeholder="Add words (comma/space separated)"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={handleManualKeyDown}
                  sx={{ flexGrow: 1, minWidth: 200 }}
                />
                <Button size="small" variant="outlined" onClick={applyManualWords} disabled={!manualInput.trim()}>
                  Add
                </Button>
              </Stack>
            )}
          <Stack direction="row" spacing={0} flexWrap="wrap">
            {focusWords.map((w) => (
              <Chip key={w} label={`${w} · ${totals[w.toLowerCase()] ?? 0}`} size="small" onDelete={isTutor ? () => { const rest = focusWords.filter((x) => x !== w); setFocusWords(rest, { ...focusMeta }, 'replace'); } : undefined} sx={{ mr: .5, mb: .5 }} />
            ))}
          </Stack>
        </Box>

          <Divider />

          <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'flex-start' }}>
              <Box sx={{ maxWidth: '64ch', width: '100%' }}>
                  {paragraphs.map((p, i) => (
                      <Typography
                          key={i}
                          variant="body2"
                          sx={{
                              mb: 1.25,
                              lineHeight: 1.6,
                              letterSpacing: 0.1,
                              wordBreak: 'break-word',
                              '& mark': (theme) => ({
                                  backgroundColor: theme.palette.mode === 'light'
                                      ? 'rgba(253,200,80,.22)' : 'rgba(253,200,80,.30)',
                                  borderRadius: '4px',
                                  padding: '0 2px',
                                  boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.05)',
                              }),
                          }}
                      >
                          {renderHighlightedByStem(p.text, focusWords)}
                      </Typography>
                  ))}
              </Box>
          </Box>

        {isTutor && debugOpen && (
          <>
            <Divider sx={{ mt: 1, mb: 1 }} />
            <Typography variant="overline" sx={{ letterSpacing: 1 }}>Debug: Raw Daily STT</Typography>

            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap' }}>
              <Button variant="outlined" onClick={handleRawStartAll} disabled={!call || rawActive}>Start (all)</Button>
              <Button variant="outlined" onClick={handleRawStartSelected} disabled={!call || rawActive || !(selectedPid || studentSessionId)}>Start (selected)</Button>
              <Button variant="outlined" onClick={handleRawStartAllThenUpdate} disabled={!call || rawActive}>Start → Update(selected)</Button>
              <Button variant="outlined" onClick={handleRawUpdateSelected} disabled={!call || !rawActive || !(selectedPid || studentSessionId)}>Update(selected)</Button>
              <Button variant="outlined" color="warning" onClick={handleRawStop} disabled={!call}>Stop</Button>
              <Button onClick={dumpEnv}>Dump env</Button>
              <Button onClick={() => { setRawLogs([]); refreshParticipants(); }}>Clear logs</Button>
            </Stack>

            <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" sx={{ mr: 1 }}>participantId:</Typography>
              <select
                value={selectedPid ?? ''}
                onChange={(e) => setSelectedPid(e.target.value || undefined)}
                style={{ fontFamily: 'monospace', fontSize: 12 }}
              >
                <option value="">(auto)</option>
                {ptList.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </Box>

            <Box sx={{ bgcolor: 'grey.100', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: 12, maxHeight: 160, overflowY: 'auto' }}>
              {rawLogs.length === 0 ? (
                <Typography variant="caption" color="text.secondary">No logs yet.</Typography>
              ) : (
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{rawLogs.join('\n')}</pre>
              )}
            </Box>
          </>
        )}
      </Box>
  );

  if (embedded) {
    return (
      <>
        {content}
        {homeworkPickerElement}
      </>
    );
  }

  return (
    <>
      <Drawer anchor="right" open={!!open} onClose={onClose} PaperProps={{ sx: { width: 440 } }}>
        {content}
      </Drawer>
      {homeworkPickerElement}
    </>
  );
}

export default function TranscriptionPanel(props: Props) {
  const { call, ...rest } = props;
  // Provide the Daily call object to @daily-co/daily-react so useTranscription works.
  return (
    <DailyProvider callObject={call}>
      <TranscriptionPanelInner {...rest} call={call} />
    </DailyProvider>
  );
}

function plainText(segments: TranscriptSegment[]) {
  return segments
    .filter((s) => s.text?.trim())
    .map((s) => s.text.trim())
    .join('\n');
}

async function copyAllText(segments: TranscriptSegment[]) {
  await navigator.clipboard.writeText(plainText(segments));
}

function downloadTxt(segments: TranscriptSegment[]) {
  const blob = new Blob([plainText(segments)], { type: 'text/plain;charset=utf-8' });
  triggerDownload(blob, 'transcript.txt');
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TranscriptionState, TranscriptSegment } from './types';
import { extractSegmentKey, collectHitsFromRaw, mergeOrAppendSegment } from './highlight';

type Props = {
  call: any; // Daily call object
  studentSessionId?: string;
  homeworkWords: string[];
};

export function useDailyTranscription({ call, studentSessionId, homeworkWords }: Props) {
  const [state, setState] = useState<TranscriptionState>({ isActive: false, segments: [], totals: {} });
  const handlerRef = useRef<((ev: any) => void) | null>(null);
  const startedRef = useRef<((ev: any) => void) | null>(null);
  const stoppedRef = useRef<((ev: any) => void) | null>(null);
  const errorRef = useRef<((ev: any) => void) | null>(null);

  const start = useCallback(async () => {
    if (state.isActive) return;
    if (!call) return;

    const sid = studentSessionId;
    if (!sid) {
      console.warn('[Transcription] cannot start: missing student session id');
      return;
    }

    // Debug: print local permissions (owner/admin) so we immediately see if token wasn't applied.
    try {
      const parts = call?.participants?.();
      const me = parts?.local;
      const can = me?.permissions?.canAdmin;
      const canTranscription = can === true || (Array.isArray(can) && can.includes('transcription'));
      // eslint-disable-next-line no-console
      console.debug('[Transcription] starting…', {
        localOwner: me?.owner,
        canAdmin: me?.permissions?.canAdmin,
        targetSid: sid,
      });
      if (!me?.owner && !canTranscription) {
        console.warn('[Transcription] local participant is not a transcription admin. Start will likely fail.');
      }
    } catch {
      /* ignore */
    }

    // Prepare handlers BEFORE starting to avoid missing the first events.
    const onMsg = (ev: any) => {
      // eslint-disable-next-line no-console
      // console.debug('[Transcription] message', ev);
      const text: string = ev?.data?.text ?? '';
      const raw = ev?.data?.rawResponse;
      const isFinal = !!(ev?.data?.is_final ?? ev?.data?.final);

      const segId = extractSegmentKey(ev);
      const hits = collectHitsFromRaw(raw, homeworkWords, text);

      setState((prev) => {
        const nextSegs = mergeOrAppendSegment(prev.segments, {
          id: segId,
          text,
          isFinal,
          startMs: raw?.start ?? ev?.data?.start,
          endMs: raw?.end ?? ev?.data?.end,
          hits,
        });

        const nextTotals = { ...prev.totals };
        for (const h of hits) {
          const key = h.word.toLowerCase();
          nextTotals[key] = (nextTotals[key] ?? 0) + 1;
        }
        return { ...prev, segments: nextSegs, totals: nextTotals };
      });
    };

    const onStarted = (ev: any) => {
      // eslint-disable-next-line no-console
      console.debug('[Transcription] started', ev);
    };
    const onStopped = (ev: any) => {
      // eslint-disable-next-line no-console
      console.debug('[Transcription] stopped', ev);
    };
    const onError = (ev: any) => {
      console.error('[Transcription] error event', ev);
    };

    handlerRef.current = onMsg;
    startedRef.current = onStarted;
    stoppedRef.current = onStopped;
    errorRef.current = onError;

    call?.on?.('transcription-message', onMsg);
    call?.on?.('transcription-started', onStarted);
    call?.on?.('transcription-stopped', onStopped);
    call?.on?.('transcription-error', onError);

    try {
      await call?.startTranscription?.({
        participants: [sid],
        includeRawResponse: true,
        extra: {
          search: homeworkWords,
          keywords: homeworkWords.map((w) => `${w}:1.5`),
        },
      });
      setState((s) => ({ ...s, isActive: true }));
    } catch (e) {
      console.error('[Transcription] start failed', e);
      // Clean up listeners if start throws
      if (handlerRef.current) call?.off?.('transcription-message', handlerRef.current);
      if (startedRef.current) call?.off?.('transcription-started', startedRef.current);
      if (stoppedRef.current) call?.off?.('transcription-stopped', stoppedRef.current);
      if (errorRef.current) call?.off?.('transcription-error', errorRef.current);
      handlerRef.current = null;
      startedRef.current = null;
      stoppedRef.current = null;
      errorRef.current = null;
      return;
    }
  }, [state.isActive, call, studentSessionId, homeworkWords]);

  const stop = useCallback(async () => {
    if (!state.isActive) return;
    try {
      await call?.stopTranscription?.();
    } catch (e) {
      console.warn('[Transcription] stop threw (ignored)', e);
    }
    if (handlerRef.current) {
      call?.off?.('transcription-message', handlerRef.current);
      handlerRef.current = null;
    }
    if (startedRef.current) {
      call?.off?.('transcription-started', startedRef.current);
      startedRef.current = null;
    }
    if (stoppedRef.current) {
      call?.off?.('transcription-stopped', stoppedRef.current);
      stoppedRef.current = null;
    }
    if (errorRef.current) {
      call?.off?.('transcription-error', errorRef.current);
      errorRef.current = null;
    }
    setState((s) => ({ ...s, isActive: false }));
  }, [state.isActive, call]);

  const clear = useCallback(() => {
    setState((s) => ({ ...s, segments: [], totals: {} }));
  }, []);

  useEffect(() => {
    return () => {
      if (handlerRef.current) call?.off?.('transcription-message', handlerRef.current);
      if (startedRef.current) call?.off?.('transcription-started', startedRef.current);
      if (stoppedRef.current) call?.off?.('transcription-stopped', stoppedRef.current);
      if (errorRef.current) call?.off?.('transcription-error', errorRef.current);
    };
  }, [call]);

  return { state, start, stop, clear };
}

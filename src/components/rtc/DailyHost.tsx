import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import DailyIframe, { type DailyCall } from '@daily-co/daily-js';
import { useRtc } from '../../context/RtcContext';

type Props = {
  url: string;
  token?: string;
  onLeft?: () => void | Promise<void>;
};

let __DAILY_HOST_SEQ = 0;

export default function DailyHost({ url, token, onLeft }: Props) {
  // Stable container ref for Prebuilt
  const parentElRef = useRef<HTMLElement | null>(null);

  // Stable log helper
  const hostIdRef = useRef<number>(++__DAILY_HOST_SEQ);
  const log = (...args: any[]) => console.debug('[RTC-DAILY]', { hostId: hostIdRef.current }, ...args);

  // Stable callback to receive the parent element (prevents null->el->null thrash)
  const setParentEl = useCallback((el: HTMLDivElement | null) => {
    if (parentElRef.current !== el) {
      parentElRef.current = el;
      if (el) log('parentEl set');
    }
  }, []);

  // Prebuilt options are constant
  const prebuiltOptions = useMemo(() => ({ showLeaveButton: true }), []);

  const { setFailure, registerDailyCall } = useRtc();

  // Keep latest callbacks in refs (no effect churn)
  const onLeftRef = useRef<Props['onLeft']>(onLeft);
  useEffect(() => { onLeftRef.current = onLeft; }, [onLeft]);

  const setFailureRef = useRef<typeof setFailure>(setFailure);
  useEffect(() => { setFailureRef.current = setFailure; }, [setFailure]);

  // Single callFrame instance for this host
  const callFrameRef = useRef<DailyCall | null>(null);
  const joiningRef = useRef<Promise<void> | null>(null);
  const joiningKeyRef = useRef<string | undefined>(undefined);
  const queuedJoinRef = useRef<{ key: string; url: string; token?: string } | null>(null);
  const joinedForKeyRef = useRef<string | undefined>(undefined);
  const suppressedLeftEventsRef = useRef<symbol[]>([]);

  const suppressNextLeftEvent = () => {
    const token = Symbol('suppress-left');
    suppressedLeftEventsRef.current.push(token);
    return () => {
      const idx = suppressedLeftEventsRef.current.indexOf(token);
      if (idx >= 0) {
        suppressedLeftEventsRef.current.splice(idx, 1);
      }
    };
  };

  // Create frame once when container becomes available. No re-creations.
  useEffect(() => {
    const el = parentElRef.current;
    if (!el || callFrameRef.current) return;

    const cf = DailyIframe.createFrame(el, prebuiltOptions);
    callFrameRef.current = cf;
    registerDailyCall(cf);
    log('callFrame created');

    const onError = (e: any) => {
      console.error('[RTC-DAILY]', { hostId: hostIdRef.current }, 'error event', e);
      setFailureRef.current?.(e?.errorMsg || 'Call error');
    };
    const onLeftHandler = async () => {
      if (suppressedLeftEventsRef.current.length > 0) {
        suppressedLeftEventsRef.current.shift();
        log('left-meeting event suppressed');
        return;
      }
      log('left-meeting event');
      try { await onLeftRef.current?.(); } catch { /* no-op */ }
    };

    cf.on('error', onError);
    cf.on('left-meeting', onLeftHandler);

    return () => {
      // detach listeners and destroy if the container disappears before unmount
      try { cf.off('error', onError); } catch {/* no-op */}
      try { cf.off('left-meeting', onLeftHandler); } catch{/* no-op */}
      try { cf.destroy(); } catch {/* no-op */}
      callFrameRef.current = null;
      joinedForKeyRef.current = undefined;
      registerDailyCall(null);
      log('callFrame early-destroy (container lost)');
    };
  }, [prebuiltOptions, registerDailyCall]);

  // Join once per URL when we have a frame and a container
  useEffect(() => {
    const parentReady = !!parentElRef.current;
    const key = `${url}|${token ?? ''}`;
    log('join effect check', { hasCF: !!callFrameRef.current, parentReady, joinedForKey: joinedForKeyRef.current, key, tokenPresent: !!token });

    if (!callFrameRef.current || !parentReady) return;
    if (!token) { log('join postponed: token not yet available'); return; }
    if (joinedForKeyRef.current === key) {
      log('join skipped: already joined for this url+token');
      queuedJoinRef.current = null;
      return;
    }

    const startJoin = (args: { key: string; url: string; token?: string }) => {
      const cfCurrent = callFrameRef.current;
      if (!cfCurrent) {
        log('join aborted: missing callFrame for key', args.key);
        return;
      }

      joiningKeyRef.current = args.key;

      const joinOperation = (async () => {
        if (joinedForKeyRef.current && joinedForKeyRef.current !== args.key) {
          try {
            log('leave before switching rooms', { from: joinedForKeyRef.current, to: args.key });
            const releaseSuppression = suppressNextLeftEvent();
            try {
              await cfCurrent.leave();
            } catch (leaveErr) {
              releaseSuppression();
              throw leaveErr;
            }
          } catch (leaveErr) {
            console.warn('[RTC-DAILY]', { hostId: hostIdRef.current }, 'leave before rejoin failed', leaveErr);
          }
        }

        await cfCurrent.join({ url: args.url, token: args.token });
        joinedForKeyRef.current = args.key;
        const me = cfCurrent.participants().local;
        log('join resolved; owner=', me?.owner, 'canAdmin=', me?.permissions?.canAdmin);
      })();

      joiningRef.current = joinOperation;

      joinOperation.catch((e: any) => {
        console.error('[RTC-DAILY]', { hostId: hostIdRef.current }, 'join error', e);
        setFailureRef.current?.(e?.errorMsg || 'Call error');
      }).finally(() => {
        if (joiningRef.current === joinOperation) {
          joiningRef.current = null;
          joiningKeyRef.current = undefined;
        }

        if (queuedJoinRef.current) {
          const next = queuedJoinRef.current;
          queuedJoinRef.current = null;
          if (next && next.key !== joinedForKeyRef.current) {
            log('draining queued join', { key: next.key });
            startJoin(next);
          }
        }
      });
    };

    if (joiningRef.current) {
      if (joiningKeyRef.current === key) {
        log('join in-flight; skipping');
        return;
      }
      log('join queued: waiting for current join to finish before switching rooms', { current: joiningKeyRef.current, next: key });
      queuedJoinRef.current = { key, url, token };
      return;
    }

    startJoin({ key, url, token });
  }, [url, token]);

  // Unmount-only cleanup: leave and destroy the frame
  useEffect(() => {
    return () => {
      const cf = callFrameRef.current;
      log('unmount cleanup: leave+destroy', { hasCF: !!cf });
      if (!cf) return;
      try {
        const releaseSuppression = suppressNextLeftEvent();
        cf.leave()
          .catch((leaveErr) => {
            releaseSuppression();
            console.warn('[RTC-DAILY]', { hostId: hostIdRef.current }, 'leave during unmount failed', leaveErr);
          })
          .finally(() => cf.destroy());
      } catch {
        try { cf.destroy(); } catch {/* no-op */}
      }
      callFrameRef.current = null;
      joinedForKeyRef.current = undefined;
      registerDailyCall(null);
    };
  }, [registerDailyCall]);

  return (
    <div ref={setParentEl} style={{ width: '100%', height: '100%' }} />
  );
}

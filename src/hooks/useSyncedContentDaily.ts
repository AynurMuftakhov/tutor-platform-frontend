import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DailyCall, DailyEventObjectAppMessage } from '@daily-co/daily-js';

export interface SyncedContentState {
  open: boolean;
  contentId?: string;
  title?: string;
  focusBlockId?: string;
  locked: boolean;
  stateVersion: number;
}

type ContentAction =
  | { kind: 'open'; contentId: string; title?: string }
  | { kind: 'close' }
  | { kind: 'focus'; blockId: string }
  | { kind: 'navigate'; sectionId: string; rowId?: string }
  | { kind: 'lockScroll'; locked: boolean }
  | { kind: 'stateRequest' }
  | { kind: 'stateSnapshot'; snapshot: SyncedContentState };

interface ContentSyncPacket {
  type: 'CONTENT_SYNC';
  stateVersion: number;
  action: ContentAction;
}

/**
 * React hook to synchronize rich lesson content (open/close, focus, navigation)
 * across participants using Daily as the RTC provider. It mirrors the logic
 * from useSyncedContent for LiveKit rooms but sends JSON objects via
 * Daily's app-message API. The tutor is the source of truth for versioned
 * actions and snapshots; students request snapshots shortly after join.
 */
export function useSyncedContentDaily(
  dailyCall: DailyCall | null,
  isTutor: boolean,
  workspaceOpen?: boolean,
  openWorkspace?: () => void,
) {
  const [state, setState] = useState<SyncedContentState>({
    open: false,
    contentId: undefined,
    title: undefined,
    focusBlockId: undefined,
    locked: false,
    stateVersion: 0,
  });

  const versionRef = useRef(0);

  const publish = useCallback(
    (packet: ContentSyncPacket) => {
      if (!dailyCall) return;
      try {
        dailyCall.sendAppMessage(packet);
      } catch (e) {
        /* ignore send errors */
      }
    },
    [dailyCall],
  );

  const pushAction = useCallback(
    (action: ContentAction) => {
      // Only tutors send versioned actions
      if (!isTutor) return;
      versionRef.current += 1;
      const stateVersion = versionRef.current;
      publish({ type: 'CONTENT_SYNC', stateVersion, action });
    },
    [isTutor, publish],
  );

  const api = useMemo(
    () => ({
      state,
      open: (content: { id: string; title?: string }) => {
        setState((prev) => ({ ...prev, open: true, contentId: content.id, title: content.title }));
        // Ensure tutor's workspace is open when opening content
        try { if (openWorkspace && !workspaceOpen) openWorkspace(); } catch (e) { if (import.meta.env?.DEV) console.debug('openWorkspace failed', e); }
        pushAction({ kind: 'open', contentId: content.id, title: content.title });
      },
      close: () => {
        setState((prev) => ({ ...prev, open: false, contentId: undefined, title: undefined, focusBlockId: undefined }));
        pushAction({ kind: 'close' });
      },
      focus: (blockId: string) => {
        setState((prev) => ({ ...prev, focusBlockId: blockId }));
        pushAction({ kind: 'focus', blockId });
      },
      navigate: (target: { sectionId: string; rowId?: string }) => {
        pushAction({ kind: 'navigate', sectionId: target.sectionId, rowId: target.rowId });
      },
      setScrollLock: (locked: boolean) => {
        setState((prev) => ({ ...prev, locked }));
        pushAction({ kind: 'lockScroll', locked });
      },
      getMediaBinder: ({ blockId, materialId }: { blockId: string; materialId: string }) => {
        return {
          play: (time?: number) => {
            if (!dailyCall || !state.contentId) return;
            const pkt = { type: 'MATERIAL_SYNC', contentId: state.contentId!, blockId, materialId, action: 'play', time };
            try { dailyCall.sendAppMessage(pkt); } catch (e) { /* ignore send errors */ }
          },
          pause: () => {
            if (!dailyCall || !state.contentId) return;
            const pkt = { type: 'MATERIAL_SYNC', contentId: state.contentId!, blockId, materialId, action: 'pause' };
            try { dailyCall.sendAppMessage(pkt); } catch (e) { /* ignore send errors */ }
          },
          seek: (t: number) => {
            if (!dailyCall || !state.contentId) return;
            const pkt = { type: 'MATERIAL_SYNC', contentId: state.contentId!, blockId, materialId, action: 'seek', time: t };
            try { dailyCall.sendAppMessage(pkt); } catch (e) { /* ignore send errors */ }
          },
        };
      },
      getGrammarBinder: ({ blockId, materialId }: { blockId: string; materialId: string }) => {
        return {
          start: (timerSec?: number) => {
            if (!dailyCall || !state.contentId) return;
            const pkt = { type: 'GRAMMAR_SYNC', contentId: state.contentId!, blockId, materialId, action: 'start', timerSec };
            try { dailyCall.sendAppMessage(pkt); } catch (e) { /* ignore send errors */ }
          },
          reveal: () => {
            if (!dailyCall || !state.contentId) return;
            const pkt = { type: 'GRAMMAR_SYNC', contentId: state.contentId!, blockId, materialId, action: 'reveal' };
            try { dailyCall.sendAppMessage(pkt); } catch (e) { /* ignore send errors */ }
          },
          reset: () => {
            if (!dailyCall || !state.contentId) return;
            const pkt = { type: 'GRAMMAR_SYNC', contentId: state.contentId!, blockId, materialId, action: 'reset' };
            try { dailyCall.sendAppMessage(pkt); } catch (e) { /* ignore send errors */ }
          },
        };
      },
    }),
    [state, pushAction, dailyCall],
  );

  // Handle incoming CONTENT_SYNC packets
  useEffect(() => {
    if (!dailyCall) return;
    const handler = (event: DailyEventObjectAppMessage) => {
      const msg: any = event?.data;
      if (!msg || msg.type !== 'CONTENT_SYNC') return;
      const packet: ContentSyncPacket = msg;
      // Ignore if packet structure is unexpected
      if (!packet.action) return;
      // Version handling for non-snapshot actions (drop stale)
      if (packet.action.kind !== 'stateSnapshot') {
        if (packet.stateVersion <= versionRef.current) return;
        versionRef.current = packet.stateVersion;
      }
      const act = packet.action;
      if (act.kind === 'open') {
        setState((prev) => ({ ...prev, open: true, contentId: act.contentId, title: act.title }));
        // Ensure students open workspace when content is opened by tutor
        if (!isTutor && openWorkspace && !workspaceOpen) {
          try { openWorkspace(); } catch (e) { if (import.meta.env?.DEV) console.debug('openWorkspace failed', e); }
        }
        return;
      }
      if (act.kind === 'close') {
        setState({ open: false, contentId: undefined, title: undefined, focusBlockId: undefined, locked: false, stateVersion: versionRef.current });
        return;
      }
      if (act.kind === 'focus') {
        setState((prev) => ({ ...prev, focusBlockId: act.blockId, stateVersion: versionRef.current }));
        return;
      }
      if (act.kind === 'navigate') {
        setState((prev) => ({ ...prev, stateVersion: versionRef.current }));
        // Emit navigation event on window to allow listeners to react
        window.dispatchEvent(new CustomEvent('CONTENT_NAVIGATE', { detail: { sectionId: act.sectionId, rowId: act.rowId } }));
        return;
      }
      if (act.kind === 'lockScroll') {
        setState((prev) => ({ ...prev, locked: act.locked, stateVersion: versionRef.current }));
        return;
      }
      if (act.kind === 'stateRequest') {
        // Only tutors respond to state requests
        if (!isTutor) return;
        const snapshot: SyncedContentState = { ...state, stateVersion: versionRef.current };
        publish({ type: 'CONTENT_SYNC', stateVersion: versionRef.current, action: { kind: 'stateSnapshot', snapshot } });
        return;
      }
      if (act.kind === 'stateSnapshot') {
        // Students accept newer snapshot
        if (isTutor) return;
        const snap = act.snapshot;
        if (snap.stateVersion >= versionRef.current) {
          versionRef.current = snap.stateVersion;
          setState(snap);
        }
        return;
      }
    };
    dailyCall.on('app-message', handler);
    return () => {
      dailyCall.off('app-message', handler);
    };
  }, [dailyCall, isTutor, publish, state]);

  // On mount for students, request a snapshot from the tutor
  useEffect(() => {
    if (!dailyCall) return;
    if (isTutor) return;
    const t = setTimeout(() => {
      publish({ type: 'CONTENT_SYNC', stateVersion: versionRef.current, action: { kind: 'stateRequest' } });
    }, 400);
    return () => { clearTimeout(t); };
  }, [dailyCall, isTutor, publish]);

  return api;
}
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DailyCall, DailyEventObjectAppMessage } from '@daily-co/daily-js';

export interface SyncedContentState {
  open: boolean;
  contentId?: string;
  title?: string;
  focusBlockId?: string;
  locked: boolean;
  scrollRatio: number;
  stateVersion: number;
}

type ContentAction =
  | { kind: 'open'; contentId: string; title?: string }
  | { kind: 'close' }
  | { kind: 'focus'; blockId: string }
  | { kind: 'navigate'; sectionId: string; rowId?: string }
  | { kind: 'lockScroll'; locked: boolean }
  | { kind: 'scroll'; ratio: number }
  | { kind: 'stateRequest' }
  | { kind: 'stateSnapshot'; snapshot: SyncedContentState };

interface ContentSyncPacketBase { type: 'CONTENT_SYNC'; stateVersion: number }
interface ContentSyncPacket extends ContentSyncPacketBase { action: ContentAction }

// Enriched packets for other subsystems; we only publish from binders.
interface MaterialSyncPacket {
  type: 'MATERIAL_SYNC';
  lessonId?: string;
  contentId: string;
  blockId: string;
  materialId: string;
  action: 'open' | 'play' | 'pause' | 'seek' | 'close';
  time?: number;
}

interface GrammarSyncPacket {
  type: 'GRAMMAR_SYNC';
  lessonId?: string;
  contentId: string;
  blockId: string;
  materialId: string;
  action: 'open' | 'update' | 'close' | 'reveal' | 'reset' | 'start';
  // optional extra fields for grammar orchestration
  itemId?: string;
  gapIndex?: number;
  value?: string;
  timerSec?: number;
}

// -----------------------------------------------
// Utilities & Type Guards (kept outside component)
// -----------------------------------------------
const isOpenAction = function (a: ContentAction): a is Extract<ContentAction, { kind: 'open' }> {
    return a.kind === 'open';
};
const isCloseAction = function (a: ContentAction): a is Extract<ContentAction, { kind: 'close' }> {
    return a.kind === 'close';
};
const isFocusAction = function (a: ContentAction): a is Extract<ContentAction, { kind: 'focus' }> {
    return a.kind === 'focus';
};
const isNavigateAction = function (a: ContentAction): a is Extract<ContentAction, { kind: 'navigate' }> {
    return a.kind === 'navigate';
};
const isLockScrollAction = function (a: ContentAction): a is Extract<ContentAction, { kind: 'lockScroll' }> {
    return a.kind === 'lockScroll';
};
const isScrollAction = function (a: ContentAction): a is Extract<ContentAction, { kind: 'scroll' }> {
    return a.kind === 'scroll';
};
const isStateRequestAction = function (a: ContentAction): a is Extract<ContentAction, { kind: 'stateRequest' }> {
    return a.kind === 'stateRequest';
};
const isStateSnapshotAction = function (a: ContentAction): a is Extract<ContentAction, { kind: 'stateSnapshot' }> {
    return a.kind === 'stateSnapshot';
};

const emitNavigate = (sectionId: string, rowId?: string) => {
  window.dispatchEvent(new CustomEvent('CONTENT_NAVIGATE', { detail: { sectionId, rowId } }));
};

export function useSyncedContent(call: DailyCall | null | undefined, isTutor: boolean) {
  const [state, setState] = useState<SyncedContentState>({
    open: false,
    contentId: undefined,
    focusBlockId: undefined,
    locked: false,
    scrollRatio: 0,
    stateVersion: 0,
  });

  const versionRef = useRef(0);

  const publish = useCallback((packet: ContentSyncPacket) => {
      if (!call) return;
    try {
        call.sendAppMessage(packet);
    } catch {
      // ignore errors when connection is closed/closing
    }
  }, [call]);

  const pushAction = useCallback((action: ContentAction) => {
    // Tutor is the source of truth for versioned actions/snapshots
    if (!isTutor) return;
    versionRef.current += 1;
    const stateVersion = versionRef.current;
    publish({ type: 'CONTENT_SYNC', stateVersion, action });
  }, [isTutor, publish]);

  // ----------------
  // Public API
  // ----------------
  const api = useMemo(() => ({
    state,
    open: (content: { id: string; title?: string }) => {
      setState((prev) => ({ ...prev, open: true, contentId: content.id, title: content.title, scrollRatio: 0 }));
      pushAction({ kind: 'open', contentId: content.id, title: content.title });
    },
    close: () => {
      setState((prev) => ({ ...prev, open: false, contentId: undefined, title: undefined, focusBlockId: undefined, scrollRatio: 0 }));
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
    syncScroll: (ratio: number) => {
      if (!Number.isFinite(ratio)) return;
      const clamped = Math.max(0, Math.min(1, ratio));
      setState((prev) => ({ ...prev, scrollRatio: clamped }));
      pushAction({ kind: 'scroll', ratio: clamped });
    },
    getMediaBinder: ({ blockId, materialId }: { blockId: string; materialId: string }) => {
      return {
        play: (time?: number) => {
          if (!call || !state.contentId) return;
          if (call.meetingState?.() !== 'joined-meeting') return;
          const pkt: MaterialSyncPacket = { type: 'MATERIAL_SYNC', contentId: state.contentId, blockId, materialId, action: 'play', time };
          try { call.sendAppMessage(pkt); } catch { /* ignore */ }
        },
        pause: () => {
          if (!call || !state.contentId) return;
          if (call.meetingState?.() !== 'joined-meeting') return;
          const pkt: MaterialSyncPacket = { type: 'MATERIAL_SYNC', contentId: state.contentId, blockId, materialId, action: 'pause' };
          try { call.sendAppMessage(pkt); } catch { /* ignore */ }
        },
        seek: (t: number) => {
          if (!call || !state.contentId) return;
          if (call.meetingState?.() !== 'joined-meeting') return;
          const pkt: MaterialSyncPacket = { type: 'MATERIAL_SYNC', contentId: state.contentId, blockId, materialId, action: 'seek', time: t };
          try { call.sendAppMessage(pkt); } catch { /* ignore */ }
        },
      };
    },
    getGrammarBinder: ({ blockId, materialId }: { blockId: string; materialId: string }) => {
      return {
        start: (timerSec?: number) => {
          if (!call || !state.contentId) return;
          if (call.meetingState?.() !== 'joined-meeting') return;
          const pkt: GrammarSyncPacket = { type: 'GRAMMAR_SYNC', contentId: state.contentId, blockId, materialId, action: 'start', timerSec };
          try { call.sendAppMessage(pkt); } catch { /* ignore */ }
        },
        reveal: () => {
          if (!call || !state.contentId) return;
          if (call.meetingState?.() !== 'joined-meeting') return;
          const pkt: GrammarSyncPacket = { type: 'GRAMMAR_SYNC', contentId: state.contentId, blockId, materialId, action: 'reveal' };
          try { call.sendAppMessage(pkt); } catch { /* ignore */ }
        },
        reset: () => {
          if (!call || !state.contentId) return;
          if (call.meetingState?.() !== 'joined-meeting') return;
          const pkt: GrammarSyncPacket = { type: 'GRAMMAR_SYNC', contentId: state.contentId, blockId, materialId, action: 'reset' };
          try { call.sendAppMessage(pkt); } catch { /* ignore */ }
        },
      };
    },
  }), [pushAction, call, state]);

  // -----------------------
  // Handle incoming data
  // -----------------------
  useEffect(() => {
    if (!call) return;

    const onAppMessage = (event: DailyEventObjectAppMessage) => {
      const payload = event?.data;
      if (!payload) return;
      let msg: ContentSyncPacket | null = null;
      if (typeof payload === 'string') {
        try {
          const parsed = JSON.parse(payload);
          if (parsed?.type === 'CONTENT_SYNC') {
            msg = parsed as ContentSyncPacket;
          }
        } catch {
          return;
        }
      } else if (typeof payload === 'object') {
        if ((payload as any)?.type === 'CONTENT_SYNC') {
          msg = payload as ContentSyncPacket;
        }
      }
      if (!msg) return;

      // 2) Version handling for non-snapshot actions (drop stale)
      if (!isStateSnapshotAction(msg.action)) {
        if (msg.stateVersion <= versionRef.current) return; // stale
        versionRef.current = msg.stateVersion;
      }

      const act = msg.action;

      // 3) Dispatch by kind using type guards (no unsafe property access)
      if (isOpenAction(act)) {
        setState((prev) => ({ ...prev, open: true, contentId: act.contentId, title: act.title, scrollRatio: 0 }));
        return;
      }

      if (isCloseAction(act)) {
        setState({ open: false, contentId: undefined, title: undefined, focusBlockId: undefined, locked: false, scrollRatio: 0, stateVersion: versionRef.current });
        return;
      }

      if (isFocusAction(act)) {
        setState((prev) => ({ ...prev, focusBlockId: act.blockId, stateVersion: versionRef.current }));
        return;
      }

      if (isNavigateAction(act)) {
        // navigation handled by SyncedContentView; just bump version and emit event
        setState((prev) => ({ ...prev, stateVersion: versionRef.current }));
        emitNavigate(act.sectionId, act.rowId);
        return;
      }

      if (isLockScrollAction(act)) {
        setState((prev) => ({ ...prev, locked: act.locked, stateVersion: versionRef.current }));
        return;
      }

      if (isScrollAction(act)) {
        if (isTutor) return;
        const ratio = Math.max(0, Math.min(1, Number(act.ratio ?? 0)));
        setState((prev) => ({ ...prev, scrollRatio: ratio, stateVersion: versionRef.current }));
        window.dispatchEvent(new CustomEvent('CONTENT_SCROLL', { detail: { ratio } }));
        return;
      }

      if (isStateRequestAction(act)) {
        // Only tutor answers with a snapshot
        if (!isTutor) return;
        const snapshot: SyncedContentState = { ...state, stateVersion: versionRef.current };
        const pkt: ContentSyncPacket = { type: 'CONTENT_SYNC', stateVersion: versionRef.current, action: { kind: 'stateSnapshot', snapshot } };
        publish(pkt);
        return;
      }

      if (isStateSnapshotAction(act)) {
        // Students accept newer snapshot
        if (isTutor) return;
        const snap = act.snapshot;
        if (snap.stateVersion >= versionRef.current) {
          versionRef.current = snap.stateVersion;
          const normalizedSnap: SyncedContentState = {
            ...snap,
            scrollRatio: Math.max(0, Math.min(1, snap.scrollRatio ?? 0)),
          };
          setState(normalizedSnap);
          window.dispatchEvent(new CustomEvent('CONTENT_SCROLL', { detail: { ratio: normalizedSnap.scrollRatio } }));
        }
        return;
      }
    };

    const localSessionId = (() => {
      try {
        return call.participants()?.local?.session_id;
      } catch {
        return undefined;
      }
    })();

    const handler = (event: DailyEventObjectAppMessage) => {
      if (event.fromId && event.fromId === localSessionId) return;
      onAppMessage(event);
    };

    call.on('app-message', handler);
    // Important: return a void destructor (not a function returning something)
    return () => { call.off('app-message', handler); };
  }, [call, isTutor, publish]);

  // On mount for students, request state snapshot
  useEffect(() => {
    if (!call) return;
    if (isTutor) return;
    // ask for snapshot shortly after join
    const t = setTimeout(() => {
      const pkt: ContentSyncPacket = { type: 'CONTENT_SYNC', stateVersion: versionRef.current, action: { kind: 'stateRequest' } };
      publish(pkt);
    }, 400);
    return () => { clearTimeout(t); };
  }, [call, isTutor, publish]);

  return api;
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Room } from 'livekit-client';

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
const DECODER = new TextDecoder();
const ENCODER = new TextEncoder();

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
const isStateRequestAction = function (a: ContentAction): a is Extract<ContentAction, { kind: 'stateRequest' }> {
    return a.kind === 'stateRequest';
};
const isStateSnapshotAction = function (a: ContentAction): a is Extract<ContentAction, { kind: 'stateSnapshot' }> {
    return a.kind === 'stateSnapshot';
};

const emitNavigate = (sectionId: string, rowId?: string) => {
  window.dispatchEvent(new CustomEvent('CONTENT_NAVIGATE', { detail: { sectionId, rowId } }));
};

export function useSyncedContent(room: Room | undefined, isTutor: boolean) {
  const [state, setState] = useState<SyncedContentState>({
    open: false,
    contentId: undefined,
    focusBlockId: undefined,
    locked: false,
    stateVersion: 0,
  });

  const versionRef = useRef(0);
  const suppressLocalEvent = useRef(false); // kept to avoid regression even if not used yet

  const isRoomReady = () => {
    try {
      const anyRoom = room as any;
      const connState: string | undefined = anyRoom?.state ?? anyRoom?.connectionState;
      return !!room && connState === 'connected';
    } catch {
      return false;
    }
  };

  const publish = useCallback((packet: ContentSyncPacket) => {
    if (!isRoomReady()) return;
    try {
      const data = ENCODER.encode(JSON.stringify(packet));
      room!.localParticipant.publishData(data, { reliable: true });
    } catch {
      // ignore errors when connection is closed/closing
    }
  }, [room]);

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
      setState((prev) => ({ ...prev, open: true, contentId: content.id, title: content.title }));
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
          if (!room || !state.contentId) return;
          if (!isRoomReady()) return;
          const pkt: MaterialSyncPacket = { type: 'MATERIAL_SYNC', contentId: state.contentId, blockId, materialId, action: 'play', time };
          try { room.localParticipant.publishData(ENCODER.encode(JSON.stringify(pkt)), { reliable: true }); } catch { /* ignore */}
        },
        pause: () => {
          if (!room || !state.contentId) return;
          if (!isRoomReady()) return;
          const pkt: MaterialSyncPacket = { type: 'MATERIAL_SYNC', contentId: state.contentId, blockId, materialId, action: 'pause' };
          try { room.localParticipant.publishData(ENCODER.encode(JSON.stringify(pkt)), { reliable: true }); } catch { /* ignore */}
        },
        seek: (t: number) => {
          if (!room || !state.contentId) return;
          if (!isRoomReady()) return;
          const pkt: MaterialSyncPacket = { type: 'MATERIAL_SYNC', contentId: state.contentId, blockId, materialId, action: 'seek', time: t };
          try { room.localParticipant.publishData(ENCODER.encode(JSON.stringify(pkt)), { reliable: true }); } catch { /* ignore */}
        },
      };
    },
    getGrammarBinder: ({ blockId, materialId }: { blockId: string; materialId: string }) => {
      return {
        start: (timerSec?: number) => {
          if (!room || !state.contentId) return;
          if (!isRoomReady()) return;
          const pkt: GrammarSyncPacket = { type: 'GRAMMAR_SYNC', contentId: state.contentId, blockId, materialId, action: 'start', timerSec };
          try { room.localParticipant.publishData(ENCODER.encode(JSON.stringify(pkt)), { reliable: true }); } catch { /* ignore */}
        },
        reveal: () => {
          if (!room || !state.contentId) return;
          if (!isRoomReady()) return;
          const pkt: GrammarSyncPacket = { type: 'GRAMMAR_SYNC', contentId: state.contentId, blockId, materialId, action: 'reveal' };
          try { room.localParticipant.publishData(ENCODER.encode(JSON.stringify(pkt)), { reliable: true }); } catch { /* ignore */}
        },
        reset: () => {
          if (!room || !state.contentId) return;
          if (!isRoomReady()) return;
          const pkt: GrammarSyncPacket = { type: 'GRAMMAR_SYNC', contentId: state.contentId, blockId, materialId, action: 'reset' };
          try { room.localParticipant.publishData(ENCODER.encode(JSON.stringify(pkt)), { reliable: true }); } catch { /* ignore */}
        },
      };
    },
  }), [pushAction, room, state]);

  // -----------------------
  // Handle incoming data
  // -----------------------
  useEffect(() => {
    if (!room) return;

    const onData = (data: Uint8Array) => {
      // 1) Decode + parse; ignore non-CONTENT_SYNC
      let msg: ContentSyncPacket | null = null;
      try {
        const payload = JSON.parse(DECODER.decode(data));
        if (payload?.type !== 'CONTENT_SYNC') return;
        msg = payload as ContentSyncPacket;
      } catch {
        return; // ignore non-JSON / other channels
      }

      // 2) Version handling for non-snapshot actions (drop stale)
      if (!isStateSnapshotAction(msg.action)) {
        if (msg.stateVersion <= versionRef.current) return; // stale
        versionRef.current = msg.stateVersion;
      }

      const act = msg.action;

      // 3) Dispatch by kind using type guards (no unsafe property access)
      if (isOpenAction(act)) {
        setState((prev) => ({ ...prev, open: true, contentId: act.contentId, title: act.title }));
        return;
      }

      if (isCloseAction(act)) {
        setState({ open: false, contentId: undefined, title: undefined, focusBlockId: undefined, locked: false, stateVersion: versionRef.current });
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
          setState(snap);
        }
        return;
      }
    };

    room.on('dataReceived', onData);
    // Important: return a void destructor (not a function returning something)
    return () => { room.off('dataReceived', onData); };
  }, [room, isTutor, publish, state]);

  // On mount for students, request state snapshot
  useEffect(() => {
    if (!room) return;
    if (isTutor) return;
    // ask for snapshot shortly after join
    const t = setTimeout(() => {
      const pkt: ContentSyncPacket = { type: 'CONTENT_SYNC', stateVersion: versionRef.current, action: { kind: 'stateRequest' } };
      publish(pkt);
    }, 400);
    return () => { clearTimeout(t); };
  }, [room, isTutor, publish]);

  return api;
}

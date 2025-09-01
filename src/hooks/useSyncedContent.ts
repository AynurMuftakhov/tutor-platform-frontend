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

export function useSyncedContent(room: Room | undefined, isTutor: boolean) {
  const [state, setState] = useState<SyncedContentState>({
    open: false,
    contentId: undefined,
    focusBlockId: undefined,
    locked: false,
    stateVersion: 0,
  });

  const versionRef = useRef(0);
  const suppressLocalEvent = useRef(false);

  const isRoomReady = () => {
    try {
      const anyRoom = room as any;
      const state: string | undefined = anyRoom?.state ?? anyRoom?.connectionState;
      return !!room && state === 'connected';
    } catch {
      return false;
    }
  };

  const publish = useCallback((packet: ContentSyncPacket) => {
    if (!isRoomReady()) return;
    try {
      const data = new TextEncoder().encode(JSON.stringify(packet));
      room!.localParticipant.publishData(data, { reliable: true });
    } catch (e) {
      // swallow errors when connection is closed or closing
    }
  }, [room]);

  const pushAction = useCallback((action: ContentAction) => {
    // Tutor is the source of truth for versioned actions/snapshots
    if (!isTutor) return;
    versionRef.current += 1;
    const stateVersion = versionRef.current;
    publish({ type: 'CONTENT_SYNC', stateVersion, action });
  }, [isTutor, publish]);

  // Public API
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
          try {
            room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(pkt)), { reliable: true });
          } catch (_) { /* ignore */ }
        },
        pause: () => {
          if (!room || !state.contentId) return;
          if (!isRoomReady()) return;
          const pkt: MaterialSyncPacket = { type: 'MATERIAL_SYNC', contentId: state.contentId, blockId, materialId, action: 'pause' };
          try {
            room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(pkt)), { reliable: true });
          } catch (_) { /* ignore */ }
        },
        seek: (t: number) => {
          if (!room || !state.contentId) return;
          if (!isRoomReady()) return;
          const pkt: MaterialSyncPacket = { type: 'MATERIAL_SYNC', contentId: state.contentId, blockId, materialId, action: 'seek', time: t };
          try {
            room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(pkt)), { reliable: true });
          } catch (_) { /* ignore */ }
        },
      };
    },
    getGrammarBinder: ({ blockId, materialId }: { blockId: string; materialId: string }) => {
      return {
        start: (timerSec?: number) => {
          if (!room || !state.contentId) return;
          if (!isRoomReady()) return;
          const pkt: GrammarSyncPacket = { type: 'GRAMMAR_SYNC', contentId: state.contentId, blockId, materialId, action: 'start', timerSec };
          try {
            room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(pkt)), { reliable: true });
          } catch (_) { /* ignore */ }
        },
        reveal: () => {
          if (!room || !state.contentId) return;
          if (!isRoomReady()) return;
          const pkt: GrammarSyncPacket = { type: 'GRAMMAR_SYNC', contentId: state.contentId, blockId, materialId, action: 'reveal' };
          try {
            room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(pkt)), { reliable: true });
          } catch (_) { /* ignore */ }
        },
        reset: () => {
          if (!room || !state.contentId) return;
          if (!isRoomReady()) return;
          const pkt: GrammarSyncPacket = { type: 'GRAMMAR_SYNC', contentId: state.contentId, blockId, materialId, action: 'reset' };
          try {
            room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(pkt)), { reliable: true });
          } catch (_) { /* ignore */ }
        },
      };
    },
  }), [pushAction, room, state]);

  // Handle incoming data
  useEffect(() => {
    if (!room) return;
    const onData = (data: Uint8Array) => {
      try {
        const payload = JSON.parse(new TextDecoder().decode(data));
        if (payload?.type !== 'CONTENT_SYNC') return;
        const msg = payload as ContentSyncPacket;
        // For non-snapshot actions, drop stale based on version
        if (msg.action.kind !== 'stateSnapshot' && msg.stateVersion <= versionRef.current) {
          return; // stale
        }
        if (msg.action.kind !== 'stateSnapshot') {
          versionRef.current = msg.stateVersion;
        }

        switch (msg.action.kind) {
          case 'open': {
            setState((prev) => ({ ...prev, open: true, contentId: msg.action.contentId, title: msg.action.title }));
            break;
          }
          case 'close': {
            setState({ open: false, contentId: undefined, title: undefined, focusBlockId: undefined, locked: false, stateVersion: versionRef.current });
            break;
          }
          case 'focus': {
            setState((prev) => ({ ...prev, focusBlockId: msg.action.blockId, stateVersion: versionRef.current }));
            break;
          }
          case 'navigate': {
            // navigation handled by SyncedContentView using the action; we only bump version
            setState((prev) => ({ ...prev, stateVersion: versionRef.current }));
            // bubble a custom event so SyncedContentView can listen
            window.dispatchEvent(new CustomEvent('CONTENT_NAVIGATE', { detail: { sectionId: msg.action.sectionId, rowId: msg.action.rowId } }));
            break;
          }
          case 'lockScroll': {
            setState((prev) => ({ ...prev, locked: msg.action.locked, stateVersion: versionRef.current }));
            break;
          }
          case 'stateRequest': {
            if (!isTutor) return; // only tutor answers
            const snapshot: SyncedContentState = { ...state, stateVersion: versionRef.current };
            const pkt: ContentSyncPacket = { type: 'CONTENT_SYNC', stateVersion: versionRef.current, action: { kind: 'stateSnapshot', snapshot } };
            publish(pkt);
            break;
          }
          case 'stateSnapshot': {
            if (isTutor) return; // students only
            // Accept snapshot if newer or we have no state open
            const snap = msg.action.snapshot;
            if (snap.stateVersion >= versionRef.current) {
              versionRef.current = snap.stateVersion;
              setState(snap);
            }
            break;
          }
        }
      } catch (e) {
        // ignore parse errors for other channels
      }
    };
    room.on('dataReceived', onData);
    return () => room.off('dataReceived', onData);
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
    return () => clearTimeout(t);
  }, [room, isTutor, publish]);

  return api;
}

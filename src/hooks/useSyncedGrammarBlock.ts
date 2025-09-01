import { useCallback, useEffect, useRef, useState } from 'react';
import type { Room } from 'livekit-client';

interface UseSyncedGrammarBlockArgs {
  room: Room | undefined;
  isTutor: boolean;
  contentId: string;
  blockId: string;
  materialId: string;
}

interface GrammarSyncPacket {
  type: 'GRAMMAR_SYNC';
  contentId: string;
  blockId: string;
  materialId: string;
  action: 'open' | 'update' | 'close' | 'reveal' | 'reset' | 'start';
  itemId?: string;
  gapIndex?: number;
  value?: string;
  timerSec?: number;
}

export function useSyncedGrammarBlock({ room, isTutor, contentId, blockId, materialId }: UseSyncedGrammarBlockArgs) {
  const [isActive, setIsActive] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const suppressLocal = useRef(false);

  const isRoomReady = () => {
    try {
      // livekit Room has a state/connectionState; avoid publishing if not connected
      const anyRoom = room as any;
      const state: any = anyRoom?.state ?? anyRoom?.connectionState;
      return !!room && (state === 'connected' || state === 2);
    } catch {
      return false;
    }
  };

  const publish = useCallback((pkt: GrammarSyncPacket) => {
    if (!isRoomReady()) return;
    try {
      const data = new TextEncoder().encode(JSON.stringify(pkt));
      room!.localParticipant.publishData(data, { reliable: true });
    } catch (e) {
      // swallow errors when room peer connection is already closed
      // avoids "PC manager is closed" exceptions surfacing to UI
    }
  }, [room]);

  const start = useCallback((timerSec?: number) => {
    setIsActive(true);
    setIsRevealed(false);
    if (suppressLocal.current) { suppressLocal.current = false; return; }
    if (isTutor) publish({ type: 'GRAMMAR_SYNC', contentId, blockId, materialId, action: 'start', timerSec });
  }, [isTutor, publish, contentId, blockId, materialId]);

  const reveal = useCallback(() => {
    setIsRevealed(true);
    if (suppressLocal.current) { suppressLocal.current = false; return; }
    if (isTutor) publish({ type: 'GRAMMAR_SYNC', contentId, blockId, materialId, action: 'reveal' });
  }, [isTutor, publish, contentId, blockId, materialId]);

  const reset = useCallback(() => {
    setIsActive(false);
    setIsRevealed(false);
    if (suppressLocal.current) { suppressLocal.current = false; return; }
    if (isTutor) publish({ type: 'GRAMMAR_SYNC', contentId, blockId, materialId, action: 'reset' });
  }, [isTutor, publish, contentId, blockId, materialId]);

  const emitAttempt = useCallback((itemId: string, gapIndex: number, value: string) => {
    if (suppressLocal.current) { suppressLocal.current = false; return; }
    if (!isRoomReady()) return;
    publish({ type: 'GRAMMAR_SYNC', contentId, blockId, materialId, action: 'update', itemId, gapIndex, value });
  }, [publish, contentId, blockId, materialId, room]);

  useEffect(() => {
    if (!room) return;
    const handler = (data: Uint8Array) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(data));
        if (msg?.type !== 'GRAMMAR_SYNC') return;
        const pkt = msg as GrammarSyncPacket;
        if (pkt.contentId !== contentId || pkt.blockId !== blockId || pkt.materialId !== materialId) return;
        switch (pkt.action) {
          case 'start':
            suppressLocal.current = true;
            setIsActive(true);
            setIsRevealed(false);
            // optional countdown can be handled by block UI via DOM event
            window.dispatchEvent(new CustomEvent('GRAMMAR_BLOCK_START', { detail: { contentId, blockId, timerSec: pkt.timerSec } }));
            break;
          case 'reveal':
            suppressLocal.current = true;
            setIsRevealed(true);
            window.dispatchEvent(new CustomEvent('GRAMMAR_BLOCK_REVEAL', { detail: { contentId, blockId } }));
            break;
          case 'reset':
            suppressLocal.current = true;
            setIsActive(false);
            setIsRevealed(false);
            window.dispatchEvent(new CustomEvent('GRAMMAR_BLOCK_RESET', { detail: { contentId, blockId } }));
            break;
          case 'update':
            // Mirror live typing to any listeners (e.g., GrammarPlayer in tutor view)
            window.dispatchEvent(new CustomEvent('GRAMMAR_BLOCK_ATTEMPT', {
              detail: { contentId, blockId, materialId, itemId: pkt.itemId, gapIndex: pkt.gapIndex, value: pkt.value }
            }));
            break;
          case 'close':
            suppressLocal.current = true;
            setIsActive(false);
            setIsRevealed(false);
            break;
        }
      } catch (_) {/* ignore */}
    };
    room.on('dataReceived', handler);
    return () => { room.off('dataReceived', handler); };
  }, [room, contentId, blockId, materialId]);

  return { start, reveal, reset, isActive, isRevealed, emitAttempt } as const;
}

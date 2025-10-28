import { useCallback, useEffect, useRef, useState } from 'react';
import type { DailyCall, DailyEventObjectAppMessage } from '@daily-co/daily-js';

interface UseSyncedGrammarBlockArgs {
  call: DailyCall | null | undefined;
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
  action: 'open' | 'update' | 'close' | 'reveal' | 'reset' | 'start' | 'score';
  itemId?: string;
  gapIndex?: number;
  value?: string;
  timerSec?: number;
  // When action === 'score', include minimal scoring details
  score?: {
    materialId: string;
    totalItems: number;
    correctItems: number;
    totalGaps: number;
    correctGaps: number;
    details: Array<{
      grammarItemId: string;
      gapResults: Array<{ index: number; student: string; correct: string; isCorrect: boolean }>
      itemCorrect: boolean;
    }>;
  };
}

export function useSyncedGrammarBlock({ call, isTutor, contentId, blockId, materialId }: UseSyncedGrammarBlockArgs) {
  const [isActive, setIsActive] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const suppressLocal = useRef(false);

  const isCallReady = () => {
    try {
      const state = call?.meetingState?.();
      return !!call && (state === 'joined-meeting' || state === 'joining-meeting');
    } catch {
      return false;
    }
  };

  const publish = useCallback((pkt: GrammarSyncPacket) => {
    if (!isCallReady()) return;
    try {
      call!.sendAppMessage(pkt);
    } catch (e) {
      // swallow errors when room peer connection is already closed
      // avoids "PC manager is closed" exceptions surfacing to UI
    }
  }, [call]);

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
    if (!isCallReady()) return;
    publish({ type: 'GRAMMAR_SYNC', contentId, blockId, materialId, action: 'update', itemId, gapIndex, value });
  }, [publish, contentId, blockId, materialId, call]);

  const emitScore = useCallback((score: GrammarSyncPacket['score']) => {
    if (!score) return;
    if (suppressLocal.current) { suppressLocal.current = false; return; }
    if (!isCallReady()) return;
    publish({ type: 'GRAMMAR_SYNC', contentId, blockId, materialId, action: 'score', score });
  }, [publish, contentId, blockId, materialId, call]);

  useEffect(() => {
    if (!call) return;

    const localSessionId = (() => {
      try {
        return call.participants().local?.session_id;
      } catch {
        return undefined;
      }
    })();

    const handler = (event: DailyEventObjectAppMessage) => {
      if (event.fromId && event.fromId === localSessionId) return;
      const payload = event.data;
      if (!payload) return;
      let pkt: GrammarSyncPacket | null = null;
      if (typeof payload === 'string') {
        try {
          const parsed = JSON.parse(payload);
          if (parsed?.type === 'GRAMMAR_SYNC') pkt = parsed as GrammarSyncPacket;
        } catch {
          return;
        }
      } else if (typeof payload === 'object' && (payload as any)?.type === 'GRAMMAR_SYNC') {
        pkt = payload as GrammarSyncPacket;
      }
      if (!pkt) return;
      if (pkt.contentId !== contentId || pkt.blockId !== blockId || pkt.materialId !== materialId) return;
      switch (pkt.action) {
        case 'start':
          suppressLocal.current = true;
          setIsActive(true);
          setIsRevealed(false);
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
          window.dispatchEvent(new CustomEvent('GRAMMAR_BLOCK_ATTEMPT', {
            detail: { contentId, blockId, materialId, itemId: pkt.itemId, gapIndex: pkt.gapIndex, value: pkt.value }
          }));
          break;
        case 'score':
          window.dispatchEvent(new CustomEvent('GRAMMAR_BLOCK_SCORE', {
            detail: { contentId, blockId, materialId, score: pkt.score }
          }));
          break;
        case 'close':
          suppressLocal.current = true;
          setIsActive(false);
          setIsRevealed(false);
          break;
      }
    };
    call.on('app-message', handler);
    return () => { call.off('app-message', handler); };
  }, [call, contentId, blockId, materialId]);

  return { start, reveal, reset, isActive, isRevealed, emitAttempt, emitScore } as const;
}

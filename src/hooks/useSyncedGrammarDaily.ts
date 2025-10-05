import { useCallback, useEffect, useRef, useState } from 'react';
import type { DailyCall, DailyEventObjectAppMessage } from '@daily-co/daily-js';
import type { Material } from '../components/materials/MaterialCard';

interface GrammarState {
  open: boolean;
  material: Material | null;
  answers: Record<string, Record<number, string>>;
}

interface GrammarSyncPacket {
  type: 'GRAMMAR_SYNC';
  lessonId?: string;
  materialId: string;
  material?: Material;
  action: 'open' | 'update' | 'close' | 'reveal' | 'reset' | 'start';
  itemId?: string;
  gapIndex?: number;
  value?: string;
  timerSec?: number;
}

export interface UseSyncedGrammarDailyResult {
  state: GrammarState;
  open: (material: Material) => void;
  close: () => void;
  updateAnswer: (itemId: string, gapIndex: number, value: string) => void;
  reveal: () => void;
  reset: () => void;
  start: (timerSec?: number) => void;
  isTutor: boolean;
}

/**
 * useSyncedGrammarDaily replicates the behaviour of useSyncedGrammar for
 * Daily calls. It synchronizes grammar exercises across tutor and student
 * via Daily's app-message API. The tutor is authoritative; students
 * react to incoming packets. It exposes methods used by WorkZone and
 * SyncedGrammarPlayer: open, close, updateAnswer, reveal, reset, start.
 */
export function useSyncedGrammarDaily(
  dailyCall: DailyCall | null,
  isTutor: boolean,
  workspaceOpen?: boolean,
  openWorkspace?: () => void,
): UseSyncedGrammarDailyResult {
  const [state, setState] = useState<GrammarState>({ open: false, material: null, answers: {} });
  const suppressLocalEvent = useRef(false);

  // Helper: send GRAMMAR_SYNC packets
  const publishData = useCallback(
    (packet: GrammarSyncPacket) => {
      if (!dailyCall) return;
      try {
        dailyCall.sendAppMessage(packet);
      } catch {
        /* ignore send errors */
      }
    },
    [dailyCall],
  );

  // Tutor opens a grammar material
  const open = useCallback(
    (material: Material) => {
      if (!material) return;
      setState({ open: true, material, answers: {} });
      if (isTutor) {
        publishData({ type: 'GRAMMAR_SYNC', materialId: material.id, material, action: 'open' });
      }
    },
    [isTutor, publishData],
  );

  // Tutor closes the grammar session
  const close = useCallback(() => {
    if (!state.material) return;
    if (!suppressLocalEvent.current) {
      publishData({ type: 'GRAMMAR_SYNC', materialId: state.material.id, action: 'close' });
    } else {
      suppressLocalEvent.current = false;
    }
    setState({ open: false, material: null, answers: {} });
  }, [state.material, publishData]);

  // Tutor updates an answer (gap fill); sends update packet
  const updateAnswer = useCallback(
    (itemId: string, gapIndex: number, value: string) => {
      if (!state.material) return;
      setState((prev) => ({
        ...prev,
        answers: {
          ...prev.answers,
          [itemId]: {
            ...(prev.answers[itemId] || {}),
            [gapIndex]: value,
          },
        },
      }));

      if (!suppressLocalEvent.current) {
        publishData({
          type: 'GRAMMAR_SYNC',
          materialId: state.material.id,
          action: 'update',
          itemId,
          gapIndex,
          value,
        });
      } else {
        suppressLocalEvent.current = false;
      }
    },
    [state.material, publishData],
  );

  // Tutor reveals answers
  const reveal = useCallback(() => {
    if (!state.material) return;
    publishData({ type: 'GRAMMAR_SYNC', materialId: state.material.id, action: 'reveal' });
  }, [state.material, publishData]);

  // Tutor resets the exercise
  const reset = useCallback(() => {
    if (!state.material) return;
    publishData({ type: 'GRAMMAR_SYNC', materialId: state.material.id, action: 'reset' });
  }, [state.material, publishData]);

  // Tutor starts the exercise (optionally with timer)
  const start = useCallback(
    (timerSec?: number) => {
      if (!state.material) return;
      publishData({ type: 'GRAMMAR_SYNC', materialId: state.material.id, action: 'start', timerSec });
    },
    [state.material, publishData],
  );

  // Handle incoming grammar packets from tutor
  useEffect(() => {
    if (!dailyCall) return;
    const handleAppMessage = (event: DailyEventObjectAppMessage) => {
      const msg: any = event?.data;
      if (!msg || msg.type !== 'GRAMMAR_SYNC') return;
      const packet: GrammarSyncPacket = msg;
      switch (packet.action) {
        case 'open':
          suppressLocalEvent.current = true;
          setState({ open: true, material: packet.material ?? ({ id: packet.materialId } as Material), answers: {} });
          if (!workspaceOpen && openWorkspace) openWorkspace();
          break;
        case 'close':
          suppressLocalEvent.current = true;
          setState({ open: false, material: null, answers: {} });
          break;
        case 'update':
          if (packet.itemId && packet.gapIndex !== undefined && packet.value !== undefined) {
            suppressLocalEvent.current = true;
            setState((prev) => ({
              ...prev,
              answers: {
                ...prev.answers,
                [packet.itemId!]: {
                  ...(prev.answers[packet.itemId!] || {}),
                  [packet.gapIndex!]: packet.value!,
                },
              },
            }));
          }
          break;
        case 'reveal':
          window.dispatchEvent(
            new CustomEvent('GRAMMAR_BLOCK_REVEAL', {
              detail: { contentId: packet.materialId, materialId: packet.materialId },
            }),
          );
          break;
        case 'reset':
          setState((prev) => ({ ...prev, answers: {} }));
          window.dispatchEvent(
            new CustomEvent('GRAMMAR_BLOCK_RESET', {
              detail: { contentId: packet.materialId, materialId: packet.materialId },
            }),
          );
          break;
        case 'start':
          window.dispatchEvent(
            new CustomEvent('GRAMMAR_BLOCK_START', {
              detail: { contentId: packet.materialId, materialId: packet.materialId, timerSec: packet.timerSec },
            }),
          );
          break;
      }
    };
    dailyCall.on('app-message', handleAppMessage);
    return () => {
      dailyCall.off('app-message', handleAppMessage);
    };
  }, [dailyCall, workspaceOpen, openWorkspace]);

  return {
    state,
    open,
    close,
    updateAnswer,
    reveal,
    reset,
    start,
    isTutor,
  };
}
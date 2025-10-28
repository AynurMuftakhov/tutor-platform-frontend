import { useState, useRef, useEffect } from 'react';
import type { DailyCall, DailyEventObjectAppMessage } from '@daily-co/daily-js';
import { Material } from '../components/materials/MaterialCard';

export interface UseSyncedGrammarResult {
  state: SyncedGrammarState;
  open: (material: Material) => void;
  close: () => void;
  updateAnswer: (itemId: string, gapIndex: number, value: string) => void;
  isTutor: boolean;
}

interface SyncedGrammarState {
  open: boolean;
  material: Material | null;
  answers: Record<string, Record<number, string>>;
}

interface GrammarSyncPacket {
  type: 'GRAMMAR_SYNC';
  lessonId: string;
  materialId: string;
  material?: Material;   // full object sent only with "open"
  action: 'open' | 'update' | 'close';
  itemId?: string;       // for update action
  gapIndex?: number;     // for update action
  value?: string;        // for update action
}

export const useSyncedGrammar = (
  call: DailyCall | null | undefined, 
  isTutor = false,
  workspaceOpen?: boolean,
  openWorkspace?: () => void
): UseSyncedGrammarResult => {
  const [state, setState] = useState<SyncedGrammarState>({
    open: false,
    material: null,
    answers: {},
  });

  const suppressLocalEvent = useRef(false);

  /* --------------------------------------------------------------- */
  /* Helper: publish data                                            */
  /* --------------------------------------------------------------- */
  const publishData = (packet: GrammarSyncPacket) => {
    if (!call) return;
    try {
      call.sendAppMessage(packet);
    } catch (e) {
      console.warn('Failed to send GRAMMAR_SYNC packet via Daily', e);
    }
  };

  /* --------------------------------------------------------------- */
  /* Actions (called by tutor or locally)                            */
  /* --------------------------------------------------------------- */
  const open = (material: Material) => {
    if (!material) return;

    setState({ open: true, material, answers: {} });

    if (isTutor) {
      publishData({
        type: 'GRAMMAR_SYNC',
        lessonId: '',
        materialId: material.id,
        material,          // send the whole material so students get details
        action: 'open',
      });
    }
  };

  const updateAnswer = (itemId: string, gapIndex: number, value: string) => {
    if (!state.material) return;
    
    setState((prev) => ({
      ...prev,
      answers: {
        ...prev.answers,
        [itemId]: {
          ...(prev.answers[itemId] || {}),
          [gapIndex]: value
        }
      }
    }));

    if (!suppressLocalEvent.current) {
      publishData({
        type: 'GRAMMAR_SYNC',
        lessonId: '',
        materialId: state.material.id,
        action: 'update',
        itemId,
        gapIndex,
        value,
      });
    } else {
      suppressLocalEvent.current = false;
    }
  };

  const close = () => {
    if (!state.material) return;
    if (!suppressLocalEvent.current) {
      publishData({
        type: 'GRAMMAR_SYNC',
        lessonId: '',
        materialId: state.material.id,
        action: 'close',
      });
    } else {
      suppressLocalEvent.current = false;
    }
    setState({ open: false, material: null, answers: {} });
  };

  /* --------------------------------------------------------------- */
  /* Subscribe to incoming data                                      */
  /* --------------------------------------------------------------- */
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
      let msg: GrammarSyncPacket | null = null;
      if (typeof payload === 'string') {
        try {
          const parsed = JSON.parse(payload);
          if (parsed.type === 'GRAMMAR_SYNC') msg = parsed as GrammarSyncPacket;
        } catch (e) {
          return;
        }
      } else if (typeof payload === 'object' && (payload as any)?.type === 'GRAMMAR_SYNC') {
        msg = payload as GrammarSyncPacket;
      }
      if (!msg) return;

      switch (msg.action) {
        case 'open':
          setState({
            open: true,
            material: msg.material ?? ({ id: msg.materialId } as Material),
            answers: {},
          });
          if (!workspaceOpen && openWorkspace) openWorkspace();
          break;
        case 'update':
          suppressLocalEvent.current = true;
          if (msg.itemId && msg.gapIndex !== undefined && msg.value !== undefined) {
            setState((prev) => ({
              ...prev,
              answers: {
                ...prev.answers,
                [msg.itemId!]: {
                  ...(prev.answers[msg.itemId!] || {}),
                  [msg.gapIndex!]: msg.value!
                }
              }
            }));
          }
          break;
        case 'close':
          suppressLocalEvent.current = true;
          setState({ open: false, material: null, answers: {} });
          break;
      }
    };

    call.on('app-message', handler);
    return () => {
      call.off('app-message', handler);
    };
  }, [call, workspaceOpen, openWorkspace]);

  return {
    state,
    open,
    updateAnswer,
    close,
    isTutor,
  };
};

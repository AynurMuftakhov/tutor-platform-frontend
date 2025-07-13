import { useState, useRef, useEffect } from 'react';
import { Room } from 'livekit-client';
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
  room: Room | undefined, 
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
    if (!room) return;
    const data = new TextEncoder().encode(JSON.stringify(packet));
    room.localParticipant.publishData(data, { reliable: true });
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
        lessonId: room?.name ?? '',
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
        lessonId: room?.name ?? '',
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
        lessonId: room?.name ?? '',
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
    if (!room) return;

    const handleData = (data: Uint8Array) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(data));
        if (msg.type !== 'GRAMMAR_SYNC') return;

        switch (msg.action) {
          case 'open':
            setState({
              open: true,
              material: msg.material ?? ({ id: msg.materialId } as Material),
              answers: {},
            });
            // ensure workspace is visible on students
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
      } catch (e) {
        console.error('Failed to parse GRAMMAR_SYNC packet', e);
      }
    };

    room.on('dataReceived', handleData);
    return () => {
      room.off('dataReceived', handleData);
    };
  }, [room, workspaceOpen, openWorkspace]);

  return {
    state,
    open,
    updateAnswer,
    close,
    isTutor,
  };
};
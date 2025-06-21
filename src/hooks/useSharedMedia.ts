import { useState, useEffect, useRef } from 'react';
import { Room, DataPacket_Kind } from 'livekit-client';
import { ListeningTask } from '../types';

enum MessageType {
  SET_TASK = 'SET_TASK',
  CLEAR_TASK = 'CLEAR_TASK',
  SET_MODE = 'SET_MODE',
  STATE_REQUEST = 'STATE_REQUEST',
  STATE_RESPONSE = 'STATE_RESPONSE',
}

interface SharedMediaState {
  task: ListeningTask | null;
  mode: 'docked' | 'pip' | 'fullscreen';
}

interface SharedMediaMessage {
  type: MessageType;
  data?: SharedMediaState;
  timestamp?: number;
}

export const useSharedMedia = (room: Room | null, isHost: boolean) => {
  const [state, setState] = useState<SharedMediaState>({
    task: null,
    mode: 'docked',
  });

  /* ---  гарантия свежего стейта внутри кол-беков  --- */
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const publish = (msg: SharedMediaMessage) => {
    if (!room || !room.localParticipant) return;
    try {
      room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify(msg)),
        { kind: DataPacket_Kind.RELIABLE },
      );
    } catch (e) {
      console.error('LiveKit publish error', e);
    }
  };

  /* ----------- actions ------------ */
  const setTask = (task: ListeningTask) =>
      setState(prev => {
        const next = { ...prev, task };
        if (isHost) publish({ type: MessageType.SET_TASK, data: next, timestamp: Date.now() });
        return next;
      });

  const clearTask = () =>
      setState(prev => {
        const next = { ...prev, task: null };
        if (isHost) publish({ type: MessageType.CLEAR_TASK, data: next, timestamp: Date.now() });
        return next;
      });

  const setMode = (mode: SharedMediaState['mode']) =>
      setState(prev => {
        const next = { ...prev, mode };
        if (isHost) publish({ type: MessageType.SET_MODE, data: next, timestamp: Date.now() });
        return next;
      });

  /* ----------- subscription ------------ */
  useEffect(() => {
    if (!room) return;

    // запрос стейта у хоста
    if (!isHost) publish({ type: MessageType.STATE_REQUEST, timestamp: Date.now() });

    const onData = (payload: Uint8Array) => {
      try {
        const msg: SharedMediaMessage = JSON.parse(new TextDecoder().decode(payload));

        switch (msg.type) {
          case MessageType.SET_TASK:
          case MessageType.CLEAR_TASK:
          case MessageType.SET_MODE:
          case MessageType.STATE_RESPONSE:
            if (!isHost && msg.data) setState(msg.data);
            break;
          case MessageType.STATE_REQUEST:
            if (isHost) publish({ type: MessageType.STATE_RESPONSE, data: stateRef.current });
            break;
        }
      } catch (e) {
        console.error('SharedMedia parse error', e);
      }
    };

    room.on('dataReceived', onData);
    return () => room.off('dataReceived', onData);
  }, [room, isHost]); // ← без state!

  return [state, { setTask, clearTask, setMode }] as const;
};
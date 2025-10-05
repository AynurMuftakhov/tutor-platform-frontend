import { useState, useRef, useEffect, useMemo } from 'react';
import { Room } from 'livekit-client';
import { Material } from '../components/materials/MaterialCard';
import ReactPlayer from "react-player";

export interface UseSyncedVideoResult {
  state: SyncedVideoState;
  playerRef: React.RefObject<ReactPlayer|null>;
  open: (material: Material) => void;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  close: () => void;
  pauseLocally: () => void;
  isTutor: boolean;
}

interface SyncedVideoState {
  open: boolean;
  material: Material | null;
  isPlaying: boolean;
  currentTime: number;
}

export interface MaterialSyncPacket {
  type: 'MATERIAL_SYNC';
  lessonId: string;
  materialId: string;
  material?: Material;   // full object sent only with "open"
  action: 'open' | 'play' | 'pause' | 'seek' | 'close';
  time: number;
}

interface MaterialSyncTransport {
  lessonId?: string;
  publish: (packet: MaterialSyncPacket) => void;
  subscribe: (handler: (packet: MaterialSyncPacket) => void) => () => void;
}

export const useSyncedVideo = (
  room: Room | undefined,
  isTutor = false,
  workspaceOpen?: boolean,
  openWorkspace?: () => void,
  transport?: MaterialSyncTransport
): UseSyncedVideoResult => {
  const [state, setState] = useState<SyncedVideoState>({
    open: false,
    material: null,
    isPlaying: false,
    currentTime: 0,
  });

  const playerRef = useRef<ReactPlayer>(null);
  const suppressLocalEvent = useRef(false);

  /* --------------------------------------------------------------- */
  /* Helper: publish data                                            */
  /* --------------------------------------------------------------- */
  const derivedTransport = useMemo<MaterialSyncTransport | undefined>(() => {
    if (!room) return undefined;
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    return {
      lessonId: room.name ?? '',
      publish: (packet) => {
        try {
          room.localParticipant.publishData(
            encoder.encode(JSON.stringify(packet)),
            { reliable: true }
          );
        } catch (err) {
          console.warn('Failed to publish MATERIAL_SYNC packet', err);
        }
      },
      subscribe: (handler) => {
        const listener = (data: Uint8Array) => {
          try {
            const msg = JSON.parse(decoder.decode(data));
            if (msg?.type !== 'MATERIAL_SYNC') return;
            handler(msg as MaterialSyncPacket);
          } catch (err) {
            console.warn('Failed to parse MATERIAL_SYNC packet', err);
          }
        };
        room.on('dataReceived', listener);
        return () => {
          room.off('dataReceived', listener);
        };
      },
    };
  }, [room]);

  const channel = transport ?? derivedTransport;

  const publishData = (packet: Omit<MaterialSyncPacket, 'lessonId'> & { lessonId?: string }) => {
    if (!channel) return;
    const lessonId = packet.lessonId ?? channel.lessonId ?? room?.name ?? '';
    channel.publish({ ...packet, lessonId });
  };

  /* --------------------------------------------------------------- */
  /* Actions (called by tutor or locally)                            */
  /* --------------------------------------------------------------- */
  const open = (material: Material) => {
    if (!material) return;

    setState({ open: true, material, isPlaying: false, currentTime: 0 });

    if (isTutor) {
      publishData({
        type: 'MATERIAL_SYNC',
        materialId: material.id,
        material,          // send the whole material so students get sourceUrl
        action: 'open',
        time: 0,
      });
    }
  };

  const play = () => {
    if (!state.material) return;
    setState((prev) => ({ ...prev, isPlaying: true }));
    if (!suppressLocalEvent.current) {
      publishData({
        type: 'MATERIAL_SYNC',
        materialId: state.material.id,
        action: 'play',
        time: playerRef.current?.getCurrentTime() || 0,
      });
    } else {
      suppressLocalEvent.current = false;
    }
  };

  const pause = () => {
    if (!state.material) return;
    setState((prev) => ({ ...prev, isPlaying: false }));
    if (!suppressLocalEvent.current) {
      publishData({
        type: 'MATERIAL_SYNC',
        materialId: state.material.id,
        action: 'pause',
        time: playerRef.current?.getCurrentTime() || 0,
      });
    } else {
      suppressLocalEvent.current = false;
    }
  };

  const seek = (time: number) => {
    if (!state.material) return;
    // Clamp too-frequent seek broadcasts
    if (Math.abs(time - state.currentTime) < 0.2) return;
    setState((prev) => ({ ...prev, currentTime: time }));
    if (!suppressLocalEvent.current) {
      publishData({
        type: 'MATERIAL_SYNC',
        materialId: state.material.id,
        action: 'seek',
        time,
      });
    } else {
      suppressLocalEvent.current = false;
    }
  };

  const close = () => {
    if (!state.material) return;
    if (!suppressLocalEvent.current) {
      publishData({
        type: 'MATERIAL_SYNC',
        materialId: state.material.id,
        action: 'close',
        time: 0,
      });
    } else {
      suppressLocalEvent.current = false;
    }
    setState({ open: false, material: null, isPlaying: false, currentTime: 0 });
  };

  /* --------------------------------------------------------------- */
  /* Subscribe to incoming data                                      */
  /* --------------------------------------------------------------- */
  useEffect(() => {
    if (!channel) return;

    const unsubscribe = channel.subscribe((msg) => {
      switch (msg.action) {
        case 'open':
          setState({
            open: true,
            material: msg.material ?? ({ id: msg.materialId } as Material),
            isPlaying: false,
            currentTime: 0,
          });
          if (!workspaceOpen && openWorkspace) openWorkspace();
          break;
        case 'play':
          suppressLocalEvent.current = true;
          playerRef.current?.seekTo(msg.time, 'seconds');
          setState((p) => ({ ...p, isPlaying: true, currentTime: msg.time }));
          break;
        case 'pause':
          suppressLocalEvent.current = true;
          setState((p) => ({ ...p, isPlaying: false, currentTime: msg.time }));
          break;
        case 'seek':
          suppressLocalEvent.current = true;
          playerRef.current?.seekTo(msg.time, 'seconds');
          setState((p) => ({ ...p, currentTime: msg.time }));
          break;
        case 'close':
          suppressLocalEvent.current = true;
          setState({ open: false, material: null, isPlaying: false, currentTime: 0 });
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [channel, workspaceOpen, openWorkspace]);

  // Pause locally without broadcasting
  const pauseLocally = () => {
    if (!state.material) return;
    setState((prev) => ({ ...prev, isPlaying: false }));
  };

  return {
    state,
    playerRef,
    open,
    play,
    pause,
    pauseLocally,
    seek,
    close,
    isTutor,
  };
};

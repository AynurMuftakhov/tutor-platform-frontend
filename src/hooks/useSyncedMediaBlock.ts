import { useEffect, useRef, useState, useCallback } from 'react';
import type { Room } from 'livekit-client';

interface UseSyncedMediaBlockArgs {
  room: Room | undefined;
  isTutor: boolean;
  contentId: string;
  blockId: string;
  materialId: string;
}

interface MaterialSyncPacket {
  type: 'MATERIAL_SYNC';
  contentId: string;
  blockId: string;
  materialId: string;
  action: 'open' | 'play' | 'pause' | 'seek' | 'close';
  time?: number;
}

export function useSyncedMediaBlock({ room, isTutor, contentId, blockId, materialId }: UseSyncedMediaBlockArgs) {
  const [playing, setPlaying] = useState(false);
  const suppressLocal = useRef(false);

  const isRoomReady = () => {
    try {
      const anyRoom = room as any;
      const state: any = anyRoom?.state ?? anyRoom?.connectionState;
      return !!room && (state === 'connected' || state === 2);
    } catch {
      return false;
    }
  };

  const publish = useCallback((pkt: MaterialSyncPacket) => {
    if (!isRoomReady()) return;
    try {
      const data = new TextEncoder().encode(JSON.stringify(pkt));
      room!.localParticipant.publishData(data, { reliable: true });
    } catch (_) { /* ignore */ }
  }, [room]);

  const onPlay = useCallback(() => {
    setPlaying(true);
    if (suppressLocal.current) { suppressLocal.current = false; return; }
    if (isTutor) publish({ type: 'MATERIAL_SYNC', contentId, blockId, materialId, action: 'play' });
  }, [isTutor, publish, contentId, blockId, materialId]);

  const onPause = useCallback(() => {
    setPlaying(false);
    if (suppressLocal.current) { suppressLocal.current = false; return; }
    if (isTutor) publish({ type: 'MATERIAL_SYNC', contentId, blockId, materialId, action: 'pause' });
  }, [isTutor, publish, contentId, blockId, materialId]);

  const onSeek = useCallback((sec: number) => {
    if (suppressLocal.current) { suppressLocal.current = false; return; }
    if (isTutor) publish({ type: 'MATERIAL_SYNC', contentId, blockId, materialId, action: 'seek', time: sec });
  }, [isTutor, publish, contentId, blockId, materialId]);

  useEffect(() => {
    if (!room) return;
    const handler = (data: Uint8Array) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(data));
        if (msg?.type !== 'MATERIAL_SYNC') return;
        const pkt = msg as MaterialSyncPacket;
        if (pkt.contentId !== contentId || pkt.blockId !== blockId || pkt.materialId !== materialId) return;
        switch (pkt.action) {
          case 'play':
            suppressLocal.current = true;
            setPlaying(true);
            // we don't have time here; rely on prior seek or current position
            break;
          case 'pause':
            suppressLocal.current = true;
            setPlaying(false);
            break;
          case 'seek': {
            // dispatch a DOM event so the owner component can seek the player ref
            const detail = { contentId, blockId, t: pkt.time ?? 0 };
            window.dispatchEvent(new CustomEvent('MEDIA_BLOCK_SEEK', { detail }));
            break;
          }
          case 'close':
            suppressLocal.current = true;
            setPlaying(false);
            break;
        }
      } catch (_) {/* ignore */}
    };
    room.on('dataReceived', handler);
    return () => { room.off('dataReceived', handler); };
  }, [room, contentId, blockId, materialId]);

  return { playing, onPlay, onPause, onSeek } as const;
}

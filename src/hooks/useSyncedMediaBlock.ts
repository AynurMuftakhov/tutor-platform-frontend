import { useEffect, useRef, useState, useCallback } from 'react';
import type { DailyCall, DailyEventObjectAppMessage } from '@daily-co/daily-js';

interface UseSyncedMediaBlockArgs {
  call: DailyCall | null | undefined;
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

export function useSyncedMediaBlock({ call, isTutor, contentId, blockId, materialId }: UseSyncedMediaBlockArgs) {
  const [playing, setPlaying] = useState(false);
  const suppressLocal = useRef(false);
  const lastSeekRef = useRef<number | null>(null);

  const clampTime = useCallback((value: number | undefined | null) => {
    if (!Number.isFinite(value ?? NaN)) return 0;
    return Math.max(0, Number(value));
  }, []);

  const isCallReady = () => {
    try {
      const state = call?.meetingState?.();
      return !!call && (state === 'joined-meeting' || state === 'joining-meeting');
    } catch {
      return false;
    }
  };

  const publish = useCallback((pkt: MaterialSyncPacket) => {
    if (!isCallReady()) return;
    try {
      call!.sendAppMessage(pkt);
    } catch (_) { /* ignore */ }
  }, [call]);

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
    const t = clampTime(sec);
    if (suppressLocal.current) {
      suppressLocal.current = false;
      lastSeekRef.current = t;
      return;
    }
    if (!isTutor) {
      lastSeekRef.current = t;
      return;
    }
    if (lastSeekRef.current !== null && Math.abs(lastSeekRef.current - t) < 0.05) return;
    lastSeekRef.current = t;
    publish({ type: 'MATERIAL_SYNC', contentId, blockId, materialId, action: 'seek', time: t });
  }, [clampTime, isTutor, publish, contentId, blockId, materialId]);

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
      let msg: MaterialSyncPacket | null = null;
      if (typeof payload === 'string') {
        try {
          const parsed = JSON.parse(payload);
          if (parsed?.type === 'MATERIAL_SYNC') msg = parsed as MaterialSyncPacket;
        } catch {
          return;
        }
      } else if (typeof payload === 'object' && (payload as any)?.type === 'MATERIAL_SYNC') {
        msg = payload as MaterialSyncPacket;
      }
      if (!msg) return;
      if (msg.contentId !== contentId || msg.blockId !== blockId || msg.materialId !== materialId) return;

      switch (msg.action) {
        case 'play':
          suppressLocal.current = true;
          setPlaying(true);
          if (msg.time != null) lastSeekRef.current = clampTime(msg.time);
          break;
        case 'pause':
          suppressLocal.current = true;
          setPlaying(false);
          if (msg.time != null) lastSeekRef.current = clampTime(msg.time);
          break;
        case 'seek': {
          const seekTime = clampTime(msg.time);
          lastSeekRef.current = seekTime;
          suppressLocal.current = true;
          const detail = { contentId, blockId, t: seekTime };
          window.dispatchEvent(new CustomEvent('MEDIA_BLOCK_SEEK', { detail }));
          break;
        }
        case 'close':
          suppressLocal.current = true;
          setPlaying(false);
          break;
      }
    };

    call.on('app-message', handler);
    return () => { call.off('app-message', handler); };
  }, [call, contentId, blockId, materialId, clampTime]);

  return { playing, onPlay, onPause, onSeek } as const;
}

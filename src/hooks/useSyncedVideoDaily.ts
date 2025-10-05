import { useCallback, useEffect, useRef, useState } from 'react';
import type { DailyCall, DailyEventObjectAppMessage } from '@daily-co/daily-js';
import React from 'react';
import ReactPlayer from 'react-player';
import type { Material } from '../components/materials/MaterialCard';

export interface SyncedVideoDailyResult {
  state: SyncedVideoState;
  playerRef: React.RefObject<ReactPlayer | null>;
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

interface MaterialSyncPacket {
  type: 'MATERIAL_SYNC';
  lessonId?: string;
  materialId: string;
  material?: Material;
  action: 'open' | 'play' | 'pause' | 'seek' | 'close';
  time?: number;
}

/**
 * useSyncedVideoDaily replicates the behaviour of useSyncedVideo for Daily calls.
 * It synchronizes video playback across tutor and student by sending app messages
 * with the same MATERIAL_SYNC schema used for LiveKit. The tutor is the
 * authoritative sender and students react to incoming packets. When students
 * receive an open/play/pause/seek/close packet they update their local state
 * and ensure the workspace is visible if needed.
 */
export const useSyncedVideoDaily = (
  dailyCall: DailyCall | null,
  isTutor: boolean,
  workspaceOpen?: boolean,
  openWorkspace?: () => void
): SyncedVideoDailyResult => {
  const [state, setState] = useState<SyncedVideoState>({
    open: false,
    material: null,
    isPlaying: false,
    currentTime: 0,
  });

  const playerRef = useRef<ReactPlayer>(null);
  const suppressLocalEvent = useRef(false);

  const publishData = useCallback(
    (packet: MaterialSyncPacket) => {
      if (!dailyCall) return;
      try {
        dailyCall.sendAppMessage(packet);
      } catch {
        /* ignore send errors */
      }
    },
    [dailyCall],
  );

  // Tutor opens a material; sends full material object for students
  const open = useCallback(
    (material: Material) => {
      if (!material) return;
      setState({ open: true, material, isPlaying: false, currentTime: 0 });
      if (isTutor) {
        publishData({
          type: 'MATERIAL_SYNC',
          materialId: material.id,
          material,
          action: 'open',
          time: 0,
        });
      }
    },
    [isTutor, publishData],
  );

  // Tutor plays the video; broadcast current time
  const play = useCallback(() => {
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
  }, [state.material, publishData]);

  // Tutor pauses the video; broadcast current time
  const pause = useCallback(() => {
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
  }, [state.material, publishData]);

  // Tutor seeks the video; clamp broadcast frequency
  const seek = useCallback(
    (time: number) => {
      if (!state.material) return;
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
    },
    [state.material, state.currentTime, publishData],
  );

  // Tutor closes the material; broadcast close
  const close = useCallback(() => {
    if (!state.material) return;
    if (!suppressLocalEvent.current) {
      publishData({
        type: 'MATERIAL_SYNC',
        materialId: state.material.id,
        action: 'close',
      });
    } else {
      suppressLocalEvent.current = false;
    }
    setState({ open: false, material: null, isPlaying: false, currentTime: 0 });
  }, [state.material, publishData]);

  // Pause locally without broadcasting (e.g., when closing workspace)
  const pauseLocally = useCallback(() => {
    if (!state.material) return;
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, [state.material]);

  // Listen for incoming MATERIAL_SYNC packets from tutor
  useEffect(() => {
    if (!dailyCall) return;
    const handleAppMessage = (event: DailyEventObjectAppMessage) => {
      const msg: any = event?.data;
      if (!msg || msg.type !== 'MATERIAL_SYNC') return;
      const packet: MaterialSyncPacket = msg;
      switch (packet.action) {
        case 'open':
          setState({
            open: true,
            material: packet.material ?? ({ id: packet.materialId } as Material),
            isPlaying: false,
            currentTime: 0,
          });
          // Ensure the workspace is visible on students when a material opens
          if (!workspaceOpen && openWorkspace) openWorkspace();
          break;
        case 'play':
          suppressLocalEvent.current = true;
          playerRef.current?.seekTo(packet.time ?? 0, 'seconds');
          setState((p) => ({ ...p, isPlaying: true, currentTime: packet.time ?? 0 }));
          break;
        case 'pause':
          suppressLocalEvent.current = true;
          setState((p) => ({ ...p, isPlaying: false, currentTime: packet.time ?? p.currentTime }));
          break;
        case 'seek':
          suppressLocalEvent.current = true;
          playerRef.current?.seekTo(packet.time ?? 0, 'seconds');
          setState((p) => ({ ...p, currentTime: packet.time ?? p.currentTime }));
          break;
        case 'close':
          suppressLocalEvent.current = true;
          setState({ open: false, material: null, isPlaying: false, currentTime: 0 });
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
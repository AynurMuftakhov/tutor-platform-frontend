import { useEffect, useRef, useMemo } from 'react';
import { Room } from 'livekit-client';

export type WorkspaceSyncPacket = {
  type: 'WORKSPACE_SYNC';
  action: 'open' | 'close';
};

export const useWorkspaceSync = (
  room: Room | undefined,
  isTutor: boolean,
  workspaceOpen: boolean,
  openWorkspace: () => void,
  closeWorkspace: () => void,
  transport?: {
    publish: (packet: WorkspaceSyncPacket) => void;
    subscribe: (handler: (packet: WorkspaceSyncPacket) => void) => () => void;
  }
) => {
  const suppress = useRef(false);

  const channel = useMemo(() => {
    if (transport) return transport;
    if (!room) return undefined;
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    return {
      publish: (packet: WorkspaceSyncPacket) => {
        try {
          room.localParticipant.publishData(
            encoder.encode(JSON.stringify(packet)),
            { reliable: true }
          );
        } catch (err) {
          console.warn('Failed to publish WORKSPACE_SYNC packet', err);
        }
      },
      subscribe: (handler: (packet: WorkspaceSyncPacket) => void) => {
        const listener = (data: Uint8Array) => {
          try {
            const msg = JSON.parse(decoder.decode(data));
            if (msg?.type !== 'WORKSPACE_SYNC') return;
            handler(msg as WorkspaceSyncPacket);
          } catch (err) {
            console.warn('Failed to parse WORKSPACE_SYNC packet', err);
          }
        };
        room.on('dataReceived', listener);
        return () => {
          room.off('dataReceived', listener);
        };
      },
    };
  }, [room, transport]);

  /* 1. Publish state changes (tutor only) */
  useEffect(() => {
    if (!channel || !isTutor) return;
    if (suppress.current) { suppress.current = false; return; }

    const packet: WorkspaceSyncPacket = {
      type: 'WORKSPACE_SYNC',
      action: workspaceOpen ? 'open' : 'close',
    };
    channel.publish(packet);
  }, [workspaceOpen, channel, isTutor]);

  /* 2. Listen for remote state changes */
  useEffect(() => {
    if (!channel) return;

    const unsubscribe = channel.subscribe((msg) => {
      suppress.current = true;               // prevent echo
      msg.action === 'open' ? openWorkspace() : closeWorkspace();
    });
    return () => {
      unsubscribe();
    };
  }, [channel, openWorkspace, closeWorkspace]);
};
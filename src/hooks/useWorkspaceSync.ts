import { useEffect, useRef } from 'react';
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
  closeWorkspace: () => void
) => {
  const suppress = useRef(false);

  /* 1. Publish state changes (tutor only) */
  useEffect(() => {
    if (!room || !isTutor) return;
    if (suppress.current) { suppress.current = false; return; }

    const packet: WorkspaceSyncPacket = {
      type: 'WORKSPACE_SYNC',
      action: workspaceOpen ? 'open' : 'close',
    };
    room.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify(packet)),
      { reliable: true }
    );
  }, [workspaceOpen, room, isTutor]);

  /* 2. Listen for remote state changes */
  useEffect(() => {
    if (!room) return;

    const handler = (data: Uint8Array) => {
      try {
        const msg: WorkspaceSyncPacket = JSON.parse(new TextDecoder().decode(data));
        if (msg.type !== 'WORKSPACE_SYNC') return;

        suppress.current = true;               // prevent echo
        msg.action === 'open' ? openWorkspace() : closeWorkspace();
      } catch {
        // ignore
      }
    };

    room.on('dataReceived', handler);
    return () => {
      room.off('dataReceived', handler);
    };
  }, [room, openWorkspace, closeWorkspace]);
};
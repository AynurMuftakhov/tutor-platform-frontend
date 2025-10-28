import { useEffect, useRef } from 'react';
import type { DailyCall, DailyEventObjectAppMessage } from '@daily-co/daily-js';

export type WorkspaceSyncPacket = {
  type: 'WORKSPACE_SYNC';
  action: 'open' | 'close';
};

export const useWorkspaceSync = (
  call: DailyCall | null | undefined,
  isTutor: boolean,
  workspaceOpen: boolean,
  openWorkspace: () => void,
  closeWorkspace: () => void
) => {
  const suppress = useRef(false);

  /* 1. Publish state changes (tutor only) */
  useEffect(() => {
    if (!call || !isTutor) return;
    if (suppress.current) { suppress.current = false; return; }

    const packet: WorkspaceSyncPacket = {
      type: 'WORKSPACE_SYNC',
      action: workspaceOpen ? 'open' : 'close',
    };
    try {
      call.sendAppMessage(packet);
    } catch (err) {
      console.warn('Failed to send WORKSPACE_SYNC message via Daily', err);
    }
  }, [workspaceOpen, call, isTutor]);

  /* 2. Listen for remote state changes */
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
      try {
        const payload = event.data;
        if (!payload) return;
        let msg: WorkspaceSyncPacket | null = null;
        if (typeof payload === 'string') {
          const parsed = JSON.parse(payload);
          if (parsed.type === 'WORKSPACE_SYNC') msg = parsed as WorkspaceSyncPacket;
        } else if (typeof payload === 'object' && (payload as any)?.type === 'WORKSPACE_SYNC') {
          msg = payload as WorkspaceSyncPacket;
        }
        if (!msg) return;
        if (msg.type !== 'WORKSPACE_SYNC') return;

        suppress.current = true;               // prevent echo
        msg.action === 'open' ? openWorkspace() : closeWorkspace();
      } catch {
        // ignore
      }
    };

    call.on('app-message', handler);
    return () => {
      call.off('app-message', handler);
    };
  }, [call, openWorkspace, closeWorkspace]);
};

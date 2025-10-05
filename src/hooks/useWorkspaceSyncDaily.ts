import { useEffect, useRef } from 'react';
import type { DailyCall } from '@daily-co/daily-js';
import type { DailyEventObjectAppMessage } from '@daily-co/daily-js';

/**
 * Synchronize workspace open/close state between tutor and student when using
 * Daily as the RTC provider. This hook mirrors the behaviour of
 * `useWorkspaceSync` for LiveKit rooms but uses Daily's app-message API.
 *
 * @param dailyCall The active Daily call instance
 * @param isTutor Whether the current user is the tutor (authoritative source)
 * @param workspaceOpen Current workspace open state
 * @param openWorkspace Function to open the workspace locally
 * @param closeWorkspace Function to close the workspace locally
 */
export const useWorkspaceSyncDaily = (
  dailyCall: DailyCall | null,
  isTutor: boolean,
  workspaceOpen: boolean,
  openWorkspace: () => void,
  closeWorkspace: () => void
) => {
  const suppress = useRef(false);

  // Publish state changes from the tutor to the student
  useEffect(() => {
    if (!dailyCall || !isTutor) return;
    // Avoid echoing remote updates back
    if (suppress.current) {
      suppress.current = false;
      return;
    }
    try {
      dailyCall.sendAppMessage({ t: 'WORKSPACE_SYNC', open: workspaceOpen });
    } catch {
      /* ignore send errors */
    }
  }, [dailyCall, isTutor, workspaceOpen]);

  // Listen for remote workspace sync messages
  useEffect(() => {
    if (!dailyCall) return;
    const handler = (event: DailyEventObjectAppMessage) => {
      const msg: any = event?.data;
      if (!msg || msg.t !== 'WORKSPACE_SYNC') return;
      // Only students should apply remote state updates
      if (isTutor) return;
      suppress.current = true;
      if (msg.open) {
        openWorkspace();
      } else {
        closeWorkspace();
      }
    };
    dailyCall.on('app-message', handler);
    return () => {
      dailyCall.off('app-message', handler);
    };
  }, [dailyCall, isTutor, openWorkspace, closeWorkspace]);
};
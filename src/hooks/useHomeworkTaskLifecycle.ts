import { useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCompleteTask, useStartTask, useUpdateTaskProgress } from './useHomeworks';
import type { UpdateProgressPayload } from '../types/homework';

const milestones = new Set([10, 30, 60, 90]);

export function useHomeworkTaskLifecycle(taskId: string) {
  const { user } = useAuth();
  const studentId = user?.id || '';

  const start = useStartTask(studentId);
  const progress = useUpdateTaskProgress(studentId);
  const complete = useCompleteTask(studentId);

  const startedRef = useRef<boolean>(false);
  const completedRef = useRef<boolean>(false);
  const lastSentPctRef = useRef<number>(0);
  const lastSentAtRef = useRef<number>(0);

  const markStarted = useCallback(() => {
    if (!taskId || !studentId) return;
    if (startedRef.current) return;
    startedRef.current = true;
    start.mutate(taskId, {
      onError: () => { startedRef.current = false; },
    });
  }, [start, taskId, studentId]);

  const reportProgress = useCallback((payload: UpdateProgressPayload) => {
    if (!taskId || !studentId) return;
    const pct = Math.max(0, Math.min(100, Math.round(payload.progressPct ?? 0)));
    const now = Date.now();

    const timeOk = now - lastSentAtRef.current >= 2000;
    const milestoneOk = milestones.has(pct) && lastSentPctRef.current !== pct;

    if (!timeOk && !milestoneOk) return;

    lastSentAtRef.current = now;
    lastSentPctRef.current = pct;

    progress.mutate({ taskId, payload: { progressPct: pct, meta: payload.meta } });
  }, [progress, taskId, studentId]);

  const markCompleted = useCallback((payload?: UpdateProgressPayload) => {
    if (!taskId || !studentId) return;
    if (completedRef.current) return;
    completedRef.current = true;
    complete.mutate({ taskId, payload }, {
      onError: () => { completedRef.current = false; },
    });
  }, [complete, taskId, studentId]);

  return { markStarted, reportProgress, markCompleted };
}

export default useHomeworkTaskLifecycle;

import React, { createContext, useContext, useMemo, useState } from 'react';
import type { DailyCall } from '@daily-co/daily-js';
import { useAuth } from './AuthContext';
import { fetchRtcJoin } from '../services/rtc/join';
import { RtcJoinResponse, RtcProviderId } from '../types/rtc/adapter';

// Optional hint shape for explicit overrides from the page
type JoinHint = {
  lessonId?: string;
  role?: string;        // 'teacher' | 'student'
  roomName?: string;    // e.g. 'lesson-<id>' or '<id>'
};

interface RtcState {
  provider?: RtcProviderId;
  effectiveProvider?: RtcProviderId; // may differ if we fallback
  lessonId?: string;
  role?: string;
  join?: RtcJoinResponse['join'];
  providerReady: boolean;
  error?: string;
  failureMessage?: string;
}

interface RtcContextValue extends RtcState {
  dailyCall: DailyCall | null;
  refreshJoin: (hint?: JoinHint) => Promise<void>;
  setFailure: (message: string) => void;
  registerDailyCall: (call: DailyCall | null) => void;
}

const RtcContext = createContext<RtcContextValue>({
  providerReady: false,
  dailyCall: null,
  refreshJoin: async () => undefined,
  setFailure: () => undefined,
  registerDailyCall: () => undefined,
});

export const useRtc = () => useContext(RtcContext);

export const RtcProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [state, setState] = useState<RtcState>({ providerReady: false });
  const [dailyCall, setDailyCall] = useState<DailyCall | null>(null);

  const deriveLessonAndRole = (hint?: JoinHint): { lessonId?: string; role?: string } => {
    // Role mapping: app roles → API roles
    const roleFromUser =
      user?.role?.toLowerCase() === 'tutor' ? 'teacher'
        : user?.role?.toLowerCase() === 'student' ? 'student'
          : undefined;
    const role = hint?.role ?? roleFromUser;

    // Lesson id from roomName query param or explicit hint
    const qs = new URLSearchParams(window.location.search);
    const roomFromQS = qs.get('roomName') ?? undefined;
    const roomName = hint?.roomName ?? roomFromQS;
    const lessonIdFromRoom = roomName ? (roomName.startsWith('lesson-') ? roomName.slice(7) : roomName) : undefined;
    const lessonId = hint?.lessonId ?? lessonIdFromRoom;

    return { lessonId, role };
  };

  const refreshJoin = async (hint?: JoinHint) => {
    try {
      const { lessonId, role } = deriveLessonAndRole(hint);
      if (!user?.id || !lessonId || !role) {
        throw new Error('Missing userId, lessonId, or role for /api/video/join');
      }

      const join = await fetchRtcJoin({ userId: user.id, lessonId, role });
      setState({
        provider: join.provider,
        effectiveProvider: join.provider,
        lessonId: join.lessonId ?? lessonId,
        role: join.role ?? role,
        join: join.join,
        providerReady: true,
        error: undefined,
        failureMessage: undefined
      });
    } catch (e: any) {
      console.error('RTC join failed', e);
      setState((s) => ({ ...s, error: 'RTC initialization failed', providerReady: false }));
    }
  };

  const setFailure = (message: string) => {
    setState((s) => ({ ...s, failureMessage: message }));
  };

  const value = useMemo(
    () => ({
      ...state,
      dailyCall,
      refreshJoin,
      setFailure,
      registerDailyCall: setDailyCall
    }),
    [state, dailyCall, refreshJoin, setFailure],
  );
  return <RtcContext.Provider value={value}>{children}</RtcContext.Provider>;
};

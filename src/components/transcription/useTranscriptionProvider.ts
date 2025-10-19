import { useMemo } from 'react';
import { useDailyTranscription } from './useDailyTranscription';
import { useTranscriptionAssemblyAI, type SegmentClip, type TranscriptionStatus } from './useTranscriptionAssemblyAI';

export type Segment = {
  id: string;
  text: string;
  isFinal?: boolean;
  startMs?: number;
  endMs?: number;
  hits?: { word: string; startMs?: number; endMs?: number; confidence?: number }[];
  clip?: SegmentClip;
};

export type UseTranscription = {
  isTranscribing: boolean;
  status: TranscriptionStatus;
  segments: Segment[];
  sessionClip?: SegmentClip;
  error?: string | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  clear: () => void;
};

export type ProviderOpts = {
  call: any;
  studentSessionId?: string;
  homeworkWords?: string[];
  lessonId?: string;
};

export function useTranscriptionDaily(opts: ProviderOpts): UseTranscription {
  const { state, start, stop, clear } = useDailyTranscription({
    call: opts.call,
    studentSessionId: opts.studentSessionId,
    homeworkWords: opts.homeworkWords || [],
  });
  return useMemo<UseTranscription>(() => ({
    isTranscribing: state.isActive,
    status: state.isActive ? 'live' : 'idle',
    segments: state.segments.map(s => ({
      id: s.id,
      text: s.text,
      isFinal: s.isFinal,
      startMs: s.startMs,
      endMs: s.endMs,
      hits: s.hits,
      clip: s.clip,
    })),
    sessionClip: undefined,
    error: null,
    start,
    stop,
    clear,
  }), [state, start, stop, clear]);
}

export function useTranscriptionProvider(opts: ProviderOpts): UseTranscription {
    return useTranscriptionAssemblyAI(opts);
}

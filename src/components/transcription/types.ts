export type TranscriptWordHit = {
  word: string;
  startMs?: number;
  endMs?: number;
  confidence?: number;
};

export type TranscriptSegment = {
  id: string; // stable key per segment (raw-based if possible)
  text: string;
  isFinal: boolean;
  startMs?: number;
  endMs?: number;
  hits: TranscriptWordHit[]; // homework-word matches inside this segment
};

export type TranscriptionState = {
  isActive: boolean;
  segments: TranscriptSegment[];
  totals: Record<string, number>; // per-word counters
};

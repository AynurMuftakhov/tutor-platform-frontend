export interface ListeningTranscriptMetadata {
  language?: string;
  theme?: string;
  cefr?: string;
  style?: string;
  [key: string]: unknown;
}

export interface ListeningTranscriptResponse {
  transcriptId: string;
  transcript: string;
  wordCoverage: Record<string, boolean>;
  estimatedDurationSec?: number;
  metadata?: ListeningTranscriptMetadata;
}

export interface GenerateListeningTranscriptPayload {
  wordIds: string[];
  durationSecTarget: number;
  theme?: string;
  cefr?: string;
  language?: string;
  style?: string;
  seed?: number;
  constraints?: Record<string, unknown>;
}

export interface UpdateListeningTranscriptPayload {
  transcript: string;
}

export interface ValidateListeningTranscriptPayload {
  transcript: string;
  wordIds: string[];
}

export interface ValidateListeningTranscriptResponse {
  wordCoverage: Record<string, boolean>;
  missing: string[];
}

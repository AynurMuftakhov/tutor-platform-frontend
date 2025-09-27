export interface ListeningTranscriptMetadata {
  language?: string;
  theme?: string;
  cefr?: string;
  style?: string;
}

export interface ListeningTranscriptResponse {
  transcriptId: string;
  transcript: string;
  wordCoverage: Record<string, boolean>;
  estimatedDurationSec?: number;
  metadata?: ListeningTranscriptMetadata;
}

export interface GenerateListeningTranscriptPayload {
  wordIds: number[];
  durationSecTarget: number;
  theme?: string;
  cefr?: string;
  language?: string;
  style?: string;
  seed?: number;
  constraints?: { mustIncludeAllWords?: boolean };
}

export interface UpdateListeningTranscriptPayload {
  transcript: string;
}

export interface ValidateListeningTranscriptPayload {
  transcript: string;
  wordIds: number[];
}

export interface ValidateListeningTranscriptResponse {
  wordCoverage: Record<string, boolean>;
  missing: string[];
}

export interface ListeningTranscriptMetadata {
  language?: string;
  theme?: string;
  cefr?: string;
  style?: string;
  [key: string]: unknown;
}

export interface ListeningVoiceSettings {
  stability?: number;
  similarity_boost?: number;
  style?: number;
  speed?: number;
  use_speaker_boost?: boolean;
  [key: string]: unknown;
}

export interface ListeningVoice {
  voiceId: string;
  name: string;
  previewUrl?: string;
  settings?: ListeningVoiceSettings;
}

export type ListeningAudioJobStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface StartListeningAudioJobPayload {
  transcriptId: string;
  transcriptOverride?: string;
  voiceId: string;
  ttsModel: string;
  languageCode: string;
  voiceSettings: ListeningVoiceSettings;
  outputFormat: string;
  metadata?: Record<string, unknown>;
}

export interface ListeningAudioJobStartResponse {
  jobId: string;
  status: ListeningAudioJobStatus;
}

export interface ListeningAudioJobStatusResponse {
  jobId: string;
  status: ListeningAudioJobStatus;
  audioMaterialId?: string;
  audioUrl?: string;
  durationSec?: number;
  transcript?: string;
  createdAt?: string;
  updatedAt?: string;
  message?: string;
  error?: string;
  [key: string]: unknown;
}

export interface ListeningGeneratedAudioContentRef {
  sourceKind: 'GENERATED_AUDIO';
  generatorRequestId: string;
  audioMaterialId: string;
  audioUrl: string;
  transcript: string;
  durationSec: number;
  wordIds: string[];
  theme?: string;
  cefr?: string;
  metadata?: ListeningTranscriptMetadata;
  voiceId?: string;
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
  maxWords: number;
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

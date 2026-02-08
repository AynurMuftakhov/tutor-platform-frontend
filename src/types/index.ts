export interface PageResult<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    size: number;
    number: number; // current page index, 0-based
}

export interface VocabularyWordRequest { text: string; translation: string; partOfSpeech?: string; createdByTeacherId?: string; }
export interface AssignedWordResponse { id: string; vocabularyWordId: string; text: string; translation: string; status: string; repetitionCount: number; lastCheckedDate?: string; }
export interface AssignWordsRequest { studentId: string; vocabularyWordIds: string[]; }

export enum AudioPart {
    TEXT = 'TEXT',
    EXAMPLE_SENTENCE = 'EXAMPLE_SENTENCE'
}

export * from './ListeningTask';

export * from './MaterialFolder';

export interface CreateWordRequest {
    text: string;
    teacherId: string;
}

export type BatchWordStatus = 'NEW' | 'DUPLICATE_REUSE' | 'INVALID';
export type BatchFailureStage = 'LLM' | 'AUDIO' | 'VALIDATION' | 'DB' | 'UNKNOWN';

export interface BatchWordsPreviewRequest {
    teacherId: string;
    inputs: string[];
}

export interface BatchWordPreviewRow {
    input: string;
    normalized: string;
    status: BatchWordStatus;
    existingWordId: string | null;
    reason: string | null;
}

export interface BatchWordsPreviewSummary {
    total: number;
    newCount: number;
    duplicateCount: number;
    invalidCount: number;
}

export interface BatchWordsPreviewResponse {
    rows: BatchWordPreviewRow[];
    summary: BatchWordsPreviewSummary;
}

export interface BatchWordsCreateRequest {
    teacherId: string;
    inputs: string[];
    reuseDuplicates?: boolean;
    generateAudio?: boolean;
}

export interface BatchWordCreateFailure {
    input: string;
    stage: BatchFailureStage;
    message: string;
}

export interface BatchWordsCreateSummary {
    total: number;
    createdCount: number;
    reusedCount: number;
    failedCount: number;
}

export interface BatchWordsCreateResponse {
    created: VocabularyWord[];
    reused: VocabularyWord[];
    failed: BatchWordCreateFailure[];
    allWordIdsForHomework: string[];
    summary: BatchWordsCreateSummary;
}

export type BatchJobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface BatchWordsCreateJobResponse {
    jobId: string;
    status: BatchJobStatus;
}

export interface BatchWordsCreateJobStatusResponse {
    jobId: string;
    status: BatchJobStatus;
    totalCount: number;
    processedCount: number;
    createdCount: number;
    reusedCount: number;
    failedCount: number;
    progressPct: number;
    message: string;
    result: BatchWordsCreateResponse | null;
}

export interface VocabularyWord {
    id: string;
    text: string;
    translation: string;
    partOfSpeech: string | null;
    createdByTeacherId: string;
    definitionEn: string;
    synonymsEn: string[];
    phonetic: string | null;
    audioUrl: string | null;
    exampleSentenceAudioUrl: string | null;
    editedAt?: string;
    difficulty?: number; // 1 = beginner can learn easily, 5 = advanced
    popularity?: number; // 1 = almost unused, 5 = very frequent (daily)
    exampleSentence?: string; // Short, realistic sentence
}

export interface GenerateExerciseRequest {
  grammarFocus: 'articles' | 'prepositions' | 'tenses' | string;
  topic: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  sentences: number;
  language?: 'en' | 'es' | 'de';
  tokenStyle?: 'doubleBraces';
}

export interface GenerateExerciseResponse {
  html: string;
  answers: Record<number, string[]>;
  meta?: {
    model: string;
    temp: number;
    tokensUsed: number;
  };
}

export * from './listeningTranscript';

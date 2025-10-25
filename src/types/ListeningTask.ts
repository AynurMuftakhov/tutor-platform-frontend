export enum AssetType {
    VIDEO = 'VIDEO',
    AUDIO = 'AUDIO'
}

export type ListeningTaskStatus = 'DRAFT' | 'READY';

export interface ListeningVoiceConfig {
    id: string;
    speed?: number;
    pitch?: number;
    style?: string;
}

export interface ListeningTask {
    id: string;
    materialId: string;
    startSec: number;
    endSec: number;
    createdAt: string;
    title?: string;
    wordLimit?: number;
    timeLimitSec?: number;
    transcriptId?: string;
    transcriptText?: string;
    targetWords?: string[];
    audioUrl?: string;
    voice?: ListeningVoiceConfig | null;
    /** @deprecated kept for backward-compat, not used in FE */
    language?: string;
    /** @deprecated kept for backward-compat, not used in FE */
    difficulty?: string;
    /** @deprecated kept for backward-compat, not used in FE */
    notes?: string;
    status: ListeningTaskStatus;
    // legacy fields for older APIs
    assetType?: AssetType;
    sourceUrl?: string;
    folderId?: string;
}

export interface LessonTask {
    id: string;
    lessonId: string;
    taskId: string;
    task?: ListeningTask;
}

export interface ListeningTaskPayload {
    title?: string;
    startSec?: number;
    endSec?: number;
    wordLimit?: number;
    timeLimitSec?: number;
    transcriptId?: string;
    transcriptText?: string;
    targetWords?: string[];
    audioUrl?: string;
    voice?: ListeningVoiceConfig | null;
    language?: string;
    difficulty?: string;
    notes?: string;
    status?: ListeningTaskStatus;
}

export interface ListeningTaskCreatePayload extends ListeningTaskPayload {
    startSec: number;
    endSec: number;
}

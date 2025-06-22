export enum AssetType {
    VIDEO = "VIDEO",
    AUDIO = "AUDIO"
}

export interface ListeningTask {
    id: string;
    assetType: AssetType;
    sourceUrl: string;
    folderId?: string;
    startSec: number;
    endSec: number;
    wordLimit?: number;
    timeLimitSec?: number;
    createdAt: string;
    title?: string;
}

export interface LessonTask {
    id: string;
    lessonId: string;
    taskId: string;
    task?: ListeningTask; // The referenced global task
}

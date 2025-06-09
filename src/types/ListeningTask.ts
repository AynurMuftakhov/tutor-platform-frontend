export enum AssetType {
    VIDEO = "VIDEO",
    AUDIO = "AUDIO"
}

export interface ListeningTask {
    id: string;
    lessonId: string;
    assetType: AssetType;
    sourceUrl: string;
    startSec: number;
    endSec: number;
    wordLimit?: number;
    timeLimitSec?: number;
    createdAt: string;
}
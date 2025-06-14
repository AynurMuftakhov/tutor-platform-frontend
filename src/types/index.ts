export interface VocabularyWordRequest { text: string; translation: string; partOfSpeech?: string; createdByTeacherId?: string; }
export interface AssignedWordResponse { id: string; vocabularyWordId: string; text: string; translation: string; status: string; repetitionCount: number; lastCheckedDate?: string; }
export interface AssignWordsRequest { studentId: string; vocabularyWordIds: string[]; }

export * from './ListeningTask';

export enum AudioPart {
    TEXT = 'TEXT',
    EXAMPLE_SENTENCE = 'EXAMPLE_SENTENCE'
}

export interface CreateWordRequest {
    text: string;
    teacherId: string;
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

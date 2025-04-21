export interface VocabularyWordRequest { text: string; translation: string; partOfSpeech?: string; createdByTeacherId?: string; }
export interface AssignedWordResponse { id: string; vocabularyWordId: string; text: string; translation: string; status: string; repetitionCount: number; lastCheckedDate?: string; }
export interface AssignWordsRequest { studentId: string; vocabularyWordIds: string[]; }

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
    editedAt?: string;
}
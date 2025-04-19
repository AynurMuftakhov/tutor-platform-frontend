export interface VocabularyWordResponse { id: string; text: string; translation: string; partOfSpeech?: string; createdByTeacherId?: string; }
export interface VocabularyWordRequest { text: string; translation: string; partOfSpeech?: string; createdByTeacherId?: string; }
export interface AssignedWordResponse { id: string; vocabularyWordId: string; text: string; translation: string; status: string; repetitionCount: number; lastCheckedDate?: string; }
export interface AssignWordsRequest { studentId: string; vocabularyWordIds: string[]; }
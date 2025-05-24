import ky from 'ky';
import {
    AssignWordsRequest,
    AssignedWordResponse,
    VocabularyWord, CreateWordRequest
} from '../types';

const api = ky.create({
    prefixUrl: `${import.meta.env.VITE_API_URL}/vocabulary-service/api/v1/vocabulary/`,
    hooks: {
        beforeRequest: [
            request => {
                // grab your token however you store it
                const token = localStorage.getItem('token');
                if (token) {
                    request.headers.set('Authorization', `Bearer ${token}`);
                }
            }
        ]
    }
});


export const vocabApi = {
    listWords: () => api.get('words').json<VocabularyWord[]>(),
    createWord: (dto: CreateWordRequest) =>
        api.post('words/create', { json: dto }).json<VocabularyWord>(),
    updateWord: (id: string, dto: Partial<VocabularyWord>) =>
        api.patch(`words/${id}`, { json: dto }).json<VocabularyWord>(),
    deleteWord: (id: string) => api.delete(`words/${id}`),

    assign: (dto: AssignWordsRequest) =>
        api.post('assignments', { json: dto }).json<AssignedWordResponse[]>(),
    listAssignments: (studentId: string) =>
        api.get(`students/${studentId}/assignments`).json<AssignedWordResponse[]>(),
    updateAssignment: (id: string, status: string) =>
        api.patch(`assignments/${id}/status`, { searchParams: { status } }).json<AssignedWordResponse>()
};

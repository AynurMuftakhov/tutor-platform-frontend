import ky from 'ky';
import {
    AssignWordsRequest,
    AssignedWordResponse,
    VocabularyWordRequest,
    VocabularyWordResponse
} from '../types';

const api = ky.create({
    prefixUrl: 'http://localhost/vocabulary-service/api/v1/vocabulary/',
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
    listWords: () => api.get('words').json<VocabularyWordResponse[]>(),
    createWord: (dto: VocabularyWordRequest) =>
        api.post('words', { json: dto }).json<VocabularyWordResponse>(),
    updateWord: (id: string, dto: VocabularyWordRequest) =>
        api.put(`words/${id}`, { json: dto }).json<VocabularyWordResponse>(),
    deleteWord: (id: string) => api.delete(`words/${id}`),
    assign: (dto: AssignWordsRequest) =>
        api.post('assignments', { json: dto }).json<AssignedWordResponse[]>(),
    listAssignments: (studentId: string) =>
        api.get(`students/${studentId}/assignments`).json<AssignedWordResponse[]>(),
    updateAssignment: (id: string, status: string) =>
        api.patch(`assignments/${id}/status`, { searchParams: { status } }).json<AssignedWordResponse>()
};
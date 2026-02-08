import ky from 'ky';
import {
    AssignWordsRequest,
    AssignedWordResponse,
    VocabularyWord, CreateWordRequest, AudioPart, PageResult
} from '../types';

const api = ky.create({
    prefixUrl: `${import.meta.env.VITE_API_URL}/vocabulary-service/api/v1/vocabulary/`,
    hooks: {
        beforeRequest: [
            request => {
                // grab your token however you store it
                const token = sessionStorage.getItem('token');
                if (token) {
                    request.headers.set('Authorization', `Bearer ${token}`);
                }
            }
        ]
    }
});


export const vocabApi = {
    listWords: (params: { text?: string; difficulty?: string; page?: number; size?: number; ids?: string[]; sort?: string | string[] } = {}) => {
        const searchParams = new URLSearchParams();
        if (params.text) {
            searchParams.set('text', params.text);
        }
        if (params.difficulty) {
            searchParams.set('difficulty', params.difficulty);
        }
        if (params.page !== undefined) {
            searchParams.set('page', String(params.page));
        }
        if (params.size !== undefined) {
            searchParams.set('size', String(params.size));
        }
        if (params.ids && params.ids.length > 0) {
            params.ids.forEach(id => {
                if (id) searchParams.append('ids', id);
            });
        }
        if (params.sort) {
            const sorts = Array.isArray(params.sort) ? params.sort : [params.sort];
            sorts.forEach(sort => {
                if (sort) searchParams.append('sort', sort);
            });
        }
        return api.get('words', { searchParams }).json<PageResult<VocabularyWord>>();
    },
    createWord: (dto: CreateWordRequest) =>
        api.post('words/create', { json: dto }).json<VocabularyWord>(),
    updateWord: (id: string, dto: Partial<VocabularyWord>) =>
        api.patch(`words/${id}`, { json: dto }).json<VocabularyWord>(),
    deleteWord: (id: string) => api.delete(`words/${id}`),
    regenerateAudio: (id: string, part?: AudioPart) =>
        api.patch(`words/${id}/audio/regenerate`, { 
            searchParams: part ? { part } : undefined 
        }).json<VocabularyWord>(),

    assign: (dto: AssignWordsRequest) =>
        api.post('assignments', { json: dto }).json<AssignedWordResponse[]>(),
    listAssignments: (studentId: string) =>
        api.get(`students/${studentId}/assignments`).json<AssignedWordResponse[]>(),
    updateAssignment: (id: string, status: string) =>
        api.patch(`assignments/${id}/status`, { searchParams: { status } }).json<AssignedWordResponse>()
};

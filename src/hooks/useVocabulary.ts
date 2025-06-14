import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vocabApi } from '../services/vocabulary.api';
import {AudioPart, CreateWordRequest, VocabularyWord } from '../types';

const QUERY_KEY = ['vocabulary', 'words'];

export const useDictionary = () => useQuery({
    queryKey: QUERY_KEY,
    queryFn: vocabApi.listWords
});

export const useCreateWord = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreateWordRequest) => vocabApi.createWord(dto),
        onSuccess: (word) => {
            // push to cache for instant list update
            qc.setQueryData<VocabularyWord[]>(QUERY_KEY, old => (old ? [word, ...old] : [word]));
        }
    });
};

export const useUpdateWord = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: Partial<VocabularyWord> }) =>
            vocabApi.updateWord(id, dto),
        onSuccess: (updated) => {
            qc.setQueryData<VocabularyWord[]>(QUERY_KEY, old =>
                old ? old.map(w => (w.id === updated.id ? updated : w)) : old
            );
        }
    });
};

export const useDeleteWord = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => vocabApi.deleteWord(id),
        onSuccess: (_, id) => {
            qc.setQueryData<VocabularyWord[]>(QUERY_KEY, old => old?.filter(w => w.id !== id) || []);
        }
    });
};

export const useRegenerateAudio = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, part }: { id: string; part?: AudioPart }) => vocabApi.regenerateAudio(id, part),
        onSuccess: (updated) => {
            qc.setQueryData<VocabularyWord[]>(QUERY_KEY, old =>
                old ? old.map(w => (w.id === updated.id ? updated : w)) : old
            );
        }
    });
};

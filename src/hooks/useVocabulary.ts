import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vocabApi } from '../services/vocabulary.api';
import {AudioPart, CreateWordRequest, VocabularyWord, PageResult } from '../types';

const QUERY_KEY = ['vocabulary', 'words'];

export const useDictionary = (
    params: { text?: string; page?: number; size?: number; ids?: string[] } = {},
    options: { enabled?: boolean; staleTime?: number } = {}
) => useQuery({
    queryKey: [...QUERY_KEY, params],
    queryFn: () => vocabApi.listWords(params),
    ...options
});

export const useCreateWord = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreateWordRequest) => vocabApi.createWord(dto),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: QUERY_KEY });
        }
    });
};

export const useUpdateWord = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: Partial<VocabularyWord> }) =>
            vocabApi.updateWord(id, dto),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: QUERY_KEY });
        }
    });
};

export const useDeleteWord = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => vocabApi.deleteWord(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: QUERY_KEY });
        }
    });
};

export const useRegenerateAudio = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, part }: { id: string; part?: AudioPart }) => vocabApi.regenerateAudio(id, part),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: QUERY_KEY });
        }
    });
};

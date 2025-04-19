import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vocabApi } from '../services/vocabulary.api';
import { VocabularyWordRequest } from '../types';

export const useDictionary = () => useQuery({ queryKey: ['words'], queryFn: vocabApi.listWords });

export const useCreateWord = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: VocabularyWordRequest) => vocabApi.createWord(dto),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['words'] })
    });
};

export const useUpdateWord = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: VocabularyWordRequest }) => vocabApi.updateWord(id, dto),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['words'] })
    });
};

export const useDeleteWord = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => vocabApi.deleteWord(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['words'] })
    });
};
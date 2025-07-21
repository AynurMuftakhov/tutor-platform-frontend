import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchGrammarItems, scoreGrammar, GrammarScoreRequest } from '../services/api';

/**
 * Hook to fetch grammar items for a material
 */
export const useGrammarItems = (materialId: string) =>
  useQuery({
    queryKey: ['grammarItems', materialId],
    queryFn: () => fetchGrammarItems(materialId),
    enabled: !!materialId,
  });

/**
 * Hook to score a grammar attempt
 */
export const useScoreGrammar = () =>
  useMutation({
    mutationFn: ({ materialId, payload }: { materialId: string; payload: GrammarScoreRequest }) =>
      scoreGrammar(materialId, payload),
  });
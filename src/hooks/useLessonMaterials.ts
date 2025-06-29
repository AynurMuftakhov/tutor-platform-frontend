import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchLessonMaterials,
  linkMaterialToLesson,
  unlinkMaterialFromLesson,
  reorderLessonMaterial
} from '../services/api';

// Hook for fetching materials for a specific lesson
export const useLessonMaterials = (lessonId: string) => useQuery({
  queryKey: ['lessonMaterials', lessonId],
  queryFn: () => fetchLessonMaterials(lessonId),
  enabled: !!lessonId, // Only run the query if lessonId is provided
});

// Hook for linking a material to a lesson
export const useLinkMaterialToLesson = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ lessonId, materialId }: { lessonId: string, materialId: string }) => 
      linkMaterialToLesson(lessonId, materialId),
    onSuccess: (_, variables) => {
      // Invalidate relevant queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['lessonMaterials', variables.lessonId] });
    },
  });
};

// Hook for unlinking a material from a lesson
export const useUnlinkMaterialFromLesson = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ lessonId, linkId }: { lessonId: string, linkId: string }) => 
      unlinkMaterialFromLesson(lessonId, linkId),
    onSuccess: (_, variables) => {
      // Invalidate relevant queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['lessonMaterials', variables.lessonId] });
    },
  });
};

// Hook for reordering a material in a lesson
export const useReorderLessonMaterial = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ lessonId, linkId, sortOrder }: { 
      lessonId: string, 
      linkId: string,
      sortOrder: number
    }) => reorderLessonMaterial(lessonId, linkId, sortOrder),
    onSuccess: (_, variables) => {
      // Invalidate relevant queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['lessonMaterials', variables.lessonId] });
    },
  });
};
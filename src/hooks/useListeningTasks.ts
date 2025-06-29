import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchListeningTasks,
  createListeningTask,
  updateListeningTask,
  deleteListeningTask
} from '../services/api';

// Hook for fetching listening tasks for a specific material
export const useListeningTasks = (materialId: string) => useQuery({
  queryKey: ['listeningTasks', materialId],
  queryFn: () => fetchListeningTasks(materialId),
  enabled: !!materialId, // Only run the query if materialId is provided
});

// Hook for creating a new listening task
export const useCreateListeningTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ materialId, taskData }: { 
      materialId: string, 
      taskData: {
        title?: string;
        startSec: number;
        endSec: number;
        wordLimit?: number;
        timeLimitSec?: number;
      }
    }) => createListeningTask(materialId, taskData),
    onSuccess: (_, variables) => {
      // Invalidate relevant queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['listeningTasks', variables.materialId] });
    },
  });
};

// Hook for updating a listening task
export const useUpdateListeningTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ materialId, taskId, taskData }: { 
      materialId: string, 
      taskId: string,
      taskData: {
        title?: string;
        startSec?: number;
        endSec?: number;
        wordLimit?: number;
        timeLimitSec?: number;
      }
    }) => updateListeningTask(materialId, taskId, taskData),
    onSuccess: (_, variables) => {
      // Invalidate relevant queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['listeningTasks', variables.materialId] });
    },
  });
};

// Hook for deleting a listening task
export const useDeleteListeningTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ materialId, taskId }: { materialId: string, taskId: string }) => 
      deleteListeningTask(materialId, taskId),
    onSuccess: (_, variables) => {
      // Invalidate relevant queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['listeningTasks', variables.materialId] });
    },
  });
};
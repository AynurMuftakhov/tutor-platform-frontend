import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMaterialFolderTree,
  createMaterialFolder,
  getMaterials
} from '../services/api';

// Hook for fetching the folder tree
export const useFolderTree = () => useQuery({
  queryKey: ['materialFolderTree'],
  queryFn: getMaterialFolderTree,
});

// Hook for creating a new folder
export const useCreateFolder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (folderData: { name: string, parentId?: string }) => 
      createMaterialFolder(folderData),
    onSuccess: () => {
      // Invalidate relevant queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['materialFolderTree'] });
      queryClient.invalidateQueries({ queryKey: ['materialFolders'] });
    },
  });
};

// Hook for fetching materials with filtering and pagination
export const useMaterials = (params: {
  folderId?: string;
  page?: number;
  size?: number;
  search?: string;
  type?: string;
  tags?: string[];
}) => useQuery({
  queryKey: ['materials', params],
  queryFn: () => getMaterials(params),
});

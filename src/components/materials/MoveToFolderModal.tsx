import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
} from '@mui/material';
import { MaterialFolderTree } from '../../types';
import { Material } from './MaterialCard';
import { updateMaterial } from '../../services/api';
import { useQueryClient } from '@tanstack/react-query';

interface MoveToFolderModalProps {
  open: boolean;
  onClose: () => void;
  material: Material | null;
  folderTree: MaterialFolderTree[];
  currentFolderId?: string;
}

const MoveToFolderModal: React.FC<MoveToFolderModalProps> = ({
  open,
  onClose,
  material,
  folderTree,
  currentFolderId,
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState(currentFolderId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  // Reset selected folder when modal opens
  React.useEffect(() => {
    if (open && material) {
      setSelectedFolderId(material.folderId || '');
    }
  }, [open, material]);

  // Recursive function to build folder options
  const buildFolderOptions = (folders: MaterialFolderTree[], level = 0): React.ReactNode[] => {
    return folders.flatMap((folder) => {
      const indent = '—'.repeat(level);
      const prefix = level > 0 ? `${indent} ` : '';

      const options = [
        <MenuItem key={folder.id} value={folder.id}>
          {prefix}{folder.name}
        </MenuItem>
      ];

      if (folder.children && folder.children.length > 0) {
        options.push(...buildFolderOptions(folder.children, level + 1));
      }

      return options;
    });
  };

  const handleSubmit = async () => {
    if (!material) return;

    setIsSubmitting(true);
    try {
      await updateMaterial(material.id, {
        folderId: selectedFolderId || undefined,
      });

      // Invalidate materials query to refresh the list
      await queryClient.invalidateQueries({ queryKey: ['materials'] });
      
      onClose();
    } catch (error) {
      console.error('Failed to move material', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Move Material to Folder</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {material && (
            <Typography variant="subtitle1" gutterBottom>
              Moving: {material.title}
            </Typography>
          )}
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="folder-select-label">Select Folder</InputLabel>
            <Select
              labelId="folder-select-label"
              value={selectedFolderId}
              label="Select Folder"
              onChange={(e) => setSelectedFolderId(e.target.value as string)}
            >
              <MenuItem value="">Uncategorized</MenuItem>
              {buildFolderOptions(folderTree)}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          color="primary"
          variant="contained"
          disabled={isSubmitting || (material?.folderId === selectedFolderId)}
        >
          {isSubmitting ? 'Moving...' : 'Move'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MoveToFolderModal;
import React, {JSX, useState} from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Box,
  Typography,
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { MaterialFolderTree } from '../../types';
import { useCreateFolder } from '../../hooks/useMaterials';
import { ROOT_FOLDER_ID } from './FolderTree';

interface AddFolderModalProps {
  open: boolean;
  onClose: () => void;
  folderTree: MaterialFolderTree[];
  currentFolderId?: string;
}

const AddFolderModal: React.FC<AddFolderModalProps> = ({
  open,
  onClose,
  folderTree,
  currentFolderId,
}) => {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState(currentFolderId || ROOT_FOLDER_ID);
  const [nameError, setNameError] = useState('');

  const createFolder = useCreateFolder();

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (e.target.value.trim()) {
      setNameError('');
    }
  };

  const handleParentChange = (event: SelectChangeEvent<string>, child: React.ReactNode) => {
    setParentId(event.target.value);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setNameError('Folder name is required');
      return;
    }

    try {
      await createFolder.mutateAsync({
        name: name.trim(),
        parentId: parentId,
      });

      // Reset form and close modal
      setName('');
      setNameError('');
      onClose();
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

  const handleClose = () => {
    setName('');
    setNameError('');
    onClose();
  };

  // Recursive function to build folder options
  const buildFolderOptions = (folders: MaterialFolderTree[], level = 0): JSX.Element[] => {
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

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add New Folder</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Folder Name"
            fullWidth
            value={name}
            onChange={handleNameChange}
            error={!!nameError}
            helperText={nameError}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth error={false}>
            <InputLabel id="parent-folder-label">Parent Folder</InputLabel>
            <Select
              labelId="parent-folder-label"
              value={parentId}
              onChange={handleParentChange}
              label="Parent Folder"
            >
              <MenuItem value={ROOT_FOLDER_ID}>
                <Typography fontWeight="bold">All Materials (Root)</Typography>
              </MenuItem>
              {buildFolderOptions(folderTree)}
            </Select>
            <FormHelperText>Select where to create the new folder</FormHelperText>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={createFolder.isPending}
        >
          {createFolder.isPending ? 'Creating...' : 'Create Folder'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddFolderModal;

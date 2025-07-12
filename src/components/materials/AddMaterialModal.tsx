import React, {useState, useRef, useEffect, JSX} from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Autocomplete,
  FormHelperText,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import ReactPlayer from 'react-player';
import { MaterialFolderTree } from '../../types';
import { MaterialType } from './MaterialCard';
import { useFolderTree } from '../../hooks/useMaterials';
import { createMaterial, updateMaterial, getMaterialTags, createGrammarItem } from '../../services/api';
import { Material } from './MaterialCard';
import GrammarEditor from '../grammar/GrammarEditor';

// Use the real API functions imported from services/api

interface AddMaterialModalProps {
  open: boolean;
  onClose: () => void;
  onMaterialCreated: (material?: any) => void;
  currentFolderId?: string;
  onOpenTaskManager?: (material: any) => void;
  materialToEdit?: Material | null;
}

const AddMaterialModal: React.FC<AddMaterialModalProps> = ({
  open,
  onClose,
  onMaterialCreated,
  currentFolderId,
  onOpenTaskManager,
  materialToEdit
}) => {
  // Form state
  const [materialType, setMaterialType] = useState<MaterialType>(materialToEdit?.type || 'VIDEO');
  const [sourceUrl, setSourceUrl] = useState(materialToEdit?.sourceUrl || '');
  const [title, setTitle] = useState(materialToEdit?.title || '');
  const [folderId, setFolderId] = useState(materialToEdit?.folderId || currentFolderId || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(materialToEdit?.tags || []);
  // Keeps whatever the user is still typing in the autocomplete field
  const [tagInputValue, setTagInputValue] = useState('');
  const [createTask, setCreateTask] = useState(false);

  // Grammar-specific state
  const [grammarContent, setGrammarContent] = useState('');
  const [grammarAnswer, setGrammarAnswer] = useState('');

  // Validation state
  const [urlError, setUrlError] = useState('');
  const [titleError, setTitleError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Player state for AUDIO/VIDEO
  const playerRef = useRef<ReactPlayer>(null);

  // Fetch folders using React Query
  const { data: folderTree = [], isLoading: foldersLoading } = useFolderTree();

  // State for tags
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);

  // Fetch tags from API
  useEffect(() => {
    const fetchTags = async () => {
      setIsLoadingTags(true);
      try {
        const tags = await getMaterialTags();
        setAvailableTags(tags);
      } catch (error) {
        console.error('Failed to fetch tags', error);
      } finally {
        setIsLoadingTags(false);
      }
    };

    fetchTags();
  }, []);

  // Reset form when modal opens or materialToEdit changes
  useEffect(() => {
    if (open) {
      if (materialToEdit) {
        // Initialize form with materialToEdit values
        setMaterialType(materialToEdit.type || 'VIDEO');
        setSourceUrl(materialToEdit.sourceUrl || '');
        setTitle(materialToEdit.title || '');
        setFolderId(materialToEdit.folderId || currentFolderId || '');
        setSelectedTags(materialToEdit.tags || []);

        // For GRAMMAR type, we'll need to fetch the grammar content
        // This would typically come from the backend, but for now we'll use placeholder
        if (materialToEdit.type === 'GRAMMAR') {
          setGrammarContent(materialToEdit.sourceUrl || '');
          setGrammarAnswer('');
        }
      } else {
        // Reset form for new material
        setMaterialType('VIDEO');
        setSourceUrl('');
        setTitle('');
        setFolderId(currentFolderId || '');
        setSelectedTags([]);
        setGrammarContent('');
        setGrammarAnswer('');
      }
      setTagInputValue('');
      setUrlError('');
      setTitleError('');
      setCreateTask(false);
    }
  }, [open, currentFolderId, materialToEdit]);

  // Validate URL based on material type
  const validateUrl = (url: string) => {
    // Skip URL validation for GRAMMAR type
    if (materialType === 'GRAMMAR') {
      setUrlError('');
      return true;
    }

    if (!url) {
      setUrlError('URL is required');
      return false;
    }

    if (materialType === 'VIDEO' || materialType === 'AUDIO') {
      // Simple regex for YouTube URLs
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
      if (!youtubeRegex.test(url)) {
        setUrlError('Please enter a valid YouTube URL');
        return false;
      }
    } else if (materialType === 'DOCUMENT') {
      // Simple check for document URLs (could be more sophisticated)
      if (!url.startsWith('http')) {
        setUrlError('Please enter a valid URL');
        return false;
      }
    }

    setUrlError('');
    return true;
  };

  // Validate title
  const validateTitle = (value: string) => {
    if (!value.trim()) {
      setTitleError('Title is required');
      return false;
    }
    setTitleError('');
    return true;
  };

  // Handle tag selection
  const handleTagChange = (event: React.SyntheticEvent, newValue: string[]) => {
    // Ensure all values, including custom ones, are included in selectedTags
    setSelectedTags(newValue);
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

  // Handle form submission
  const handleSubmit = async () => {
    // Validate form
    const isUrlValid = materialType === 'GRAMMAR' ? true : validateUrl(sourceUrl);
    const isTitleValid = validateTitle(title);

    // For GRAMMAR type, validate that we have content and at least one gap
    let isGrammarValid = true;
    if (materialType === 'GRAMMAR') {
      if (!grammarContent || !grammarContent.includes('{{')) {
        isGrammarValid = false;
        // We could show an error message here
        return;
      }
    }

    if (!isUrlValid || !isTitleValid || !isGrammarValid) {
      return;
    }

    // Ensure we capture any tag the user typed but didn't press "Enter" for
    const finalTags = [...selectedTags];
    if (tagInputValue.trim() && !finalTags.includes(tagInputValue.trim())) {
      finalTags.push(tagInputValue.trim());
    }

    // For GRAMMAR type, use the grammar content as the sourceUrl
    // In a real implementation, we would store this differently
    const effectiveSourceUrl = materialType === 'GRAMMAR' ? grammarContent : sourceUrl;

    const materialData = {
      type: materialType,
      title,
      sourceUrl: effectiveSourceUrl,
      folderId: folderId || undefined,
      tags: finalTags
    };

    setIsSubmitting(true);
    try {
      let updatedMaterial;

      if (materialToEdit) {
        // Update existing material
        updatedMaterial = await updateMaterial(materialToEdit.id, materialData);
      } else {
        // Create new material
        updatedMaterial = await createMaterial(materialData);
      }

      // For GRAMMAR type, create a grammar item
      if (materialType === 'GRAMMAR' && updatedMaterial) {
        try {
          // Create a grammar item with the content and answer
          await createGrammarItem(updatedMaterial.id, {
            sortOrder: 1,
            type: 'GAP_FILL',
            text: grammarContent,
            answer: grammarAnswer,
          });
        } catch (grammarError) {
          console.error('Failed to create grammar item', grammarError);
          // Continue with the flow even if grammar item creation fails
        }
      }

      // If the user wants to create a task and we have the task manager
      if (createTask && onOpenTaskManager && updatedMaterial) {
        onMaterialCreated(updatedMaterial);
        setTagInputValue('');
        onClose();
        // Open the task manager with the newly created/updated material
        onOpenTaskManager(updatedMaterial);
      } else {
        // Just close the modal
        onMaterialCreated(updatedMaterial);
        setTagInputValue('');
        onClose();
      }
    } catch (error) {
      console.error(`Failed to ${materialToEdit ? 'update' : 'create'} material`, error);
      // You could add error handling here
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{materialToEdit ? 'Edit Learning Material' : 'Add Learning Material'}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id="material-type-label">Material Type</InputLabel>
            <Select
              labelId="material-type-label"
              value={materialType}
              label="Material Type"
              onChange={(e) => setMaterialType(e.target.value as MaterialType)}
            >
              <MenuItem value="VIDEO">VIDEO</MenuItem>
              <MenuItem value="AUDIO">AUDIO</MenuItem>
              <MenuItem value="DOCUMENT">Document</MenuItem>
              <MenuItem value="GRAMMAR">Grammar Exercise</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (e.target.value) validateTitle(e.target.value);
            }}
            error={!!titleError}
            helperText={titleError}
            placeholder="Enter a descriptive title"
            sx={{ mb: 3 }}
          />

          {materialType !== 'GRAMMAR' && (
            <TextField
              fullWidth
              label={materialType === 'VIDEO' || materialType === 'AUDIO' ? 'YouTube URL' : 'Source URL'}
              value={sourceUrl}
              onChange={(e) => {
                setSourceUrl(e.target.value);
                if (e.target.value) validateUrl(e.target.value);
              }}
              error={!!urlError}
              helperText={urlError || (materialType === 'DOCUMENT' ? 'Enter URL to document or PDF' : '')}
              sx={{ mb: 3 }}
            />
          )}

          {materialType === 'GRAMMAR' && (
            <Box sx={{ mb: 3 }}>
              <GrammarEditor 
                initialContent={grammarContent}
                onSave={(content, answer) => {
                  setGrammarContent(content);
                  setGrammarAnswer(answer);
                }}
              />
            </Box>
          )}

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id="folder-label">Folder</InputLabel>
            <Select
              labelId="folder-label"
              value={folderId}
              label="Folder"
              onChange={(e) => setFolderId(e.target.value as string)}
              disabled={foldersLoading}
            >
              <MenuItem value="">Uncategorized</MenuItem>
              {buildFolderOptions(folderTree)}
            </Select>
            <FormHelperText>Select a folder to organize this material</FormHelperText>
          </FormControl>

          <Autocomplete
            multiple
            id="tags-input"
            options={availableTags}
            value={selectedTags}
            onChange={handleTagChange}
            inputValue={tagInputValue}
            onInputChange={(event, value) => setTagInputValue(value)}
            loading={isLoadingTags}
            freeSolo
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((option, index) => (
                  <Chip key={option} label={option} size="small" />
                ))}
              </Box>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Tags"
                placeholder="Add tags"
                helperText="Select existing tags or create new ones"
                fullWidth
              />
            )}
            sx={{ mb: 3 }}
          />

          {(materialType === 'VIDEO' || materialType === 'AUDIO') && sourceUrl && !urlError && (
            <Box sx={{ mb: 3 }}>
              <ReactPlayer
                ref={playerRef}
                url={sourceUrl}
                controls
                width="100%"
                height={materialType === 'VIDEO' ? '240px' : '80px'}
              />
            </Box>
          )}

          {/* Only show the create task checkbox if the new API is enabled and we have a task manager */}
          {onOpenTaskManager && (materialType === 'VIDEO' || materialType === 'AUDIO') && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={createTask}
                  onChange={(e) => setCreateTask(e.target.checked)}
                />
              }
              label="Create listening task after saving material"
              sx={{ mb: 2 }}
            />
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          color="primary" 
          variant="contained"
          disabled={
            materialType === 'GRAMMAR'
              ? (!!titleError || !title || !grammarContent || !grammarContent.includes('{{') || isSubmitting)
              : (materialType === 'VIDEO' || materialType === 'AUDIO')
                ? (!!urlError || !!titleError || isSubmitting)
                : (!!urlError || !!titleError || !sourceUrl || !title || isSubmitting)
          }
        >
          {isSubmitting ? 'Saving...' : materialToEdit ? 'Update' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddMaterialModal;

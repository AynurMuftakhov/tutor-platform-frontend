import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Grid,
  useTheme,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import MaterialCard, { Material } from '../materials/MaterialCard';
import MaterialsToolbar, { MaterialType, ViewMode } from '../materials/MaterialsToolbar';
import { useMaterials } from '../../hooks/useMaterials';
import { useLinkMaterialToLesson, useLessonMaterials } from '../../hooks/useLessonMaterials';

interface MaterialPickerDialogProps {
  lessonId: string;
  open: boolean;
  onClose: () => void;
}

const MaterialPickerDialog: React.FC<MaterialPickerDialogProps> = ({
  lessonId,
  open,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedType, setSelectedType] = useState<MaterialType>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Fetch materials
  const { data: materialsData = { content: [] }, isLoading: materialsLoading } = useMaterials({
    search: searchTerm,
    type: selectedType === 'all' ? undefined : selectedType,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
  });

  // Fetch lesson materials to check which ones are already linked
  const { data: lessonMaterials = [] } = useLessonMaterials(lessonId);
  
  // Link material mutation
  const linkMutation = useLinkMaterialToLesson();

  // Extract materials array from response
  const materials = Array.isArray(materialsData) ? materialsData : materialsData.content || [];

  // Check if a material is already linked to the lesson
  const isLinkedToLesson = (materialId: string) => {
    return lessonMaterials.some((lessonMaterial: any) => lessonMaterial.material.id === materialId);
  };

  // Handle search term change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  // Handle material type change
  const handleTypeChange = (type: MaterialType) => {
    setSelectedType(type);
  };

  // Handle tags change
  const handleTagsChange = (tags: string[]) => {
    setSelectedTags(tags);
  };

  // Handle view mode change
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  // Handle assign button click
  const handleAssign = (material: Material) => {
    linkMutation.mutate(
      { lessonId, materialId: material.id },
      {
        onSuccess: () => {
          // Do nothing, the query will be invalidated automatically
        },
        onError: (error) => {
          console.error('Failed to link material to lesson', error);
        },
      }
    );
  };

  // Empty state component
  const EmptyState = () => (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      <Typography variant="body1">
        No materials available or all materials are already linked to this lesson.
      </Typography>
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Add Materials from Library</Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <MaterialsToolbar
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          selectedType={selectedType}
          onTypeChange={handleTypeChange}
          selectedTags={selectedTags}
          onTagsChange={handleTagsChange}
          hideAddButton
        />

        {/* Materials content */}
        {materialsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : materials.length === 0 ? (
          <EmptyState />
        ) : (
          <Grid container spacing={2}>
            {materials.map((material: Material) => {
              const alreadyLinked = isLinkedToLesson(material.id);
              return (
                <Grid
                  item
                  xs={12}
                  sm={viewMode === 'list' ? 12 : 6}
                  md={viewMode === 'list' ? 12 : 4}
                  lg={viewMode === 'list' ? 12 : 3}
                  key={material.id}
                >
                  <Box sx={{ position: 'relative' }}>
                    <MaterialCard
                      material={material}
                      viewMode={viewMode}
                    />
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      disabled={alreadyLinked}
                      sx={{ 
                        position: 'absolute', 
                        bottom: 16, 
                        right: 16,
                        zIndex: 1,
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: 2
                        },
                        opacity: alreadyLinked ? 0.5 : 1,
                      }}
                      onClick={() => handleAssign(material)}
                    >
                      {alreadyLinked ? 'Already Linked' : 'Assign'}
                    </Button>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MaterialPickerDialog;
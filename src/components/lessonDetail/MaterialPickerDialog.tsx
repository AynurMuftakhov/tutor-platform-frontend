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
import { useMaterials, useFolderTree } from '../../hooks/useMaterials';
import { useLinkMaterialToLesson, useLessonMaterials } from '../../hooks/useLessonMaterials';
import FolderSidebar, { SIDEBAR_WIDTH } from '../folders/FolderSidebar';
import { ROOT_FOLDER_ID } from '../folders/FolderTree';
import { fetchStudents } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

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
  const theme = useTheme();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedType, setSelectedType] = useState<MaterialType>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedFolderId, setSelectedFolderId] = useState<string>(ROOT_FOLDER_ID);
  // Shared student search across cards in this dialog
  const [studentQ, setStudentQ] = useState<string>("");
  const [studentOptions, setStudentOptions] = useState<{ id: string; name: string; email?: string }[]>([]);
  const [studentLoading, setStudentLoading] = useState<boolean>(false);

  React.useEffect(() => {
    if (!user?.id) return;
    const h = setTimeout(async () => {
      setStudentLoading(true);
      try {
        const res = await fetchStudents(user.id, studentQ, 0, 10);
        setStudentOptions(res.content.map((s: any) => ({ id: s.id, name: s.name, email: s.email })));
      } finally {
        setStudentLoading(false);
      }
    }, 300);
    return () => clearTimeout(h);
  }, [studentQ, user?.id]);

  // Fetch folder tree
  const { data: folderTree = [], isLoading: foldersLoading } = useFolderTree();

  // Fetch materials
  const { data: materialsData = { content: [] }, isLoading: materialsLoading } = useMaterials({
    folderId: selectedFolderId === ROOT_FOLDER_ID || selectedFolderId === 'all' ? undefined : selectedFolderId,
    search: searchTerm,
    type:
      selectedType === 'all'
        ? undefined
        : selectedType === 'grammar'
          ? 'GRAMMAR'
          : selectedType === 'listening'
            ? 'LISTENING'
            : selectedType,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
  });

  // Fetch lesson materials to check which ones are already linked
  const { data: lessonMaterials = [], refetch: refetchLessonMaterials } = useLessonMaterials(lessonId);

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

  // Handle tags change
  const handleAddMaterial = () => {
    console.log('Add material');
  };

  // Handle view mode change
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  // Handle folder selection
  const handleFolderSelect = (folderId: string) => {
    setSelectedFolderId(folderId);
  };

  // Handle add folder
  const handleAddFolder = () => {
    console.log('Add folder');
  };

  // Handle assign button click
  const handleAssign = (material: Material) => {
    linkMutation.mutate(
      { lessonId, materialId: material.id },
      {
        onSuccess: () => {
          refetchLessonMaterials();
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
      PaperProps={{
        sx: {
          height: '80vh',
          maxHeight: '900px',
          display: 'flex',
          flexDirection: 'column',
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Add Materials from Library</Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', p: 0, overflow: 'hidden' }}>
        {/* Folder Sidebar */}
        {foldersLoading ? (
          <Box sx={{ width: SIDEBAR_WIDTH, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ width: SIDEBAR_WIDTH, borderRight: `1px solid ${theme.palette.divider}` }}>
            <FolderSidebar
              tree={folderTree}
              selectedId={selectedFolderId}
              onSelect={handleFolderSelect}
              onAddFolder={handleAddFolder}
              isPickerDialog={true}
            />
          </Box>
        )}

        {/* Main Content */}
        <Box sx={{ flexGrow: 1, p: 3, overflow: 'auto' }}>
          <MaterialsToolbar
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            selectedType={selectedType}
            onTypeChange={handleTypeChange}
            selectedTags={selectedTags}
            onTagsChange={handleTagsChange}
            onAddMaterial={handleAddMaterial}
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
                    size={{
                      xs : 12,
                      sm : viewMode === 'list' ? 12 : 6,
                      md: viewMode === 'list' ? 12 : 4,
                      lg: viewMode === 'list' ? 12 : 3
                    }}
                    key={material.id}
                  >
                    <Box sx={{ position: 'relative' }}>
                      <MaterialCard
                        material={material}
                        viewMode={viewMode}
                        studentOptionsExternal={studentOptions}
                        studentLoadingExternal={studentLoading}
                        onStudentQueryChange={setStudentQ}
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
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default MaterialPickerDialog;

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Paper,
  Grid,
  useTheme,
  Dialog,
} from '@mui/material';
import ListeningTaskManager from '../components/materials/ListeningTaskManager';
import {
  Add as AddIcon,
} from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ROOT_FOLDER_ID } from '../components/folders/FolderTree';
import FolderSidebar, { SIDEBAR_WIDTH } from '../components/folders/FolderSidebar';
import MaterialsToolbar, { MaterialType, ViewMode } from '../components/materials/MaterialsToolbar';
import MaterialCard, { Material } from '../components/materials/MaterialCard';
import AddFolderModal from '../components/folders/AddFolderModal';
import AddMaterialModal from '../components/materials/AddMaterialModal';
import MoveToFolderModal from '../components/materials/MoveToFolderModal';
import { useFolderTree, useMaterials } from '../hooks/useMaterials';
import StandaloneMediaPlayer from '../components/lessonDetail/StandaloneMediaPlayer';
import GrammarViewerDialog from '../components/grammar/GrammarViewerDialog';
import { extractVideoId } from '../utils/videoUtils';
import { deleteMaterial, updateMaterialFolder, deleteMaterialFolder } from '../services/api';

const LearningMaterialsPage: React.FC = () => {
  const theme = useTheme();
  const queryClient = useQueryClient();

  // URL params for state persistence
  const [searchParams, setSearchParams] = useSearchParams();

  // Get state from URL or use defaults
  const getParamOrDefault = <T extends string>(key: string, defaultValue: T): T => {
    return (searchParams.get(key) as T) || defaultValue;
  };

  // State
  const [selectedFolderId, setSelectedFolderId] = useState<string>(getParamOrDefault('folder', ROOT_FOLDER_ID));
  const [searchTerm, setSearchTerm] = useState<string>(getParamOrDefault('search', ''));
  const [selectedType, setSelectedType] = useState<MaterialType>(getParamOrDefault('type', 'all'));
  const [selectedTags, setSelectedTags] = useState<string[]>(
    searchParams.get('tags') ? searchParams.get('tags')!.split(',') : []
  );
  const [viewMode, setViewMode] = useState<ViewMode>(
    getParamOrDefault('view', localStorage.getItem('materialsViewMode') as ViewMode || 'grid')
  );
  const [isAddFolderModalOpen, setIsAddFolderModalOpen] = useState(false);
  const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState<Material | null>(null);
  const [isGrammarDialogOpen, setIsGrammarDialogOpen] = useState(false);
  const [isTaskManagerOpen, setIsTaskManagerOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [materialToEdit, setMaterialToEdit] = useState<Material | null>(null);
  const [materialToMove, setMaterialToMove] = useState<Material | null>(null);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);

  // Fetch data using React Query
  const { data: folderTree = [], isLoading: foldersLoading } = useFolderTree();
  const { data: materialsData = { content: [] }, isLoading: materialsLoading } = useMaterials({
    folderId: selectedFolderId === ROOT_FOLDER_ID || selectedFolderId === 'all' ? undefined : selectedFolderId,
    search: searchTerm,
    type: selectedType === 'all' ? undefined : selectedType === 'grammar' ? 'GRAMMAR' : selectedType,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
  });

  // Extract materials array from response (handle both array and object responses)
  const materials = Array.isArray(materialsData) ? materialsData : materialsData.content || [];

  // Update URL params when state changes
  useEffect(() => {
    const params: Record<string, string> = {};

    if (selectedFolderId !== ROOT_FOLDER_ID && selectedFolderId !== 'all') {
      params.folder = selectedFolderId;
    }

    if (searchTerm) {
      params.search = searchTerm;
    }

    if (selectedType !== 'all') {
      params.type = selectedType;
    }

    if (selectedTags.length > 0) {
      params.tags = selectedTags.join(',');
    }

    if (viewMode !== 'grid') {
      params.view = viewMode;
    }

    setSearchParams(params, { replace: true });

    // Save view mode to localStorage
    localStorage.setItem('materialsViewMode', viewMode);
  }, [selectedFolderId, searchTerm, selectedType, selectedTags, viewMode, setSearchParams]);

  // Handle folder selection
  const handleFolderSelect = (folderId: string) => {
    setSelectedFolderId(folderId);
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

  // Handle play button click
  const handlePlay = (material: Material) => {
    if (material.type === 'GRAMMAR') {
      setSelectedMaterial(material);
      setIsGrammarDialogOpen(true);
    } else {
      setCurrentMaterial(material);
    }
  };

  // Close the player
  const handleClosePlayer = () => {
    setCurrentMaterial(null);
  };

  // Close the grammar dialog
  const handleCloseGrammarDialog = () => {
    setIsGrammarDialogOpen(false);
    setSelectedMaterial(null);
  };

  // Handle managing tasks for a material
  const handleManageTasks = (material: Material) => {
    setSelectedMaterial(material);
    setIsTaskManagerOpen(true);
  };

  // Handle closing the task manager
  const handleCloseTaskManager = () => {
    setIsTaskManagerOpen(false);
    setSelectedMaterial(null);
  };

  // Handle add folder
  const handleAddFolder = () => {
    setIsAddFolderModalOpen(true);
  };

  // Handle edit folder
  const handleEditFolder = async (folder: any) => {
    try {
      await updateMaterialFolder(folder.id, { name: folder.name });
      // Invalidate folder tree query to refresh the list
      await queryClient.invalidateQueries({ queryKey: ['materialFolderTree'] });
    } catch (error) {
      console.error('Failed to update folder', error);
    }
  };

  // Handle delete folder
  const handleDeleteFolder = async (folder: any) => {
    try {
      await deleteMaterialFolder(folder.id);
      // Invalidate folder tree query to refresh the list
      await queryClient.invalidateQueries({ queryKey: ['materialFolderTree'] });
      // If the deleted folder was selected, select the root folder
      if (selectedFolderId === folder.id) {
        setSelectedFolderId(ROOT_FOLDER_ID);
      }
    } catch (error) {
      console.error('Failed to delete folder', error);
    }
  };

  // Handle add material
  const handleAddMaterial = () => {
    setMaterialToEdit(null);
    setIsAddMaterialModalOpen(true);
  };

  // Handle edit material
  const handleEditMaterial = (material: Material) => {
    setMaterialToEdit(material);
    setIsAddMaterialModalOpen(true);
  };

  // Handle move material
  const handleMoveMaterial = (material: Material) => {
    setMaterialToMove(material);
    setIsMoveModalOpen(true);
  };

  // Handle delete material
  const handleDeleteMaterial = async (material: Material) => {
    try {
      await deleteMaterial(material.id);
      // Invalidate materials query to refresh the list
      await queryClient.invalidateQueries({ queryKey: ['materials'] });
    } catch (error) {
      console.error('Failed to delete material', error);
    }
  };

  // Handle material refresh after creation
  const handleMaterialCreated = async (newMaterial?: Material) => {
    // Always invalidate all material queries so inactive queries refresh
    await queryClient.invalidateQueries({ queryKey: ['materials'] });

    // Optionally push the new material optimistically if already present
    if (newMaterial) {
      await queryClient.setQueryData(
        ['materials', {
          folderId: selectedFolderId === ROOT_FOLDER_ID || selectedFolderId === 'all' ? undefined : selectedFolderId,
          search: searchTerm,
          type: selectedType === 'all' ? undefined : selectedType,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
        }],
        (old: any) => {
          if (!old) return old;
          const content = Array.isArray(old) ? old : old.content ?? [];
          const alreadyExists = content.some((m: Material) => m.id === newMaterial.id);
          if (alreadyExists) return old;
          return {
            ...old,
            content: [newMaterial, ...content],
          };
        }
      );
    }
  };

  // Empty state component
  const EmptyState = () => (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'background.default',
        borderRadius: 2,
        textAlign: 'center'
      }}
    >
      <img
        src="/assets/empty-materials.svg"
        alt="No materials"
        style={{ width: '150px', height: '150px', marginBottom: '16px' }}
        onError={(e) => {
          // Fallback if image doesn't exist
          e.currentTarget.style.display = 'none';
        }}
      />
      <Typography variant="h6" gutterBottom>
        {selectedFolderId === 'all' ? 'No materials found' : 'No materials in this folder'}
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        {selectedFolderId === 'all' 
          ? 'Click to add your first material.'
          : 'Drag & drop or click to add material to this folder.'}
      </Typography>
      <Button
        variant="contained"
        color="primary"
        startIcon={<AddIcon />}
        onClick={handleAddMaterial}
      >
        Add Material
      </Button>
    </Paper>
  );

  // Loading state
  if (foldersLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)' ,   bgcolor: '#fafbfd',}}>
      <FolderSidebar
          tree={folderTree}
          selectedId={selectedFolderId}
          onSelect={handleFolderSelect}
          onAddFolder={handleAddFolder}
          onEditFolder={handleEditFolder}
          onDeleteFolder={handleDeleteFolder}
      />
      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          ml: { xs: 0, md: `${SIDEBAR_WIDTH}px`},
          overflow: 'auto',
          borderLeft: { xs: 'none', md: `1px solid ${theme.palette.divider}` },
          boxShadow: { xs: 'none', md: '-2px 0 5px rgba(0,0,0,0.02)' },
        }}
      >

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
            {materials.map((material: any) => (
              <Grid
                size ={{
                xs: 12,
                sm: viewMode === 'list' ? 12 : 6,
                md: viewMode === 'list' ? 12 : 4,
                lg: viewMode === 'list' ? 12 : 3
                }}
                key={material.id}
              >
                <MaterialCard
                  material={material}
                  viewMode={viewMode}
                  onPlay={handlePlay}
                  onEdit={handleEditMaterial}
                  onMove={handleMoveMaterial}
                  onDelete={handleDeleteMaterial}
                  onManageTasks={handleManageTasks}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Add Folder Modal */}
      <AddFolderModal
        open={isAddFolderModalOpen}
        onClose={() => setIsAddFolderModalOpen(false)}
        folderTree={folderTree}
        currentFolderId={selectedFolderId}
      />

      {/* Add Material Modal */}
      <AddMaterialModal
        open={isAddMaterialModalOpen}
        onClose={() => setIsAddMaterialModalOpen(false)}
        onMaterialCreated={handleMaterialCreated}
        currentFolderId={selectedFolderId === 'all' ? '' : selectedFolderId}
        onOpenTaskManager={handleManageTasks}
        materialToEdit={materialToEdit}
      />

      {/* Media Player Dialog */}
      <Dialog
        open={!!currentMaterial}
        onClose={handleClosePlayer}
        maxWidth="md"
        fullWidth
      >
        {currentMaterial && currentMaterial.sourceUrl && (
          <Box sx={{ position: 'relative', height: 500 }}>
            <StandaloneMediaPlayer
              videoId={extractVideoId(currentMaterial.sourceUrl) || ''}
              startTime={0}
              endTime={0}
              onClose={handleClosePlayer}
            />
          </Box>
        )}
      </Dialog>

      {/* Listening Task Manager */}
      {selectedMaterial && (
        <ListeningTaskManager
          material={selectedMaterial}
          open={isTaskManagerOpen}
          onClose={handleCloseTaskManager}
        />
      )}

      {/* Move to Folder Modal */}
      <MoveToFolderModal
        open={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        material={materialToMove}
        folderTree={folderTree}
        currentFolderId={selectedFolderId}
      />

      {/* Grammar Viewer Dialog */}
      {selectedMaterial && selectedMaterial.type === 'GRAMMAR' && (
        <GrammarViewerDialog
          open={isGrammarDialogOpen}
          onClose={handleCloseGrammarDialog}
          materialId={selectedMaterial.id}
          title={selectedMaterial.title}
        />
      )}
    </Box>
  );
};

export default LearningMaterialsPage;

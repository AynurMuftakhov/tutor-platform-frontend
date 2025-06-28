import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Paper,
  Grid,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
} from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import { ROOT_FOLDER_ID } from '../components/folders/FolderTree';
import FolderSidebar, { SIDEBAR_WIDTH } from '../components/folders/FolderSidebar';
import MaterialsToolbar, { MaterialType, ViewMode } from '../components/materials/MaterialsToolbar';
import MaterialCard, { Material } from '../components/materials/MaterialCard';
import AddFolderModal from '../components/folders/AddFolderModal';
import AddMaterialModal from '../components/materials/AddMaterialModal';
import { useFolderTree, useMaterials } from '../hooks/useMaterials';
import StandaloneMediaPlayer from '../components/lessonDetail/StandaloneMediaPlayer';
import { extractVideoId } from '../utils/videoUtils';
import Dialog from '@mui/material/Dialog';

const LearningMaterialsPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // URL params for state persistence
  const [searchParams, setSearchParams] = useSearchParams();

  // Get state from URL or use defaults
  const getParamOrDefault = <T extends string>(key: string, defaultValue: T): T => {
    return (searchParams.get(key) as T) || defaultValue;
  };

  // State
  const [selectedFolderId, setSelectedFolderId] = useState(getParamOrDefault('folder', ROOT_FOLDER_ID));
  const [searchTerm, setSearchTerm] = useState(getParamOrDefault('search', ''));
  const [selectedType, setSelectedType] = useState<MaterialType>(getParamOrDefault('type', 'all'));
  const [selectedTags, setSelectedTags] = useState<string[]>(
    searchParams.get('tags') ? searchParams.get('tags')!.split(',') : []
  );
  const [viewMode, setViewMode] = useState<ViewMode>(
    getParamOrDefault('view', localStorage.getItem('materialsViewMode') as ViewMode || 'grid')
  );
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isAddFolderModalOpen, setIsAddFolderModalOpen] = useState(false);
  const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState<Material | null>(null);

  // Fetch data using React Query
  const { data: folderTree = [], isLoading: foldersLoading } = useFolderTree();
  const { data: materialsData = { content: [] }, isLoading: materialsLoading } = useMaterials({
    folderId: selectedFolderId === ROOT_FOLDER_ID ? undefined : selectedFolderId,
    search: searchTerm,
    type: selectedType === 'all' ? undefined : selectedType,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
  });

  // Extract materials array from response (handle both array and object responses)
  const materials = Array.isArray(materialsData) ? materialsData : materialsData.content || [];

  // Update URL params when state changes
  useEffect(() => {
    const params: Record<string, string> = {};

    if (selectedFolderId !== ROOT_FOLDER_ID) {
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
    if (isMobile) {
      setMobileDrawerOpen(false);
    }
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
    setCurrentMaterial(material);
  };

  // Close the player
  const handleClosePlayer = () => {
    setCurrentMaterial(null);
  };

  // Handle add folder
  const handleAddFolder = () => {
    setIsAddFolderModalOpen(true);
  };

  // Handle add material
  const handleAddMaterial = () => {
    setIsAddMaterialModalOpen(true);
  };

  // Handle material refresh after creation
  const handleMaterialCreated = () => {
    // React Query will automatically refetch the data
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
        No materials in this folder
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Drag & drop or click to add material to this folder.
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
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
      <FolderSidebar
          tree={folderTree}
          selectedId={selectedFolderId}
          onSelect={handleFolderSelect}
          onAddFolder={handleAddFolder}
      />
      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          ml: { xs: 0, md: `${SIDEBAR_WIDTH}px` },
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
                item
                xs={12}
                sm={viewMode === 'list' ? 12 : 6}
                md={viewMode === 'list' ? 12 : 4}
                lg={viewMode === 'list' ? 12 : 3}
                key={material.id}
              >
                <MaterialCard
                  material={material}
                  viewMode={viewMode}
                  onPlay={handlePlay}
                  onEdit={() => console.log('Edit', material)}
                  onDuplicate={() => console.log('Duplicate', material)}
                  onMove={() => console.log('Move', material)}
                  onDelete={() => console.log('Delete', material)}
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
        currentFolderId={selectedFolderId}
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
    </Box>
  );
};

export default LearningMaterialsPage;

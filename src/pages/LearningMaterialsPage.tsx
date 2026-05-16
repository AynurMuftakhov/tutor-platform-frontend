import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Paper,
  Grid,
  useTheme,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Divider,
  Select,
  MenuItem,
  Pagination,
  Alert,
} from '@mui/material';
import PageHeader from '../components/PageHeader';
import ListeningTaskManager from '../components/materials/ListeningTaskManager';
import {
  Add as AddIcon,
  FolderOpenRounded as AllIcon,
  AutoAwesome as NeedsOrgIcon,
  Videocam as VideoIcon,
  MusicNote as AudioIcon,
  Description as DocumentIcon,
  Code as GrammarIcon,
  Headphones as ListeningIcon,
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
import { deleteMaterial, updateMaterialFolder, deleteMaterialFolder, fetchStudents } from '../services/api';
import { resolveUrl } from '../services/assets';
import { useAuth } from '../context/AuthContext';
import ListeningMaterialViewer from '../components/materials/listening/ListeningMaterialViewer';
import {
  buildMaterialsApiQuery,
  MaterialSmartViewId,
  MaterialSortOption,
  SMART_VIEW_LABELS,
} from '../components/materials/materialsViewConfig';

const LearningMaterialsPage: React.FC = () => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // URL params for state persistence
  const [searchParams, setSearchParams] = useSearchParams();

  // Get state from URL or use defaults
  const getParamOrDefault = <T extends string>(key: string, defaultValue: T): T => {
    return (searchParams.get(key) as T) || defaultValue;
  };
  const allowedSmartViews: MaterialSmartViewId[] = ['all', 'needs_organization', 'video', 'audio', 'document', 'grammar', 'listening'];
  const allowedSortOptions: MaterialSortOption[] = ['title_asc', 'title_desc', 'type_asc'];
  const smartFromQuery = searchParams.get('smart') as MaterialSmartViewId | null;
  const sortFromQuery = searchParams.get('sort') as MaterialSortOption | null;

  // State
  const [selectedFolderId, setSelectedFolderId] = useState<string>(getParamOrDefault('folder', 'all'));
  const [searchTerm, setSearchTerm] = useState<string>(getParamOrDefault('search', ''));
  const [selectedType, setSelectedType] = useState<MaterialType>(getParamOrDefault('type', 'all'));
  const [selectedSmartView, setSelectedSmartView] = useState<MaterialSmartViewId>(
    smartFromQuery && allowedSmartViews.includes(smartFromQuery) ? smartFromQuery : 'all'
  );
  const [selectedSort, setSelectedSort] = useState<MaterialSortOption>(
    sortFromQuery && allowedSortOptions.includes(sortFromQuery) ? sortFromQuery : 'title_asc'
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(
    searchParams.get('tags') ? searchParams.get('tags')!.split(',') : []
  );
  const [viewMode, setViewMode] = useState<ViewMode>(
    getParamOrDefault('view', (localStorage.getItem('materialsViewMode') as ViewMode) || 'grid')
  );
  const [page, setPage] = useState<number>(() => Math.max(1, parseInt(getParamOrDefault('page', '1'), 10) || 1));
  const [size, setSize] = useState<number>(() => Math.max(1, parseInt(getParamOrDefault('size', '12'), 10) || 12));
  const [isAddFolderModalOpen, setIsAddFolderModalOpen] = useState(false);
  const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState<Material | null>(null);
  const [isGrammarDialogOpen, setIsGrammarDialogOpen] = useState(false);
  const [isTaskManagerOpen, setIsTaskManagerOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [materialToEdit, setMaterialToEdit] = useState<Material | null>(null);
  const [materialToMove, setMaterialToMove] = useState<Material | null>(null);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);

  // Shared student search (for Assign from each MaterialCard)
  const [studentQ, setStudentQ] = useState<string>("");
  const [studentOptions, setStudentOptions] = useState<{ id: string; name: string; email?: string }[]>([]);
  const [studentLoading, setStudentLoading] = useState<boolean>(false);

  useEffect(() => {
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

  // Fetch data using React Query
  const { data: folderTree = [], isLoading: foldersLoading } = useFolderTree();
  const materialsQuery = useMemo(
    () =>
      buildMaterialsApiQuery({
        folderId: selectedFolderId === ROOT_FOLDER_ID || selectedFolderId === 'all' ? undefined : selectedFolderId,
        search: searchTerm,
        selectedType,
        selectedTags,
        smartView: selectedSmartView,
        sort: selectedSort,
        page: page - 1,
        size,
      }),
    [page, searchTerm, selectedFolderId, selectedSmartView, selectedSort, selectedTags, selectedType, size]
  );

  const {
    data: materialsData = { content: [] },
    isLoading: materialsLoading,
    isError: materialsError,
  } = useMaterials(materialsQuery);

  // Extract materials array from response (handle both array and object responses)
  const materials = Array.isArray(materialsData) ? materialsData : materialsData.content || [];
  // Pagination metadata
  const total: number = Array.isArray(materialsData) ? materials.length : (materialsData.totalElements ?? materials.length ?? 0);
  const totalPages: number = Array.isArray(materialsData) ? 1 : (materialsData.totalPages ?? Math.max(1, Math.ceil(((materialsData.totalElements ?? 0) / (materialsData.size ?? size)) || 1)));
  const from: number = total === 0 ? 0 : (page - 1) * size + 1;
  const to: number = Math.min(page * size, total);

  const folderNameById = useMemo(() => {
    const map = new Map<string, string>();
    const walk = (nodes: any[]) => {
      nodes.forEach((node) => {
        map.set(node.id, node.name);
        if (node.children?.length) {
          walk(node.children);
        }
      });
    };
    walk(folderTree as any[]);
    return map;
  }, [folderTree]);

  const smartViews = useMemo(
    () => [
      { id: 'all', label: SMART_VIEW_LABELS.all, icon: <AllIcon fontSize="small" /> },
      {
        id: 'needs_organization',
        label: SMART_VIEW_LABELS.needs_organization,
        icon: <NeedsOrgIcon fontSize="small" />,
      },
      { id: 'video', label: SMART_VIEW_LABELS.video, icon: <VideoIcon fontSize="small" /> },
      { id: 'audio', label: SMART_VIEW_LABELS.audio, icon: <AudioIcon fontSize="small" /> },
      { id: 'document', label: SMART_VIEW_LABELS.document, icon: <DocumentIcon fontSize="small" /> },
      { id: 'grammar', label: SMART_VIEW_LABELS.grammar, icon: <GrammarIcon fontSize="small" /> },
      { id: 'listening', label: SMART_VIEW_LABELS.listening, icon: <ListeningIcon fontSize="small" /> },
    ],
    []
  );

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

    if (selectedSmartView !== 'all') {
      params.smart = selectedSmartView;
    }

    if (selectedSort !== 'title_asc') {
      params.sort = selectedSort;
    }

    if (selectedTags.length > 0) {
      params.tags = selectedTags.join(',');
    }

    if (viewMode !== 'grid') {
      params.view = viewMode;
    }

    if (page !== 1) {
      params.page = String(page);
    }
    if (size !== 12) {
      params.size = String(size);
    }

    setSearchParams(params, { replace: true });

    // Save view mode to localStorage
    localStorage.setItem('materialsViewMode', viewMode);
  }, [selectedFolderId, searchTerm, selectedType, selectedSmartView, selectedSort, selectedTags, viewMode, page, size, setSearchParams]);

  // Handle folder selection
  const handleFolderSelect = (folderId: string) => {
    setSelectedFolderId(folderId);
    setSelectedSmartView('all');
    setPage(1);
  };

  // Handle search term change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };

  // Handle material type change
  const handleTypeChange = (type: MaterialType) => {
    setSelectedType(type);
    setSelectedSmartView('all');
    setPage(1);
  };

  const handleSortChange = (sort: MaterialSortOption) => {
    setSelectedSort(sort);
    setPage(1);
  };

  const handleSmartViewSelect = (viewId: string) => {
    const view = (viewId as MaterialSmartViewId) || 'all';
    setSelectedSmartView(view);
    setSelectedFolderId('all');
    setSelectedType('all');
    setPage(1);
  };

  // Handle tags change
  const handleTagsChange = (tags: string[]) => {
    setSelectedTags(tags);
    setPage(1);
  };

  // Handle view mode change
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  const clearFilters = () => {
    setSelectedType('all');
    setSelectedTags([]);
    setSearchTerm('');
    setSelectedSmartView('all');
    setSelectedFolderId('all');
    setSelectedSort('title_asc');
    setPage(1);
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
        setSelectedFolderId('all');
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
  const handleMaterialCreated = async (_newMaterial?: Material) => {
    await queryClient.invalidateQueries({ queryKey: ['materials'] });
  };

  const hasAnyFilter = Boolean(
    searchTerm ||
      selectedTags.length ||
      selectedType !== 'all' ||
      selectedSmartView !== 'all' ||
      (selectedFolderId !== ROOT_FOLDER_ID && selectedFolderId !== 'all')
  );

  const emptyTitle =
    selectedSmartView === 'needs_organization'
      ? 'Everything looks organized'
      : selectedFolderId === 'all' || selectedFolderId === ROOT_FOLDER_ID
        ? 'No materials found'
        : 'No materials in this folder';

  const emptyDescription =
    selectedSmartView === 'needs_organization'
      ? 'All visible items already have a folder and tags.'
      : hasAnyFilter
        ? 'Try adjusting search, tags, smart views, or type filters.'
        : 'Add your first learning material to build your library.';

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
        {emptyTitle}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {emptyDescription}
      </Typography>
      <Stack direction="row" spacing={1.5}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddMaterial}
        >
          Add Material
        </Button>
        {hasAnyFilter && (
          <Button variant="outlined" onClick={clearFilters}>
            Clear Filters
          </Button>
        )}
      </Stack>
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
    <Box sx={{ display: 'flex', height: '100%' ,   bgcolor: '#fafbfd',}}>
      <FolderSidebar
          tree={folderTree}
          selectedId={selectedFolderId}
          onSelect={handleFolderSelect}
          onAddFolder={handleAddFolder}
          onEditFolder={handleEditFolder}
          onDeleteFolder={handleDeleteFolder}
          smartViews={smartViews}
          selectedSmartViewId={selectedSmartView}
          onSelectSmartView={handleSmartViewSelect}
      />
      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          ml: { xs: 0, md: `${SIDEBAR_WIDTH}px`},
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderLeft: { xs: 'none', md: `1px solid ${theme.palette.divider}` },
          boxShadow: { xs: 'none', md: '-2px 0 5px rgba(0,0,0,0.02)' },
        }}
      >
        <PageHeader
          title="Learning Materials"
          actions={
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAddMaterial}
            >
              Add Material
            </Button>
          }
          secondaryRow={
            <MaterialsToolbar
              searchTerm={searchTerm}
              onSearchChange={handleSearchChange}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              selectedType={selectedType}
              onTypeChange={handleTypeChange}
              selectedTags={selectedTags}
              onTagsChange={handleTagsChange}
              selectedSort={selectedSort}
              onSortChange={handleSortChange}
              onClearFilters={clearFilters}
              onAddMaterial={handleAddMaterial}
            />
          }
          mb={0}
        />

        {selectedSmartView === 'needs_organization' && (
          <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
            Materials shown here need quick cleanup: missing folder, missing tags, or both. Use the `Fix` action on any card.
          </Alert>
        )}

        {materialsError && (
          <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
            Failed to load learning materials. Please refresh and try again.
          </Alert>
        )}

        {/* Materials content */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
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
                  size={{
                    xs: 12,
                    sm: viewMode === 'list' ? 12 : 6,
                    md: viewMode === 'list' ? 12 : 4,
                    lg: viewMode === 'list' ? 12 : 3,
                  }}
                  key={material.id}
                >
                  <MaterialCard
                    material={material}
                    viewMode={viewMode}
                    folderName={material.folderId ? folderNameById.get(material.folderId) : undefined}
                    highlightNeedsOrganization={selectedSmartView === 'needs_organization'}
                    onPlay={handlePlay}
                    onEdit={handleEditMaterial}
                    onFixMetadata={handleEditMaterial}
                    onMove={handleMoveMaterial}
                    onDelete={handleDeleteMaterial}
                    onManageTasks={handleManageTasks}
                    studentOptionsExternal={studentOptions}
                    studentLoadingExternal={studentLoading}
                    onStudentQueryChange={setStudentQ}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>

        <Divider sx={{ mt: 2 }} />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" mt={2}>
          <Typography variant="body2" color="text.secondary">
            {total > 0 ? `Showing ${from}–${to} of ${total}` : 'No results'}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" color="text.secondary">Per page</Typography>
            <Select size="small" value={String(size)} onChange={(e) => { const v = parseInt(String(e.target.value), 10); setSize(v); setPage(1); }} sx={{ width: 100 }}>
              <MenuItem value={8}>8</MenuItem>
              <MenuItem value={12}>12</MenuItem>
              <MenuItem value={24}>24</MenuItem>
              <MenuItem value={48}>48</MenuItem>
            </Select>
          </Stack>
          <Pagination color="primary" shape="rounded" count={Math.max(1, totalPages)} page={page} onChange={(_, v) => setPage(v)} />
        </Stack>
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
        currentFolderId={selectedFolderId === 'all' || selectedFolderId === ROOT_FOLDER_ID ? '' : selectedFolderId}
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
        {currentMaterial && (
          <>
            <DialogTitle>{currentMaterial.title || 'Material preview'}</DialogTitle>
            <DialogContent dividers>
              {currentMaterial.type === 'LISTENING' ? (
                <ListeningMaterialViewer material={currentMaterial} open={!!currentMaterial} />
              ) : currentMaterial.type === 'AUDIO' ? (
                <Box>
                  {currentMaterial.sourceUrl ? (
                    <audio
                      controls
                      src={resolveUrl(currentMaterial.sourceUrl)}
                      style={{ width: '100%' }}
                      aria-label={currentMaterial.title || 'Audio material'}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Audio source is unavailable.
                    </Typography>
                  )}
                </Box>
              ) : currentMaterial.sourceUrl ? (
                <Box sx={{ position: 'relative', height: 500 }}>
                  <StandaloneMediaPlayer
                    videoId={extractVideoId(currentMaterial.sourceUrl) || ''}
                    startTime={0}
                    endTime={0}
                    onClose={handleClosePlayer}
                  />
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Media source is unavailable.
                </Typography>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClosePlayer}>Close</Button>
            </DialogActions>
          </>
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

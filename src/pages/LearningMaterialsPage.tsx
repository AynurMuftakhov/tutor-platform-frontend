import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  CircularProgress, 
  Paper, 
  Grid, 
  Tabs, 
  Tab, 
  TextField, 
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { 
  Add as AddIcon, 
  Search as SearchIcon, 
  ViewList as ListIcon, 
  ViewModule as GridIcon 
} from '@mui/icons-material';
import { ListeningTask, MaterialFolder } from '../types';
import {deleteGlobalListeningTask, getAllListeningTasks, getMaterialFolders, createMaterialFolder} from '../services/api';
import {ListeningCard} from '../components/lessonDetail/ListeningCard';
import CreateListeningTaskModal from '../components/lessonDetail/CreateListeningTaskModal';
import StandaloneMediaPlayer from '../components/lessonDetail/StandaloneMediaPlayer';
import { extractVideoId } from '../utils/videoUtils';
import Dialog from '@mui/material/Dialog';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const LearningMaterialsPage: React.FC = () => {
  const [tasks, setTasks] = useState<ListeningTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<ListeningTask | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [folders, setFolders] = useState<MaterialFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Handle play button click
  const handlePlay = (task: ListeningTask) => {
    setCurrentTask(task);
  };

  // Handle play button click
  const handleDelete = async(task: ListeningTask) => {
      await deleteGlobalListeningTask(task.id)
      .then(() => {
        fetchTasks();
      })
      .catch(err => {
        console.error('Failed to delete listening task', err);
        setError('Failed to delete listening task. Please try again later.');
      }
      )
  };

  // Close the player
  const handleClosePlayer = () => {
    setCurrentTask(null);
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await getAllListeningTasks();
      setTasks(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch listening tasks', err);
      setError('Failed to load listening tasks. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    try {
      const data = await getMaterialFolders();
      setFolders(data);
    } catch (err) {
      console.error('Failed to fetch folders', err);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchFolders();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleViewModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newViewMode: 'list' | 'grid' | null
  ) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  };

  // Filter tasks based on search term
  const filteredTasks = tasks.filter(task => {
    const title = task.title || '';
    const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFolder = selectedFolder === 'all' || (selectedFolder === '' ? !task.folderId : task.folderId === selectedFolder);
    return matchesSearch && matchesFolder;
  });

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
        alt="No listening tasks" 
        style={{ width: '150px', height: '150px', marginBottom: '16px' }}
        onError={(e) => {
          // Fallback if image doesn't exist
          e.currentTarget.style.display = 'none';
        }}
      />
      <Typography variant="h6" gutterBottom>
        No listening tasks yet
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Add listening tasks to help your students practice their listening skills.
      </Typography>
      <Button 
        variant="contained" 
        color="primary" 
        startIcon={<AddIcon />}
        onClick={() => setIsModalOpen(true)}
      >
        Add Listening Task
      </Button>
    </Paper>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Learning Materials</Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => setIsModalOpen(true)}
        >
          Add New Material
        </Button>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="material types">
          <Tab label="Listening Tasks" />
          <Tab label="Reading Materials" disabled />
          <Tab label="Grammar Exercises" disabled />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        {tasks.length === 0 ? (
          <EmptyState />
        ) : (
          <Box>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' }, 
              justifyContent: 'space-between',
              alignItems: { xs: 'stretch', sm: 'center' },
              mb: 3,
              gap: 2
            }}>
              {/* Search Bar */}
              <TextField
                placeholder="Search by title"
                variant="outlined"
                fullWidth
                size="small"
                value={searchTerm}
                onChange={handleSearchChange}
                sx={{ flexGrow: 1, maxWidth: { sm: '300px' } }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />

              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel id="folder-filter-label">Folder</InputLabel>
                <Select
                  labelId="folder-filter-label"
                  value={selectedFolder}
                  label="Folder"
                  onChange={(e) => setSelectedFolder(e.target.value)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="">Uncategorized</MenuItem>
                  {folders.map(f => (
                    <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button variant="outlined" onClick={() => setIsFolderDialogOpen(true)}>
                Add Folder
              </Button>

              {/* View Toggle */}
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={handleViewModeChange}
                aria-label="view mode"
                size="small"
              >
                <ToggleButton value="list" aria-label="list view">
                  <ListIcon />
                </ToggleButton>
                <ToggleButton value="grid" aria-label="grid view">
                  <GridIcon />
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {filteredTasks.length === 0 ? (
              <Typography variant="body1" sx={{ textAlign: 'center', py: 4 }}>
                No tasks match your search. Try a different search term.
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {filteredTasks.map((task) => (
                  <Grid 
                    item 
                    xs={12} 
                    sm={viewMode === 'list' ? 12 : 6} 
                    md={viewMode === 'list' ? 12 : 4}
                    lg={viewMode === 'list' ? 12 : 3}
                    key={task.id}
                  >
                    <ListeningCard 
                      task={task} 
                      isTutor={true}
                      onPlay={handlePlay}
                      viewMode={viewMode}
                      onDelete={handleDelete}
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Typography variant="body1">Reading materials will be available soon.</Typography>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Typography variant="body1">Grammar exercises will be available soon.</Typography>
      </TabPanel>

      {/* Create Listening Task Modal */}
      <CreateListeningTaskModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTaskCreated={fetchTasks}
        isGlobal={true}
      />

      {/* Media Player Dialog */}
      <Dialog
        open={!!currentTask}
        onClose={handleClosePlayer}
        maxWidth="md"
        fullWidth
      >
        {currentTask && (
          <Box sx={{ position: 'relative', height: 500 }}>
            <StandaloneMediaPlayer
              videoId={extractVideoId(currentTask.sourceUrl) || ''}
              startTime={currentTask.startSec}
              endTime={currentTask.endSec}
              onClose={handleClosePlayer}
            />
          </Box>
        )}
      </Dialog>

      <Dialog open={isFolderDialogOpen} onClose={() => setIsFolderDialogOpen(false)}>
        <Box sx={{ p: 3, minWidth: 300 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Add Folder</Typography>
          <TextField
            fullWidth
            label="Folder Name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={() => setIsFolderDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={async () => {
                await createMaterialFolder({ name: newFolderName });
                setNewFolderName('');
                setIsFolderDialogOpen(false);
                fetchFolders();
              }}
              disabled={!newFolderName.trim()}
            >
              Create
            </Button>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
};

export default LearningMaterialsPage;

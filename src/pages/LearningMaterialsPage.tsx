import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, CircularProgress, Paper, Grid, Tabs, Tab } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { ListeningTask } from '../types/ListeningTask';
import { getAllListeningTasks } from '../services/api';
import ListeningCard from '../components/lessonDetail/ListeningCard';
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

  // Handle play button click
  const handlePlay = (task: ListeningTask) => {
    setCurrentTask(task);
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

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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
          <Grid container spacing={2}>
            {tasks.map((task) => (
              <Grid item xs={12} sm={6} md={4} key={task.id}>
                <ListeningCard 
                  task={task} 
                  isTutor={true}
                  onPlay={handlePlay}
                />
              </Grid>
            ))}
          </Grid>
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
    </Box>
  );
};

export default LearningMaterialsPage;

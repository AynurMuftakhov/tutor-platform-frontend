import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, CircularProgress, Paper, Dialog, IconButton } from '@mui/material';
import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import { ListeningTask } from '../../types/ListeningTask';
import { getListeningTasks } from '../../services/api';
import ListeningCard from './ListeningCard';
import CreateListeningTaskModal from './CreateListeningTaskModal';
import StandaloneMediaPlayer from './StandaloneMediaPlayer';
import { extractVideoId } from '../../utils/videoUtils';

interface MaterialsTabProps {
  lessonId: string;
  isTeacher: boolean;
}

const MaterialsTab: React.FC<MaterialsTabProps> = ({ lessonId, isTeacher }) => {
  const [tasks, setTasks] = useState<ListeningTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<ListeningTask | null>(null);

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
      const data = await getListeningTasks(lessonId);
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
  }, [lessonId]);

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
        {isTeacher 
          ? "Add listening tasks to help your student practice their listening skills."
          : "Your teacher hasn't added any listening tasks yet."}
      </Typography>
      {isTeacher && (
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={() => setIsModalOpen(true)}
        >
          Add Listening Task
        </Button>
      )}
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
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Listening Tasks</Typography>
        {isTeacher && tasks.length > 0 && (
          <Button 
            variant="outlined" 
            startIcon={<AddIcon />}
            onClick={() => setIsModalOpen(true)}
          >
            Add Task
          </Button>
        )}
      </Box>

      {tasks.length === 0 ? (
        <EmptyState />
      ) : (
        <Box>
          {tasks.map((task) => (
            <ListeningCard 
              key={task.id} 
              task={task} 
              isTutor={isTeacher}
              onPlay={handlePlay}
            />
          ))}
        </Box>
      )}

      {/* Create Listening Task Modal */}
      <CreateListeningTaskModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        lessonId={lessonId}
        onTaskCreated={fetchTasks}
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

export default MaterialsTab;

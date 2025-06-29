import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  TextField,
  Typography,
  Divider,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { Material } from '../../types/material';
import { ListeningTask } from '../../types';
import { 
  useListeningTasks, 
  useCreateListeningTask, 
  useUpdateListeningTask, 
  useDeleteListeningTask 
} from '../../hooks/useListeningTasks';

interface ListeningTaskManagerProps {
  material: Material;
  open: boolean;
  onClose: () => void;
  onTaskChange?: () => void; // Callback for when tasks are created, updated, or deleted
}

interface TaskFormData {
  id?: string;
  title: string;
  startSec: number;
  endSec: number;
  wordLimit?: number;
  timeLimitSec?: number;
}

const ListeningTaskManager: React.FC<ListeningTaskManagerProps> = ({
  material,
  open,
  onClose,
  onTaskChange
}) => {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [currentTask, setCurrentTask] = useState<TaskFormData>({
    title: '',
    startSec: 0,
    endSec: 0
  });

  // Fetch tasks for this material
  const { data: tasks = [], isLoading } = useListeningTasks(material.id);

  // Mutations
  const createTask = useCreateListeningTask();
  const updateTask = useUpdateListeningTask();
  const deleteTask = useDeleteListeningTask();

  // Format time (seconds to MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle opening the add task form
  const handleAddTask = () => {
    setCurrentTask({
      title: '',
      startSec: 0,
      endSec: material.duration || 60
    });
    setIsAddingTask(true);
    setIsEditingTask(false);
  };

  // Handle opening the edit task form
  const handleEditTask = (task: ListeningTask) => {
    setCurrentTask({
      id: task.id,
      title: task.title || '',
      startSec: task.startSec,
      endSec: task.endSec,
      wordLimit: task.wordLimit,
      timeLimitSec: task.timeLimitSec
    });
    setIsEditingTask(true);
    setIsAddingTask(false);
  };

  // State for delete confirmation dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  // Handle opening delete confirmation dialog
  const handleDeleteClick = (taskId: string) => {
    setTaskToDelete(taskId);
    setDeleteConfirmOpen(true);
  };

  // Handle confirming task deletion
  const handleDeleteConfirm = () => {
    if (taskToDelete) {
      deleteTask.mutate(
        { materialId: material.id, taskId: taskToDelete },
        {
          onSuccess: () => {
            // Call the onTaskChange callback if provided
            if (onTaskChange) onTaskChange();
          }
        }
      );
      setDeleteConfirmOpen(false);
      setTaskToDelete(null);
    }
  };

  // Handle canceling task deletion
  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setTaskToDelete(null);
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Convert numeric fields
    if (['startSec', 'endSec', 'wordLimit', 'timeLimitSec'].includes(name)) {
      setCurrentTask({
        ...currentTask,
        [name]: value === '' ? undefined : Number(value)
      });
    } else {
      setCurrentTask({
        ...currentTask,
        [name]: value
      });
    }
  };

  // Handle form submission
  const handleSubmitTask = (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditingTask && currentTask.id) {
      // Update existing task
      updateTask.mutate({
        materialId: material.id,
        taskId: currentTask.id,
        taskData: {
          title: currentTask.title || undefined,
          startSec: currentTask.startSec,
          endSec: currentTask.endSec,
          wordLimit: currentTask.wordLimit,
          timeLimitSec: currentTask.timeLimitSec
        }
      });
    } else {
      // Create new task
      createTask.mutate({
        materialId: material.id,
        taskData: {
          title: currentTask.title || undefined,
          startSec: currentTask.startSec,
          endSec: currentTask.endSec,
          wordLimit: currentTask.wordLimit,
          timeLimitSec: currentTask.timeLimitSec
        }
      });
    }

    // Close the form
    setIsAddingTask(false);
    setIsEditingTask(false);
  };

  // Handle canceling the form
  const handleCancelForm = () => {
    setIsAddingTask(false);
    setIsEditingTask(false);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Listening Tasks for {material.title}
          </Typography>
          <IconButton edge="end" onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {isLoading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {(isAddingTask || isEditingTask) ? (
              // Task form
              <Box component="form" onSubmit={handleSubmitTask} sx={{ mt: 1 }}>
                <TextField
                  name="title"
                  label="Task Title (optional)"
                  value={currentTask.title}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                />

                <Box display="flex" gap={2} mt={2}>
                  <TextField
                    name="startSec"
                    label="Start Time (seconds)"
                    type="number"
                    value={currentTask.startSec}
                    onChange={handleInputChange}
                    fullWidth
                    required
                    margin="normal"
                    InputProps={{ inputProps: { min: 0 } }}
                  />

                  <TextField
                    name="endSec"
                    label="End Time (seconds)"
                    type="number"
                    value={currentTask.endSec}
                    onChange={handleInputChange}
                    fullWidth
                    required
                    margin="normal"
                    InputProps={{ inputProps: { min: currentTask.startSec + 1 } }}
                  />
                </Box>

                <Box display="flex" gap={2} mt={2}>
                  <TextField
                    name="wordLimit"
                    label="Word Limit (optional)"
                    type="number"
                    value={currentTask.wordLimit || ''}
                    onChange={handleInputChange}
                    fullWidth
                    margin="normal"
                    InputProps={{ inputProps: { min: 0 } }}
                  />

                  <TextField
                    name="timeLimitSec"
                    label="Time Limit (seconds, optional)"
                    type="number"
                    value={currentTask.timeLimitSec || ''}
                    onChange={handleInputChange}
                    fullWidth
                    margin="normal"
                    InputProps={{ inputProps: { min: 0 } }}
                  />
                </Box>

                <Box display="flex" justifyContent="flex-end" gap={1} mt={3}>
                  <Button onClick={handleCancelForm}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    variant="contained" 
                    color="primary"
                    disabled={createTask.isPending || updateTask.isPending}
                  >
                    {createTask.isPending || updateTask.isPending ? (
                      <CircularProgress size={24} />
                    ) : isEditingTask ? 'Update Task' : 'Add Task'}
                  </Button>
                </Box>
              </Box>
            ) : (
              // Task list
              <>
                <Box display="flex" justifyContent="flex-end" mb={2}>
                  <Button 
                    startIcon={<AddIcon />} 
                    variant="contained" 
                    color="primary"
                    onClick={handleAddTask}
                  >
                    Add Task
                  </Button>
                </Box>

                {tasks.length === 0 ? (
                  <Typography color="textSecondary" align="center" sx={{ py: 4 }}>
                    No listening tasks yet. Click &quot;Add Task&quot; to create one.
                  </Typography>
                ) : (
                  <List>
                    {tasks.map((task: ListeningTask) => (
                      <React.Fragment key={task.id}>
                        <ListItem>
                          <ListItemText
                            primary={task.title || `Task ${formatTime(task.startSec)} - ${formatTime(task.endSec)}`}
                            secondary={
                              <Box component="span">
                                <Typography component="span" variant="body2">
                                  {formatTime(task.startSec)} - {formatTime(task.endSec)}
                                </Typography>
                                {(task.wordLimit || task.timeLimitSec) && (
                                  <Typography component="span" variant="body2" sx={{ ml: 2 }}>
                                    {task.wordLimit && `${task.wordLimit} words`}
                                    {task.wordLimit && task.timeLimitSec && ' • '}
                                    {task.timeLimitSec && `${task.timeLimitSec}s limit`}
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                          <ListItemSecondaryAction>
                            <Tooltip title="Edit">
                              <IconButton edge="end" onClick={() => handleEditTask(task)}>
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton edge="end" onClick={() => handleDeleteClick(task.id)}>
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </ListItemSecondaryAction>
                        </ListItem>
                        <Divider />
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </>
            )}
          </>
        )}
      </DialogContent>

      {!isAddingTask && !isEditingTask && (
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-task-dialog-title"
      >
        <DialogTitle id="delete-task-dialog-title">
          Confirm Deletion
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this task?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default ListeningTaskManager;

import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
  CircularProgress,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { useListeningTasks, useDeleteListeningTask } from '../../hooks/useListeningTasks';
import type { ListeningTask } from '../../types';
import type { Material } from '../../types/material';
import ListeningTaskEditor from './listening/ListeningTaskEditor';

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

interface ListeningTaskManagerProps {
  material: Material;
  open: boolean;
  onClose: () => void;
  onTaskChange?: () => void; // Callback for when tasks are created, updated, or deleted
}

const ListeningTaskManager: React.FC<ListeningTaskManagerProps> = ({
  material,
  open,
  onClose,
  onTaskChange
}) => {
  const { data: tasks = [], isLoading } = useListeningTasks(material.id);
  const deleteTask = useDeleteListeningTask();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTask, setEditorTask] = useState<ListeningTask | undefined>(undefined);

  const audioCount = useMemo(() => tasks.filter((task: ListeningTask) => Boolean(task.audioUrl)).length, [tasks]);

  const handleDeleteClick = (taskId: string) => {
    setTaskToDelete(taskId);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (taskToDelete) {
      deleteTask.mutate(
        { materialId: material.id, taskId: taskToDelete },
        {
          onSuccess: () => {
            if (onTaskChange) onTaskChange();
          }
        }
      );
      setDeleteConfirmOpen(false);
      setTaskToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setTaskToDelete(null);
  };

  const openEditorForCreate = () => {
    setEditorTask(undefined);
    setEditorOpen(true);
  };

  const openEditorForEdit = (task: ListeningTask) => {
    setEditorTask(task);
    setEditorOpen(true);
  };

  const handleEditorClose = () => {
    setEditorOpen(false);
    setEditorTask(undefined);
  };

  const handleEditorSaved = () => {
    if (onTaskChange) onTaskChange();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>
        <Typography variant="h6">Listening tasks for {material.title}</Typography>
      </DialogTitle>

      <DialogContent>
        {isLoading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={3}>
            <Button startIcon={<AddIcon />} variant="contained" onClick={openEditorForCreate}>
              New listening task
            </Button>

            {tasks.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                No listening tasks yet. Create one to reuse across lessons.
              </Typography>
            ) : (
              <>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip label={`${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}`} color="primary" variant="outlined" />
                  <Chip label={`${audioCount} with audio`} variant="outlined" />
                </Stack>
                <List>
                  {tasks.map((task: ListeningTask) => (
                    <React.Fragment key={task.id}>
                      <ListItem alignItems="flex-start">
                        <ListItemText
                          primary={task.title || `Clip ${formatTime(task.startSec)} – ${formatTime(task.endSec)}`}
                          secondary={
                            <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                              <Typography variant="body2" color="text.secondary">
                                {formatTime(task.startSec)} – {formatTime(task.endSec)}
                                {task.wordLimit ? ` • up to ${task.wordLimit} words` : ''}
                                {task.timeLimitSec ? ` • ${task.timeLimitSec}s` : ''}
                              </Typography>
                              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <Chip size="small" label={task.status || 'DRAFT'} color={task.status === 'READY' ? 'success' : 'default'} />
                                {task.targetWords && task.targetWords.length > 0 && (
                                  <Chip size="small" label={`${task.targetWords.length} blanks`} />
                                )}
                                {task.audioUrl && <Chip size="small" label="Audio" color="secondary" />}
                              </Stack>
                              {task.targetWords && task.targetWords.length > 0 && (
                                <Typography variant="caption" color="text.secondary">
                                  Target words: {task.targetWords.join(', ')}
                                </Typography>
                              )}
                            </Stack>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Tooltip title="Edit">
                            <IconButton onClick={() => openEditorForEdit(task)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton onClick={() => handleDeleteClick(task.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </ListItemSecondaryAction>
                      </ListItem>
                      <Divider component="li" />
                    </React.Fragment>
                  ))}
                </List>
              </>
            )}
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Done</Button>
      </DialogActions>

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

      <ListeningTaskEditor
        material={material}
        open={editorOpen}
        task={editorTask}
        onClose={handleEditorClose}
        onSaved={handleEditorSaved}
      />
    </Dialog>
  );
};

export default ListeningTaskManager;

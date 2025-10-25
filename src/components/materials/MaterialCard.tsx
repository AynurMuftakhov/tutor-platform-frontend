import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  alpha,
  useTheme,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  DriveFileMove as MoveIcon,
  Delete as DeleteIcon,
  MusicNote as AudioIcon,
  Videocam as VideoIcon,
  Description as DocumentIcon,
  Code as GrammarIcon,
  Assignment as TasksIcon,
  Headphones as ListeningIcon,
  OpenInFull,
  Start,
  StartOutlined,
  School,
} from '@mui/icons-material';
import { useListeningTasks } from '../../hooks/useListeningTasks';
import { useAuth } from '../../context/AuthContext';
import { useCreateAssignment } from '../../hooks/useHomeworks';
import { CreateAssignmentDto } from '../../types/homework';
import { Autocomplete, TextField } from '@mui/material';
import { fetchStudents } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { toOffsetDateTime } from '../../utils/datetime';

export type MaterialType = 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'GRAMMAR' | 'LISTENING';

export interface Material {
  id: string;
  title: string;
  type: MaterialType;
  thumbnailUrl?: string;
  duration?: number; // in seconds
  tags?: string[];
  sourceUrl?: string;
  folderId:string;
}

interface MaterialCardProps {
  material: Material;
  onPlay?: (material: Material) => void;
  onEdit?: (material: Material) => void;
  onMove?: (material: Material) => void;
  onDelete?: (material: Material) => void;
  onUnlink?: (material: Material) => void;
  onManageTasks?: (material: Material) => void;
  viewMode?: 'list' | 'grid';
  // Optional external student search props to avoid per-card fetching
  studentOptionsExternal?: { id: string; name: string; email?: string }[];
  studentLoadingExternal?: boolean;
  onStudentQueryChange?: (query: string) => void;
}

const MaterialCard: React.FC<MaterialCardProps> = ({
  material,
  onPlay,
  onEdit,
  onMove,
  onDelete,
  onUnlink,
  onManageTasks,
  viewMode = 'grid',
  studentOptionsExternal,
  studentLoadingExternal,
  onStudentQueryChange,
}) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const theme = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const create = useCreateAssignment(user?.id || '');
  const [assignOpen, setAssignOpen] = useState(false);
  const [studentQuery, setStudentQuery] = useState('');
  const [studentOptions, setStudentOptions] = useState<{ id: string; name: string; email?: string }[]>([]);
  const [studentLoading, setStudentLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null);
  const [dueAt, setDueAt] = useState('');
  const [customTitle, setCustomTitle] = useState(material.title ? `HW • ${material.title}` : 'Homework');

  const searchStudents = async (q: string) => {
    if (!user?.id) return;
    setStudentLoading(true);
    try {
      const res = await fetchStudents(user.id, q, 0, 10);
      setStudentOptions(res.content.map((s:any) => ({ id: s.id, name: s.name, email: s.email })));
    } finally {
      setStudentLoading(false);
    }
  };

  const useExternalStudents = !!(onStudentQueryChange || studentOptionsExternal || studentLoadingExternal);

  React.useEffect(() => {
    if (useExternalStudents) return; // parent handles fetching
    const h = setTimeout(() => searchStudents(studentQuery), 300);
    return () => clearTimeout(h);
  }, [studentQuery, useExternalStudents]);
  const isVideo = material.type === 'VIDEO';
  const isListening = material.type === 'LISTENING';
  const isMedia = material.type === 'VIDEO' || material.type === 'AUDIO' || isListening;
  const shouldFetchTasks = !isListening && (material.type === 'AUDIO' || material.type === 'VIDEO');
  const { data: tasks = [] } = useListeningTasks(shouldFetchTasks ? material.id : '');

  // Format duration if available
  const formattedDuration = material.duration
    ? `${Math.floor(material.duration / 60)}:${(material.duration % 60).toString().padStart(2, '0')}`
    : undefined;

  // Handle menu open/close
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  // Handle actions
  const handleEdit = () => {
    if (onEdit) onEdit(material);
    handleMenuClose();
  };

  const handleMove = () => {
    if (onMove) onMove(material);
    handleMenuClose();
  };

  const handleUnlink = () => {
    if (onUnlink) onUnlink(material);
    handleMenuClose();
  };

  const handleManageTasks = () => {
    if (onManageTasks) onManageTasks(material);
    handleMenuClose();
  };

  const handleAssign = () => {
    setAssignOpen(true);
    handleMenuClose();
  };

  const submitAssign = async () => {
    if (!selectedStudent || !user?.id) return;
    let task: any;
    if (material.type === 'VIDEO') {
      task = { type: 'VIDEO', sourceKind: 'MATERIAL', title: material.title, contentRef: { materialId: material.id }, ordinal: 1 };
    } else if (material.type === 'GRAMMAR') {
      task = { type: 'GRAMMAR', sourceKind: 'MATERIAL', title: material.title, contentRef: { materialId: material.id }, ordinal: 1 };
    } else if (material.sourceUrl) {
      task = { type: 'LINK', sourceKind: 'EXTERNAL_URL', title: material.title, contentRef: { url: material.sourceUrl }, ordinal: 1 };
    } else {
      task = { type: 'READING', sourceKind: 'MATERIAL', title: material.title, contentRef: { materialId: material.id }, ordinal: 1 };
    }

    const payload: CreateAssignmentDto = {
      studentId: selectedStudent.id,
      title: customTitle || `HW • ${material.title}`,
      dueAt: toOffsetDateTime(dueAt) || undefined,
      idempotencyKey: (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      tasks: [task],
    };

    try {
      await create.mutateAsync(payload);
      window.alert('Assigned');
      navigate('/t/homework');
    } catch (e) {
      // handled globally
    }
  };

  const handleDeleteClick = () => {
    handleMenuClose();
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (onDelete) onDelete(material);
    setIsDeleteDialogOpen(false);
  };

  const handleDeleteCancel = () => {
    setIsDeleteDialogOpen(false);
  };

  // Get icon based on material type
  const getTypeIcon = () => {
    switch (material.type) {
      case 'AUDIO':
        return <AudioIcon fontSize="small" />;
      case 'VIDEO':
        return <VideoIcon fontSize="small" />;
      case 'GRAMMAR':
        return <GrammarIcon fontSize="small" />;
      case 'LISTENING':
        return <ListeningIcon fontSize="small" />;
      case 'DOCUMENT':
      default:
        return <DocumentIcon fontSize="small" />;
    }
  };

  // Get thumbnail based on material type
  const getThumbnail = () => {
    if (material.thumbnailUrl) {
      return material.thumbnailUrl;
    }

    // Default thumbnails based on type
    switch (material.type) {
      case 'AUDIO':
        return '/assets/audio-placeholder.jpg';
      case 'LISTENING':
        return '/assets/audio-placeholder.jpg';
      case 'VIDEO':
        // For YouTube videos, we can use their thumbnail API
        if (material.sourceUrl?.includes('youtube.com') || material.sourceUrl?.includes('youtu.be')) {
          const videoId = material.sourceUrl.includes('v=') 
            ? material.sourceUrl.split('v=')[1].split('&')[0]
            : material.sourceUrl.split('/').pop();
          return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
        }
        return '/assets/video-placeholder.jpg';
      case 'GRAMMAR':
        return '/assets/grammar-placeholder.jpg';
      case 'DOCUMENT':
      default:
        return '/assets/document-placeholder.jpg';
    }
  };

  return (
    <>
      <Card
        sx={{
          display: 'flex',
          flexDirection: viewMode === 'list' 
            ? { xs: 'column', sm: 'row' } 
            : 'column',
          mb: 2,
          height: viewMode === 'list' 
            ? { xs: 'auto', sm: 100 } 
            : '100%',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 3
          }
        }}
      >
        {isVideo && (
          <CardMedia
            component="img"
            sx={{
              width: viewMode === 'list'
                ? { xs: '100%', sm: 150 }
                : '100%',
              height: viewMode === 'list'
                ? { xs: 180, sm: '100%' }
                : 180,
              objectFit: 'cover'
            }}
            image={getThumbnail()}
            alt={material.title}
          />)}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            justifyContent: 'space-between',
            flexGrow: 1
          }}
        >
          <CardContent sx={{ 
            flex: '1 0 auto', 
            py: 1,
            height: viewMode === 'grid' ? '100%' : 'auto',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: viewMode === 'grid' ? 'space-between' : 'flex-start'
          }}>
            <Typography 
              component="div" 
              variant="h6" 
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: viewMode === 'grid' ? 2 : 1,
                WebkitBoxOrient: 'vertical',
                lineHeight: '1.2em',
                height: viewMode === 'grid' ? '2.4em' : '1.2em'
              }}
            >
              {material.title}
            </Typography>

            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 1,
                mt: viewMode === 'grid' ? 'auto' : 1,
                justifyContent: 'space-between'
              }}
            >
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Chip
                  icon={getTypeIcon()}
                  label={formattedDuration || material.type}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ 
                    minWidth: viewMode === 'grid' ? '80px' : 'auto',
                    justifyContent: 'flex-start'
                  }}
                />

                {/* Task count badge - only show if new API is enabled */}
                { tasks && tasks.length > 0 && (
                  <Chip
                    icon={<TasksIcon fontSize="small" />}
                    label={`${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}`}
                    size="small"
                    color="secondary"
                    sx={{ 
                      minWidth: 'auto',
                      justifyContent: 'flex-start'
                    }}
                  />
                )}

                {material.tags && material.tags.length > 0 && viewMode === 'list' && (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {material.tags.slice(0, 2).map(tag => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    ))}
                    {material.tags.length > 2 && (
                      <Chip
                        label={`+${material.tags.length - 2}`}
                        size="small"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                )}
              </Box>

              {/* Action buttons */}
              <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                {(material.type === 'AUDIO' || material.type === 'VIDEO' || material.type === 'GRAMMAR' || material.type === 'LISTENING') && onPlay && (
                  <Tooltip
                    title={
                      isVideo
                        ? 'Play'
                        : material.type === 'GRAMMAR'
                          ? 'Start exercise'
                          : 'Play'
                    }
                  >
                    <IconButton
                      size="small"
                      onClick={() => onPlay(material)}
                      sx={{
                        color: theme.palette.primary.main,
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        width: 32,
                        height: 32,
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.2),
                        }
                      }}
                    >
                      {material.type === 'GRAMMAR'
                        ? <School />
                        : <PlayIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                )}

                {(onEdit || onUnlink || onManageTasks) && (<Tooltip title="More options">
                  <IconButton
                    size="small"
                    onClick={handleMenuOpen}
                    sx={{
                      width: 32,
                      height: 32,
                    }}
                  >
                    <MoreIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                )}
              </Box>
            </Box>
          </CardContent>
        </Box>
      </Card>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        { onManageTasks && isMedia && !isListening && (
          <MenuItem onClick={handleManageTasks}>
            <ListItemIcon>
              <TasksIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Tasks</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={handleAssign}>
          <ListItemIcon>
            <TasksIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Assign</ListItemText>
        </MenuItem>
        {onEdit && (
          <MenuItem onClick={handleEdit}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
        )}
        {onMove && (
          <MenuItem onClick={handleMove}>
            <ListItemIcon>
              <MoveIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Move</ListItemText>
          </MenuItem>
        )}
        {onUnlink && (
          <MenuItem onClick={handleUnlink} sx={{ color: theme.palette.warning.main }}>
            <ListItemIcon sx={{ color: 'inherit' }}>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Unlink</ListItemText>
          </MenuItem>
        )}
        {onDelete && (
          <MenuItem onClick={handleDeleteClick} sx={{ color: theme.palette.error.main }}>
            <ListItemIcon sx={{ color: 'inherit' }}>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Assign Dialog */}
      <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Autocomplete
              options={studentOptionsExternal ?? studentOptions}
              loading={studentLoadingExternal ?? studentLoading}
              getOptionLabel={(opt) => `${opt.name}${opt.email ? ` (${opt.email})` : ''}`}
              onInputChange={(_, v) => {
                if (onStudentQueryChange) onStudentQueryChange(v);
                else setStudentQuery(v);
              }}
              onChange={(_, v) => setSelectedStudent(v as any)}
              renderInput={(params) => (
                <TextField {...params} label="Student" placeholder="Search by name/email" />
              )}
            />
            <TextField label="Custom title" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} />
            <TextField type="datetime-local" label="Due At (optional)" InputLabelProps={{ shrink: true }} value={dueAt} onChange={e => setDueAt(e.target.value)} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitAssign} disabled={!selectedStudent || create.isPending}>Assign</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Confirm Deletion
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete &quot;{material.title}&quot;?
          </DialogContentText>
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
    </>
  );
};

export default MaterialCard;

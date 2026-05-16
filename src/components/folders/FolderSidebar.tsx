import React, { useState } from 'react';
import {
  Drawer,
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  IconButton,
  Tooltip,
  Typography,
  alpha,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  TextField,
  Chip,
} from '@mui/material';
import {
  ChevronRight,
  ExpandMore,
  FolderOutlined,
  FolderOpenOutlined,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { MaterialFolderTree } from '../../types';

const DRAWER_WIDTH = 280;
const HEADER_HEIGHT = 65;

export interface SidebarSmartView {
  id: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
}

export interface FolderSidebarProps {
  tree: MaterialFolderTree[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAddFolder: () => void;
  onEditFolder?: (folder: MaterialFolderTree) => void;
  onDeleteFolder?: (folder: MaterialFolderTree) => void;
  isPickerDialog?: boolean;
  smartViews?: SidebarSmartView[];
  selectedSmartViewId?: string;
  onSelectSmartView?: (id: string) => void;
}

const RecursiveList: React.FC<{
  nodes: MaterialFolderTree[];
  selectedId: string;
  onSelect: (id: string) => void;
  onEditFolder?: (folder: MaterialFolderTree) => void;
  onDeleteFolder?: (folder: MaterialFolderTree) => void;
  level?: number;
}> = ({ nodes, selectedId, onSelect, onEditFolder, onDeleteFolder, level = 0 }) => {
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setOpenMap((m) => ({ ...m, [id]: !m[id] }));

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<MaterialFolderTree | null>(null);
  const [newFolderName, setNewFolderName] = useState('');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<MaterialFolderTree | null>(null);

  const handleEditClick = (e: React.MouseEvent, folder: MaterialFolderTree) => {
    e.stopPropagation();
    setFolderToEdit(folder);
    setNewFolderName(folder.name);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, folder: MaterialFolderTree) => {
    e.stopPropagation();
    setFolderToDelete(folder);
    setDeleteDialogOpen(true);
  };

  const handleEditFolderSubmit = () => {
    if (folderToEdit && onEditFolder && newFolderName.trim()) {
      onEditFolder({ ...folderToEdit, name: newFolderName.trim() });
      setEditDialogOpen(false);
      setFolderToEdit(null);
    }
  };

  const handleDeleteFolderConfirm = () => {
    if (folderToDelete && onDeleteFolder) {
      onDeleteFolder(folderToDelete);
      setDeleteDialogOpen(false);
      setFolderToDelete(null);
    }
  };

  return (
    <>
      <List disablePadding dense>
        {nodes.map((node) => {
          const hasChildren = (node.children?.length ?? 0) > 0;
          const isOpen = openMap[node.id] ?? level < 1;
          const selected = selectedId === node.id;
          const count = node.totalMaterialCount ?? node.materialCount;

          return (
            <React.Fragment key={node.id}>
              <ListItemButton
                selected={selected}
                onClick={() => onSelect(node.id)}
                sx={{
                  py: 0.75,
                  mb: 0.25,
                  borderRadius: 1.25,
                  borderLeft: selected ? (theme) => `3px solid ${theme.palette.primary.main}` : 'none',
                  pl: selected ? 2 + level * 1.5 - 0.5 : 2 + level * 1.5,
                  '&.Mui-selected': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1) },
                  '&:hover': {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.07),
                    '& .folder-actions': { opacity: 1 },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 22 }}>
                  {hasChildren ? (
                    isOpen ? (
                      <ExpandMore
                        fontSize="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggle(node.id);
                        }}
                      />
                    ) : (
                      <ChevronRight
                        fontSize="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggle(node.id);
                        }}
                      />
                    )
                  ) : (
                    <Box sx={{ width: 16 }} />
                  )}
                </ListItemIcon>

                {isOpen ? <FolderOpenOutlined fontSize="small" /> : <FolderOutlined fontSize="small" />}
                <ListItemText
                  primary={node.name}
                  primaryTypographyProps={{
                    variant: 'body2',
                    ml: 1,
                    sx: { fontWeight: selected ? 600 : 400, color: selected ? 'primary.main' : 'text.primary' },
                  }}
                />
                {typeof count === 'number' && (
                  <Chip
                    size="small"
                    label={count}
                    sx={{ height: 20, fontSize: '0.7rem', mr: 0.5 }}
                    color={selected ? 'primary' : 'default'}
                    variant={selected ? 'filled' : 'outlined'}
                  />
                )}

                {(onEditFolder || onDeleteFolder) && (
                  <Box
                    className="folder-actions"
                    sx={{ display: 'flex', opacity: 0, transition: 'opacity 0.2s ease', ml: 'auto' }}
                  >
                    {onEditFolder && (
                      <Tooltip title="Edit folder">
                        <IconButton
                          size="small"
                          onClick={(e) => handleEditClick(e, node)}
                          aria-label={`Edit folder ${node.name}`}
                          sx={{ p: 0.5 }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {onDeleteFolder && (
                      <Tooltip title="Delete folder">
                        <IconButton
                          size="small"
                          onClick={(e) => handleDeleteClick(e, node)}
                          aria-label={`Delete folder ${node.name}`}
                          sx={{ p: 0.5 }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                )}
              </ListItemButton>

              {hasChildren && (
                <Collapse in={isOpen} timeout="auto" unmountOnExit>
                  <RecursiveList
                    nodes={node.children ?? []}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    onEditFolder={onEditFolder}
                    onDeleteFolder={onDeleteFolder}
                    level={level + 1}
                  />
                </Collapse>
              )}
            </React.Fragment>
          );
        })}
      </List>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit Folder</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Folder Name"
            type="text"
            fullWidth
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditFolderSubmit} color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Folder</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the folder &quot;{folderToDelete?.name}&quot;?
            {folderToDelete?.children && folderToDelete.children.length > 0 && (
              <span> This folder contains subfolders that will also be deleted.</span>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteFolderConfirm} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export const FolderSidebar: React.FC<FolderSidebarProps> = ({
  tree,
  selectedId,
  onSelect,
  onAddFolder,
  onEditFolder,
  onDeleteFolder,
  isPickerDialog = false,
  smartViews = [],
  selectedSmartViewId,
  onSelectSmartView,
}) => {
  const theme = useTheme();
  const root = tree[0];
  const nodes = root?.children ?? tree;
  const headerTop = isPickerDialog ? 0 : HEADER_HEIGHT;

  const containerSx = {
    width: DRAWER_WIDTH,
    bgcolor: '#fafbfd',
    borderRight: `1px solid ${theme.palette.divider}`,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  } as const;

  const Content = (
    <>
      <Box
        sx={{
          position: 'sticky',
          top: headerTop,
          bgcolor: '#fafbfd',
          py: 1.5,
          px: 1.25,
          zIndex: 2,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.65)}`,
        }}
      >
        <Typography variant="subtitle2" color="text.secondary" sx={{ letterSpacing: '0.02em' }}>
          Library
        </Typography>
      </Box>

      <Box sx={{ overflow: 'auto', flexGrow: 1, px: 1, pb: 1 }}>
        {smartViews.length > 0 && (
          <Box sx={{ pt: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ px: 1, textTransform: 'uppercase' }}>

            </Typography>
            <List dense disablePadding sx={{ mt: 0.5 }}>
              {smartViews.map((view) => {
                const selected = selectedSmartViewId === view.id;
                return (
                  <ListItemButton
                    key={view.id}
                    selected={selected}
                    onClick={() => onSelectSmartView?.(view.id)}
                    sx={{
                      borderRadius: 1.25,
                      py: 0.75,
                      mb: 0.25,
                      '&.Mui-selected': {
                        bgcolor: (paletteTheme) => alpha(paletteTheme.palette.primary.main, 0.1),
                      },
                    }}
                    aria-label={`Open smart view ${view.label}`}
                  >
                    <ListItemIcon sx={{ minWidth: 30 }}>{view.icon}</ListItemIcon>
                    <ListItemText
                      primary={view.label}
                      primaryTypographyProps={{
                        variant: 'body2',
                        sx: { fontWeight: selected ? 600 : 500, color: selected ? 'primary.main' : 'text.primary' },
                      }}
                    />
                    {typeof view.count === 'number' && (
                      <Chip
                        size="small"
                        label={view.count}
                        sx={{ height: 20, fontSize: '0.7rem' }}
                        color={selected ? 'primary' : 'default'}
                        variant={selected ? 'filled' : 'outlined'}
                      />
                    )}
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        )}

        <Box sx={{ pt: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
            Folders
          </Typography>
          {!isPickerDialog && (
            <Tooltip title="Add folder">
              <IconButton
                size="small"
                onClick={onAddFolder}
                aria-label="Add folder"
                sx={{
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.5)}`,
                  borderRadius: 1,
                  p: 0.5,
                }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {smartViews.length === 0 && (
          <List disablePadding dense sx={{ mt: 0.75 }}>
            <ListItemButton
              selected={selectedId === 'all'}
              onClick={() => onSelect('all')}
              sx={{
                borderRadius: 1.25,
                py: 0.75,
                '&.Mui-selected': { bgcolor: (paletteTheme) => alpha(paletteTheme.palette.primary.main, 0.1) },
              }}
            >
              <FolderOpenOutlined fontSize="small" />
              <ListItemText
                primary="All Materials"
                primaryTypographyProps={{
                  variant: 'body2',
                  ml: 1,
                  sx: { fontWeight: selectedId === 'all' ? 600 : 500, color: selectedId === 'all' ? 'primary.main' : 'text.primary' },
                }}
              />
            </ListItemButton>
          </List>
        )}

        <RecursiveList
          nodes={nodes}
          selectedId={selectedId}
          onSelect={onSelect}
          onEditFolder={onEditFolder}
          onDeleteFolder={onDeleteFolder}
        />
      </Box>
    </>
  );

  return isPickerDialog ? (
    <Box sx={containerSx}>{Content}</Box>
  ) : (
    <Drawer
      variant="permanent"
      PaperProps={{
        elevation: 1,
        sx: {
          ml: { xs: 0, md: `${DRAWER_WIDTH}px` },
          pt: 0,
          px: 0,
          zIndex: 1100,
          ...containerSx,
        },
      }}
    >
      {Content}
    </Drawer>
  );
};

export default FolderSidebar;
export const SIDEBAR_WIDTH = DRAWER_WIDTH;

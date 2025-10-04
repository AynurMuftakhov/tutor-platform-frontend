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

export interface FolderSidebarProps {
    tree: MaterialFolderTree[];
    selectedId: string;
    onSelect: (id: string) => void;
    onAddFolder: () => void;
    onEditFolder?: (folder: MaterialFolderTree) => void;
    onDeleteFolder?: (folder: MaterialFolderTree) => void;
    isPickerDialog?: boolean;
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

    // State for edit dialog
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [folderToEdit, setFolderToEdit] = useState<MaterialFolderTree | null>(null);
    const [newFolderName, setNewFolderName] = useState('');

    // State for delete confirmation dialog
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [folderToDelete, setFolderToDelete] = useState<MaterialFolderTree | null>(null);

    // Handle edit button click
    const handleEditClick = (e: React.MouseEvent, folder: MaterialFolderTree) => {
        e.stopPropagation();
        setFolderToEdit(folder);
        setNewFolderName(folder.name);
        setEditDialogOpen(true);
    };

    // Handle delete button click
    const handleDeleteClick = (e: React.MouseEvent, folder: MaterialFolderTree) => {
        e.stopPropagation();
        setFolderToDelete(folder);
        setDeleteDialogOpen(true);
    };

    // Handle edit dialog close
    const handleEditDialogClose = () => {
        setEditDialogOpen(false);
        setFolderToEdit(null);
    };

    // Handle delete dialog close
    const handleDeleteDialogClose = () => {
        setDeleteDialogOpen(false);
        setFolderToDelete(null);
    };

    // Handle edit folder submit
    const handleEditFolderSubmit = () => {
        if (folderToEdit && onEditFolder && newFolderName.trim()) {
            const updatedFolder = { ...folderToEdit, name: newFolderName.trim() };
            onEditFolder(updatedFolder);
            handleEditDialogClose();
        }
    };

    // Handle delete folder confirm
    const handleDeleteFolderConfirm = () => {
        if (folderToDelete && onDeleteFolder) {
            onDeleteFolder(folderToDelete);
            handleDeleteDialogClose();
        }
    };

    return (
        <>
            <List disablePadding dense>
                {nodes.map((n) => {
                    const hasChildren = (n.children?.length ?? 0) > 0;
                    const isOpen = openMap[n.id] ?? level < 1;
                    const selected = selectedId === n.id;

                    return (
                        <React.Fragment key={n.id}>
                            <ListItemButton
                                selected={selected}
                                onClick={() => onSelect(n.id)}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    py: 1,
                                    mb: 0.25,
                                    borderRadius: '6px',
                                    transition: 'all 0.2s ease',
                                    borderLeft: selected ? (theme) => `3px solid ${theme.palette.primary.main}` : 'none',
                                    pl: selected ? 2 + level * 1.5 - 3 : 2 + level * 1.5,
                                    '&.Mui-selected': {
                                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                    },
                                    '&:hover': {
                                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
                                        '& .folder-actions': {
                                            opacity: 1,
                                        },
                                    },
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 28 }}>
                                    {hasChildren ? (
                                        isOpen ? (
                                            <ExpandMore
                                                fontSize="small"
                                                sx={{ transition: 'transform 0.3s ease' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggle(n.id);
                                                }}
                                            />
                                        ) : (
                                            <ChevronRight
                                                fontSize="small"
                                                sx={{ transition: 'transform 0.3s ease' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggle(n.id);
                                                }}
                                            />
                                        )
                                    ) : (
                                        <Box sx={{ width: 16 }} />
                                    )}
                                </ListItemIcon>

                                <Box >
                                    {isOpen ? (
                                        <FolderOpenOutlined fontSize="small" />
                                    ) : (
                                        <FolderOutlined fontSize="small" />
                                    )}
                                </Box>
                                <ListItemText
                                    primaryTypographyProps={{
                                        variant: 'body2',
                                        ml: 1,
                                        sx: {
                                            fontSize: '0.85rem',
                                            fontWeight: selected ? 600 : 400,
                                            color: selected
                                                ? 'primary.main'
                                                : isOpen
                                                    ? 'text.primary'
                                                    : 'text.secondary',
                                        },
                                    }}
                                    primary={n.name}
                                />

                                {/* Folder action buttons */}
                                <Box
                                    className="folder-actions"
                                    sx={{
                                        display: 'flex',
                                        opacity: 0,
                                        transition: 'opacity 0.2s ease',
                                        ml: 'auto',
                                        mr: 0
                                    }}
                                >
                                    {onEditFolder && (
                                        <Tooltip title="Edit folder">
                                            <IconButton
                                                size="small"
                                                onClick={(e) => handleEditClick(e, n)}
                                                sx={{
                                                    p: 0.5,
                                                    color: 'action.active',
                                                    '&:hover': { color: 'primary.main' }
                                                }}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    )}

                                    {onDeleteFolder && (
                                        <Tooltip title="Delete folder">
                                            <IconButton
                                                size="small"
                                                onClick={(e) => handleDeleteClick(e, n)}
                                                sx={{
                                                    p: 0.5,
                                                    color: 'action.active',
                                                    '&:hover': { color: 'error.main' }
                                                }}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                </Box>
                            </ListItemButton>

                            {hasChildren && (
                                <Collapse in={isOpen} timeout="auto" unmountOnExit>
                                    <RecursiveList
                                        nodes={n.children!}
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

            {/* Edit Folder Dialog */}
            <Dialog open={editDialogOpen} onClose={handleEditDialogClose}>
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
                    <Button onClick={handleEditDialogClose}>Cancel</Button>
                    <Button onClick={handleEditFolderSubmit} color="primary">
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Folder Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={handleDeleteDialogClose}>
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
                    <Button onClick={handleDeleteDialogClose}>Cancel</Button>
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
                                                            }) => {
    const theme      = useTheme();
    const root       = tree[0];
    const nodes      = root?.children ?? tree;
    const headerTop  = isPickerDialog ? 0 : HEADER_HEIGHT;

    /* Common container styles (Drawer.Paper or Box) */
    const containerSx = {
        width: DRAWER_WIDTH,
        bgcolor:  '#fafbfd',
        borderRight: `1px solid ${theme.palette.divider}`,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
    } as const;

    /* Shared header + list markup */
    const Content = (
        <>
            {/* Sticky header */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    position: 'sticky',
                    top: headerTop,
                    bgcolor: '#fafbfd',
                    py: 2,
                    px: 1,
                    zIndex: 1,
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                    mb: 1,
                }}
            >
                <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                >
                    📁 Materials tree
                </Typography>

                {!isPickerDialog && (<Tooltip title="Add folder">
                    <IconButton
                        size="small"
                        onClick={onAddFolder}
                        sx={{
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.5)}`,
                            borderRadius: 1,
                            p: 0.5,
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05) },
                        }}
                    >
                        <AddIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                )}
            </Box>

            {/* Scrollable folder list */}
            <Box
                sx={{
                    overflow: 'auto',
                    flexGrow: 1,
                    pt: 1,
                    mt: `${headerTop}px`,
                }}
            >
                {/* “All materials” */}
                <List disablePadding dense>
                    <ListItemButton
                        selected={selectedId === 'all'}
                        onClick={() => onSelect('all')}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            py: 1,
                            mb: 0.25,
                            borderRadius: 1,
                            borderLeft:
                                selectedId === 'all'
                                    ? `3px solid ${theme.palette.primary.main}`
                                    : 'none',
                            pl: selectedId === 'all' ? 1.25 : 2,
                            '&.Mui-selected': {
                                bgcolor: alpha(theme.palette.primary.main, 0.08),
                            },
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.06) },
                        }}
                    >
                        <FolderOpenOutlined fontSize="small" />
                        <ListItemText
                            primary="All Materials"
                            primaryTypographyProps={{
                                variant: 'body2',
                                ml: 1,
                                sx: {
                                    fontSize: '0.85rem',
                                    fontWeight: selectedId === 'all' ? 600 : 400,
                                    color:
                                        selectedId === 'all'
                                            ? 'primary.main'
                                            : 'text.secondary',
                                },
                            }}
                        />
                    </ListItemButton>
                </List>

                {/* Recursive folder tree */}
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

    /* Render variant */
    return isPickerDialog ? (
        /* Inside a dialog → just a Box */
        <Box sx={containerSx}>{Content}</Box>
    ) : (
        /* Normal page → permanent Drawer */
        <Drawer
            variant="permanent"
            PaperProps={{
                elevation: 1,
                sx: {
                    ml: { xs: 0, md: `${DRAWER_WIDTH}px` }, // keep your original offset
                    pt: 0,
                    px: 1,
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

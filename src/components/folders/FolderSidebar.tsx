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
} from '@mui/material';
import {
    ChevronRight,
    ExpandMore,
    FolderOutlined,
    FolderOpenOutlined,
    Add as AddIcon,
} from '@mui/icons-material';
import { MaterialFolderTree } from '../../types';
import {drawerWidth} from "../../layout/MainLayout";

const DRAWER_WIDTH = 220;

export interface FolderSidebarProps {
    tree: MaterialFolderTree[];
    selectedId: string;
    onSelect: (id: string) => void;
    onAddFolder: () => void;
}

const RecursiveList: React.FC<{
    nodes: MaterialFolderTree[];
    selectedId: string;
    onSelect: (id: string) => void;
    level?: number;
}> = ({ nodes, selectedId, onSelect, level = 0 }) => {
    const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
    const toggle = (id: string) => setOpenMap((m) => ({ ...m, [id]: !m[id] }));

    return (
        <List disablePadding dense>
            {nodes.map((n) => {
                const hasChildren = (n.children?.length ?? 0) > 0;
                const isOpen = openMap[n.id] ?? level < 1; // раскрыт 1-й уровень
                return (
                    <React.Fragment key={n.id}>
                        <ListItemButton
                            selected={selectedId === n.id}
                            onClick={() => onSelect(n.id)}
                            sx={{
                                pl: 2 + level * 2,
                                py: 1,
                                mb: 0.5,
                                borderRadius: '6px',
                                transition: 'all 0.2s ease',
                                '&.Mui-selected': {
                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                    borderLeft: (theme) => `3px solid ${theme.palette.primary.main}`,
                                    pl: 2 + level * 2 - 3, // Adjust for the border
                                },
                                '&:hover': {
                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
                                },
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 28 }}>
                                {isOpen ? 
                                    <FolderOpenOutlined fontSize="small" /> : 
                                    <FolderOutlined fontSize="small" />
                                }
                            </ListItemIcon>
                            <ListItemText
                                primaryTypographyProps={{ 
                                    variant: 'body2',
                                    sx: { 
                                        fontWeight: selectedId === n.id ? 500 : 400,
                                        color: selectedId === n.id ? 'primary.main' : 'text.primary'
                                    }
                                }}
                                primary={n.name}
                            />
                            {hasChildren &&
                                (isOpen ? (
                                    <ExpandMore
                                        fontSize="small"
                                        sx={{
                                            transition: 'transform 0.3s ease',
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggle(n.id);
                                        }}
                                    />
                                ) : (
                                    <ChevronRight
                                        fontSize="small"
                                        sx={{
                                            transition: 'transform 0.3s ease',
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggle(n.id);
                                        }}
                                    />
                                ))}
                        </ListItemButton>

                        {hasChildren && (
                            <Collapse in={isOpen} timeout="auto" unmountOnExit>
                                <RecursiveList
                                    nodes={n.children!}
                                    selectedId={selectedId}
                                    onSelect={onSelect}
                                    level={level + 1}
                                />
                            </Collapse>
                        )}
                    </React.Fragment>
                );
            })}
        </List>
    );
};

const FolderSidebar: React.FC<FolderSidebarProps> = ({
                                                         tree,
                                                         selectedId,
                                                         onSelect,
                                                         onAddFolder,
                                                     }) => {
    const theme = useTheme();
    const root = tree[0];
    const nodes = root?.children ?? tree;
    return (
        <Drawer
            variant="permanent"
            PaperProps={{
                elevation: 1,
                sx: {
                    ml: { xs: 0, md: `${drawerWidth}px` },
                    width: DRAWER_WIDTH,
                    bgcolor: 'grey.50',
                    borderRight: 0,
                    pt: 0,
                    px: 1,
                    zIndex: 1100,
                    display: 'flex',
                    flexDirection: 'column',
                },
            }}
        >
            {/* Sticky header with title and add button */}
            <Box 
                sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    position: 'sticky',
                    top: 0,
                    bgcolor: 'grey.50',
                    py: 2,
                    px: 1,
                    zIndex: 1,
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                    mb: 1
                }}
            >
                <Typography 
                    variant="subtitle2" 
                    color="text.secondary"
                    sx={{ 
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5
                    }}
                >
                    📁 Your Folders
                </Typography>
                <Tooltip title="Add folder">
                    <IconButton 
                        size="small" 
                        onClick={onAddFolder}
                        sx={{
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.5)}`,
                            borderRadius: '4px',
                            p: 0.5,
                            '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.05),
                            }
                        }}
                    >
                        <AddIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Folder list */}
            <Box sx={{ overflow: 'auto', flexGrow: 1 }}>
                <RecursiveList nodes={nodes} selectedId={selectedId} onSelect={onSelect} />
            </Box>
        </Drawer>
    );
};

export default FolderSidebar;
export const SIDEBAR_WIDTH = DRAWER_WIDTH;

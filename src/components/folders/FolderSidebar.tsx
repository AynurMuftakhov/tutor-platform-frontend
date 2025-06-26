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
} from '@mui/material';
import {
    ExpandLess,
    ExpandMore,
    Folder as FolderIcon,
    Add as AddIcon,
} from '@mui/icons-material';
import { MaterialFolderTree } from '../../types';

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
                                pl: 1.5 + level * 2,
                                borderRadius: 1,
                                '&.Mui-selected': {
                                    bgcolor: 'action.selected',
                                    fontWeight: 600,
                                },
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 28 }}>
                                <FolderIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText
                                primaryTypographyProps={{ variant: 'subtitle2' }}
                                primary={n.name}
                            />
                            {hasChildren &&
                                (isOpen ? (
                                    <ExpandLess
                                        fontSize="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggle(n.id);
                                        }}
                                    />
                                ) : (
                                    <ExpandMore
                                        fontSize="small"
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
    const root = tree[0];
    const nodes = root?.children ?? tree;
    return (
        <Drawer
            variant="permanent"
            PaperProps={{
                elevation: 1,
                sx: {
                    width: DRAWER_WIDTH,
                    bgcolor: 'grey.50',
                    borderRight: 0,
                    pt: 2,
                    px: 1,
                },
            }}
        >
            <RecursiveList nodes={nodes} selectedId={selectedId} onSelect={onSelect} />
            <Box sx={{ flexGrow: 1 }} />
            <Box sx={{ p: 1, textAlign: 'center' }}>
                <Tooltip title="Add folder">
                    <IconButton size="small" onClick={onAddFolder}>
                        <AddIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>
        </Drawer>
    );
};

export default FolderSidebar;
export const SIDEBAR_WIDTH = DRAWER_WIDTH;
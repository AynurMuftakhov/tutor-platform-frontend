import React from 'react';
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
  SxProps,
  Theme,
} from '@mui/material';
import {
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  Add as AddIcon,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';
import { MaterialFolderTree } from '../../types';

export interface FolderSidebarProps {
  tree: MaterialFolderTree[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAddFolder: () => void;
  sx?: SxProps<Theme>;
}

const DRAWER_WIDTH = 240;

const FolderSidebar: React.FC<FolderSidebarProps> = ({
  tree = [],
  selectedId,
  onSelect,
  onAddFolder,
  sx = {},
}) => {
  const [openIds, setOpenIds] = React.useState<Record<string, boolean>>({});

  const handleToggle = (id: string) => {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderTree = (nodes?: MaterialFolderTree[]) =>
    (nodes ?? []).map((node) => {
      const hasChildren = Array.isArray(node.children) && node.children.length > 0;
      const isOpen = openIds[node.id] || false;
      const isSelected = selectedId === node.id;

      return (
        <Box key={node.id}>
          <ListItemButton
            selected={isSelected}
            onClick={() => onSelect(node.id)}
            sx={{ pl: 2 + (node.level || 0) * 2 }}
          >
            <ListItemIcon>
              {isOpen ? <FolderOpenIcon /> : <FolderIcon />}
            </ListItemIcon>
            <ListItemText primary={node.name} />
            {hasChildren ? (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle(node.id);
                }}
              >
                {isOpen ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            ) : null}
          </ListItemButton>
          {hasChildren && (
            <Collapse in={isOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {renderTree(node.children)}
              </List>
            </Collapse>
          )}
        </Box>
      );
    });

  return (
    <Drawer
      variant="permanent"
      sx={{ width: DRAWER_WIDTH, flexShrink: 0, ...sx }}
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
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 1, mb: 1 }}>
        <Tooltip title="Add Folder">
          <IconButton onClick={onAddFolder} size="small">
            <AddIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <List>{renderTree(tree)}</List>
    </Drawer>
  );
};

export default FolderSidebar;
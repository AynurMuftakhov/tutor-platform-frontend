import React from 'react';
import { TreeView, TreeItem } from '@mui/lab';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { MaterialFolderTree } from '../../types';

export interface FolderTreeProps {
  tree: MaterialFolderTree[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const renderNodes = (nodes: MaterialFolderTree[]) =>
  nodes.map((node) => (
    <TreeItem key={node.id} nodeId={node.id} label={node.name}>
      {node.children && renderNodes(node.children)}
    </TreeItem>
  ));

const FolderTree: React.FC<FolderTreeProps> = ({ tree, selectedId, onSelect }) => {
  return (
    <TreeView
      selected={selectedId}
      onNodeSelect={(_, id) => onSelect(id)}
      aria-label="Material folders"
      defaultCollapseIcon={<ExpandMoreIcon />}
      defaultExpandIcon={<ChevronRightIcon />}
      sx={{ flexGrow: 1, overflowY: 'auto', py: 1 }}
    >
      <TreeItem nodeId="all" label="All materials">
        {renderNodes(tree)}
        <TreeItem nodeId="" label="Uncategorized" />
      </TreeItem>
    </TreeView>
  );
};

export default FolderTree;

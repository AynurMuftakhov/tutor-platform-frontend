import React from 'react';
import { TreeView, TreeItem } from '@mui/lab';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { MaterialFolderTree } from '../../types';

export const ROOT_FOLDER_ID = 'b2e084f9-1601-48b3-98c8-bde136653155';

export interface FolderTreeProps {
  tree: MaterialFolderTree[];
  selectedId: string;
  onSelect: (id: string) => void;
}

/** Рекурсивный рендер узлов */
const renderNodes = (nodes: MaterialFolderTree[]) =>
    nodes.map((node) => (
        <TreeItem key={node.id} nodeId={node.id} label={node.name}>
          {node.children && renderNodes(node.children)}
        </TreeItem>
    ));

const FolderTree: React.FC<FolderTreeProps> = ({ tree, selectedId, onSelect }) => (
    <TreeView
        selected={selectedId}
        onNodeSelect={(_, id) => onSelect(id)}
        aria-label="Material folders"
        defaultCollapseIcon={<ExpandMoreIcon />}
        defaultExpandIcon={<ChevronRightIcon />}
        defaultExpanded={[ROOT_FOLDER_ID]}          // авто-раскрытие корня
        sx={{ flexGrow: 1, overflowY: 'auto', py: 1 }}
    >
      {renderNodes(tree)}
      {/* «Без категории» — виртуальная папка */}
      <TreeItem nodeId="" label="Uncategorized" />
    </TreeView>
);

export default FolderTree;
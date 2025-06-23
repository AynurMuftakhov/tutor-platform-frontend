import React from 'react';
import { Breadcrumbs, Button } from '@mui/material';

export interface BreadcrumbNavProps {
  selectedFolderId: string;
  folderMap: Record<string, { id: string; name: string; parentId?: string }>;
  onSelect: (id: string) => void;
}

const BreadcrumbNav: React.FC<BreadcrumbNavProps> = ({ selectedFolderId, folderMap, onSelect }) => {
  const path: { id: string; name: string }[] = [];
  let current = folderMap[selectedFolderId];
  while (current) {
    path.unshift({ id: current.id, name: current.name });
    if (!current.parentId) break;
    current = folderMap[current.parentId];
  }
  return (
    <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
      <Button variant="text" onClick={() => onSelect('all')} size="small">All materials</Button>
      {path.map(p => (
        <Button key={p.id} variant="text" onClick={() => onSelect(p.id)} size="small">
          {p.name}
        </Button>
      ))}
    </Breadcrumbs>
  );
};

export default BreadcrumbNav;

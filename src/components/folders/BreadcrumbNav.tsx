import React from 'react';
import { Breadcrumbs, Button } from '@mui/material';
import { ROOT_FOLDER_ID } from './FolderTree';

export interface BreadcrumbNavProps {
  selectedFolderId: string;
  folderMap: Record<string, { id: string; name: string; parentId?: string }>;
  onSelect: (id: string) => void;
}

const BreadcrumbNav: React.FC<BreadcrumbNavProps> = ({
                                                       selectedFolderId,
                                                       folderMap,
                                                       onSelect,
                                                     }) => {
  // строим путь корень→…→текущая, но пропускаем сам корень
  const path: { id: string; name: string }[] = [];
  let current = folderMap[selectedFolderId];
  while (current) {
    if (current.id !== ROOT_FOLDER_ID) {
      path.unshift({ id: current.id, name: current.name });
    }
    if (!current.parentId) break;
    current = folderMap[current.parentId];
  }

  return (
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Button size="small" variant="text" onClick={() => onSelect(ROOT_FOLDER_ID)}>
          All materials
        </Button>
        {path.map((p) => (
            <Button
                key={p.id}
                size="small"
                variant="text"
                onClick={() => onSelect(p.id)}
            >
              {p.name}
            </Button>
        ))}
      </Breadcrumbs>
  );
};

export default BreadcrumbNav;
import { MaterialType } from '../components/materials/MaterialCard';

export interface Material {
  id: string;
  title: string;
  type: MaterialType;
  thumbnailUrl?: string;
  duration?: number; // in seconds
  tags?: string[];
  sourceUrl?: string;
  folderId?: string;
  // Add any new fields required by the backend
}

// Export the renamed type for backward compatibility
export type { MaterialType } from '../components/materials/MaterialCard';

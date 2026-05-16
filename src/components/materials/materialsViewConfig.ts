export type MaterialToolbarType = 'all' | 'video' | 'audio' | 'document' | 'grammar' | 'listening';

export type MaterialSmartViewId =
  | 'all'
  | 'needs_organization'
  | 'video'
  | 'audio'
  | 'document'
  | 'grammar'
  | 'listening';

export type MaterialSortOption = 'title_asc' | 'title_desc' | 'type_asc';

export interface MaterialsQueryInput {
  folderId?: string;
  search?: string;
  selectedType: MaterialToolbarType;
  selectedTags: string[];
  smartView: MaterialSmartViewId;
  sort: MaterialSortOption;
  page: number;
  size: number;
}

export interface MaterialsApiQuery {
  folderId?: string;
  search?: string;
  type?: string;
  tags?: string[];
  needsOrganization?: boolean;
  sortBy?: 'title' | 'type';
  sortDir?: 'asc' | 'desc';
  page: number;
  size: number;
}

export const SMART_VIEW_LABELS: Record<MaterialSmartViewId, string> = {
  all: 'All',
  needs_organization: 'Needs organizing',
  video: 'Video',
  audio: 'Audio',
  document: 'Documents',
  grammar: 'Grammar',
  listening: 'Listening',
};

export const mapToolbarTypeToApi = (type: MaterialToolbarType): string | undefined => {
  switch (type) {
    case 'video':
      return 'VIDEO';
    case 'audio':
      return 'AUDIO';
    case 'document':
      return 'DOCUMENT';
    case 'grammar':
      return 'GRAMMAR';
    case 'listening':
      return 'LISTENING';
    case 'all':
    default:
      return undefined;
  }
};

const mapSmartViewToApiType = (view: MaterialSmartViewId): string | undefined => {
  switch (view) {
    case 'video':
      return 'VIDEO';
    case 'audio':
      return 'AUDIO';
    case 'document':
      return 'DOCUMENT';
    case 'grammar':
      return 'GRAMMAR';
    case 'listening':
      return 'LISTENING';
    default:
      return undefined;
  }
};

export const mapSortOption = (sort: MaterialSortOption): Pick<MaterialsApiQuery, 'sortBy' | 'sortDir'> => {
  switch (sort) {
    case 'title_desc':
      return { sortBy: 'title', sortDir: 'desc' };
    case 'type_asc':
      return { sortBy: 'type', sortDir: 'asc' };
    case 'title_asc':
    default:
      return { sortBy: 'title', sortDir: 'asc' };
  }
};

export const buildMaterialsApiQuery = (input: MaterialsQueryInput): MaterialsApiQuery => {
  const smartType = mapSmartViewToApiType(input.smartView);
  const hasSmartFilter = input.smartView !== 'all';
  const isNeedsOrganizationView = input.smartView === 'needs_organization';
  const type = smartType ?? mapToolbarTypeToApi(input.selectedType);
  const { sortBy, sortDir } = mapSortOption(input.sort);

  return {
    folderId: hasSmartFilter ? undefined : input.folderId,
    search: input.search || undefined,
    type: isNeedsOrganizationView ? undefined : type,
    tags: input.selectedTags.length > 0 ? input.selectedTags : undefined,
    needsOrganization: isNeedsOrganizationView ? true : undefined,
    sortBy,
    sortDir,
    page: input.page,
    size: input.size,
  };
};

export const isMaterialNeedsOrganization = (material: { folderId?: string; tags?: string[] | null }): boolean => {
  const hasFolder = !!material.folderId;
  const hasTags = Array.isArray(material.tags) && material.tags.length > 0;
  return !hasFolder || !hasTags;
};

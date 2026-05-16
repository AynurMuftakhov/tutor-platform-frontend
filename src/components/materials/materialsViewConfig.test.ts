import { describe, expect, it } from 'vitest';
import {
  buildMaterialsApiQuery,
  isMaterialNeedsOrganization,
  mapSortOption,
  mapToolbarTypeToApi,
} from './materialsViewConfig';

describe('materialsViewConfig', () => {
  it('maps toolbar types to API types', () => {
    expect(mapToolbarTypeToApi('all')).toBeUndefined();
    expect(mapToolbarTypeToApi('video')).toBe('VIDEO');
    expect(mapToolbarTypeToApi('document')).toBe('DOCUMENT');
    expect(mapToolbarTypeToApi('grammar')).toBe('GRAMMAR');
  });

  it('builds query for regular folder view', () => {
    const query = buildMaterialsApiQuery({
      folderId: 'folder-1',
      search: 'phrasal verbs',
      selectedType: 'grammar',
      selectedTags: ['b2'],
      smartView: 'all',
      sort: 'title_desc',
      page: 2,
      size: 24,
    });

    expect(query).toEqual({
      folderId: 'folder-1',
      search: 'phrasal verbs',
      type: 'GRAMMAR',
      tags: ['b2'],
      needsOrganization: undefined,
      sortBy: 'title',
      sortDir: 'desc',
      page: 2,
      size: 24,
    });
  });

  it('builds query for needs organization smart view', () => {
    const query = buildMaterialsApiQuery({
      folderId: 'folder-1',
      search: '',
      selectedType: 'audio',
      selectedTags: [],
      smartView: 'needs_organization',
      sort: 'title_asc',
      page: 0,
      size: 12,
    });

    expect(query.folderId).toBeUndefined();
    expect(query.type).toBeUndefined();
    expect(query.needsOrganization).toBe(true);
    expect(query.sortBy).toBe('title');
    expect(query.sortDir).toBe('asc');
  });

  it('maps sort options', () => {
    expect(mapSortOption('title_asc')).toEqual({ sortBy: 'title', sortDir: 'asc' });
    expect(mapSortOption('title_desc')).toEqual({ sortBy: 'title', sortDir: 'desc' });
    expect(mapSortOption('type_asc')).toEqual({ sortBy: 'type', sortDir: 'asc' });
  });

  it('classifies material organization state', () => {
    expect(isMaterialNeedsOrganization({ folderId: undefined, tags: [] })).toBe(true);
    expect(isMaterialNeedsOrganization({ folderId: 'folder', tags: [] })).toBe(true);
    expect(isMaterialNeedsOrganization({ folderId: undefined, tags: ['exam'] })).toBe(true);
    expect(isMaterialNeedsOrganization({ folderId: 'folder', tags: ['exam'] })).toBe(false);
  });
});

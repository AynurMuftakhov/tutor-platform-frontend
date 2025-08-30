export type LessonContentStatus = 'DRAFT' | 'PUBLISHED';

export interface BlockRef {
  id: string; // references content[id]
  type: 'text' | 'image' | 'audio' | 'video' | 'grammarMaterial';
}

export interface Column {
  id: string;
  span: number; // 1..12
  ariaLabel?: string;
  blocks: BlockRef[];
}

export interface Row {
  id: string;
  ariaLabel?: string;
  columns: Column[];
}

export interface Section {
  id: string;
  title?: string;
  ariaLabel?: string;
  rows: Row[];
}

export interface PageModel {
  sections: Section[];
}

export interface BaseBlockPayload { id: string; }

export interface TextBlockPayload extends BaseBlockPayload { html: string; }
export interface ImageBlockPayload extends BaseBlockPayload { url?: string; alt?: string; caption?: string; materialId?: string; }
export interface AudioBlockPayload extends BaseBlockPayload { materialId: string; startSec?: number; endSec?: number; autoplay?: boolean; }
export interface VideoBlockPayload extends BaseBlockPayload { materialId: string; startSec?: number; endSec?: number; }
export interface GrammarMaterialBlockPayload extends BaseBlockPayload { materialId: string; itemIds?: string[]; mode?: 'all' | 'subset'; shuffle?: boolean; }

export type BlockContentPayload =
  | TextBlockPayload
  | ImageBlockPayload
  | AudioBlockPayload
  | VideoBlockPayload
  | GrammarMaterialBlockPayload;

export interface LessonContent {
  id: string;
  ownerId: string;
  title: string;
  status: LessonContentStatus;
  tags?: string[];
  layout: PageModel;
  content: Record<string, BlockContentPayload>;
  createdAt: string;
  updatedAt: string;
}

export interface LessonContentListResponse {
  content: LessonContent[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number; // current page
}

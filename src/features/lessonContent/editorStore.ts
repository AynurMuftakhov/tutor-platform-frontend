import React, { createContext, useContext, useMemo, useReducer } from 'react';
import type { LessonContentStatus, PageModel, BlockContentPayload } from '../../types/lessonContent';

export interface EditorSelection { ids: string[] }

export interface EditorState {
  id: string;
  ownerId: string;
  title: string;
  status: LessonContentStatus;
  tags: string[];
  coverImageUrl?: string;
  layout: PageModel;
  content: Record<string, BlockContentPayload>;
  selection: EditorSelection;
  selectedSectionId?: string;
  selectedRowPath?: { sectionId: string; rowId: string };
  selectedColumnPath?: { sectionId: string; rowId: string; columnId: string };
  selectedBlockId?: string;
  overlaysVisible: boolean;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt?: string;
  error?: string;
  // Validation
  isLayoutValid: boolean;
  rowErrors: Record<string, string | undefined>;
  invalidById: Record<string, string | undefined>;
  invalidCount: number;
  inspectorInvalid?: boolean;
  history: Array<{ layout: PageModel; content: Record<string, BlockContentPayload>; title: string; tags: string[]; }>; // simple snapshots
}

const emptyState: EditorState = {
  id: '',
  ownerId: '',
  title: '',
  status: 'DRAFT',
  tags: [],
  layout: { sections: [] },
  content: {},
  selection: { ids: [] },
  selectedSectionId: undefined,
  selectedRowPath: undefined,
  selectedColumnPath: undefined,
  selectedBlockId: undefined,
  overlaysVisible: true,
  isDirty: false,
  isSaving: false,
  isLayoutValid: true,
  rowErrors: {},
  invalidById: {},
  invalidCount: 0,
  history: [],
};

// Actions
 type Action =
  | { type: 'INIT_FROM_SERVER'; payload: { id: string; ownerId: string; title: string; status: LessonContentStatus; tags?: string[]; coverImageUrl?: string; layout: PageModel; content: Record<string, BlockContentPayload>; } }
  | { type: 'SET_TITLE'; payload: string }
  | { type: 'SET_TAGS'; payload: string[] }
  | { type: 'SELECT'; payload: string[] }
  | { type: 'SET_LAYOUT'; payload: PageModel }
  | { type: 'SET_CONTENT'; payload: { id: string; patch: Partial<BlockContentPayload> } }
  | { type: 'ADD_SECTION' }
  | { type: 'DELETE_SECTION'; payload: { sectionId: string } }
  | { type: 'ADD_ROW'; payload: { sectionId: string } }
  | { type: 'DELETE_ROW'; payload: { sectionId: string; rowId: string } }
  | { type: 'MOVE_ROW'; payload: { sectionId: string; from: number; to: number } }
  | { type: 'ADD_COLUMN'; payload: { sectionId: string; rowId: string; span?: number } }
  | { type: 'DELETE_COLUMN'; payload: { sectionId: string; rowId: string; columnId: string } }
  | { type: 'MOVE_COLUMN'; payload: { sectionId: string; rowId: string; from: number; to: number } }
  | { type: 'SET_COLUMN_SPAN'; payload: { sectionId: string; rowId: string; columnId: string; span: number } }
  | { type: 'MOVE_BLOCK'; payload: { from: { sectionId: string; rowId: string; columnId: string; index: number }; to: { sectionId: string; rowId: string; columnId: string; index: number } } }
  | { type: 'DELETE_BY_IDS'; payload: string[] }
  | { type: 'SET_SELECTED_SECTION'; payload?: { sectionId: string } }
  | { type: 'SET_SELECTED_ROW'; payload?: { sectionId: string; rowId: string } }
  | { type: 'SET_SELECTED_COLUMN'; payload?: { sectionId: string; rowId: string; columnId: string } }
  | { type: 'SET_SELECTED_BLOCK'; payload?: { blockId: string } }
  | { type: 'UPDATE_SECTION_META'; payload: { sectionId: string; patch: { title?: string; ariaLabel?: string } } }
  | { type: 'UPDATE_ROW_META'; payload: { sectionId: string; rowId: string; patch: { ariaLabel?: string } } }
  | { type: 'UPDATE_COLUMN_META'; payload: { sectionId: string; rowId: string; columnId: string; patch: { ariaLabel?: string } } }
  | { type: 'INSERT_BLOCK'; payload: { sectionId: string; rowId: string; columnId: string; blockId: string; type: string; content: BlockContentPayload } }
  | { type: 'INSERT_BLOCK_AT'; payload: { sectionId: string; rowId: string; columnId: string; index: number; blockId: string; type: string; content: BlockContentPayload } }
  | { type: 'SET_OVERLAYS_VISIBLE'; payload: boolean }
  | { type: 'SET_INSPECTOR_INVALID'; payload: boolean }
  | { type: 'UNDO' }
  | { type: 'REDO' } // not implemented, reserved
  | { type: 'MARK_DIRTY'; payload: boolean }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_SAVED_AT'; payload?: string }
  | { type: 'SET_ERROR'; payload?: string };

function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function sumSpans(row: { columns: { span: number }[] }): number {
  return (row.columns || []).reduce((acc, c) => acc + (c.span || 0), 0);
}
function computeValidation(layout: PageModel): { isLayoutValid: boolean; rowErrors: Record<string, string | undefined> } {
  const rowErrors: Record<string, string | undefined> = {};
  let valid = true;
  for (const s of layout.sections || []) {
    for (const r of s.rows || []) {
      const total = sumSpans(r as any);
      if (total > 12) {
        rowErrors[r.id] = `Columns exceed 12 (current ${total}/12).`;
        valid = false;
      } else {
        rowErrors[r.id] = undefined;
      }
    }
  }
  return { isLayoutValid: valid, rowErrors };
}

function stripHtml(html: string): string {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || div.innerText || '').trim();
}

function computeBlockValidation(layout: PageModel, content: Record<string, BlockContentPayload>): { invalidById: Record<string, string | undefined>; invalidCount: number } {
  const invalidById: Record<string, string | undefined> = {};
  let invalidCount = 0;
  for (const s of layout.sections || []) {
    for (const r of s.rows || []) {
      for (const c of r.columns || []) {
        for (const b of c.blocks || []) {
          const payload = content[b.id];
          let msg: string | undefined;
          if (!payload) {
            msg = 'Missing block content';
          } else {
            switch (b.type) {
              case 'text': {
                const plain = stripHtml((payload as any).html || '');
                if (!plain) msg = 'Text is empty';
                break;
              }
              case 'image': {
                const p: any = payload;
                if (!((p.url && p.url.trim()) || (p.materialId && String(p.materialId).trim()))) msg = 'Image source required';
                if (!p.alt || !p.alt.trim()) msg = msg ? msg + '; alt required' : 'Image alt required';
                break;
              }
              case 'audio':
              case 'video':
              case 'grammarMaterial': {
                const p: any = payload;
                if (!p.materialId || !String(p.materialId).trim()) msg = 'Material is required';
                break;
              }
              default:
                break;
            }
          }
          if (msg) {
            invalidById[b.id] = msg;
            invalidCount++;
          } else {
            invalidById[b.id] = undefined;
          }
        }
      }
    }
  }
  return { invalidById, invalidCount };
}

function reducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case 'INIT_FROM_SERVER': {
      const { id, ownerId, title, status, tags, coverImageUrl, layout, content } = action.payload;
      const nextLayout = layout ?? { sections: [] };
      const v = computeValidation(nextLayout);
      const bv = computeBlockValidation(nextLayout, content ?? {});
      return {
        ...state,
        id, ownerId, title, status, tags: tags ?? [], coverImageUrl,
        layout: nextLayout,
        content: content ?? {},
        isDirty: false,
        isSaving: false,
        error: undefined,
        lastSavedAt: undefined,
        isLayoutValid: v.isLayoutValid,
        rowErrors: v.rowErrors,
        invalidById: bv.invalidById,
        invalidCount: bv.invalidCount,
        history: [],
      };
    }
    case 'SET_TITLE': {
      return { ...state, title: action.payload, isDirty: true };
    }
    case 'SET_TAGS': {
      return { ...state, tags: action.payload, isDirty: true };
    }
    case 'SELECT': {
      return { ...state, selection: { ids: action.payload } };
    }
    case 'SET_LAYOUT': {
      const next = { ...state, layout: action.payload, isDirty: true };
      return next;
    }
    case 'SET_CONTENT': {
      const { id, patch } = action.payload;
      const prev = state.content[id];
      const base: BlockContentPayload = (prev ?? ({ id } as unknown as BlockContentPayload));
      const updated = { ...base, ...(patch as unknown as BlockContentPayload) } as BlockContentPayload;
      const content = { ...state.content, [id]: updated };
      const bv = computeBlockValidation(state.layout, content);
      return { ...state, content, isDirty: true, invalidById: bv.invalidById, invalidCount: bv.invalidCount };
    }
    case 'ADD_SECTION': {
      const newSection = { id: `sec_${Math.random().toString(36).slice(2,9)}`, rows: [] };
      const layout = { sections: [...(state.layout?.sections ?? []), newSection] };
      const v = computeValidation(layout);
      const bv = computeBlockValidation(layout, state.content);
      return { ...state, layout, isDirty: true, isLayoutValid: v.isLayoutValid, rowErrors: v.rowErrors, invalidById: bv.invalidById, invalidCount: bv.invalidCount };
    }
    case 'DELETE_SECTION': {
      const layout = clone(state.layout);
      layout.sections = (layout.sections || []).filter(s => s.id !== action.payload.sectionId);
      const v = computeValidation(layout);
      const bv = computeBlockValidation(layout, state.content);
      return { ...state, layout, isDirty: true, isLayoutValid: v.isLayoutValid, rowErrors: v.rowErrors, invalidById: bv.invalidById, invalidCount: bv.invalidCount };
    }
    case 'ADD_ROW': {
      const layout = clone(state.layout);
      const sec = layout.sections.find(s => s.id === action.payload.sectionId);
      if (sec) {
        sec.rows = sec.rows || [];
        sec.rows.push({ id: `row_${Math.random().toString(36).slice(2,9)}`, columns: [] });
      }
      const v = computeValidation(layout);
      const bv = computeBlockValidation(layout, state.content);
      return { ...state, layout, isDirty: true, isLayoutValid: v.isLayoutValid, rowErrors: v.rowErrors, invalidById: bv.invalidById, invalidCount: bv.invalidCount };
    }
    case 'DELETE_ROW': {
      const layout = clone(state.layout);
      const sec = layout.sections.find(s => s.id === action.payload.sectionId);
      if (sec) {
        sec.rows = (sec.rows || []).filter(r => r.id !== action.payload.rowId);
      }
      const v = computeValidation(layout);
      const bv = computeBlockValidation(layout, state.content);
      return { ...state, layout, isDirty: true, isLayoutValid: v.isLayoutValid, rowErrors: v.rowErrors, invalidById: bv.invalidById, invalidCount: bv.invalidCount };
    }
    case 'MOVE_ROW': {
      const layout = clone(state.layout);
      const sec = layout.sections.find(s => s.id === action.payload.sectionId);
      if (sec && sec.rows && action.payload.from >=0 && action.payload.to >=0 && action.payload.from < sec.rows.length && action.payload.to < sec.rows.length) {
        const [row] = sec.rows.splice(action.payload.from, 1);
        sec.rows.splice(action.payload.to, 0, row);
      }
      const v = computeValidation(layout);
      const bv = computeBlockValidation(layout, state.content);
      return { ...state, layout, isDirty: true, isLayoutValid: v.isLayoutValid, rowErrors: v.rowErrors, invalidById: bv.invalidById, invalidCount: bv.invalidCount };
    }
    case 'ADD_COLUMN': {
      const layout = clone(state.layout);
      const { sectionId, rowId, span } = action.payload;
      const sec = layout.sections.find(s => s.id === sectionId);
      const row = sec?.rows.find(r => r.id === rowId);
      if (row) {
        const used = sumSpans(row as any);
        const remaining = Math.max(0, 12 - used);
        const colSpan = Math.min(span ?? 12, remaining || 12); // if empty row, allow 12
        row.columns = row.columns || [];
        row.columns.push({ id: `col_${Math.random().toString(36).slice(2,9)}`, span: Math.max(1, Math.min(12, colSpan)), blocks: [] });
      }
      const v = computeValidation(layout);
      const bv = computeBlockValidation(layout, state.content);
      return { ...state, layout, isDirty: true, isLayoutValid: v.isLayoutValid, rowErrors: v.rowErrors, invalidById: bv.invalidById, invalidCount: bv.invalidCount };
    }
    case 'DELETE_COLUMN': {
      const layout = clone(state.layout);
      const { sectionId, rowId, columnId } = action.payload;
      const sec = layout.sections.find(s => s.id === sectionId);
      const row = sec?.rows.find(r => r.id === rowId);
      if (row) {
        row.columns = (row.columns || []).filter(c => c.id !== columnId);
      }
      const v = computeValidation(layout);
      const bv = computeBlockValidation(layout, state.content);
      return { ...state, layout, isDirty: true, isLayoutValid: v.isLayoutValid, rowErrors: v.rowErrors, invalidById: bv.invalidById, invalidCount: bv.invalidCount };
    }
    case 'MOVE_COLUMN': {
      const layout = clone(state.layout);
      const { sectionId, rowId, from, to } = action.payload;
      const sec = layout.sections.find(s => s.id === sectionId);
      const row = sec?.rows.find(r => r.id === rowId);
      if (row && row.columns && from>=0 && to>=0 && from<row.columns.length && to<row.columns.length) {
        const [col] = row.columns.splice(from, 1);
        row.columns.splice(to, 0, col);
      }
      const v = computeValidation(layout);
      const bv = computeBlockValidation(layout, state.content);
      return { ...state, layout, isDirty: true, isLayoutValid: v.isLayoutValid, rowErrors: v.rowErrors, invalidById: bv.invalidById, invalidCount: bv.invalidCount };
    }
    case 'SET_COLUMN_SPAN': {
      const { sectionId, rowId, columnId, span } = action.payload;
      const layout = clone(state.layout);
      for (const s of layout.sections) {
        if (s.id !== sectionId) continue;
        for (const r of s.rows) {
          if (r.id !== rowId) continue;
          const othersSum = (r.columns || []).reduce((acc, c) => acc + (c.id === columnId ? 0 : c.span || 0), 0);
          const allowed = Math.max(1, Math.min(12 - othersSum, 12));
          for (const c of r.columns) {
            if (c.id === columnId) {
              c.span = Math.max(1, Math.min(span, allowed));
            }
          }
        }
      }
      const v = computeValidation(layout);
      const bv = computeBlockValidation(layout, state.content);
      return { ...state, layout, isDirty: true, isLayoutValid: v.isLayoutValid, rowErrors: v.rowErrors, invalidById: bv.invalidById, invalidCount: bv.invalidCount };
    }
    case 'SET_SELECTED_SECTION': {
      return { ...state, selectedSectionId: action.payload?.sectionId, selectedRowPath: undefined, selectedColumnPath: undefined, selectedBlockId: undefined } as EditorState;
    }
    case 'SET_SELECTED_ROW': {
      return { ...state, selectedSectionId: action.payload?.sectionId, selectedRowPath: action.payload, selectedColumnPath: undefined, selectedBlockId: undefined } as EditorState;
    }
    case 'SET_SELECTED_COLUMN': {
      return { ...state, selectedSectionId: action.payload?.sectionId, selectedRowPath: action.payload ? { sectionId: action.payload.sectionId, rowId: action.payload.rowId } : undefined, selectedColumnPath: action.payload, selectedBlockId: undefined } as EditorState;
    }
    case 'SET_SELECTED_BLOCK': {
      return { ...state, selectedBlockId: action.payload?.blockId } as EditorState;
    }
    case 'UPDATE_SECTION_META': {
      const { sectionId, patch } = action.payload;
      const layout = clone(state.layout);
      const s = layout.sections.find(s => s.id === sectionId);
      if (s) {
        if (patch.title !== undefined) s.title = patch.title;
        if (patch.ariaLabel !== undefined) s.ariaLabel = patch.ariaLabel;
      }
      return { ...state, layout, isDirty: true };
    }
    case 'UPDATE_ROW_META': {
      const { sectionId, rowId, patch } = action.payload;
      const layout = clone(state.layout);
      const s = layout.sections.find(s => s.id === sectionId);
      const r = s?.rows.find(r => r.id === rowId);
      if (r) {
        if (patch.ariaLabel !== undefined) r.ariaLabel = patch.ariaLabel;
      }
      return { ...state, layout, isDirty: true };
    }
    case 'UPDATE_COLUMN_META': {
      const { sectionId, rowId, columnId, patch } = action.payload;
      const layout = clone(state.layout);
      const s = layout.sections.find(s => s.id === sectionId);
      const r = s?.rows.find(r => r.id === rowId);
      const c = r?.columns.find(c => c.id === columnId);
      if (c) {
        if (patch.ariaLabel !== undefined) c.ariaLabel = patch.ariaLabel;
      }
      return { ...state, layout, isDirty: true };
    }
    case 'INSERT_BLOCK': {
      const { sectionId, rowId, columnId, blockId, type, content } = action.payload;
      const layout = clone(state.layout);
      for (const s of layout.sections) {
        if (s.id !== sectionId) continue;
        for (const r of s.rows) {
          if (r.id !== rowId) continue;
          for (const c of r.columns) {
            if (c.id === columnId) {
              c.blocks = c.blocks || [];
              c.blocks.push({ id: blockId, type: type as any });
            }
          }
        }
      }
      const nextContent = { ...state.content, [blockId]: content } as Record<string, BlockContentPayload>;
      const v = computeValidation(layout);
      const bv = computeBlockValidation(layout, nextContent);
      return { ...state, layout, content: nextContent, isDirty: true, isLayoutValid: v.isLayoutValid, rowErrors: v.rowErrors, invalidById: bv.invalidById, invalidCount: bv.invalidCount };
    }
    case 'INSERT_BLOCK_AT': {
      const { sectionId, rowId, columnId, index, blockId, type, content } = action.payload;
      const layout = clone(state.layout);
      for (const s of layout.sections) {
        if (s.id !== sectionId) continue;
        for (const r of s.rows) {
          if (r.id !== rowId) continue;
          for (const c of r.columns) {
            if (c.id === columnId) {
              c.blocks = c.blocks || [];
              const safeIndex = Math.max(0, Math.min(index, c.blocks.length));
              c.blocks.splice(safeIndex, 0, { id: blockId, type: type as any });
            }
          }
        }
      }
      const nextContent = { ...state.content, [blockId]: content } as Record<string, BlockContentPayload>;
      const v = computeValidation(layout);
      const bv = computeBlockValidation(layout, nextContent);
      return { ...state, layout, content: nextContent, isDirty: true, isLayoutValid: v.isLayoutValid, rowErrors: v.rowErrors, invalidById: bv.invalidById, invalidCount: bv.invalidCount };
    }
    case 'MOVE_BLOCK': {
      const { from, to } = action.payload;
      const layout = clone(state.layout);
      // locate source and target columns
      const findCol = (sectionId: string, rowId: string, columnId: string) => {
        const sec = layout.sections.find(s => s.id === sectionId);
        const row = sec?.rows.find(r => r.id === rowId);
        const col = row?.columns.find(c => c.id === columnId);
        return col;
      };
      const srcCol = findCol(from.sectionId, from.rowId, from.columnId);
      const dstCol = findCol(to.sectionId, to.rowId, to.columnId);
      if (!srcCol || !dstCol) return state;
      srcCol.blocks = srcCol.blocks || [];
      dstCol.blocks = dstCol.blocks || [];
      if (from.index < 0 || from.index >= srcCol.blocks.length) return state;
      let insertIndex = Math.max(0, Math.min(to.index, dstCol.blocks.length));
      const [moved] = srcCol.blocks.splice(from.index, 1);
      if (!moved) return state;
      // adjust index when moving within same column and original index < target index
      if (srcCol === dstCol && from.index < insertIndex) {
        insertIndex = Math.max(0, insertIndex - 1);
      }
      dstCol.blocks.splice(insertIndex, 0, moved);
      const v = computeValidation(layout);
      const bv = computeBlockValidation(layout, state.content);
      return { ...state, layout, isDirty: true, isLayoutValid: v.isLayoutValid, rowErrors: v.rowErrors, invalidById: bv.invalidById, invalidCount: bv.invalidCount };
    }
    case 'SET_OVERLAYS_VISIBLE': {
      return { ...state, overlaysVisible: action.payload };
    }
    case 'DELETE_BY_IDS': {
      const toDelete = new Set(action.payload);
      const layout = clone(state.layout);
      for (const s of layout.sections) {
        for (const r of s.rows) {
          for (const c of r.columns) {
            c.blocks = c.blocks.filter(b => !toDelete.has(b.id));
          }
        }
      }
      const content: Record<string, BlockContentPayload> = { ...state.content };
      for (const id of toDelete) {
        delete content[id];
      }
      const bv = computeBlockValidation(layout, content);
      return { ...state, layout, content, isDirty: true, invalidById: bv.invalidById, invalidCount: bv.invalidCount };
    }
    case 'UNDO': {
      if (!state.history.length) return state;
      const last = state.history[state.history.length - 1];
      const history = state.history.slice(0, -1);
      return { ...state, layout: last.layout, content: last.content, title: last.title, tags: last.tags, history };
    }
    case 'REDO': {
      return state; // not implemented
    }
    case 'MARK_DIRTY': {
      return { ...state, isDirty: action.payload };
    }
    case 'SET_SAVING': {
      return { ...state, isSaving: action.payload };
    }
    case 'SET_SAVED_AT': {
      return { ...state, lastSavedAt: action.payload };
    }
    case 'SET_INSPECTOR_INVALID': {
      return { ...state, inspectorInvalid: action.payload };
    }
    case 'SET_ERROR': {
      return { ...state, error: action.payload };
    }
    default:
      return state;
  }
}

interface EditorActions {
  initFromServer: (dto: { id: string; ownerId: string; title: string; status: LessonContentStatus; tags?: string[]; coverImageUrl?: string; layout: PageModel; content: Record<string, BlockContentPayload> }) => void;
  setTitle: (title: string) => void;
  setTags: (tags: string[]) => void;
  select: (ids: string[]) => void;
  setSelectedSection: (sectionId?: string) => void;
  setSelectedRow: (path?: { sectionId: string; rowId: string }) => void;
  setSelectedColumn: (path?: { sectionId: string; rowId: string; columnId: string }) => void;
  setSelectedBlock: (blockId?: string) => void;
  insertBlock: (sectionId: string, rowId: string, columnId: string, type: string, content: BlockContentPayload) => void;
  insertBlockAt: (sectionId: string, rowId: string, columnId: string, index: number, type: string, content: BlockContentPayload) => void;
  moveBlock: (from: { sectionId: string; rowId: string; columnId: string; index: number }, to: { sectionId: string; rowId: string; columnId: string; index: number }) => void;
  upsertBlock: (blockId: string, partial: Partial<BlockContentPayload>) => void;
  addSection: () => void;
  deleteSection: (sectionId: string) => void;
  addRow: (sectionId: string) => void;
  deleteRow: (sectionId: string, rowId: string) => void;
  moveRow: (sectionId: string, from: number, to: number) => void;
  addColumn: (sectionId: string, rowId: string, span?: number) => void;
  deleteColumn: (sectionId: string, rowId: string, columnId: string) => void;
  moveColumn: (sectionId: string, rowId: string, from: number, to: number) => void;
  setLayout: (layout: PageModel) => void;
  setColumnSpan: (sectionId: string, rowId: string, columnId: string, span: number) => void;
  updateSectionMeta: (sectionId: string, patch: { title?: string; ariaLabel?: string }) => void;
  updateRowMeta: (sectionId: string, rowId: string, patch: { ariaLabel?: string }) => void;
  updateColumnMeta: (sectionId: string, rowId: string, columnId: string, patch: { ariaLabel?: string }) => void;
  deleteByIds: (ids: string[]) => void;
  undo: () => void;
  redo: () => void;
  markDirty: (dirty: boolean) => void;
  setSaving: (saving: boolean) => void;
  setSavedAt: (iso?: string) => void;
  setError: (err?: string) => void;
  setInspectorInvalid: (invalid: boolean) => void;
  setOverlaysVisible: (visible: boolean) => void;
}

const EditorContext = createContext<{ state: EditorState; actions: EditorActions } | undefined>(undefined);

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, emptyState);

  const actions: EditorActions = useMemo(() => ({
    initFromServer: (dto) => dispatch({ type: 'INIT_FROM_SERVER', payload: dto }),
    setTitle: (title) => dispatch({ type: 'SET_TITLE', payload: title }),
    setTags: (tags) => dispatch({ type: 'SET_TAGS', payload: tags }),
    select: (ids) => dispatch({ type: 'SELECT', payload: ids }),
    setSelectedSection: (sectionId) => dispatch({ type: 'SET_SELECTED_SECTION', payload: sectionId ? { sectionId } : undefined }),
    setSelectedRow: (path) => dispatch({ type: 'SET_SELECTED_ROW', payload: path }),
    setSelectedColumn: (path) => dispatch({ type: 'SET_SELECTED_COLUMN', payload: path }),
    setSelectedBlock: (blockId) => dispatch({ type: 'SET_SELECTED_BLOCK', payload: blockId ? { blockId } : undefined }),
    insertBlock: (sectionId, rowId, columnId, type, content) => dispatch({ type: 'INSERT_BLOCK', payload: { sectionId, rowId, columnId, type, content, blockId: content.id } }),
    insertBlockAt: (sectionId, rowId, columnId, index, type, content) => dispatch({ type: 'INSERT_BLOCK_AT', payload: { sectionId, rowId, columnId, index, type, content, blockId: content.id } }),
    moveBlock: (from, to) => dispatch({ type: 'MOVE_BLOCK', payload: { from, to } }),
    upsertBlock: (blockId, partial) => dispatch({ type: 'SET_CONTENT', payload: { id: blockId, patch: partial } }),
    addSection: () => dispatch({ type: 'ADD_SECTION' }),
    deleteSection: (sectionId) => dispatch({ type: 'DELETE_SECTION', payload: { sectionId } }),
    addRow: (sectionId) => dispatch({ type: 'ADD_ROW', payload: { sectionId } }),
    deleteRow: (sectionId, rowId) => dispatch({ type: 'DELETE_ROW', payload: { sectionId, rowId } }),
    moveRow: (sectionId, from, to) => dispatch({ type: 'MOVE_ROW', payload: { sectionId, from, to } }),
    addColumn: (sectionId, rowId, span) => dispatch({ type: 'ADD_COLUMN', payload: { sectionId, rowId, span } }),
    deleteColumn: (sectionId, rowId, columnId) => dispatch({ type: 'DELETE_COLUMN', payload: { sectionId, rowId, columnId } }),
    moveColumn: (sectionId, rowId, from, to) => dispatch({ type: 'MOVE_COLUMN', payload: { sectionId, rowId, from, to } }),
    setLayout: (layout) => dispatch({ type: 'SET_LAYOUT', payload: layout }),
    setColumnSpan: (sectionId, rowId, columnId, span) => dispatch({ type: 'SET_COLUMN_SPAN', payload: { sectionId, rowId, columnId, span } }),
    updateSectionMeta: (sectionId, patch) => dispatch({ type: 'UPDATE_SECTION_META', payload: { sectionId, patch } }),
    updateRowMeta: (sectionId, rowId, patch) => dispatch({ type: 'UPDATE_ROW_META', payload: { sectionId, rowId, patch } }),
    updateColumnMeta: (sectionId, rowId, columnId, patch) => dispatch({ type: 'UPDATE_COLUMN_META', payload: { sectionId, rowId, columnId, patch } }),
    deleteByIds: (ids) => dispatch({ type: 'DELETE_BY_IDS', payload: ids }),
    undo: () => dispatch({ type: 'UNDO' }),
    redo: () => dispatch({ type: 'REDO' }),
    markDirty: (dirty) => dispatch({ type: 'MARK_DIRTY', payload: dirty }),
    setSaving: (saving) => dispatch({ type: 'SET_SAVING', payload: saving }),
    setSavedAt: (iso) => dispatch({ type: 'SET_SAVED_AT', payload: iso }),
    setError: (err) => dispatch({ type: 'SET_ERROR', payload: err }),
    setInspectorInvalid: (invalid) => dispatch({ type: 'SET_INSPECTOR_INVALID', payload: invalid }),
    setOverlaysVisible: (visible) => dispatch({ type: 'SET_OVERLAYS_VISIBLE', payload: visible }),
  }), []);

  return React.createElement(
    EditorContext.Provider as unknown as React.JSXElementConstructor<{ children?: React.ReactNode }>,
    { value: { state, actions } },
    children
  );
};

export const useEditorStore = () => {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditorStore must be used within EditorProvider');
  return ctx;
};
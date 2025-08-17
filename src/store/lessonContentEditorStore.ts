import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type LessonContentStatus = 'DRAFT' | 'PUBLISHED';

export type NodeType = 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'GRAMMAR';

export interface Frame {
  id: string;
  name?: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Node {
  id: string;
  type: NodeType;
  frameId?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  locked?: boolean;
  z?: number;
  ariaLabel?: string;
}

export interface HistoryEntry {
  state: Partial<LessonContentEditorState>;
}

export interface LessonContentEditorState {
  // meta
  id: string | null;
  ownerId?: string | null;
  title: string;
  status: LessonContentStatus;
  tags: string[];
  coverImageUrl?: string | null;

  // layout & content
  layout: {
    gridUnit: number;
    snapToGrid: boolean;
    frames: Record<string, Frame>;
    nodes: Record<string, Node>;
  };
  content: Record<string, any>; // nodeId -> payload

  // ui
  selection: { ids: string[] };
  pan: { x: number; y: number };
  zoom: number; // 0.25..2

  // io
  history: {
    past: HistoryEntry[];
    future: HistoryEntry[];
  };
  isSaving: boolean;
  lastSavedAt?: string;
  error?: string | null;

  // actions
  initFromServer: (payload: Partial<LessonContentEditorState>) => void;
  setTitle: (title: string) => void;
  setStatus: (status: LessonContentStatus) => void;
  setSelection: (ids: string[]) => void;
  clearSelection: () => void;
  addNode: (node: Node, content?: any) => void;
  removeSelected: () => void;
  moveSelectedBy: (dx: number, dy: number) => void;
  setNodeRect: (id: string, rect: { x: number; y: number; w: number; h: number }) => void;
  toggleLock: (ids?: string[]) => void;
  duplicateSelected: () => void;
  bringToFront: (ids?: string[]) => void;
  addFrame: (frame: Frame) => void;
  setFrameRect: (id: string, rect: { x: number; y: number; w: number; h: number }) => void;
  moveFrameBy: (id: string, dx: number, dy: number) => void;
  assignNodeToFrame: (nodeId: string, frameId?: string) => void;
  setNodeContent: (id: string, next: any | ((prev: any) => any)) => void;
  setNodeMeta: (id: string, patch: Partial<Pick<Node, 'z' | 'frameId' | 'ariaLabel' | 'locked'>>) => void;
  setPan: (x: number, y: number) => void;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  undo: () => void;
  redo: () => void;
  markSaving: (saving: boolean) => void;
  setError: (msg: string | null) => void;
}

const clampZoom = (z: number) => Math.min(2, Math.max(0.5, Number.isFinite(z) ? z : 1));

const pushHistory = (state: LessonContentEditorState, partial: Partial<LessonContentEditorState>): LessonContentEditorState => {
  const entry: HistoryEntry = { state: partial };
  return {
    ...state,
    history: { past: [...state.history.past, entry], future: [] },
  };
};

export const useLessonContentEditorStore = create<LessonContentEditorState>()(devtools((set, get) => ({
  id: null,
  ownerId: null,
  title: 'Untitled',
  status: 'DRAFT',
  tags: [],
  coverImageUrl: null,
  layout: { gridUnit: 8, snapToGrid: true, frames: {}, nodes: {} },
  content: {},
  selection: { ids: [] },
  pan: { x: 0, y: 0 },
  zoom: 1,
  history: { past: [], future: [] },
  isSaving: false,
  lastSavedAt: undefined,
  error: null,

  initFromServer: (payload) => set((state) => ({
    ...state,
    ...payload,
    id: payload.id ?? state.id,
    title: payload.title ?? state.title,
    status: payload.status ?? state.status,
    tags: payload.tags ?? state.tags,
    coverImageUrl: payload.coverImageUrl ?? state.coverImageUrl,
    layout: payload.layout as any ?? state.layout,
    content: payload.content as any ?? state.content,
  })),

  setTitle: (title) => set((state) => ({ ...pushHistory(state, { title: state.title }), title })),
  setStatus: (status) => set((state) => ({ ...pushHistory(state, { status: state.status }), status })),

  setSelection: (ids) => set((state) => ({ selection: { ids } })),
  clearSelection: () => set({ selection: { ids: [] } }),

  addNode: (node, nodeContent) => set((state) => {
    const nodes = { ...state.layout.nodes, [node.id]: node };
    const content = nodeContent !== undefined ? { ...state.content, [node.id]: nodeContent } : state.content;
    return { ...pushHistory(state, { layout: state.layout, content: state.content }), layout: { ...state.layout, nodes }, content };
  }),

  removeSelected: () => set((state) => {
    const ids = state.selection.ids;
    if (ids.length === 0) return state;
    const nodes = { ...state.layout.nodes };
    const content = { ...state.content };
    ids.forEach(id => { delete nodes[id]; delete content[id]; });
    return { ...pushHistory(state, { layout: state.layout, content: state.content }), layout: { ...state.layout, nodes }, content, selection: { ids: [] } };
  }),

  moveSelectedBy: (dx, dy) => set((state) => {
    if (state.selection.ids.length === 0) return state;
    const nodes = { ...state.layout.nodes };
    const width = 2000, height = 2000;
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
    state.selection.ids.forEach(id => {
      const n = nodes[id];
      if (!n || n.locked) return;
      const nx = clamp(n.x + dx, 0, width - n.w);
      const ny = clamp(n.y + dy, 0, height - n.h);
      nodes[id] = { ...n, x: nx, y: ny };
    });
    return { ...pushHistory(state, { layout: state.layout }), layout: { ...state.layout, nodes } };
  }),

  setNodeRect: (id, rect) => set((state) => {
    const nodes = { ...state.layout.nodes };
    const target = nodes[id];
    if (!target || target.locked) return state;
    const unit = state.layout.gridUnit || 8;
    const tol = 4;
    const width = 2000, height = 2000;
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
    const snap = (v: number) => {
      const r = v % unit;
      if (r <= tol) return v - r;
      if (unit - r <= tol) return v + (unit - r);
      return v;
    };
    const minW = 40, minH = 40;
    let x = rect.x, y = rect.y, w = rect.w, h = rect.h;
    x = snap(x); y = snap(y); w = Math.max(minW, snap(w)); h = Math.max(minH, snap(h));
    x = clamp(x, 0, width - w); y = clamp(y, 0, height - h);
    nodes[id] = { ...target, x, y, w, h };
    return { ...pushHistory(state, { layout: state.layout }), layout: { ...state.layout, nodes } };
  }),

  toggleLock: (ids) => set((state) => {
    const sel = ids && ids.length ? ids : state.selection.ids;
    if (!sel.length) return state;
    const nodes = { ...state.layout.nodes };
    sel.forEach(id => {
      const n = nodes[id];
      if (!n) return;
      nodes[id] = { ...n, locked: !n.locked };
    });
    return { ...state, layout: { ...state.layout, nodes } };
  }),

  duplicateSelected: () => set((state) => {
    if (!state.selection.ids.length) return state;
    const nodes = { ...state.layout.nodes };
    const content = { ...state.content };
    const maxZ = Math.max(0, ...Object.values(nodes).map(n => n.z || 0));
    state.selection.ids.forEach(origId => {
      const n = nodes[origId];
      if (!n) return;
      const newId = Math.random().toString(36).slice(2);
      nodes[newId] = { ...n, id: newId, x: Math.min(2000 - n.w, n.x + 10), y: Math.min(2000 - n.h, n.y + 10), z: (maxZ + 1) };
      if (state.content[origId] !== undefined) content[newId] = state.content[origId];
    });
    return { ...pushHistory(state, { layout: state.layout, content: state.content }), layout: { ...state.layout, nodes }, content };
  }),

  bringToFront: (ids) => set((state) => {
    const sel = ids && ids.length ? ids : state.selection.ids;
    if (!sel.length) return state;
    const nodes = { ...state.layout.nodes };
    let maxZ = Math.max(0, ...Object.values(nodes).map(n => n.z || 0));
    sel.forEach(id => {
      const n = nodes[id]; if (!n) return;
      nodes[id] = { ...n, z: ++maxZ };
    });
    return { ...state, layout: { ...state.layout, nodes } };
  }),

  addFrame: (frame) => set((state) => {
    const frames = { ...state.layout.frames, [frame.id]: frame };
    return { ...pushHistory(state, { layout: state.layout }), layout: { ...state.layout, frames } };
  }),

  setFrameRect: (id, rect) => set((state) => {
    const frames = { ...state.layout.frames };
    const f = frames[id]; if (!f) return state;
    const width = 2000, height = 2000, minW = 60, minH = 60;
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
    let x = rect.x, y = rect.y, w = Math.max(minW, rect.w), h = Math.max(minH, rect.h);
    x = clamp(x, 0, width - w); y = clamp(y, 0, height - h);
    frames[id] = { ...f, x, y, w, h };
    return { ...pushHistory(state, { layout: state.layout }), layout: { ...state.layout, frames } };
  }),

  moveFrameBy: (id, dx, dy) => set((state) => {
    const frames = { ...state.layout.frames };
    const f = frames[id]; if (!f) return state;
    const width = 2000, height = 2000;
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
    const nx = clamp(f.x + dx, 0, width - f.w);
    const ny = clamp(f.y + dy, 0, height - f.h);
    const adx = nx - f.x; const ady = ny - f.y;
    const nodes = { ...state.layout.nodes };
    Object.values(nodes).forEach(n => {
      if (n.frameId === id && !n.locked) {
        const newX = clamp(n.x + adx, 0, width - n.w);
        const newY = clamp(n.y + ady, 0, height - n.h);
        nodes[n.id] = { ...n, x: newX, y: newY };
      }
    });
    frames[id] = { ...f, x: nx, y: ny };
    return { ...pushHistory(state, { layout: state.layout }), layout: { ...state.layout, frames, nodes } };
  }),

  assignNodeToFrame: (nodeId, frameId) => set((state) => {
    const nodes = { ...state.layout.nodes };
    const n = nodes[nodeId]; if (!n) return state;
    nodes[nodeId] = { ...n, frameId };
    return { ...state, layout: { ...state.layout, nodes } };
  }),

  setNodeContent: (id, next) => set((state) => {
    const prev = state.content[id];
    const value = typeof next === 'function' ? (next as (p: any) => any)(prev) : next;
    const content = { ...state.content, [id]: value };
    return { ...pushHistory(state, { content: state.content }), content };
  }),

  setNodeMeta: (id, patch) => set((state) => {
    const nodes = { ...state.layout.nodes };
    const n = nodes[id]; if (!n) return state;
    nodes[id] = { ...n, ...patch };
    return { ...state, layout: { ...state.layout, nodes } };
  }),

  setPan: (x, y) => set({ pan: { x, y } }),
  setZoom: (zoom) => set({ zoom: clampZoom(zoom) }),
  zoomIn: () => set((s) => ({ zoom: clampZoom(s.zoom + 0.1) })),
  zoomOut: () => set((s) => ({ zoom: clampZoom(s.zoom - 0.1) })),

  undo: () => set((state) => {
    const past = [...state.history.past];
    if (past.length === 0) return state;
    const last = past.pop()!;
    const inverse: HistoryEntry = { state: last.state };
    return { ...state, ...last.state, history: { past, future: [inverse, ...state.history.future] } } as LessonContentEditorState;
  }),

  redo: () => set((state) => {
    const future = [...state.history.future];
    if (future.length === 0) return state;
    const next = future.shift()!;
    const past: HistoryEntry[] = [...state.history.past, { state: next.state }];
    return { ...state, ...next.state, history: { past, future } } as LessonContentEditorState;
  }),

  markSaving: (saving) => set({ isSaving: saving, lastSavedAt: saving ? get().lastSavedAt : new Date().toISOString() }),
  setError: (msg) => set({ error: msg ?? null }),
})));
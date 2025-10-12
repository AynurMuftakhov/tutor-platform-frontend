import React, {createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState} from 'react';
import { useAuth } from './AuthContext';

export type FocusWordsMeta = {
  source: 'manual' | 'homework';
  assignmentId?: string;
  taskId?: string;
  label?: string; // e.g., assignment title or task title
};

export type ApplyMode = 'merge' | 'replace';

export type FocusWordsState = {
  words: string[];
  meta: FocusWordsMeta;
};

export type FocusWordsController = {
  getWords: () => string[];
  getMeta: () => FocusWordsMeta;
  setWords: (words: string[], meta: FocusWordsMeta, mode?: ApplyMode) => { applied: number; trimmed: number };
  clear: () => void;
  subscribe: (listener: (state: FocusWordsState) => void) => () => void;
};

const MAX_WORDS = 30;

function normalizeWord(w: string): string | null {
  if (!w) return null;
  let s = String(w)
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim()
    .toLowerCase();
  if (!s) return null;
  // collapse whitespace
  s = s.replace(/\s+/g, ' ');
  return s || null;
}

function dedupeAndCap(input: string[]): { words: string[]; trimmed: number } {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    const n = normalizeWord(raw);
    if (!n) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
    if (out.length >= MAX_WORDS) break;
  }
  const totalNorm = Array.from(seen.values()).length;
  const trimmed = totalNorm > MAX_WORDS ? totalNorm - MAX_WORDS : 0;
  return { words: out, trimmed };
}

const FocusWordsCtx = createContext<FocusWordsController | null>(null);
type FocusWordsProviderProps = { children?: ReactNode };

export function FocusWordsProvider({ children }: FocusWordsProviderProps) {
  const { user } = useAuth();
  const isTutor = user?.role === 'tutor';

  const stateRef = useRef<FocusWordsState>({ words: [], meta: { source: 'manual' } });
  const listenersRef = useRef(new Set<(s: FocusWordsState) => void>());
  const [, forceRerender] = useState(0);

  const emit = useCallback(() => {
    for (const l of listenersRef.current) {
      try { l(stateRef.current); } catch (e) { /* ignore */ void e; }
    }
    // Also re-render provider's consumers via context value change (we use ref, so force a tick)
    forceRerender((x) => x + 1);
  }, []);

  const controller = useMemo<FocusWordsController>(() => ({
    getWords: () => stateRef.current.words,
    getMeta: () => stateRef.current.meta,
    setWords: (words, meta, mode = 'merge') => {
      if (!isTutor) return { applied: 0, trimmed: 0 };
      const incoming = Array.isArray(words) ? words : [];
      const current = stateRef.current.words;
      const combined = mode === 'replace' ? incoming : [...current, ...incoming];
      const { words: cleaned, trimmed } = dedupeAndCap(combined);
      const applied = cleaned.length;
      const nextMeta: FocusWordsMeta = { ...meta };
      stateRef.current = { words: cleaned, meta: nextMeta };
      emit();
      if (trimmed > 0) console.warn('[focus_words.trimmed_due_to_cap]', { trimmed, cap: MAX_WORDS });
      console.debug('[focus_words.pick_applied]', { count: applied, source: meta.source, mode });
      return { applied, trimmed };
    },
    clear: () => {
      if (!isTutor) return;
      stateRef.current = { words: [], meta: { source: 'manual' } };
      emit();
      console.debug('[focus_words.clear]');
    },
    subscribe: (listener) => {
      listenersRef.current.add(listener);
      // Immediately call with current state
      try { listener(stateRef.current); } catch (e) { /* ignore */ void e; }
      return () => { listenersRef.current.delete(listener); };
    },
  }), [emit, isTutor]);

  return (
    <FocusWordsCtx.Provider value={controller}>
      {children}
    </FocusWordsCtx.Provider>
  );
}

export function useFocusWords() {
  const ctx = useContext(FocusWordsCtx);
  if (!ctx) throw new Error('useFocusWords must be used within FocusWordsProvider');
  const [state, setState] = React.useState<FocusWordsState>({ words: ctx.getWords(), meta: ctx.getMeta() });
  React.useEffect(() => ctx.subscribe(setState), [ctx]);
  return {
    words: state.words,
    meta: state.meta,
    setWords: ctx.setWords,
    clear: ctx.clear,
    controller: ctx,
  };
}

export const FOCUS_WORDS_MAX = MAX_WORDS;

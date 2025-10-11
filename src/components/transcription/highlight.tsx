import React from 'react';
import { TranscriptSegment, TranscriptWordHit } from './types';

export function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildWordsRegex(words: string[]) {
  const uniq = Array.from(new Set(words.map(w => w.toLowerCase().trim()).filter(Boolean)));
  if (!uniq.length) return null as unknown as RegExp | null;
  const body = uniq.map(escapeRegExp).join("|");
  return new RegExp(`\\b(${body})\\b`, "gi");
}

export function renderHighlighted(text: string, rx: RegExp | null) {
  if (!rx) return text as unknown as React.ReactNode;
  const parts: Array<string | React.JSX.Element> = [];
  let last = 0;
  text.replace(rx, (m, _g1, idx) => {
    if (typeof idx === 'number' && idx > last) parts.push(text.slice(last, idx));
    parts.push(<mark key={`${idx}-${m}`}>{m}</mark>);
    if (typeof idx === 'number') last = idx + m.length;
    return m;
  });
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

export function extractSegmentKey(ev: any): string {
  const raw = ev?.data?.rawResponse;
  const id = raw?.segment_id ?? raw?.id ?? ev?.data?.segment_id;
  if (id) return String(id);
  const s = raw?.start ?? ev?.data?.start ?? Date.now();
  const e = raw?.end ?? ev?.data?.end ?? s;
  return `${s}-${e}`;
}

export function collectHitsFromRaw(raw: any, words: string[], fallbackText: string): TranscriptWordHit[] {
  const hits: TranscriptWordHit[] = [];
  const set = new Set(words.map(w => w.toLowerCase()));

  const matches = raw?.matches ?? raw?.search ?? [];
  for (const m of matches) {
    const w = String((m as any)?.text ?? (m as any)?.word ?? "").toLowerCase();
    if (set.has(w)) hits.push({ word: w, startMs: (m as any)?.start, endMs: (m as any)?.end, confidence: (m as any)?.confidence });
  }

  if (!hits.length && fallbackText) {
    const rx = buildWordsRegex(words);
    if (rx) {
      fallbackText.replace(rx, (m) => {
        hits.push({ word: m.toLowerCase() });
        return m;
      });
    }
  }
  return hits;
}

export function mergeOrAppendSegment(arr: TranscriptSegment[], next: TranscriptSegment) {
  const idx = arr.findIndex(s => s.id === next.id);
  if (idx >= 0) {
    const merged: TranscriptSegment = { ...arr[idx], ...next, text: next.text || arr[idx].text, isFinal: arr[idx].isFinal || next.isFinal };
    const copy = arr.slice();
    copy[idx] = merged;
    return copy;
  }
  return [...arr, next];
}

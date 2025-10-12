import React from 'react';
import { TranscriptSegment, TranscriptWordHit } from './types';
import stem from 'wink-porter2-stemmer';

export function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const WORD_RX = /\b[\p{L}\p{M}’']+\b/gu;

function toStemSet(words: string[]): Set<string> {
    const out = new Set<string>();
    for (const w of words) {
        if (!w) continue;
        const base = String(w).toLowerCase().trim().replace(/’s$|'s$/,'');
        if (!base) continue;
        out.add(stem(base));
    }
    return out;
}

export function buildWordsRegex(words: string[]): RegExp | null {
  const uniq = Array.from(new Set(words.map(w => w.toLowerCase().trim()).filter(Boolean)));
  if (!uniq.length) return null;
  const body = uniq.map(escapeRegExp).join("|");
  return new RegExp(`\\b(${body})\\b`, "gi");
}


export function renderHighlightedByStem(text: string, focusWords: string[]) {
    const targetStems = toStemSet(focusWords);
    if (targetStems.size === 0) return text as unknown as React.ReactNode;

    const nodes: React.ReactNode[] = [];
    let last = 0;
    WORD_RX.lastIndex = 0;
    let m: RegExpExecArray | null;

    while ((m = WORD_RX.exec(text))) {
        const start = m.index;
        const end = start + m[0].length;
        const token = m[0];
        const tokenStem = stem(token.toLowerCase().replace(/’s$|'s$/,''));

        if (targetStems.has(tokenStem)) {
            if (start > last) nodes.push(text.slice(last, start));
            nodes.push(<mark key={`${start}-${end}`}>{token}</mark>);
            last = end;
        }
    }
    if (last < text.length) nodes.push(text.slice(last));
    return <>{nodes}</>;
}

export function extractSegmentKey(ev: any): string {
  const raw = ev?.data?.rawResponse;
  const id = raw?.segment_id ?? raw?.id ?? ev?.data?.segment_id;
  if (id) return String(id);
  const s = raw?.start ?? ev?.data?.start ?? Date.now();
  const e = raw?.end ?? ev?.data?.end ?? s;
  return `${s}-${e}`;
}

export function collectHitsFromRaw(
    raw: any,
    words: string[],
    fallbackText: string
): TranscriptWordHit[] {
    const hits: TranscriptWordHit[] = [];
    if (!Array.isArray(words) || words.length === 0) return hits;

    const targetStems = toStemSet(words);
    const foundStems = new Set<string>();

    const matches = raw?.matches ?? raw?.search ?? [];
    if (Array.isArray(matches)) {
        for (const m of matches) {
            const token = String((m as any)?.text ?? (m as any)?.word ?? '').toLowerCase();
            if (!token) continue;
            const tokenStem = stem(token.replace(/’s$|'s$/,''));
            if (targetStems.has(tokenStem)) {
                hits.push({
                    word: token,
                    startMs: (m as any)?.start,
                    endMs: (m as any)?.end,
                    confidence: (m as any)?.confidence,
                });
                foundStems.add(tokenStem);
            }
        }
    }

    const missingStems = new Set<string>();
    for (const s of targetStems) {
        if (!foundStems.has(s)) missingStems.add(s);
    }

    if (missingStems.size > 0 && fallbackText) {
        let m: RegExpExecArray | null;
        WORD_RX.lastIndex = 0;
        while ((m = WORD_RX.exec(fallbackText))) {
            const token = m[0].toLowerCase();
            const tokenStem = stem(token.replace(/’s$|'s$/,''));
            if (missingStems.has(tokenStem)) {
                hits.push({ word: token });
            }
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

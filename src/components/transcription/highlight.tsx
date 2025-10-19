import React from 'react';
import { TranscriptSegment, TranscriptWordHit } from './types';
import lemmatizer from 'wink-lemmatizer';
/** Cope with CJS/ESM interop and older wink-lemmatizer builds */
const LM: any = (lemmatizer as any)?.default ?? (lemmatizer as any);

export function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const WORD_RX = /\b[\p{L}\p{M}’']+\b/gu;
const POSSESSIVE_RX = /’s$|'s$/;

// Cache lemma forms to avoid repeated lookups per token
const lemmaFormsCache = new Map<string, string[]>();
function getLemmaForms(input: string): string[] {
  const token = input.toLowerCase().trim().replace(POSSESSIVE_RX,'');
  const cached = lemmaFormsCache.get(token);
  if (cached) return cached;

  const formsSet = new Set<string>();
  formsSet.add(token);

  const tryPush = (name: 'verb' | 'noun' | 'adjective' | 'adverb') => {
    try {
      const fn = (LM as any)?.[name];
      if (typeof fn === 'function') {
        const val = fn(token);
        if (val) formsSet.add(val);
      }
    } catch { /* noop */ }
  };

  tryPush('verb');
  tryPush('noun');
  tryPush('adjective');
  tryPush('adverb'); // optional: older versions might not expose this

  const forms = Array.from(formsSet);
  lemmaFormsCache.set(token, forms);
  return forms;
}

function toLemmaSet(words: string[]): Set<string> {
  const out = new Set<string>();
  for (const raw of words) {
    if (!raw) continue;
    const token = String(raw).toLowerCase().trim().replace(POSSESSIVE_RX,'');
    if (!token) continue;
    for (const form of getLemmaForms(token)) out.add(form);
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
    const targetLemmas = toLemmaSet(focusWords);
    if (targetLemmas.size === 0) return text as unknown as React.ReactNode;

    const nodes: React.ReactNode[] = [];
    let last = 0;
    WORD_RX.lastIndex = 0;
    let m: RegExpExecArray | null;

    while ((m = WORD_RX.exec(text))) {
        const start = m.index;
        const end = start + m[0].length;
        const token = m[0];
        const normalized = token.toLowerCase().replace(POSSESSIVE_RX,'');
        const lemmaForms = getLemmaForms(normalized);

        let matches = false;
        for (const form of lemmaForms) {
            if (form && targetLemmas.has(form)) {
                matches = true;
                break;
            }
        }

        if (matches) {
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

    const targetLemmas = toLemmaSet(words);
    const foundLemmas = new Set<string>();

    const matches = raw?.matches ?? raw?.search ?? [];
    if (Array.isArray(matches)) {
        for (const m of matches) {
            const token = String((m as any)?.text ?? (m as any)?.word ?? '').toLowerCase();
            if (!token) continue;
            const normalized = token.replace(POSSESSIVE_RX,'');
            const lemmaForms = getLemmaForms(normalized);
            if (lemmaForms.some((form) => targetLemmas.has(form))) {
                hits.push({
                    word: token,
                    startMs: (m as any)?.start,
                    endMs: (m as any)?.end,
                    confidence: (m as any)?.confidence,
                });
                lemmaForms.forEach((form) => { foundLemmas.add(form); });
            }
        }
    }

    const missingLemmas = new Set<string>();
    for (const lemma of targetLemmas) {
        if (!foundLemmas.has(lemma)) missingLemmas.add(lemma);
    }

    if (missingLemmas.size > 0 && fallbackText) {
        let m: RegExpExecArray | null;
        WORD_RX.lastIndex = 0;
        while ((m = WORD_RX.exec(fallbackText))) {
            const token = m[0].toLowerCase();
            const normalized = token.replace(/’s$|'s$/,'');
            const lemmaForms = getLemmaForms(normalized);
            if (lemmaForms.some((form) => missingLemmas.has(form))) {
                hits.push({ word: token });
                lemmaForms.forEach((form) => { missingLemmas.delete(form); });
            }
        }
    }

    return hits;
}

export function mergeOrAppendSegment(arr: TranscriptSegment[], next: TranscriptSegment) {
  const idx = arr.findIndex(s => s.id === next.id);
  if (idx >= 0) {
    const merged: TranscriptSegment = {
      ...arr[idx],
      ...next,
      text: next.text || arr[idx].text,
      isFinal: arr[idx].isFinal || next.isFinal,
      hits: next.hits && next.hits.length ? next.hits : arr[idx].hits,
    };
    if (!next.clip && arr[idx].clip) {
      merged.clip = arr[idx].clip;
    }
    const copy = arr.slice();
    copy[idx] = merged;
    return copy;
  }
  return [...arr, next];
}

export function countFocusWordMatches(text: string, focusWords: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  if (!text || !focusWords || focusWords.length === 0) return counts;

  const lemmaToBase = new Map<string, Set<string>>();
  for (const raw of focusWords) {
    const base = String(raw ?? '').trim().toLowerCase();
    if (!base) continue;
    const forms = getLemmaForms(base);
    for (const form of forms) {
      if (!lemmaToBase.has(form)) lemmaToBase.set(form, new Set());
      lemmaToBase.get(form)!.add(base);
    }
  }
  if (lemmaToBase.size === 0) return counts;

  WORD_RX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = WORD_RX.exec(text))) {
    const token = match[0];
    const normalized = token.toLowerCase().replace(POSSESSIVE_RX, '');
    const forms = getLemmaForms(normalized);
    const matchedBases = new Set<string>();
    for (const form of forms) {
      const targets = lemmaToBase.get(form);
      if (!targets) continue;
      for (const base of targets) matchedBases.add(base);
    }
    matchedBases.forEach((base) => {
      counts[base] = (counts[base] ?? 0) + 1;
    });
  }

  return counts;
}

/*
 * BlockNote Markdown serialization helpers with robust fallbacks.
 */
import type { BlockNoteEditor } from '@blocknote/core';
import { canonicalizeContent } from './contentCanonicalization';

// We intentionally type Block as any to decouple from specific BlockNote versions.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Block = any;

// Dynamic import for Vite/ESM environments; cached between calls.
let coreModPromise: Promise<Record<string, unknown>> | null = null;
let coreMod: Record<string, unknown> | null = null;
const loadCore = async () => {
  if (coreMod) return coreMod;
  if (!coreModPromise) {
    coreModPromise = import('@blocknote/core') as unknown as Promise<Record<string, unknown>>;
  }
  try {
    coreMod = await coreModPromise;
  } catch {
    coreMod = null;
  }
  return coreMod;
};

const has = (mod: Record<string, unknown> | null, name: string) => !!mod && Object.prototype.hasOwnProperty.call(mod, name);

export async function bnFromMarkdown(md: string): Promise<Block[]> {
  const src = canonicalizeContent(md ?? '', 'md');
  if (!src.trim()) {
    return fromPlainText('');
  }
  try {
    const mod = await loadCore();
    if (has(mod, 'markdownToBlocks')) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const markdownToBlocks = (mod as any).markdownToBlocks as (markdown: string) => Block[] | Promise<Block[]>;
      const res = await Promise.resolve(markdownToBlocks(src));
      if (Array.isArray(res) && res.length > 0) return res;
    }
  } catch {
    // fall through to manual impl
  }
  // Minimal manual Markdown -> Blocks mapping (paragraphs, headings, lists, inline styles partially)
  return minimalMarkdownToBlocks(src);
}

export async function bnToMarkdown(editor: BlockNoteEditor): Promise<string> {
  try {
    const mod = await loadCore();
    if (has(mod, 'blocksToMarkdown')) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const blocksToMarkdown = (mod as any).blocksToMarkdown as (blocks: Block[]) => string | Promise<string>;
      const blocks: Block[] = editor?.document ?? [];
      const md = await Promise.resolve(blocksToMarkdown(blocks));
      if (typeof md === 'string') return canonicalizeContent(md, 'md');
    }
  } catch {
    /* noop */
  }
  // Fallback: walk current document and serialize a subset
  const blocks: Block[] = editor?.document ?? [];
  return canonicalizeContent(blocksToMinimalMarkdown(blocks), 'md');
}

export function fromPlainText(text: string): Block[] {
  const lines = (text ?? '').split(/\r?\n/);
  return lines.map((line) => paragraphBlock(line));
}

// ------------------------
// Minimal mappings
// ------------------------

function paragraphBlock(text: string): Block {
  return {
    type: 'paragraph',
    content: textToInline(text)
  };
}

function headingBlock(text: string, level: 1 | 2 | 3): Block {
  return {
    type: 'heading',
    props: { level },
    content: textToInline(text)
  };
}

function bulletItemBlock(text: string): Block {
  return {
    type: 'bulletListItem',
    content: textToInline(text)
  };
}

function orderedItemBlock(text: string): Block {
  return {
    type: 'numberedListItem',
    content: textToInline(text)
  };
}

function minimalMarkdownToBlocks(md: string): Block[] {
  const out: Block[] = [];
  const lines = canonicalizeContent(md, 'md').split('\n');
  let inBullet = false;
  let inOrdered = false;
  let pendingBlankCount = 0;

  const flushList = () => {
    inBullet = false;
    inOrdered = false;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushList();
      if (out.length === 0) {
        pendingBlankCount = 0;
      } else {
        pendingBlankCount += 1;
      }
      continue;
    }

    if (pendingBlankCount > 0) {
      for (let i = 0; i < pendingBlankCount; i += 1) {
        out.push(paragraphBlock(''));
      }
      pendingBlankCount = 0;
    }

    if (line.startsWith('### ')) {
      flushList();
      out.push(headingBlock(line.slice(4), 3));
      continue;
    }
    if (line.startsWith('## ')) {
      flushList();
      out.push(headingBlock(line.slice(3), 2));
      continue;
    }
    if (line.startsWith('# ')) {
      flushList();
      out.push(headingBlock(line.slice(2), 1));
      continue;
    }
    const olMatch = line.match(/^\d+\.\s+(.*)$/);
    if (olMatch) {
      inOrdered = true;
      out.push(orderedItemBlock(olMatch[1]));
      continue;
    }
    const ulMatch = line.match(/^[-*+]\s+(.*)$/);
    if (ulMatch) {
      inBullet = true;
      out.push(bulletItemBlock(ulMatch[1]));
      continue;
    }
    flushList();
    out.push(paragraphBlock(line));
  }

  // Drop trailing blank paragraphs introduced by pending blanks at EOF
  while (out.length > 1 && out[out.length - 1]?.type === 'paragraph') {
    const last = out[out.length - 1];
    const lastContent = inlineToMarkdown(last.content ?? []);
    if (lastContent.trim() === '') {
      out.pop();
    } else {
      break;
    }
  }

  return out;
}

function blocksToMinimalMarkdown(blocks: Block[]): string {
  const lines: string[] = [];
  for (const b of blocks ?? []) {
    if (!b) continue;
    const type = b.type;
    const text = inlineToMarkdown(b.content ?? []);
    if (type === 'heading' && (b.props?.level === 1 || b.props?.level === 2 || b.props?.level === 3)) {
      const hashes = '#'.repeat(b.props.level as number);
      lines.push(`${hashes} ${text}`);
    } else if (type === 'bulletListItem') {
      lines.push(`- ${text}`);
    } else if (type === 'numberedListItem') {
      lines.push(`1. ${text}`);
    } else {
      lines.push(text);
    }
  }
  return lines.join('\n');
}

// Convert simple inline markdown markers to BlockNote inline spans
function textToInline(text: string) {
  // Splitting conservatively; Bold **, Italic _, Code ``, Highlight ==
  const spans: Array<{ type: 'text'; text: string; styles?: string[] | Record<string, boolean> } | { type: 'code'; text: string } > = [];
  let i = 0;
  const pushText = (t: string, styles?: string[]) => {
    if (!t) return;
    spans.push({ type: 'text', text: t, styles });
  };
  const len = text.length;
  while (i < len) {
    // code
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end > i + 1) {
        const code = text.slice(i + 1, end);
        spans.push({ type: 'code', text: code });
        i = end + 1;
        continue;
      }
    }
    // bold
    if (text[i] === '*' && text[i + 1] === '*') {
      const end = text.indexOf('**', i + 2);
      if (end > i + 2) {
        pushText(text.slice(i + 2, end), ['bold']);
        i = end + 2;
        continue;
      }
    }
    // italic
    if (text[i] === '_' ) {
      const end = text.indexOf('_', i + 1);
      if (end > i + 1) {
        pushText(text.slice(i + 1, end), ['italic']);
        i = end + 1;
        continue;
      }
    }
    // highlight ==text==
    if (text[i] === '=' && text[i + 1] === '=') {
      const end = text.indexOf('==', i + 2);
      if (end > i + 2) {
        pushText(text.slice(i + 2, end), ['highlight']);
        i = end + 2;
        continue;
      }
    }
    // default consume one char
    const nextSpecial = findNextSpecial(text, i);
    const sliceEnd = nextSpecial === -1 ? len : nextSpecial;
    pushText(text.slice(i, sliceEnd));
    i = sliceEnd;
  }
  return spans;
}

function findNextSpecial(text: string, from: number): number {
  const specials = ['**', '_', '`', '=='];
  let nearest = -1;
  for (const s of specials) {
    const idx = text.indexOf(s, from);
    if (idx !== -1 && (nearest === -1 || idx < nearest)) nearest = idx;
  }
  return nearest;
}

function inlineToMarkdown(content: any[]): string {
  if (!Array.isArray(content)) return '' + (content ?? '');
  const out: string[] = [];
  for (const span of content) {
    if (!span) continue;
    const t = '' + (span.text ?? '');
    const styles: string[] = Array.isArray(span.styles)
      ? span.styles
      : span.styles && typeof span.styles === 'object'
        ? Object.keys(span.styles).filter((k) => !!(span.styles as any)[k])
        : [];
    if (span.type === 'code') {
      out.push('`' + t + '`');
      continue;
    }
    let s = t;
    if (styles.includes('bold')) s = `**${s}**`;
    if (styles.includes('italic')) s = `_${s}_`;
    if (styles.includes('highlight')) s = `==${s}==`;
    out.push(s);
  }
  return out.join('');
}

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import type { BlockNoteEditor } from '@blocknote/core';
import { bnFromMarkdown, bnToMarkdown } from '../utils/bnSerialization';
import './BlockNoteMiniEditor.css';
import '@blocknote/mantine/style.css';

export interface BlockNoteMiniEditorProps {
  valueMarkdown: string;
  readOnly?: boolean;
  onChangeMarkdown: (md: string) => void;
  onImmediateInput?: () => void;
  ariaLabel?: string;
  autoFocus?: boolean;
  minHeight?: number; // default ~220px
}

const DEBOUNCE_MS = 350;

const BlockNoteMiniEditor: React.FC<BlockNoteMiniEditorProps> = ({
  valueMarkdown,
  readOnly = false,
  onChangeMarkdown,
  onImmediateInput,
  ariaLabel = 'Lesson notes editor',
  autoFocus = false,
  minHeight = 220
}) => {
  const lastEmittedRef = useRef<string>('');
  const lastAppliedFromPropsRef = useRef<string>('');
  const rafIdRef = useRef<number | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ready, setReady] = useState(false);

  // Create editor instance once
  const editor = useCreateBlockNote() as unknown as BlockNoteEditor;

  // Initialize or update document from valueMarkdown (but avoid feedback loops)
  useEffect(() => {
    let cancelled = false;
    const incoming = valueMarkdown ?? '';
    if (incoming === lastEmittedRef.current) {
      return; // it's our own change
    }
    if (!editor) return;

    (async () => {
      try {
        const blocks = await bnFromMarkdown(incoming);
        if (cancelled) return;
        // Avoid replacing the document with an empty block array; keep default doc instead.
        if (!blocks || (Array.isArray(blocks) && blocks.length === 0)) {
          lastAppliedFromPropsRef.current = incoming;
          return;
        }
        // Replace full document. Using a permissive any-call for API compatibility across versions.
        try {
          (editor as any).replaceBlocks?.((editor as any).document, blocks);
        } catch {
          try {
            (editor as any).setDocument?.(blocks);
          } catch {
            // As a last resort, clear and insert
            const doc = (editor as any).document || [];
            if (Array.isArray(doc) && doc.length) {
              (editor as any).removeBlocks?.(doc);
            }
            (editor as any).insertBlocks?.(blocks);
          }
        }
        lastAppliedFromPropsRef.current = incoming;
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [valueMarkdown, editor]);

  // Emit markdown changes with debounce
  const scheduleEmit = useCallback(async () => {
    if (!editor) return;
    try {
      const md = await bnToMarkdown(editor);
      lastEmittedRef.current = md;
      onChangeMarkdown(md);
    } catch {
      /* noop */
    }
  }, [editor, onChangeMarkdown]);

  const onEditorChange = useCallback(() => {
    if (readOnly) return;
    if (onImmediateInput) onImmediateInput();
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        void scheduleEmit();
      }, DEBOUNCE_MS);
    });
  }, [readOnly, scheduleEmit, onImmediateInput]);

  useEffect(() => {
    setReady(true);
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const wrapperSx = useMemo(() => ({
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: 0,
    p: 1.5,
    minHeight: `${minHeight}px`,
    height: '100%',
    boxSizing: 'border-box',
    overflow: 'hidden'
  } as const), [minHeight]);

  return (
    <Box className="bn-mini-editor__paper" sx={wrapperSx}>
      {/* The BlockNoteView already has toolbar; we keep it compact via CSS and let it wrap on mobile */}
      <BlockNoteView
        editor={editor as any}
        editable={!readOnly}
        onChange={onEditorChange}
        aria-label={ariaLabel}
        autoFocus={autoFocus}
      />
    </Box>
  );
};

export default BlockNoteMiniEditor;

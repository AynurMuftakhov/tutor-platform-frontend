import React, { useEffect, useMemo, useRef } from 'react';
import { Box } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getLessonContent } from '../../../services/api';
import StudentRenderer from './StudentRenderer';
import type { PageModel, BlockContentPayload } from '../../../types/lessonContent';

import type { Room } from 'livekit-client';

interface Props {
  contentId: string;
  focusBlockId?: string;
  locked: boolean;
  contentSync?: { room: Room; isTutor: boolean; contentId: string; controller?: any };
}

const pulseCss = `
@keyframes outlinePulse { 0% { box-shadow: 0 0 0 2px rgba(37, 115, 255, .0);} 50% { box-shadow: 0 0 0 3px rgba(37,115,255,.45);} 100% { box-shadow: 0 0 0 2px rgba(37, 115, 255, .0);} }
.synced-pulse { animation: outlinePulse 950ms ease-out 1; border-radius: 8px; }
`;

const SyncedContentView: React.FC<Props> = ({ contentId, focusBlockId, locked, contentSync }) => {
  const styleInjected = useRef(false);
  const { data } = useQuery({
    queryKey: ['lesson-content', contentId],
    queryFn: () => getLessonContent(contentId),
    staleTime: 30_000,
  });

  const layout: PageModel | undefined = data?.layout;
  const content: Record<string, BlockContentPayload> | undefined = data?.content;

  // Soft scroll lock
  useEffect(() => {
    if (!locked) return;
    const prevent = (e: Event) => { e.preventDefault(); };
    window.addEventListener('wheel', prevent, { passive: false });
    window.addEventListener('touchmove', prevent, { passive: false });
    return () => {
      window.removeEventListener('wheel', prevent as any);
      window.removeEventListener('touchmove', prevent as any);
    };
  }, [locked]);

  // Handle focus highlight
  useEffect(() => {
    if (!focusBlockId) return;
    const el = document.querySelector(`[data-block-id="${focusBlockId}"]`) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('synced-pulse');
      const t = setTimeout(() => el.classList.remove('synced-pulse'), 1200);
      return () => clearTimeout(t);
    }
  }, [focusBlockId]);

  // Handle navigate messages (from hook via custom event)
  useEffect(() => {
    const handler = (evt: any) => {
      const { sectionId, rowId } = evt.detail || {};
      if (!sectionId) return;
      // find the target row/section element and scroll to its first block
      let target: HTMLElement | null = null;
      if (rowId) {
        const rowEl = document.querySelector(`[data-row-id="${rowId}"]`) as HTMLElement | null;
        if (rowEl) target = rowEl.querySelector('[data-block-id]') as HTMLElement | null;
      }
      if (!target) {
        const secEl = document.querySelector(`[data-section-id="${sectionId}"]`) as HTMLElement | null;
        if (secEl) target = secEl.querySelector('[data-block-id]') as HTMLElement | null;
      }
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        target.classList.add('synced-pulse');
        setTimeout(() => target && target.classList.remove('synced-pulse'), 1200);
      }
    };
    window.addEventListener('CONTENT_NAVIGATE', handler as any);
    return () => window.removeEventListener('CONTENT_NAVIGATE', handler as any);
  }, []);

  // inject styles once
  useEffect(() => {
    if (styleInjected.current) return;
    const style = document.createElement('style');
    style.innerHTML = pulseCss;
    document.head.appendChild(style);
    styleInjected.current = true;
    return () => { try { document.head.removeChild(style); } catch { /* noop */ } };
  }, []);

  if (!layout || !content) return null;
  return (
    <Box sx={{ p: 2, overflow: 'auto', height: '100%' }}>
      <StudentRenderer layout={layout} content={content} contentSync={contentSync ? { room: contentSync.room, isTutor: contentSync.isTutor, contentId } : undefined} />
    </Box>
  );
};

export default SyncedContentView;

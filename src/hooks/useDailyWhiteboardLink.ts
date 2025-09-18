import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DailyCall, DailyEventObjectAppMessage } from '@daily-co/daily-js';

type WhiteboardMessage =
  | {
      type: 'WHITEBOARD_URL';
      url: string;
      lessonId?: string;
      ts: number;
      createdBy?: string;
    }
  | {
      type: 'WHITEBOARD_REQUEST_URL';
      lessonId?: string;
      ts: number;
      requester?: string;
    };

interface Options {
  callFrame: DailyCall | null;
  role?: string | null;
  lessonId?: string;
  isOpen: boolean;
}

interface Result {
  url: string | null;
  embedUrl: string | null;
  waitingForLink: boolean;
  error?: string;
  lastUpdatedAt: number | null;
  remoteParticipantCount: number;
  ensureLink: () => void;
  resetBoard: () => void;
  openInNewTab: () => void;
}

const STORAGE_PREFIX = 'daily-whiteboard:';

const createBoardUrl = () => {
  if (typeof window === 'undefined' || !window.crypto) {
    const fallback = Math.random().toString(36).slice(2);
    return `https://excalidraw.com/#room=${fallback}`;
  }
  const roomBytes = new Uint8Array(12);
  window.crypto.getRandomValues(roomBytes);
  const keyBytes = new Uint8Array(16);
  window.crypto.getRandomValues(keyBytes);

  const roomId = Array.from(roomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const keyBase64 = btoa(String.fromCharCode(...Array.from(keyBytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `https://excalidraw.com/#room=${roomId},${keyBase64}`;
};

const toEmbedUrl = (url: string | null) => {
  if (!url) return null;
  const [base, hash] = url.split('#');
  const baseWithEmbed = base.includes('?') ? `${base}&embed=1` : `${base}?embed=1`;
  return hash ? `${baseWithEmbed}#${hash}` : baseWithEmbed;
};

const computeRemoteCount = (callFrame: DailyCall | null) => {
  if (!callFrame) return 0;
  try {
    const participants = callFrame.participants();
    return Object.values(participants).filter((p) => !p.local).length;
  } catch {
    return 0;
  }
};

export const useDailyWhiteboardLink = ({ callFrame, role, lessonId, isOpen }: Options): Result => {
  const storageKey = lessonId ? `${STORAGE_PREFIX}${lessonId}` : null;
  const initialUrl = useMemo(() => {
    if (!storageKey) return null;
    if (typeof window === 'undefined') return null;
    return window.sessionStorage.getItem(storageKey);
  }, [storageKey]);

  const [url, setUrl] = useState<string | null>(initialUrl);
  const [waitingForLink, setWaitingForLink] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(initialUrl ? Date.now() : null);
  const [remoteParticipantCount, setRemoteParticipantCount] = useState<number>(computeRemoteCount(callFrame));

  const latestUrlRef = useRef<string | null>(initialUrl);

  const applyUrl = useCallback(
    (value: string | null, source: 'local' | 'remote') => {
      latestUrlRef.current = value;
      setUrl(value);
      setWaitingForLink(false);
      setError(undefined);
      setLastUpdatedAt(value ? Date.now() : null);
      if (storageKey) {
        if (value) {
          try {
            window.sessionStorage.setItem(storageKey, value);
          } catch (e) {
            console.warn('Unable to persist whiteboard url', e);
          }
        } else {
          try {
            window.sessionStorage.removeItem(storageKey);
          } catch {}
        }
      }
      if (source === 'local' && value && callFrame) {
        try {
          callFrame.sendAppMessage(
            { type: 'WHITEBOARD_URL', url: value, lessonId, ts: Date.now(), createdBy: role ?? undefined },
            '*'
          );
        } catch (e) {
          console.warn('Failed to broadcast whiteboard url', e);
          setError('Could not broadcast the whiteboard link. Try again.');
        }
      }
    },
    [callFrame, lessonId, role, storageKey]
  );

  const requestLink = useCallback(() => {
    if (!callFrame) return;
    setWaitingForLink(true);
    try {
      callFrame.sendAppMessage({ type: 'WHITEBOARD_REQUEST_URL', lessonId, ts: Date.now(), requester: role ?? undefined }, '*');
    } catch (e) {
      console.warn('Failed to request whiteboard link', e);
      setError('Could not contact the host for a whiteboard link.');
      setWaitingForLink(false);
    }
  }, [callFrame, lessonId, role]);

  const ensureLink = useCallback(() => {
    if (latestUrlRef.current) return;
    if (role === 'tutor' || role === 'teacher') {
      applyUrl(createBoardUrl(), 'local');
    } else {
      requestLink();
    }
  }, [applyUrl, requestLink, role]);

  const resetBoard = useCallback(() => {
    if (role !== 'tutor' && role !== 'teacher') return;
    applyUrl(createBoardUrl(), 'local');
  }, [applyUrl, role]);

  const openInNewTab = useCallback(() => {
    if (!url) return;
    if (typeof window === 'undefined') return;
    const target = window.open(url, '_blank', 'noopener,noreferrer');
    if (!target) {
      setError('Your browser blocked the new whiteboard tab. Allow popups or copy the link manually.');
    }
  }, [url]);

  useEffect(() => {
    setRemoteParticipantCount(computeRemoteCount(callFrame));
    if (!callFrame) return;

    const updateParticipants = () => {
      setRemoteParticipantCount(computeRemoteCount(callFrame));
    };

    callFrame.on('participant-joined', updateParticipants);
    callFrame.on('participant-left', updateParticipants);
    callFrame.on('participant-updated', updateParticipants);

    return () => {
      callFrame.off('participant-joined', updateParticipants);
      callFrame.off('participant-left', updateParticipants);
      callFrame.off('participant-updated', updateParticipants);
    };
  }, [callFrame]);

  useEffect(() => {
    if (!callFrame) return;
    const handler = (event: DailyEventObjectAppMessage<WhiteboardMessage>) => {
      const payload = event.data;
      if (!payload || typeof payload !== 'object') return;
      if (payload.lessonId && lessonId && payload.lessonId !== lessonId) return;

      if (payload.type === 'WHITEBOARD_URL') {
        if (typeof payload.url === 'string' && payload.url.trim().length > 0) {
          applyUrl(payload.url, 'remote');
        }
      } else if (payload.type === 'WHITEBOARD_REQUEST_URL') {
        if (latestUrlRef.current && (!lessonId || payload.lessonId === lessonId)) {
          try {
            callFrame.sendAppMessage(
              { type: 'WHITEBOARD_URL', url: latestUrlRef.current, lessonId, ts: Date.now(), createdBy: role ?? undefined },
              event.fromId
            );
          } catch (e) {
            console.warn('Failed to respond with whiteboard url', e);
          }
        }
      }
    };

    callFrame.on('app-message', handler);
    return () => {
      callFrame.off('app-message', handler);
    };
  }, [applyUrl, callFrame, lessonId, role]);

  useEffect(() => {
    if (!isOpen) return;
    if (latestUrlRef.current) {
      if (role === 'tutor' || role === 'teacher') {
        // ensure late joiners receive the link as soon as the dashboard opens
        if (callFrame && latestUrlRef.current) {
          try {
            callFrame.sendAppMessage(
              { type: 'WHITEBOARD_URL', url: latestUrlRef.current, lessonId, ts: Date.now(), createdBy: role ?? undefined },
              '*'
            );
          } catch (e) {
            console.warn('Failed to rebroadcast whiteboard url', e);
          }
        }
      }
      return;
    }
    ensureLink();
  }, [callFrame, ensureLink, isOpen, lessonId, role]);

  useEffect(() => {
    // If the stored link was cleared elsewhere, sync state
    if (!storageKey || typeof window === 'undefined') return;
    const stored = window.sessionStorage.getItem(storageKey);
    if (stored && stored !== latestUrlRef.current) {
      latestUrlRef.current = stored;
      setUrl(stored);
      setLastUpdatedAt(Date.now());
    }
  }, [storageKey]);

  return {
    url,
    embedUrl: toEmbedUrl(url),
    waitingForLink,
    error,
    lastUpdatedAt,
    remoteParticipantCount,
    ensureLink,
    resetBoard,
    openInNewTab,
  };
};

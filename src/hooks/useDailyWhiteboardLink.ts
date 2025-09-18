import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DailyCall, DailyEventObjectAppMessage } from '@daily-co/daily-js';

type WhiteboardMessage =
  | {
      type: 'WB_LINK';
      url: string;
      lessonId?: string;
      ts: number;
      createdBy?: string;
    }
  | {
      type: 'WB_REQUEST_LINK';
      lessonId?: string;
      ts: number;
      requester?: string;
    };

type Options = {
  callFrame: DailyCall | null;
  role?: string | null;
  lessonId?: string;
  isOpen: boolean;
};

type Result = {
  url: string | null;
  embedUrl: string | null;
  waitingForLink: boolean;
  error?: string;
  lastUpdatedAt: number | null;
  remoteParticipantCount: number;
  resyncBoard: () => void;
  resetBoard: () => void;
  openInNewTab: () => void;
};

type StoredWhiteboard = {
  url: string;
  ts?: number;
};

const STORAGE_PREFIX = 'daily-whiteboard-link:';

const computeRemoteCount = (callFrame: DailyCall | null) => {
  if (!callFrame) return 0;
  try {
    const participants = callFrame.participants();
    return Object.values(participants).filter((participant) => !participant.local).length;
  } catch {
    return 0;
  }
};

const createBoardUrl = () => {
  if (typeof window === 'undefined' || !window.crypto?.getRandomValues) {
    const fallback = Math.random().toString(36).slice(2);
    return `https://excalidraw.com/#room=${fallback}`;
  }

  const roomBytes = new Uint8Array(12);
  window.crypto.getRandomValues(roomBytes);
  const roomId = Array.from(roomBytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  const keyBytes = new Uint8Array(16);
  window.crypto.getRandomValues(keyBytes);
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

export const useDailyWhiteboardLink = ({ callFrame, role, lessonId, isOpen }: Options): Result => {
  const storageKey = lessonId ? `${STORAGE_PREFIX}${lessonId}` : null;

  const stored = useMemo(() => {
    if (!storageKey || typeof window === 'undefined') return null;
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as StoredWhiteboard;
      if (parsed?.url && typeof parsed.url === 'string') {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }, [storageKey]);

  const [url, setUrl] = useState<string | null>(stored?.url ?? null);
  const [waitingForLink, setWaitingForLink] = useState<boolean>(!stored?.url);
  const [error, setError] = useState<string | undefined>();
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(stored?.ts ?? (stored?.url ? Date.now() : null));
  const [remoteParticipantCount, setRemoteParticipantCount] = useState<number>(computeRemoteCount(callFrame));

  const latestUrlRef = useRef<string | null>(stored?.url ?? null);
  const isHost = role === 'tutor' || role === 'teacher';
  const rebroadcastOnJoinedRef = useRef<boolean>(false);

  const persist = useCallback(
    (value: StoredWhiteboard | null) => {
      if (!storageKey || typeof window === 'undefined') return;
      try {
        if (value) {
          window.sessionStorage.setItem(storageKey, JSON.stringify(value));
        } else {
          window.sessionStorage.removeItem(storageKey);
        }
      } catch (err) {
        console.warn('Unable to persist whiteboard link', err);
      }
    },
    [storageKey],
  );

  const broadcastUrl = useCallback(
    (value: string, target: string | '*' = '*', timestamp?: number) => {
      if (!callFrame) return;
      const ts = timestamp ?? Date.now();
      try {
        console.debug('[WB]', { action: 'broadcast', to: target, isHost, lessonId, ts, hasUrl: !!value });
        callFrame.sendAppMessage(
          { type: 'WB_LINK', url: value, lessonId, ts, createdBy: role ?? undefined },
          target,
        );
      } catch (err) {
        console.warn('Failed to broadcast whiteboard link', err);
        setError('Could not broadcast the whiteboard link. Try again.');
      }
    },
    [callFrame, lessonId, role, isHost],
  );

  const applyUrl = useCallback(
    (value: string | null, source: 'local' | 'remote', timestamp?: number) => {
      latestUrlRef.current = value;
      if (!value) {
        setUrl(null);
        setLastUpdatedAt(null);
        setWaitingForLink(true);
        persist(null);
        if (source === 'local') {
          setError(undefined);
        }
        return;
      }

      const ts = timestamp ?? Date.now();
      setUrl(value);
      setWaitingForLink(false);
      setError(undefined);
      setLastUpdatedAt(ts);
      persist({ url: value, ts });
      if (source === 'local') {
        broadcastUrl(value, '*', ts);
      }
    },
    [broadcastUrl, persist],
  );

  const requestLink = useCallback(() => {
    if (!callFrame) return;
    setWaitingForLink(true);
    try {
      const ts = Date.now();
      console.debug('[WB]', { action: 'request-link', isHost, lessonId, ts });
      callFrame.sendAppMessage({ type: 'WB_REQUEST_LINK', lessonId, ts, requester: role ?? undefined }, '*');
    } catch (err) {
      console.warn('Failed to request whiteboard link', err);
      setError('Could not reach the host for a whiteboard link.');
      setWaitingForLink(false);
    }
  }, [callFrame, lessonId, role, isHost]);

  const resyncBoard = useCallback(() => {
    if (latestUrlRef.current) {
      broadcastUrl(latestUrlRef.current);
      setWaitingForLink(false);
    } else {
      requestLink();
    }
  }, [broadcastUrl, requestLink]);

  const resetBoard = useCallback(() => {
    if (!isHost) return;
    applyUrl(createBoardUrl(), 'local');
  }, [applyUrl, isHost]);

  const openInNewTab = useCallback(() => {
    if (!latestUrlRef.current || typeof window === 'undefined') return;
    const target = window.open(latestUrlRef.current, '_blank', 'noopener,noreferrer');
    if (!target) {
      setError('Your browser blocked the new whiteboard tab. Allow popups or copy the link manually.');
    }
  }, []);

  useEffect(() => {
    setRemoteParticipantCount(computeRemoteCount(callFrame));
    if (!callFrame) return;

    const updateParticipants = () => {
      setRemoteParticipantCount(computeRemoteCount(callFrame));
    };

    const onParticipantJoined = (ev: any) => {
      updateParticipants();
      if (!isHost) return;
      const toId = ev?.participant?.session_id;
      if (latestUrlRef.current && toId) {
        console.debug('[WB]', { action: 'targeted-send-on-join', to: toId, isHost, lessonId, hasUrl: !!latestUrlRef.current });
        broadcastUrl(latestUrlRef.current, toId);
      } else {
        console.debug('[WB]', { action: 'participant-joined-no-url', isHost, lessonId, to: toId });
      }
    };

    callFrame.on('participant-joined', onParticipantJoined);
    callFrame.on('participant-left', updateParticipants);
    callFrame.on('participant-updated', updateParticipants);

    return () => {
      callFrame.off('participant-joined', onParticipantJoined);
      callFrame.off('participant-left', updateParticipants);
      callFrame.off('participant-updated', updateParticipants);
    };
  }, [callFrame, isHost, lessonId, broadcastUrl]);

  useEffect(() => {
    if (!callFrame) return;
    const onJoinedMeeting = () => {
      console.debug('[WB]', { action: 'joined-meeting', isHost, lessonId, isOpen, hasUrl: !!latestUrlRef.current, alreadyRebroadcasted: rebroadcastOnJoinedRef.current });
      if (isHost && isOpen && latestUrlRef.current && !rebroadcastOnJoinedRef.current) {
        rebroadcastOnJoinedRef.current = true;
        broadcastUrl(latestUrlRef.current);
      }
    };
    callFrame.on('joined-meeting', onJoinedMeeting);
    return () => {
      callFrame.off('joined-meeting', onJoinedMeeting);
    };
  }, [callFrame, isHost, isOpen, lessonId, broadcastUrl]);

  useEffect(() => {
    if (!callFrame) return;
    const handler = (event: DailyEventObjectAppMessage<WhiteboardMessage>) => {
      const payload = event.data;
      if (!payload || typeof payload !== 'object') return;
      if (lessonId && payload.lessonId !== lessonId) {
        console.debug('[WB]', { action: 'app-message-ignore-lesson', isHost, lessonId, from: event.fromId, payloadLessonId: (payload as any).lessonId });
        return;
      }
      console.debug('[WB]', { action: 'app-message', isHost, lessonId, from: event.fromId, type: (payload as any).type });

      if (payload.type === 'WB_LINK') {
        if (typeof payload.url === 'string' && payload.url.trim()) {
          applyUrl(payload.url, 'remote', payload.ts);
        }
      } else if (payload.type === 'WB_REQUEST_LINK') {
        console.debug('[WB]', { action: 'request-received', isHost, lessonId, hasUrl: !!latestUrlRef.current, from: event.fromId });
        if (latestUrlRef.current) {
          broadcastUrl(latestUrlRef.current, event.fromId ?? '*');
        } else if (isHost) {
          applyUrl(createBoardUrl(), 'local');
        }
      }
    };

    callFrame.on('app-message', handler);
    return () => {
      callFrame.off('app-message', handler);
    };
  }, [applyUrl, broadcastUrl, callFrame, isHost, lessonId]);

  useEffect(() => {
    if (!isOpen) return;
    if (latestUrlRef.current) {
      console.debug('[WB]', { action: 'drawer-open-has-url', isHost, lessonId });
      if (isHost) {
        broadcastUrl(latestUrlRef.current);
      } else {
        setWaitingForLink(false);
      }
      return;
    }
    if (isHost) {
      console.debug('[WB]', { action: 'drawer-open-create', isHost, lessonId });
      applyUrl(createBoardUrl(), 'local');
    } else {
      console.debug('[WB]', { action: 'drawer-open-request', isHost, lessonId });
      requestLink();
    }
  }, [applyUrl, broadcastUrl, isHost, isOpen, requestLink, lessonId]);

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return;
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as StoredWhiteboard;
      if (parsed?.url && parsed.url !== latestUrlRef.current) {
        latestUrlRef.current = parsed.url;
        setUrl(parsed.url);
        setLastUpdatedAt(parsed.ts ?? Date.now());
        setWaitingForLink(false);
      }
    } catch (e) {
      console.debug('[WB]', { action: 'storage-parse-error', lessonId, error: (e as any)?.message });
    }
  }, [storageKey, lessonId]);

  const embedUrl = useMemo(() => toEmbedUrl(url), [url]);

  return {
    url,
    embedUrl,
    waitingForLink,
    error,
    lastUpdatedAt,
    remoteParticipantCount,
    resyncBoard,
    resetBoard,
    openInNewTab,
  };
};

// Lightweight activity emitter for SpeakShire
// Sends batched events to /api/tracking/events with privacy in mind.
// Feature flag: VITE_ACTIVITY_TRACKING_ENABLED (default true)

export type ActivityEventType =
  | 'login'
  | 'visibility_visible' | 'visibility_hidden'
  | 'heartbeat'
  | 'homework_start' | 'homework_end'
  | 'vocab_start' | 'vocab_end'
  | 'lesson_join' | 'lesson_leave';

export interface ActivityEvent {
  userId: string;
  sessionId: string;
  seq: number;          // monotonic per session
  ts: number;           // epoch millis (UTC)
  type: ActivityEventType;
  page?: string;        // route key
  meta?: Record<string, unknown>;
}

interface TransportResult {
  ok: boolean;
}

const FEATURE_ENABLED = import.meta.env.VITE_ACTIVITY_TRACKING_ENABLED !== 'false';
const BATCH_SIZE = 25;
const FLUSH_INTERVAL_MS = 5_000;
const HEARTBEAT_MS = 60_000;
const IDLE_THRESHOLD_MS = 60_000; // 60s
const LEADER_KEY = 'activity-heartbeat-leader';

function uuid(): string {
  return ([1e7] as any + -1e3 + -4e3 + -8e3 + -1e11)
    .replace(/[018]/g, (c: any) =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

class ActivityEmitter {
  private enabled = FEATURE_ENABLED;
  private started = false;
  private userId: string | null = null;
  private authToken: string | null = null;
  private sessionId: string = '';
  private seq = 0;
  private pageKey: string | undefined;
  private queue: ActivityEvent[] = [];
  private flushTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private lastInputTs = Date.now();
  private channel: BroadcastChannel | null = null;
  private tabId: string = uuid();
  private isLeader = false;
  private debug = import.meta.env.DEV && import.meta.env.VITE_ACTIVITY_TRACKING_DEBUG === 'true';

  start(userId: string, token?: string) {
    if (!this.enabled) return;
    if (this.started && this.userId === userId) {
      // only update token
      if (token) this.authToken = token;
      return;
    }
    this.stop();

    this.userId = userId;
    this.authToken = token ?? this.authToken;
    this.sessionId = uuid();
    this.seq = 0;
    this.started = true;

    // Init visibility + idle + leader election
    this.attachListeners();
    this.tryAcquireLeadership(true);

    // emit login event immediately
    this.emit('login');
  }

  stop() {
    if (!this.started) return;
    this.started = false;
    this.detachListeners();
    this.releaseLeadership();
    this.flushSync();
    this.userId = null;
    this.authToken = null;
    this.sessionId = '';
    this.pageKey = undefined;
    this.queue = [];
    this.seq = 0;
  }

  setToken(token: string | null) {
    this.authToken = token || null;
  }

  setPage(pageKey: string) {
    if (!this.enabled || !this.started) return;
    this.pageKey = pageKey;
  }

  emit(type: ActivityEventType, page?: string, meta?: Record<string, unknown>) {
    if (!this.enabled || !this.started || !this.userId) return;
    const evt: ActivityEvent = {
      userId: this.userId,
      sessionId: this.sessionId,
      seq: ++this.seq,
      ts: Date.now(),
      type,
      page: page ?? this.pageKey,
      meta,
    };
    this.queue.push(evt);
    if (this.queue.length >= BATCH_SIZE) this.flush();
    if (!this.flushTimer) this.flushTimer = window.setTimeout(() => this.flush(), FLUSH_INTERVAL_MS);
  }

  private attachListeners() {
    window.addEventListener('beforeunload', this.onBeforeUnload, { capture: true });
    document.addEventListener('visibilitychange', this.onVisibilityChange, { capture: true });

    // Idle detection (passive listeners)
    const opts: AddEventListenerOptions = { passive: true };
    ['mousemove', 'keydown', 'scroll', 'touchstart'].forEach((t) => {
      window.addEventListener(t, this.onUserInput, opts);
    });

    // Broadcast channel for faster coordination
    try {
      this.channel = new BroadcastChannel('activity-emitter');
      this.channel.onmessage = (e) => this.onBroadcast(e);
      this.channel.postMessage({ type: 'hello', tabId: this.tabId });
    } catch (_) {
      this.channel = null;
    }

    // Start heartbeat loop
    this.scheduleHeartbeat();
  }

  private detachListeners() {
    window.removeEventListener('beforeunload', this.onBeforeUnload, { capture: true } as any);
    document.removeEventListener('visibilitychange', this.onVisibilityChange, { capture: true } as any);
    ['mousemove', 'keydown', 'scroll', 'touchstart'].forEach((t) => {
      window.removeEventListener(t, this.onUserInput as any);
    });

    if (this.channel) {
      try { this.channel.close(); } catch {/* do nothing */}
      this.channel = null;
    }

    if (this.flushTimer) { clearTimeout(this.flushTimer); this.flushTimer = null; }
    if (this.heartbeatTimer) { clearTimeout(this.heartbeatTimer); this.heartbeatTimer = null; }
  }

  private onBeforeUnload = () => {
    // best-effort flush
    this.flushSync();
    this.releaseLeadership();
  };

  private onVisibilityChange = () => {
    const hidden = document.hidden;
    this.emit(hidden ? 'visibility_hidden' : 'visibility_visible');
    if (hidden) {
      this.flush();
      // if hidden, relinquish leader immediately so another tab can take over
      this.releaseLeadership();
    } else {
      this.tryAcquireLeadership(true);
      this.scheduleHeartbeat();
    }
  };

  private onUserInput = () => {
    this.lastInputTs = Date.now();
  };

  private onBroadcast(e: MessageEvent) {
    const data = e.data || {};
    if (!data || typeof data !== 'object') return;
    if (data.type === 'leader-announce') {
      // another tab asserts leadership
      if (data.tabId !== this.tabId) this.isLeader = false;
    } else if (data.type === 'leader-release') {
      // try to acquire
      this.tryAcquireLeadership(false);
    } else if (data.type === 'who-is-leader') {
      if (this.isLeader && this.channel) this.channel.postMessage({ type: 'leader-announce', tabId: this.tabId });
    }
  }

  private scheduleHeartbeat() {
    if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);
    const tick = () => {
      if (!this.started) return;
      const active = !document.hidden && (Date.now() - this.lastInputTs) <= IDLE_THRESHOLD_MS;
      if (active) {
        // only leader emits heartbeats
        if (this.isLeader) this.emit('heartbeat');
      }
      this.heartbeatTimer = window.setTimeout(tick, HEARTBEAT_MS);
    };
    this.heartbeatTimer = window.setTimeout(tick, HEARTBEAT_MS);
  }

  private tryAcquireLeadership(announce: boolean) {
    // Use localStorage lock with TTL as the primary mechanism
    const now = Date.now();
    const raw = localStorage.getItem(LEADER_KEY);
    let holder: { tabId: string; expiresAt: number } | null = null;
    try { holder = raw ? JSON.parse(raw) : null; } catch {/* do nothing */}

    if (!holder || holder.expiresAt < now || document.hidden) {
      // claim
      const expiresAt = now + HEARTBEAT_MS + 2_000; // small buffer
      localStorage.setItem(LEADER_KEY, JSON.stringify({ tabId: this.tabId, expiresAt }));
      this.isLeader = !document.hidden;
      if (this.channel && this.isLeader && announce) this.channel.postMessage({ type: 'leader-announce', tabId: this.tabId });
    } else {
      this.isLeader = holder.tabId === this.tabId && !document.hidden;
    }

    // Listen to storage changes
    window.addEventListener('storage', this.onStorageChange);

    // Periodically renew if leader
    setTimeout(() => {
      if (!this.started) return;
      if (this.isLeader && !document.hidden) {
        const expiresAt = Date.now() + HEARTBEAT_MS + 2_000;
        localStorage.setItem(LEADER_KEY, JSON.stringify({ tabId: this.tabId, expiresAt }));
      }
    }, HEARTBEAT_MS);
  }

  private onStorageChange = (e: StorageEvent) => {
    if (e.key !== LEADER_KEY) return;
    try {
      const holder = e.newValue ? JSON.parse(e.newValue) : null;
      this.isLeader = holder && holder.tabId === this.tabId && !document.hidden;
      if (!holder && !document.hidden) {
        // try to claim
        this.tryAcquireLeadership(true);
      }
    } catch {/* do nothing */}
  };

  private releaseLeadership() {
    try {
      const raw = localStorage.getItem(LEADER_KEY);
      const holder = raw ? JSON.parse(raw) : null;
      if (holder && holder.tabId === this.tabId) localStorage.removeItem(LEADER_KEY);
    } catch {/* do nothing */}
    if (this.channel) {
      try { this.channel.postMessage({ type: 'leader-release', tabId: this.tabId }); } catch {/* do nothing */}
    }
    this.isLeader = false;
    window.removeEventListener('storage', this.onStorageChange);
  }

  private flush() {
    if (!this.enabled || !this.started) return;
    if (this.flushTimer) { clearTimeout(this.flushTimer); this.flushTimer = null; }
    const batch = this.queue.splice(0, this.queue.length);
    if (batch.length === 0) return;
    this.send(batch).catch(() => {
      // do nothing
    });
  }

  private flushSync() {
    if (!this.enabled) return;
    const batch = this.queue.splice(0, this.queue.length);
    if (batch.length === 0) return;
    this.send(batch, true);
  }

  private async send(events: ActivityEvent[], preferBeacon = false): Promise<TransportResult> {
    const url = 'http://localhost/users-service/api/tracking/events';

    // Beacon path: send only if available and either preferBeacon is true or page is unloading/hidden
    const body = JSON.stringify(events);

    if (preferBeacon && typeof navigator.sendBeacon === 'function') {
      try {
        const blob = new Blob([body], { type: 'application/json' });
        const ok = navigator.sendBeacon(url, blob);
        return { ok };
      } catch (_) { /* ignore */ }
    }

    // Fallback to fetch with retry/backoff
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {}),
      },
      keepalive: true,
      body,
    });
    if (res.ok) return { ok: true };

    return { ok: false };
  }
}

export const activityEmitter = new ActivityEmitter();

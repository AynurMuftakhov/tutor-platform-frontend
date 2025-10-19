import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useSnackbar} from 'notistack';
import {useFocusWords} from '../../context/FocusWordsContext';
import {useAuth} from '../../context/AuthContext';
import {collectHitsFromRaw, mergeOrAppendSegment} from './highlight';
import {fetchAssemblyAiToken, type TurnClipResponse, uploadTurnClip} from '../../services/api';
import type {TranscriptSegmentClip} from './types';

export type SegmentClip = TranscriptSegmentClip;

export type Segment = {
    id: string;
    text: string;
    isFinal?: boolean;
    startMs?: number;
    endMs?: number;
    hits?: { word: string; startMs?: number; endMs?: number; confidence?: number }[];
    clip?: SegmentClip;
};

export type TranscriptionStatus = 'idle' | 'starting' | 'live' | 'paused';

export type UseTranscription = {
    isTranscribing: boolean;
    status: TranscriptionStatus;
    segments: Segment[];
    sessionClip?: SegmentClip;
    error?: string | null;
    start: () => Promise<void>;
    stop: () => Promise<void>;
    clear: () => void;
};

export type ProviderOpts = {
    call: any;
    studentSessionId?: string;
    lessonId?: string;
};

type StreamStatus = TranscriptionStatus;
type StartOrigin = 'local' | 'remote';

const AUDIO_CONSTRAINTS: MediaStreamConstraints = {
    audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
    },
};

const TARGET_SAMPLE_RATE = 16_000;
const CHUNK_MS = 50;
const CHUNK_SAMPLES = (TARGET_SAMPLE_RATE * CHUNK_MS) / 1000;
const TOKEN_REFRESH_BUFFER_MS = 5_000;
const RECONNECT_BASE_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 5_000;
const MIN_CLIP_DURATION_MS = 400;
const MAX_CLIP_UPLOAD_ATTEMPTS = 3;

const API_BASE = ((import.meta as any).env?.VITE_API_URL as string | undefined) || '';

const noop = () => { /* no-op */ };

function toAbsoluteClipUrl(relative: string): string {
    const safe = relative?.startsWith('/') ? relative : `/${relative ?? ''}`;
    const cleanBase = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
    const prefix = `${cleanBase}${cleanBase ? '' : ''}/lessons-service`;
    return `${prefix}${safe}`;
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function chooseRecorderMime(): string {
    if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return 'audio/webm';
    const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg',
    ];
    for (const candidate of candidates) {
        try {
            if ((MediaRecorder as any).isTypeSupported?.(candidate)) {
                return candidate;
            }
        } catch {
            // ignore and continue
        }
    }
    return 'audio/webm';
}

export function useTranscriptionAssemblyAI({ call, studentSessionId, lessonId }: ProviderOpts): UseTranscription {
    const { enqueueSnackbar } = useSnackbar();
    const { user } = useAuth();
    const isTutor = user?.role === 'tutor';
    const { words: focusWords } = useFocusWords();

    const [isTranscribing, setIsTranscribing] = useState(false);
    const [status, setStatusState] = useState<StreamStatus>('idle');
    const [segments, setSegments] = useState<Segment[]>([]);
    const [sessionClip, setSessionClip] = useState<SegmentClip | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);

    const audioCtxRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const muteGainRef = useRef<GainNode | null>(null);
    const inputRateRef = useRef<number>(48_000);

    const fracIndexRef = useRef<number>(0);
    const resampleBufferRef = useRef<Float32Array>(new Float32Array(0));
    const pending16kRef = useRef<Float32Array>(new Float32Array(0));

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimerRef = useRef<number | null>(null);
    const tokenRefreshTimerRef = useRef<number | null>(null);
    const reconnectAttemptRef = useRef<number>(0);
    const shouldStreamRef = useRef<boolean>(false);
    const manualStopRef = useRef<boolean>(false);
    const isMutedRef = useRef<boolean>(false);

    const connectWsRef = useRef<() => void>(noop);
    const statusRef = useRef<StreamStatus>('idle');
    const lastBroadcastStatusRef = useRef<StreamStatus | null>(null);
    const lessonIdRef = useRef<string | undefined>(lessonId);
    const sessionClipRef = useRef<SegmentClip | null>(null);
    const sessionTurnIdRef = useRef<string | null>(null);
    const sessionRecorderRef = useRef<MediaRecorder | null>(null);
    const sessionRecorderChunksRef = useRef<Blob[]>([]);
    const sessionRecorderMimeRef = useRef<string>('audio/webm');
    const sessionRecorderShouldUploadRef = useRef<boolean>(false);
    const sessionRecorderStartPendingRef = useRef<boolean>(false);
    const sessionRecorderStartedAtRef = useRef<number | null>(null);

    useEffect(() => {
        lessonIdRef.current = lessonId;
    }, [lessonId]);

    const sanitizedKeyterms = useMemo(() => {
        if (!Array.isArray(focusWords) || focusWords.length === 0) return null;
        const unique = new Set<string>();
        const trimmed: string[] = [];
        for (const raw of focusWords) {
            if (trimmed.length >= 100) break;
            const word = String(raw ?? '').trim().slice(0, 50);
            if (!word) continue;
            const lower = word.toLowerCase();
            if (unique.has(lower)) continue;
            unique.add(lower);
            trimmed.push(word);
        }
        return trimmed.length ? trimmed : null;
    }, [focusWords]);

    const logTelemetry = useCallback((event: string, extra?: Record<string, unknown>) => {
        const payload = {
            event,
            lessonSessionId: studentSessionId,
            ts: new Date().toISOString(),
            ...extra,
        };
        // eslint-disable-next-line no-console
        console.info('[stt.telemetry]', payload);
    }, [studentSessionId]);

    const applyStatus = useCallback((next: StreamStatus, opts?: { broadcast?: boolean }) => {
        statusRef.current = next;
        setStatusState(next);
        setIsTranscribing(next === 'live');

        if (!opts?.broadcast || isTutor) return;
        if (!call || typeof call.sendAppMessage !== 'function') return;
        if (lastBroadcastStatusRef.current === next) return;
        lastBroadcastStatusRef.current = next;
        try {
            call.sendAppMessage({ t: 'A2T_STATUS', state: next });
        } catch (err) {
            console.warn('[transcription] failed to broadcast status', err);
        }
    }, [call, isTutor]);

    useEffect(() => {
        lastBroadcastStatusRef.current = null;
    }, [call]);

    const setSessionClipState = useCallback((clip?: SegmentClip) => {
        sessionClipRef.current = clip ?? null;
        setSessionClip(clip);
    }, []);

    const uploadSessionClip = useCallback(async (turnId: string, blob: Blob, durationMs: number) => {
        const lessonIdValue = lessonIdRef.current;
        if (!lessonIdValue) return;

        let attempt = 0;
        while (attempt < MAX_CLIP_UPLOAD_ATTEMPTS) {
            try {
                const response: TurnClipResponse = await uploadTurnClip({
                    lessonId: lessonIdValue,
                    turnId,
                    blob,
                    durationMs,
                });

                const clip: SegmentClip = {
                    clipId: response.clipId,
                    url: toAbsoluteClipUrl(response.url),
                    mime: response.mime,
                    durationMs: response.durationMs ?? durationMs,
                    expiresAt: response.expiresAt,
                };

                setSessionClipState(clip);

                if (call && typeof call.sendAppMessage === 'function') {
                    try {
                        call.sendAppMessage({
                            t: 'SESSION_CLIP',
                            lessonId: response.lessonId,
                            turnId: response.turnId,
                            clip: {
                                clipId: response.clipId,
                                url: response.url,
                                mime: response.mime,
                                durationMs: response.durationMs ?? durationMs,
                                expiresAt: response.expiresAt,
                            },
                        });
                    } catch (err) {
                        console.warn('[transcription] failed to emit SESSION_CLIP', err);
                    }
                }

                logTelemetry('session_clip_uploaded', { clipId: response.clipId, sizeBytes: response.sizeBytes });
                return;
            } catch (err) {
                attempt += 1;
                if (attempt >= MAX_CLIP_UPLOAD_ATTEMPTS) {
                    console.warn('Session clip upload failed', err);
                    enqueueSnackbar?.('Failed to upload session recording', { variant: 'error' });
                    logTelemetry('session_clip_upload_failed', { turnId, message: (err as Error)?.message });
                    return;
                }
                await sleep(500 * attempt);
            }
        }
    }, [call, enqueueSnackbar, logTelemetry, setSessionClipState]);

    const startSessionRecorder = useCallback(() => {
        if (isTutor || !mediaStreamRef.current) return;
        if (typeof MediaRecorder === 'undefined') return;
        if (sessionRecorderRef.current && sessionRecorderRef.current.state !== 'inactive') return;
        if (!sessionRecorderStartPendingRef.current) return;
        if (!sessionTurnIdRef.current) {
            sessionTurnIdRef.current = `session-${Date.now()}`;
        }

        try {
            const mimeType = chooseRecorderMime();
            const recorder = new MediaRecorder(mediaStreamRef.current, mimeType ? { mimeType } : undefined);
            sessionRecorderMimeRef.current = recorder.mimeType || mimeType || 'audio/webm';
            sessionRecorderChunksRef.current = [];
            sessionRecorderShouldUploadRef.current = true;
            sessionRecorderStartedAtRef.current = Date.now();

            recorder.ondataavailable = (ev: BlobEvent) => {
                if (ev.data && ev.data.size > 0) {
                    sessionRecorderChunksRef.current.push(ev.data);
                }
            };
            recorder.onerror = (ev) => {
                console.warn('MediaRecorder error', ev);
                sessionRecorderShouldUploadRef.current = false;
            };
            recorder.onstop = () => {
                const currentTurnId = sessionTurnIdRef.current;
                const chunks = sessionRecorderChunksRef.current.slice();
                sessionRecorderChunksRef.current = [];
                const startedAt = sessionRecorderStartedAtRef.current;
                sessionRecorderStartedAtRef.current = null;
                const shouldUpload = sessionRecorderShouldUploadRef.current;
                sessionRecorderShouldUploadRef.current = false;
                sessionRecorderRef.current = null;

                if (!shouldUpload || !currentTurnId || chunks.length === 0) {
                    return;
                }

                const blob = new Blob(chunks, { type: sessionRecorderMimeRef.current || 'audio/webm' });
                if (blob.size === 0) return;

                const durationMs = Math.max(Date.now() - (startedAt ?? Date.now()), 0);
                if (durationMs < MIN_CLIP_DURATION_MS) return;

                void uploadSessionClip(currentTurnId, blob, durationMs);
            };

            sessionRecorderRef.current = recorder;
            sessionRecorderStartPendingRef.current = false;
            recorder.start();
            logTelemetry('session_record_start', { turnId: sessionTurnIdRef.current });
        } catch (err) {
            console.warn('Failed to start MediaRecorder', err);
            sessionRecorderShouldUploadRef.current = false;
            sessionRecorderStartPendingRef.current = false;
        }
    }, [isTutor, logTelemetry, uploadSessionClip]);

    const stopSessionRecorder = useCallback((opts?: { upload?: boolean }) => {
        const shouldUpload = opts?.upload !== false;
        sessionRecorderShouldUploadRef.current = shouldUpload;
        sessionRecorderStartPendingRef.current = false;

        const recorder = sessionRecorderRef.current;
        if (!recorder) {
            if (!shouldUpload) {
                sessionRecorderChunksRef.current = [];
            }
            sessionTurnIdRef.current = null;
            return;
        }

        try {
            if (recorder.state !== 'inactive') {
                recorder.stop();
                logTelemetry('session_record_stop', {
                    turnId: sessionTurnIdRef.current,
                    upload: shouldUpload,
                });
            }
        } catch (err) {
            console.warn('Failed to stop MediaRecorder', err);
        }
    }, [logTelemetry]);

    const clearReconnectTimer = useCallback(() => {
        if (reconnectTimerRef.current) {
            window.clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }
    }, []);

    const clearTokenRefreshTimer = useCallback(() => {
        if (tokenRefreshTimerRef.current) {
            window.clearTimeout(tokenRefreshTimerRef.current);
            tokenRefreshTimerRef.current = null;
        }
    }, []);

    const cleanupAudio = useCallback(() => {
        try { processorRef.current?.disconnect(); } catch { /* noop */ }
        try { sourceRef.current?.disconnect(); } catch { /* noop */ }
        try { muteGainRef.current?.disconnect(); } catch { /* noop */ }
        try { audioCtxRef.current?.close(); } catch { /* noop */ }
        processorRef.current = null;
        sourceRef.current = null;
        muteGainRef.current = null;
        audioCtxRef.current = null;

        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => {
                try { track.stop(); } catch { /* noop */ }
            });
            mediaStreamRef.current = null;
        }

        pending16kRef.current = new Float32Array(0);
        resampleBufferRef.current = new Float32Array(0);
        fracIndexRef.current = 0;
    }, []);

    const closeWebSocket = useCallback((sendTerminate: boolean) => {
        const ws = wsRef.current;
        if (!ws) return;
        if (sendTerminate && ws.readyState === WebSocket.OPEN) {
            try { ws.send(JSON.stringify({ type: 'Terminate' })); } catch { /* noop */ }
        }
        try { ws.close(); } catch { /* noop */ }
        wsRef.current = null;
    }, []);

    const floatTo16BitPCM = useCallback((input: Float32Array): Uint8Array => {
        const buffer = new ArrayBuffer(input.length * 2);
        const view = new DataView(buffer);
        let offset = 0;
        for (let i = 0; i < input.length; i++, offset += 2) {
            const s = Math.max(-1, Math.min(1, input[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        }
        return new Uint8Array(buffer);
    }, []);

    const resampleLinear = useCallback((input: Float32Array, inRate: number, outRate: number): Float32Array => {
        if (inRate === outRate) return input;
        const ratio = outRate / inRate;
        const inLen = input.length;

        let t = fracIndexRef.current;
        const totalOut = Math.floor((inLen - t) * ratio);
        if (resampleBufferRef.current.length < totalOut) {
            resampleBufferRef.current = new Float32Array(totalOut);
        }
        const out = resampleBufferRef.current.subarray(0, totalOut);

        let o = 0;
        while (o < totalOut) {
            const idx = t;
            const i0 = Math.floor(idx);
            const i1 = Math.min(i0 + 1, inLen - 1);
            const frac = idx - i0;
            out[o++] = input[i0] * (1 - frac) + input[i1] * frac;
            t += 1 / ratio;
        }
        fracIndexRef.current = t - inLen;
        return out;
    }, []);

    const handleAudioProcess = useCallback((ev: AudioProcessingEvent) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        if (isMutedRef.current) return;

        const inBuf = ev.inputBuffer;
        const ch0 = inBuf.getChannelData(0);
        let mono: Float32Array;

        if (inBuf.numberOfChannels > 1) {
            const tmp = new Float32Array(ch0.length);
            for (let i = 0; i < ch0.length; i++) {
                tmp[i] = (ch0[i] + inBuf.getChannelData(1)[i]) * 0.5;
            }
            mono = tmp;
        } else {
            mono = ch0;
        }

        const out16k = resampleLinear(mono, inputRateRef.current, TARGET_SAMPLE_RATE);
        const combined = new Float32Array(pending16kRef.current.length + out16k.length);
        combined.set(pending16kRef.current, 0);
        combined.set(out16k, pending16kRef.current.length);

        let offset = 0;
        while (combined.length - offset >= CHUNK_SAMPLES) {
            const slice = combined.subarray(offset, offset + CHUNK_SAMPLES);
            const pcm = floatTo16BitPCM(slice);
            try {
                ws.send(pcm);
            } catch (e) {
                logTelemetry('stt_error', { reason: 'pcm_send_failed', message: (e as Error)?.message });
                break;
            }
            offset += CHUNK_SAMPLES;
        }
        pending16kRef.current = combined.subarray(offset);
    }, [floatTo16BitPCM, logTelemetry, resampleLinear]);

    const ensureAudioPipeline = useCallback(async () => {
        if (audioCtxRef.current) return;
        if (!navigator?.mediaDevices?.getUserMedia) {
            throw new Error('Browser does not support microphone capture');
        }

        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS);
        } catch (err: any) {
            throw new Error(err?.message || 'Microphone permission denied');
        }

        mediaStreamRef.current = stream;
        const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
        const ctx: AudioContext = new Ctx();
        audioCtxRef.current = ctx;
        inputRateRef.current = ctx.sampleRate || 48_000;
        if (typeof ctx.resume === 'function' && ctx.state === 'suspended') {
            try { await ctx.resume(); } catch { /* noop */ }
        }

        const source = ctx.createMediaStreamSource(stream);
        sourceRef.current = source;

        const processor = ctx.createScriptProcessor(2048, 1, 1);
        processorRef.current = processor;
        processor.onaudioprocess = handleAudioProcess;

        const muteGain = ctx.createGain();
        muteGain.gain.value = 0;
        muteGainRef.current = muteGain;

        source.connect(processor);
        processor.connect(muteGain);
        muteGain.connect(ctx.destination);
    }, [handleAudioProcess]);

    const scheduleReconnect = useCallback((reason: string, extra?: Record<string, unknown>) => {
        if (!shouldStreamRef.current) return;
        const nextAttempt = reconnectAttemptRef.current + 1;
        reconnectAttemptRef.current = nextAttempt;
        const delay = Math.min(RECONNECT_MAX_DELAY_MS, RECONNECT_BASE_DELAY_MS * Math.pow(2, nextAttempt - 1));
        applyStatus('starting', { broadcast: true });
        logTelemetry('stt_reconnect', { attempt: nextAttempt, reason, delayMs: delay, ...extra });
        clearReconnectTimer();
        reconnectTimerRef.current = window.setTimeout(() => {
            connectWsRef.current();
        }, delay);
    }, [applyStatus, clearReconnectTimer, logTelemetry]);

    const mapCloseCodeToMessage = useCallback((code: number, reason?: string): string | null => {
        if (code === 3005) return 'Audio chunk rejected: please retry.';
        if (code === 1008) return 'Token rejected by AssemblyAI. Please restart.';
        if (code === 1006) return 'Connection to AssemblyAI lost. Reconnecting…';
        if (reason && reason.toLowerCase().includes('token')) return 'AssemblyAI token expired. Refreshing…';
        return null;
    }, []);

    const handleWsMessage = useCallback((ev: MessageEvent) => {
        if (isTutor && !call) return;
        let payload: any;
        try {
            payload = JSON.parse((ev as any).data);
        } catch {
            return;
        }

        const type = String(payload.type || payload.message_type || '');
        if (type === 'SessionBegins' || type === 'Begin') return;
        if (type === 'SessionTerminated' || type === 'Termination') return;

        const text = String(payload.transcript ?? payload.text ?? '');
        const isFinal = Boolean(payload.end_of_turn ?? payload.is_final ?? payload.final);
        const words = Array.isArray(payload.words) ? payload.words : [];

        if (!text && words.length === 0) return;

        const startMs = words.length ? words[0]?.start ?? null : (payload.audio_start ?? payload.start ?? null);
        const endMs = words.length ? words[words.length - 1]?.end ?? null : (payload.audio_end ?? payload.end ?? null);
        const turnId = String(
            payload.utterance_id
            || payload.id
            || (startMs != null && endMs != null ? `${startMs}-${endMs}` : Date.now())
        );

        const hits = collectHitsFromRaw({ matches: words }, focusWords, text);
        const segment: Segment = {
            id: turnId,
            text,
            isFinal,
            startMs: startMs ?? undefined,
            endMs: endMs ?? undefined,
            hits: hits as any,
        };

        setSegments((prev) => {
            return mergeOrAppendSegment(prev as any, segment as any) as Segment[];
        });

        logTelemetry('stt_turn', { isFinal, chars: text.length });

        if (!isTutor && call && typeof call.sendAppMessage === 'function') {
            try {
                call.sendAppMessage({ t: 'A2T_TURN', seg: segment });
            } catch (err) {
                console.warn('[transcription] failed to send A2T_TURN', err);
            }
        }
    }, [call, focusWords, isTutor, logTelemetry]);

    const connectWs = useCallback(async () => {
        if (!shouldStreamRef.current) return;

        let token: { token: string; expiresAt: number; ttlSeconds?: number };
        try {
            token = await fetchAssemblyAiToken();
            logTelemetry('stt_token_issued', { ttlSeconds: token.ttlSeconds });
        } catch (err: any) {
            const message = err?.message || 'Failed to fetch AssemblyAI token';
            setError(message);
            logTelemetry('stt_error', { reason: 'token_fetch_failed', message });
            scheduleReconnect('token_fetch_failed');
            return;
        }

        const params = new URLSearchParams({
            sample_rate: String(TARGET_SAMPLE_RATE),
            encoding: 'pcm_s16le',
            format_turns: 'false',
            end_of_turn_confidence_threshold: '0.4',
            min_end_of_turn_silence_when_confident: '400',
            max_turn_silence: '1280',
        });
        if (sanitizedKeyterms && sanitizedKeyterms.length) {
            params.set('keyterms_prompt', JSON.stringify(sanitizedKeyterms));
        }

        const url = `wss://streaming.assemblyai.com/v3/ws?${params.toString()}&token=${encodeURIComponent(token.token)}`;

        let ws: WebSocket;
        try {
            ws = new WebSocket(url);
        } catch (err: any) {
            const message = err?.message || 'Unable to open AssemblyAI websocket';
            setError(message);
            logTelemetry('stt_error', { reason: 'ws_init_failed', message });
            scheduleReconnect('ws_init_failed');
            return;
        }

        ws.binaryType = 'arraybuffer';
        wsRef.current = ws;

        ws.onopen = () => {
            reconnectAttemptRef.current = 0;
            const nextState: StreamStatus = isMutedRef.current ? 'paused' : 'live';
            applyStatus(nextState, { broadcast: true });
            logTelemetry('stt_ws_open', { status: nextState });
            if (!isTutor) {
                startSessionRecorder();
            }
        };

        ws.onmessage = handleWsMessage;

        ws.onerror = (event: Event) => {
            logTelemetry('stt_error', { reason: 'ws_error', message: (event as any)?.message });
        };

        ws.onclose = (event: CloseEvent) => {
            logTelemetry('stt_ws_close', { code: event.code, reason: event.reason });
            clearTokenRefreshTimer();
            wsRef.current = null;

            if (!shouldStreamRef.current) {
                applyStatus('idle', { broadcast: true });
                return;
            }
            if (manualStopRef.current) {
                manualStopRef.current = false;
                applyStatus('idle', { broadcast: true });
                return;
            }

            const mappedMessage = mapCloseCodeToMessage(event.code, event.reason);
            if (mappedMessage) {
                setError(mappedMessage);
            }
            scheduleReconnect('ws_close', { code: event.code, reason: event.reason });
        };

        clearTokenRefreshTimer();
        const refreshDelay = Math.max(10_000, token.expiresAt - Date.now() - TOKEN_REFRESH_BUFFER_MS);
        tokenRefreshTimerRef.current = window.setTimeout(() => {
            if (!shouldStreamRef.current) return;
            logTelemetry('stt_reconnect', { reason: 'token_refresh' });
            manualStopRef.current = false;
            closeWebSocket(true);
        }, refreshDelay);
    }, [applyStatus, clearTokenRefreshTimer, closeWebSocket, handleWsMessage, isTutor, logTelemetry, mapCloseCodeToMessage, sanitizedKeyterms, scheduleReconnect, startSessionRecorder]);

    connectWsRef.current = () => { void connectWs(); };

    const stopStreaming = useCallback(async () => {
        shouldStreamRef.current = false;
        manualStopRef.current = true;
        if (!isTutor) {
            stopSessionRecorder({ upload: true });
        }
        clearReconnectTimer();
        clearTokenRefreshTimer();
        closeWebSocket(true);
        cleanupAudio();
        applyStatus('idle', { broadcast: true });
    }, [applyStatus, clearReconnectTimer, clearTokenRefreshTimer, cleanupAudio, closeWebSocket, isTutor, stopSessionRecorder]);

    const startStreaming = useCallback(async (origin: StartOrigin) => {
        if (isTutor) return;
        if (shouldStreamRef.current) return;

        setError(null);
        reconnectAttemptRef.current = 0;
        shouldStreamRef.current = true;
        manualStopRef.current = false;
        applyStatus('starting', { broadcast: true });

        if (!isTutor) {
            stopSessionRecorder({ upload: false });
            const sessionId = Date.now();
            sessionTurnIdRef.current = `session-${sessionId}`;
            sessionRecorderChunksRef.current = [];
            sessionRecorderStartedAtRef.current = null;
            sessionRecorderStartPendingRef.current = true;
            setSessionClipState(undefined);
        }

        try {
            await ensureAudioPipeline();
        } catch (err: any) {
            shouldStreamRef.current = false;
            manualStopRef.current = false;
            sessionRecorderStartPendingRef.current = false;
            sessionTurnIdRef.current = null;
            const message = err?.message || 'Microphone access required';
            setError(message);
            logTelemetry('stt_error', { reason: 'mic_initialise_failed', message, origin });
            applyStatus('idle', { broadcast: true });
            return;
        }

        await connectWs();
    }, [applyStatus, connectWs, ensureAudioPipeline, isTutor, logTelemetry, setSessionClipState, stopSessionRecorder]);

    const updateMuteState = useCallback(() => {
        if (!call || typeof call.participants !== 'function') return;
        try {
            const participants = call.participants();
            const local = participants?.local;
            const state = local?.tracks?.audio?.state;
            const muted = state === 'off' || state === 'blocked';
            isMutedRef.current = Boolean(muted);
            if (!isTutor && shouldStreamRef.current) {
                const wsReady = wsRef.current && wsRef.current.readyState === WebSocket.OPEN;
                if (wsReady) {
                    const nextStatus: StreamStatus = isMutedRef.current ? 'paused' : 'live';
                    applyStatus(nextStatus, { broadcast: true });
                }
            }
        } catch {
            /* noop */
        }
    }, [applyStatus, call, isTutor]);

    useEffect(() => {
        if (!call) return;
        const onParticipant = (ev: any) => {
            if (ev?.participant?.local || ev?.id === 'local') {
                updateMuteState();
            }
        };
        call.on?.('participant-updated', onParticipant);
        call.on?.('participant-joined', onParticipant);
        updateMuteState();
        return () => {
            try { call.off?.('participant-updated', onParticipant); } catch { /* noop */ }
            try { call.off?.('participant-joined', onParticipant); } catch { /* noop */ }
        };
    }, [call, updateMuteState]);

    useEffect(() => {
        if (!call) return;
        const handler = (event: any) => {
            const msg = event?.data;
            if (!msg || typeof msg !== 'object') return;
            if (msg.t === 'A2T_TURN' && isTutor) {
                const seg = msg.seg;
                if (!seg || typeof seg !== 'object') return;
                const incoming: Segment = {
                    id: String(seg.id || Date.now()),
                    text: String(seg.text || ''),
                    isFinal: Boolean(seg.isFinal ?? seg.is_final ?? seg.final),
                    startMs: typeof seg.startMs === 'number' ? seg.startMs : undefined,
                    endMs: typeof seg.endMs === 'number' ? seg.endMs : undefined,
                    hits: Array.isArray(seg.hits) ? seg.hits : undefined,
                    clip: seg.clip,
                };
                setSegments((prev) => {
                    return mergeOrAppendSegment(prev as any, incoming as any) as Segment[];
                });
            } else if (msg.t === 'A2T_STATUS' && isTutor) {
                const state = typeof msg.state === 'string' ? msg.state.toLowerCase() : '';
                if (state === 'idle' || state === 'starting' || state === 'live' || state === 'paused') {
                    applyStatus(state as StreamStatus);
                }
            } else if (msg.t === 'SESSION_CLIP') {
                const clipPayload = msg.clip;
                const turnId = String(msg.turnId || clipPayload?.clipId || '');
                if (!turnId || !clipPayload || typeof clipPayload !== 'object') return;
                const clip: SegmentClip = {
                    clipId: String(clipPayload.clipId || ''),
                    url: toAbsoluteClipUrl(String(clipPayload.url || '')),
                    mime: String(clipPayload.mime || 'audio/webm'),
                    durationMs: typeof clipPayload.durationMs === 'number' ? clipPayload.durationMs : undefined,
                    expiresAt: typeof clipPayload.expiresAt === 'number' ? clipPayload.expiresAt : undefined,
                };
                sessionTurnIdRef.current = turnId;
                setSessionClipState(clip);
            } else if (msg.t === 'STT_CONTROL' && !isTutor) {
                const action = msg.action;
                if (action === 'start') {
                    startStreaming('remote').catch((err) => {
                        setError(err?.message || 'Failed to start transcription');
                    });
                } else if (action === 'stop') {
                    stopStreaming().catch(() => { /* noop */ });
                } else if (action === 'clear') {
                    setSessionClipState(undefined);
                    setSegments([]);
                }
            }
        };
        call.on?.('app-message', handler);
        return () => {
            try { call.off?.('app-message', handler); } catch { /* noop */ }
        };
    }, [call, isTutor, setSessionClipState, startStreaming, stopStreaming]);

    useEffect(() => {
        if (isTutor || !call) return;
        const handleExit = () => {
            stopStreaming().catch(() => { /* noop */ });
        };
        call.on?.('left-meeting', handleExit);
        call.on?.('error', handleExit);
        return () => {
            try { call.off?.('left-meeting', handleExit); } catch { /* noop */ }
            try { call.off?.('error', handleExit); } catch { /* noop */ }
        };
    }, [call, isTutor, stopStreaming]);

    useEffect(() => {
        if (isTutor) return noop;
        const handleUnload = () => {
            stopStreaming().catch(() => { /* noop */ });
        };
        window.addEventListener('beforeunload', handleUnload);
        window.addEventListener('pagehide', handleUnload);
        return () => {
            window.removeEventListener('beforeunload', handleUnload);
            window.removeEventListener('pagehide', handleUnload);
        };
    }, [isTutor, stopStreaming]);

    useEffect(() => () => {
        clearReconnectTimer();
        clearTokenRefreshTimer();
        closeWebSocket(false);
        cleanupAudio();
        setSessionClipState(undefined);
        stopSessionRecorder({ upload: false });
        applyStatus('idle');
    }, [applyStatus, clearReconnectTimer, clearTokenRefreshTimer, cleanupAudio, closeWebSocket, setSessionClipState, stopSessionRecorder]);

    const start = useCallback(async () => {
        if (!call) {
            setError('Call is not ready');
            return;
        }
        if (isTutor) {
            applyStatus('starting');
            try {
                call.sendAppMessage?.({ t: 'STT_CONTROL', action: 'start' });
            } catch (err) {
                applyStatus('idle');
                const message = (err as Error)?.message || 'Failed to notify student';
                setError(message);
                logTelemetry('stt_error', { reason: 'control_send_failed', message });
            }
            return;
        }
        await startStreaming('local');
    }, [applyStatus, call, isTutor, logTelemetry, startStreaming]);

    const stop = useCallback(async () => {
        if (isTutor) {
            try {
                call?.sendAppMessage?.({ t: 'STT_CONTROL', action: 'stop' });
            } catch {
                /* noop */
            }
            applyStatus('idle');
            return;
        }
        await stopStreaming();
    }, [applyStatus, call, isTutor, stopStreaming]);

    const clear = useCallback(() => {
        setSegments([]);
        setSessionClipState(undefined);
        if (isTutor && call && typeof call.sendAppMessage === 'function') {
            try {
                call.sendAppMessage({ t: 'STT_CONTROL', action: 'clear' });
            } catch (err) {
                console.warn('[transcription] failed to send clear control', err);
            }
        }
    }, [call, isTutor, setSessionClipState]);

    return useMemo<UseTranscription>(() => ({
        isTranscribing,
        status,
        segments,
        sessionClip,
        error,
        start,
        stop,
        clear,
    }), [clear, error, isTranscribing, segments, sessionClip, start, status, stop]);
}

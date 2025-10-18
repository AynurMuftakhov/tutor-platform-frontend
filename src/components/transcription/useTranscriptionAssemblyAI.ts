import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusWords } from '../../context/FocusWordsContext';
import { useAuth } from '../../context/AuthContext';
import { collectHitsFromRaw, mergeOrAppendSegment } from './highlight';
import { fetchAssemblyAiToken } from '../../services/api';

export type Segment = {
    id: string;
    text: string;
    isFinal?: boolean;
    startMs?: number;
    endMs?: number;
    hits?: { word: string; startMs?: number; endMs?: number; confidence?: number }[];
};

export type UseTranscription = {
    isTranscribing: boolean;
    segments: Segment[];
    error?: string | null;
    start: () => Promise<void>;
    stop: () => Promise<void>;
    clear: () => void;
};

export type ProviderOpts = {
    call: any;
    studentSessionId?: string;
};

const AUDIO_CONSTRAINTS: MediaStreamConstraints = {
    audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
    },
};

const TARGET_SAMPLE_RATE = 16_000;
const CHUNK_MS = 50;
const CHUNK_SAMPLES = (TARGET_SAMPLE_RATE * CHUNK_MS) / 1000; // 800 samples @16kHz
const TOKEN_REFRESH_BUFFER_MS = 5_000;
const RECONNECT_BASE_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 5_000;

type StartOrigin = 'local' | 'remote';

const noop = () => {/* no op*/};

export function useTranscriptionAssemblyAI({ call, studentSessionId }: ProviderOpts): UseTranscription {
    const { user } = useAuth();
    const isTutor = user?.role === 'tutor';
    const { words: focusWords } = useFocusWords();

    const [isTranscribing, setIsTranscribing] = useState(false);
    const [segments, setSegments] = useState<Segment[]>([]);
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

    const sanitizedKeyterms = useMemo(() => {
        if (!Array.isArray(focusWords) || focusWords.length === 0) return null;
        const unique = new Set<string>();
        const trimmed: string[] = [];
        for (const raw of focusWords) {
            if (trimmed.length >= 100) break;
            const word = String(raw ?? '')
                .trim()
                .slice(0, 50);
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
    }, [floatTo16BitPCM, resampleLinear, logTelemetry]);

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
        logTelemetry('stt_reconnect', { attempt: nextAttempt, reason, delayMs: delay, ...extra });
        clearReconnectTimer();
        reconnectTimerRef.current = window.setTimeout(() => {
            connectWsRef.current();
        }, delay);
    }, [clearReconnectTimer, logTelemetry]);

    const mapCloseCodeToMessage = useCallback((code: number, reason?: string): string | null => {
        if (code === 3005) return 'Audio chunk rejected: please retry.';
        if (code === 1008) return 'Token rejected by AssemblyAI. Please restart.';
        if (code === 1006) return 'Connection to AssemblyAI lost. Reconnecting…';
        if (reason && reason.toLowerCase().includes('token')) return 'AssemblyAI token expired. Refreshing…';
        return null;
    }, []);

    const handleWsMessage = useCallback((ev: MessageEvent) => {
        if (isTutor) return;
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
        const id = payload.utterance_id
            || payload.id
            || (startMs != null && endMs != null ? `${startMs}-${endMs}` : `${Date.now()}`);

        const hits = collectHitsFromRaw({ matches: words }, focusWords, text);
        const segment: Segment = {
            id: String(id),
            text,
            isFinal,
            startMs: startMs ?? undefined,
            endMs: endMs ?? undefined,
            hits: hits as any,
        };

        setSegments((prev) => mergeOrAppendSegment(prev as any, segment as any) as any);
        logTelemetry('stt_turn', { isFinal, chars: text.length });

        if (call && typeof call.sendAppMessage === 'function') {
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
            logTelemetry('stt_ws_open', {});
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
                setIsTranscribing(false);
                return;
            }
            if (manualStopRef.current) {
                manualStopRef.current = false;
                return;
            }

            const mappedMessage = mapCloseCodeToMessage(event.code, event.reason);
            if (mappedMessage) {
                setError(mappedMessage);
            }
            scheduleReconnect('ws_close', { code: event.code, reason: event.reason });
        };

        clearTokenRefreshTimer();
        const refreshDelay = Math.max(
            10_000,
            token.expiresAt - Date.now() - TOKEN_REFRESH_BUFFER_MS,
        );
        tokenRefreshTimerRef.current = window.setTimeout(() => {
            if (!shouldStreamRef.current) return;
            logTelemetry('stt_reconnect', { reason: 'token_refresh' });
            manualStopRef.current = false;
            closeWebSocket(true);
        }, refreshDelay);
    }, [
        sanitizedKeyterms,
        handleWsMessage,
        logTelemetry,
        mapCloseCodeToMessage,
        scheduleReconnect,
        clearTokenRefreshTimer,
        closeWebSocket,
    ]);

    connectWsRef.current = () => { void connectWs(); };

    const stopStreaming = useCallback(async () => {
        shouldStreamRef.current = false;
        manualStopRef.current = true;
        clearReconnectTimer();
        clearTokenRefreshTimer();
        closeWebSocket(true);
        cleanupAudio();
        setIsTranscribing(false);
    }, [clearReconnectTimer, clearTokenRefreshTimer, closeWebSocket, cleanupAudio]);

    const startStreaming = useCallback(async (origin: StartOrigin) => {
        if (isTutor) return;
        if (shouldStreamRef.current) return;

        setError(null);
        reconnectAttemptRef.current = 0;
        shouldStreamRef.current = true;
        manualStopRef.current = false;

        try {
            await ensureAudioPipeline();
        } catch (err: any) {
            shouldStreamRef.current = false;
            manualStopRef.current = false;
            const message = err?.message || 'Microphone access required';
            setError(message);
            logTelemetry('stt_error', { reason: 'mic_initialise_failed', message, origin });
            return;
        }

        setIsTranscribing(true);
        await connectWs();
    }, [connectWs, ensureAudioPipeline, isTutor, logTelemetry]);

    const updateMuteState = useCallback(() => {
        if (!call || typeof call.participants !== 'function') return;
        try {
            const participants = call.participants();
            const local = participants?.local;
            const state = local?.tracks?.audio?.state;
            const muted = state === 'off' || state === 'blocked';
            isMutedRef.current = Boolean(muted);
        } catch {
            /* noop */
        }
    }, [call]);

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
                };
                setIsTranscribing(true);
                setSegments((prev) => mergeOrAppendSegment(prev as any, incoming as any) as any);
            } else if (msg.t === 'STT_CONTROL' && !isTutor) {
                const action = msg.action;
                if (action === 'start') {
                    startStreaming('remote').catch((err) => {
                        setError(err?.message || 'Failed to start transcription');
                    });
                } else if (action === 'stop') {
                    stopStreaming().catch(() => {/* noop */});
                }
            }
        };
        call.on?.('app-message', handler);
        return () => {
            try { call.off?.('app-message', handler); } catch { /* noop */ }
        };
    }, [call, isTutor, startStreaming, stopStreaming]);

    useEffect(() => {
        if (isTutor || !call) return;
        const handleExit = () => {
            stopStreaming().catch(() => {/* noop */});
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
            stopStreaming().catch(() => {/* noop */});
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
    }, [clearReconnectTimer, clearTokenRefreshTimer, closeWebSocket, cleanupAudio]);

    const start = useCallback(async () => {
        if (!call) {
            setError('Call is not ready');
            return;
        }
        if (isTutor) {
            try {
                call.sendAppMessage?.({ t: 'STT_CONTROL', action: 'start' });
                setIsTranscribing(true);
            } catch (err) {
                const message = (err as Error)?.message || 'Failed to notify student';
                setError(message);
                logTelemetry('stt_error', { reason: 'control_send_failed', message });
            }
            return;
        }
        await startStreaming('local');
    }, [call, isTutor, logTelemetry, startStreaming]);

    const stop = useCallback(async () => {
        if (isTutor) {
            try {
                call?.sendAppMessage?.({ t: 'STT_CONTROL', action: 'stop' });
            } catch {
                /* noop */
            }
            setIsTranscribing(false);
            return;
        }
        await stopStreaming();
    }, [call, isTutor, stopStreaming]);

    const clear = useCallback(() => {
        setSegments([]);
    }, []);

    return useMemo<UseTranscription>(() => ({
        isTranscribing,
        segments,
        error,
        start,
        stop,
        clear,
    }), [isTranscribing, segments, error, start, stop, clear]);
}

import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
    Box,
    Typography,
    Button,
    CircularProgress,
    IconButton,
    Tooltip,
    Alert
} from '@mui/material';
import {LiveKitRoom, VideoConference, useRoomContext} from '@livekit/components-react';
import MicIcon from '@mui/icons-material/Mic';
import '@livekit/components-styles';
import { RoomEvent, RemoteParticipant, createLocalAudioTrack } from 'livekit-client';
import { useAuth } from '../context/AuthContext';
import {fetchLiveKitToken, MicDiagPayload, postMicDiag} from '../services/api';
import WorkZone from '../components/lessonDetail/WorkZone';
import DraggableDivider from '../components/lessonDetail/DraggableDivider';
import { useSyncedVideo } from '../hooks/useSyncedVideo';
import { useSyncedGrammar } from '../hooks/useSyncedGrammar';
import { useSyncedContent } from '../hooks/useSyncedContent';
import { useWorkspaceToggle } from '../hooks/useWorkspaceToggle';
import { useWorkspaceSync } from '../hooks/useWorkspaceSync';
import { WorkspaceProvider } from '../context/WorkspaceContext';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DoneIcon from "@mui/icons-material/Done";
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

import '../styles/livekit-custom.css';
import { MicPermissionGate } from "../components/MicPermissionGate";
import { useRtc } from '../context/RtcContext';
import RtcHost from '../components/rtc/RtcHost';
import RtcErrorBanner from '../components/rtc/RtcErrorBanner';
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";

interface VideoCallPageProps {
    identity?: string;
    roomName?: string;
}

const SERVER_URL = 'wss://mytutorspace-ftahx5sh.livekit.cloud';

const VideoCallPage: React.FC<VideoCallPageProps> = (props) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [searchParams] = useSearchParams();

    // Get identity and roomName from props, URL query parameters, or location state
    const identity = props.identity ||
        searchParams.get('identity') ||
        (location.state?.identity as string);
    const roomName = props.roomName ||
        searchParams.get('roomName') ||
        (location.state?.roomName as string);
    const studentId = searchParams.get('studentId') ||
        (location.state?.studentId as string);

    const lessonId = roomName?.startsWith('lesson-') ? roomName.slice(7) : roomName;
    const previousPath = location.state?.from || '/dashboard';

    const [liveKitToken, setLiveKitToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Daily provider copy-link button state and helpers
    const [copiedDaily, setCopiedDaily] = useState(false);

    const generateDirectLinkDaily = () => {
        const baseUrl = window.location.origin;
        const rn = roomName ?? '';
        const sid = studentId ?? '';
        return `${baseUrl}/video-call?identity=${sid}&roomName=${rn}`;
    };

    const handleCopyLinkDaily = () => {
        navigator.clipboard.writeText(generateDirectLinkDaily());
        setCopiedDaily(true);
        setTimeout(() => setCopiedDaily(false), 3000);
    };

    /* ------------------------------------------------------------------ */
    /* 1. Fetch LiveKit token                                             */
    /* ------------------------------------------------------------------ */
    const { providerReady, provider, failureMessage, canFallbackToLiveKit, refreshJoin, forceFallbackToLiveKit, effectiveProvider } = useRtc();
    const currentProvider = (effectiveProvider ?? provider);

    useEffect(() => {
        // Wait until the RTC provider is known before deciding what to do
        if (!providerReady) return;

        // If Daily is the active provider, do not fetch a LiveKit token
        if (currentProvider === 'daily') {
            setIsLoading(false);
            return;
        }

        (async () => {
            if (!identity || !roomName) {
                setError('Identity and room name are required');
                setIsLoading(false);
                return;
            }
            try {
                const { token } = await fetchLiveKitToken(identity, roomName, user?.name || '');
                setLiveKitToken(token);
            } catch (err) {
                console.error('Failed to fetch LiveKit token:', err);
                setError('Failed to fetch token. Please try again.');
            } finally {
                setIsLoading(false);
            }
        })();
    }, [providerReady, currentProvider, identity, roomName, user?.name]);


    // Define leave handler and RTC hooks BEFORE any early returns to preserve Hooks order
    const handleLeave = () => navigate(previousPath);

    // Bootstrap RTC join once auth user and roomName are available
    useEffect(() => {
        if (!user?.id || !roomName) return;
        if (joinStartedRef.current) return;
        joinStartedRef.current = true;

        const mappedRole =
            user?.role === 'tutor' ? 'teacher'
                : user?.role === 'student' ? 'student'
                    : undefined;

        // Pass explicit hint so context doesn't depend solely on the URL query
        void refreshJoin({ roomName, lessonId, role: mappedRole });
    }, [user?.id, user?.role, roomName, lessonId, refreshJoin]);

    const joinStartedRef = useRef(false);

    /* ------------------------------------------------------------------ */
    /* 2. Loading / error UI                                              */
    /* ------------------------------------------------------------------ */
    if (currentProvider !== 'daily' && isLoading) {
        return (
            <Centered>
                <CircularProgress size={60} thickness={4} />
                <Typography variant="h6" sx={{ mt: 2 }}>
                    Connecting to video call…
                </Typography>
            </Centered>
        );
    }

    if (currentProvider !== 'daily' && (error || !liveKitToken)) {
        return (
            <Centered>
                <Typography variant="h5" color="error" gutterBottom>
                    {error || 'Failed to get video-call token'}
                </Typography>
                <Button variant="contained" onClick={() => navigate(-1)}>
                    Go Back
                </Button>
            </Centered>
        );
    }

    /* ------------------------------------------------------------------ */
    /* 3. Normal render                                                   */
    /* ------------------------------------------------------------------ */

    if (currentProvider === 'daily' && providerReady) {
        return (
            <Box sx={{ width: '100%', height: '100vh', overflow: 'hidden', position: 'relative' }}>
                {!!failureMessage && (
                    <RtcErrorBanner
                        message={failureMessage}
                        canFallback={canFallbackToLiveKit}
                        onRetry={() => refreshJoin()}
                        onFallback={() => forceFallbackToLiveKit()}
                    />
                )}
                {user?.role === 'tutor' && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 48,
                            right: 'auto',
                            left: 8,
                            zIndex: 1000,
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            borderRadius: '50%',
                            padding: '4px',
                        }}
                    >
                        {!copiedDaily ? (
                            <Tooltip title="Copy direct link to this video call">
                                <IconButton
                                    onClick={handleCopyLinkDaily}
                                    color="primary"
                                    size="small"
                                >
                                    <ContentCopyIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        ) : (
                            <Tooltip title="Copied!">
                                <IconButton color="success" size="small">
                                    <DoneIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>
                )}
                <RtcHost onLeft={handleLeave} lessonId={lessonId} />
            </Box>
        );
    }

    return (
        <LiveKitRoom
            token={liveKitToken ?? undefined}
            serverUrl={SERVER_URL}
            connect
            data-lk-theme="speakshire"
            onDisconnected={handleLeave}
        >
            <RoomContent lessonId={lessonId} studentId={studentId} />
        </LiveKitRoom>
    );
};

/* -------------------------------------------------------------------- */
/* RoomContent – everything inside LiveKit context                      */
/* -------------------------------------------------------------------- */
const RoomContent: React.FC<{
    lessonId: string;
    studentId?: string;
}> = ({ lessonId, studentId }) => {
    const { user } = useAuth();
    const room = useRoomContext(); // existing LiveKit room
    const statsTimerRef = useRef<number | null>(null);

    const [showUnmutePrompt, setShowUnmutePrompt] = useState(false);

    // ---------- Lightweight diagnostics logger ----------
    const postDiag = async (event: string, details?: any) => {
        const payload: MicDiagPayload = {
            ts: new Date().toISOString(),
            event,
            room: room?.name,
            identity: room?.localParticipant?.identity,
            userRole: user?.role,
            ua: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
            details,
        };

        // mirror to console
        console.log('[MicDiag]', payload);

        // send to backend with token
        try {
            await postMicDiag(payload);
        } catch {
            /* ignore network errors for diagnostics */
        }
    };

    // ---- helpers to describe publications/tracks and attach listeners ----
    const describePub = (pub: any) => ({
        sid: pub?.trackSid,
        kind: pub?.kind,
        source: pub?.source,
        muted: pub?.isMuted,
        subscribed: pub?.isSubscribed,
        trackReadyState: pub?.track?.mediaStreamTrack?.readyState,
        deviceId: (pub?.track?.getDeviceId?.() || pub?.track?.mediaStreamTrack?.getSettings?.().deviceId),
        settings: pub?.track?.mediaStreamTrack?.getSettings?.(),
    });

    const tapLocalTrackEvents = () => {
        try {
            const pubs = Array.from(room.localParticipant.audioTrackPublications.values());
            const tr = pubs[0]?.track?.mediaStreamTrack as MediaStreamTrack | undefined;
            if (!tr) return;
            postDiag('local_mediaStreamTrack_settings', tr.getSettings?.());
            tr.onended = () => postDiag('local_mediaStreamTrack_ended');
            tr.onmute = () => postDiag('local_mediaStreamTrack_muted');
            tr.onunmute = () => postDiag('local_mediaStreamTrack_unmuted');
        } catch (e) {
            postDiag('tapLocalTrackEvents_error', { error: String(e) });
        }
    };

    const startStatsTimer = () => {
        if (statsTimerRef.current) return;
        statsTimerRef.current = window.setInterval(async () => {
            try {
                const pubs = Array.from(room.localParticipant.audioTrackPublications.values());
                const track: any = pubs[0]?.track;
                const sender: RTCRtpSender | undefined = (track?.sender || track?._sender);
                if (!sender || !sender.getStats) return;
                const report = await sender.getStats();
                report.forEach((stat: any) => {
                    if (stat.type === 'outbound-rtp' && stat.kind === 'audio') {
                        postDiag('webrtc_outbound_audio', {
                            timestamp: stat.timestamp,
                            bytesSent: stat.bytesSent,
                            packetsSent: stat.packetsSent,
                            packetsLost: stat.packetsLost,
                            roundTripTime: stat.roundTripTime,
                            jitter: stat.jitter,
                            audioLevel: stat.audioLevel,
                            totalAudioEnergy: stat.totalAudioEnergy,
                            mimeType: stat.mimeType,
                        });
                    }
                });
            } catch (e) {
                postDiag('webrtc_outbound_audio_stats_error', { error: String(e) });
            }
        }, 5000);
    };

    // helper: find the student remote participant (1:1 room)
    const getStudentRemote = (): RemoteParticipant | undefined => {
      if (!room) return undefined;
      // room.participants is a Map<sid, RemoteParticipant>
      for (const p of room.remoteParticipants.values()) {
        if (p.identity === studentId) return p;
      }
      return undefined;
    };

    // Ask the student to unmute via LiveKit data channel
    const requestStudentUnmute = async () => {
      try {
        const payload = new TextEncoder().encode(JSON.stringify({ t: 'REQUEST_UNMUTE', from: user?.name || 'tutor' }));
        const target = getStudentRemote();
        // diagnostics
        postDiag('requestStudentUnmute_clicked', { targetFound: !!target, targetSid: target?.sid });
        // If we know who to target, send directly; otherwise broadcast
        if (target) {
          await room.localParticipant.publishData(payload, { reliable: true, destinationIdentities: [target.identity] });
        } else {
          await room.localParticipant.publishData(payload, { reliable: true });
        }
      } catch (e) {
        console.warn('Failed to send unmute request', e);
      }
    };

    // Local unmute flow that the student triggers
    const enableMicLocal = async () => {
      postDiag('enableMicLocal_start', {
        pubsCount: Array.from(room.localParticipant.audioTrackPublications.values()).length,
        micEnabled: room.localParticipant.isMicrophoneEnabled,
      });
      try {
        // ensure audio playback is unlocked (needed on Safari/Chrome autoplay policies)
        await room.startAudio();
        postDiag('startAudio_called');
      } catch (e) {
        console.debug('startAudio() failed or already started', e);
      }
        try {
            // proactively (re)open mic device to poke Safari issues
            const constraints: MediaStreamConstraints = { audio: true };
            const gum = await navigator.mediaDevices.getUserMedia(constraints);
            const t = gum.getAudioTracks?.()[0];
            postDiag('getUserMedia_audio_success', {
                constraints,
                settings: t?.getSettings?.(),
                label: t?.label,
                readyState: t?.readyState,
            });
            // stop temp tracks to avoid duplicate capture
            gum.getTracks?.().forEach(tr => tr.stop());
        } catch (e) {
            console.warn('getUserMedia audio failed', e);
            postDiag('getUserMedia_audio_failed', { error: String(e) });
        }
      // attempt normal enable first
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
        postDiag('setMicrophoneEnabled_called');
      } catch (e) {
        console.debug('setMicrophoneEnabled(true) threw, will verify/publish manually', e);
        postDiag('setMicrophoneEnabled_threw', { error: String(e) });
      }
      // verify we have a published local audio track; if not, create & publish one
      try {
        const pubs = Array.from(room.localParticipant.audioTrackPublications.values());
        const current = pubs[0];
        postDiag('verify_audio_pub', { hasPub: !!current, hasTrack: !!current?.track });
        if (!current || !current.track) {
          const track = await createLocalAudioTrack();
          await room.localParticipant.publishTrack(track);
          postDiag('publishTrack_success', { trackId: track.mediaStreamTrack.id });
        } else {
          // ensure it is unmuted
          await room.localParticipant.setMicrophoneEnabled(true);
        }
      } catch (e) {
        console.error('Manual audio publish/enable failed', e);
        postDiag('manual_publish_failed', { error: String(e) });
        return;
      }
      try {
          // attach MediaStreamTrack listeners and start periodic stats collection
          tapLocalTrackEvents();
          startStatsTimer();

        // sample local track amplitude once for diagnostics
        const pubs = Array.from(room.localParticipant.audioTrackPublications.values());
        const tr = pubs[0]?.track?.mediaStreamTrack as MediaStreamTrack | undefined;
        if (tr) {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const src = ctx.createMediaStreamSource(new MediaStream([tr]));
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          src.connect(analyser);
          const data = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteTimeDomainData(data);
          const variance = data.reduce((acc, v) => acc + Math.abs(v - 128), 0) / data.length;
          postDiag('local_waveform_variance', { variance });
          setTimeout(() => { try { ctx.close(); } catch {console.log("")} }, 200);
        } else {
          postDiag('local_waveform_no_track');
        }
      } catch (e) {
        postDiag('local_waveform_error', { error: String(e) });
      }
      setShowUnmutePrompt(false);
    };

    const [copied, setIsCopied] = useState(false);

    // Hook to manage workspace toggle and split ratio
    const [workspaceOpen, openWorkspace, closeWorkspace, splitRatio, setSplitRatio] = useWorkspaceToggle();

    // Hooks that encapsulate all playback sync
    const syncedVideo = useSyncedVideo(room, user?.role === 'tutor', workspaceOpen, openWorkspace);
    const syncedGrammar = useSyncedGrammar(room, user?.role === 'tutor', workspaceOpen, openWorkspace);
    const syncedContent = useSyncedContent(room, user?.role === 'tutor');

    const isTutor = user?.role === 'tutor';
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

    useWorkspaceSync(room, isTutor, workspaceOpen, openWorkspace, closeWorkspace);

    const generateDirectLink = () => {
        const baseUrl = window.location.origin;
        return `${baseUrl}/video-call?identity=${studentId}&roomName=${room.name}`;
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(generateDirectLink());
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 3000); // reset after 3 seconds
    };

    // Pause video locally when workspace is closed
    useEffect(() => {
        if (syncedVideo.state.open && syncedVideo.state.isPlaying && !workspaceOpen) {
            syncedVideo.pauseLocally();
        }
    }, [workspaceOpen, syncedVideo]);

    useEffect(() => {
      if (!room) return;

      const onData = (payload: Uint8Array) => {
        try {
          const msg = JSON.parse(new TextDecoder().decode(payload));
          if (msg?.t === 'REQUEST_UNMUTE' && !isTutor) {
            postDiag('request_unmute_received', msg);
            setShowUnmutePrompt(true);
          }
        } catch {
          /* ignore non-JSON data packets */
        }
      };

      room.on(RoomEvent.DataReceived, onData);
      return () => {
        room.off(RoomEvent.DataReceived, onData);
      };
    }, [room, isTutor]);

    useEffect(() => {
        if (!room) return;

        // environment snapshot
        postDiag('env_snapshot', {
            ua: navigator.userAgent,
            platform: (navigator as any).platform,
            hardwareConcurrency: (navigator as any).hardwareConcurrency,
            isSecureContext: (window as any).isSecureContext,
            visibility: document.visibilityState,
            supportedConstraints: navigator.mediaDevices?.getSupportedConstraints?.(),
        });

        const onVis = () => postDiag('document_visibilitychange', { visibility: document.visibilityState });
        document.addEventListener('visibilitychange', onVis);

        const onDeviceChange = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                postDiag('devicechange_enumerate', devices.map(d => ({
                    kind: d.kind, label: d.label,
                    deviceId: d.deviceId ? d.deviceId.substring(0, 6) + '…' : undefined
                })));
            } catch (e) {
                postDiag('devicechange_enumerate_failed', { error: String(e) });
            }
        };
        navigator.mediaDevices?.addEventListener?.('devicechange', onDeviceChange);

        // LiveKit signals
        const onLocalPub = (publication: any) => {
            postDiag('lk_LocalTrackPublished', describePub(publication));
            tapLocalTrackEvents();
            startStatsTimer();
        };
        const onLocalUnpub = (publication: any) => postDiag('lk_LocalTrackUnpublished', describePub(publication));
        const onTrackSub = (track: any, publication: any, participant: any) => {
            if (publication?.kind === 'audio') {
                postDiag('lk_TrackSubscribed_audio_remote', { pub: describePub(publication), participant: participant?.identity });
            }
        };
        const onTrackUnsub = (track: any, publication: any, participant: any) => {
            if (publication?.kind === 'audio') {
                postDiag('lk_TrackUnsubscribed_audio_remote', { pub: describePub(publication), participant: participant?.identity });
            }
        };
        const onMuted = (publication: any, participant: any) =>
            postDiag('lk_TrackMuted', { pub: describePub(publication), participant: participant?.identity, isLocal: !!participant?.isLocal });
        const onUnmuted = (publication: any, participant: any) =>
            postDiag('lk_TrackUnmuted', { pub: describePub(publication), participant: participant?.identity, isLocal: !!participant?.isLocal });
        const onAudioPlayback = (playing: boolean) => postDiag('lk_AudioPlaybackStatusChanged', { playing });
        const onDevicesChanged: (...args: unknown[]) => void = (...args) => {
            // keep diagnostics identical: we log the first argument from LiveKit
            void postDiag('lk_MediaDevicesChanged', args[0]);
        };
        const onConnQual = (participant: any, quality: any) => {
            if (participant?.isLocal) postDiag('lk_ConnectionQualityChanged_local', { quality });
        };

        room.on(RoomEvent.LocalTrackPublished, onLocalPub);
        room.on(RoomEvent.LocalTrackUnpublished, onLocalUnpub);
        room.on(RoomEvent.TrackSubscribed, onTrackSub);
        room.on(RoomEvent.TrackUnsubscribed, onTrackUnsub);
        room.on(RoomEvent.TrackMuted, onMuted);
        room.on(RoomEvent.TrackUnmuted, onUnmuted);
        room.on(RoomEvent.AudioPlaybackStatusChanged, onAudioPlayback);
        room.on(RoomEvent.MediaDevicesChanged, onDevicesChanged as unknown as (...args: any[]) => void);
        room.on(RoomEvent.ConnectionQualityChanged, onConnQual);

        return () => {
            document.removeEventListener('visibilitychange', onVis);
            navigator.mediaDevices?.removeEventListener?.('devicechange', onDeviceChange);
            room.off(RoomEvent.LocalTrackPublished, onLocalPub);
            room.off(RoomEvent.LocalTrackUnpublished, onLocalUnpub);
            room.off(RoomEvent.TrackSubscribed, onTrackSub);
            room.off(RoomEvent.TrackUnsubscribed, onTrackUnsub);
            room.off(RoomEvent.TrackMuted, onMuted);
            room.off(RoomEvent.TrackUnmuted, onUnmuted);
            room.off(RoomEvent.AudioPlaybackStatusChanged, onAudioPlayback);
            room.off(RoomEvent.MediaDevicesChanged, onDevicesChanged as unknown as (...args: any[]) => void);
            room.off(RoomEvent.ConnectionQualityChanged, onConnQual);
            if (statsTimerRef.current) {
                clearInterval(statsTimerRef.current);
                statsTimerRef.current = null;
            }
        };
    }, [room]);

    return (
        <WorkspaceProvider>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: !workspaceOpen || isSmallScreen ? '100%' : `${splitRatio}% 6px 1fr`,
                    gridTemplateRows: '100%',
                    height: '100%',
                    overflow: 'hidden',
                    position: 'relative',
                }}
            >
                {/* Copy Link Button - only visible for teachers */}
                {user?.role === 'tutor' && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 8,
                            right: 'auto',
                            left: 8,
                            zIndex: 1000,
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            borderRadius: '50%',
                            padding: '4px',
                        }}
                    >
                        {!copied ? (
                            <Tooltip title="Copy direct link to this video call">
                                <IconButton
                                    onClick={handleCopyLink}
                                    color="primary"
                                    size="small"
                                >
                                    <ContentCopyIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        ) : (
                            <Tooltip title="Copied!">
                                <IconButton color="success" size="small">
                                    <DoneIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>
                )}

                {/* ---------- Button to open workspace (always visible when workspace is closed) */}
                {!workspaceOpen && isTutor && (
                    <Tooltip title="Open materials">
                        <IconButton
                            onClick={openWorkspace}
                            sx={{
                                position: 'absolute',
                                top: 64,
                                left: 8,
                                right: 'auto',
                                zIndex: 1000,
                                bgcolor: 'primary.main',
                                color: 'white',
                                '&:hover': { bgcolor: 'primary.dark' },
                            }}
                            aria-label="Open workspace"
                        >
                            <LibraryBooksIcon />
                        </IconButton>
                    </Tooltip>
                )}

                {isTutor && (
                    <Tooltip title="Ask student to unmute">
                        <IconButton
                            onClick={requestStudentUnmute}
                            sx={{
                                position: 'absolute',
                                top: 126,
                                left: 8,
                                right: 'auto',
                                zIndex: 1000,
                                bgcolor: 'primary.main',
                                color: 'white',
                                '&:hover': { bgcolor: 'primary.dark' },
                            }}
                            aria-label="Open workspace"
                        >
                            <MicIcon />
                        </IconButton>
                    </Tooltip>
                )}

                {/* ---------- Left pane: VideoConference ----------------------- */}
                <Box
                    sx={{
                        height: '100%',
                        minWidth: 280,
                        overflow: 'hidden',
                        transition: 'width .25s ease',
                        position: 'relative',
                    }}
                >
                    <MicPermissionGate />
                    <VideoConference style={{ height: '100%', width: '100%' }} />
                    {!isTutor && showUnmutePrompt && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 8,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          zIndex: 1200,
                          maxWidth: 520,
                          width: 'calc(100% - 16px)',
                        }}
                      >
                        <Alert
                          severity="info"
                          variant="filled"
                          sx={{ display: 'flex', alignItems: 'center' }}
                          action={
                            <Button color="inherit" size="small" onClick={enableMicLocal}>
                              Unmute now
                            </Button>
                          }
                        >
                          Your teacher asked you to unmute your microphone. Click “Unmute now” to start speaking.
                        </Alert>
                      </Box>
                    )}
                </Box>

                {/* ---------- Draggable divider (only when workspace is open) -- */}
                {workspaceOpen && (
                    <DraggableDivider onDrag={setSplitRatio} />
                )}

                {/* ---------- Right pane: WorkZone (only when workspace is open) */}
                {workspaceOpen && (
                    <Box
                        sx={{
                            height: '100%',
                            overflow: 'hidden',
                        }}
                    >
                        <WorkZone
                            useSyncedVideo={syncedVideo}
                            useSyncedGrammar={syncedGrammar}
                            useSyncedContent={syncedContent}
                            onClose={closeWorkspace}
                            lessonId={lessonId}
                            room={room}
                        />
                    </Box>
                )}
            </Box>
        </WorkspaceProvider>
    );
};

/* Utility wrapper for center-aligned states */
const Centered: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Box
        sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            bgcolor: '#fafbfd',
        }}
    >
        {children}
    </Box>
);

export default VideoCallPage;

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getMediaPermissions, listDevices, isSetSinkIdSupported } from './deviceUtils';
import { useMicLevel } from './useMicLevel';

// Minimal types for devices (subset of MediaDeviceInfo)
type DeviceInfo = Pick<MediaDeviceInfo, 'deviceId' | 'label' | 'kind'>;

interface Props {
  lessonId: string;
  role: 'teacher'|'student';
  roomName: string;
  userName: string;
  onContinue: (opts: { cameraId?: string; micId?: string; speakerId?: string }) => void;
  onCancel?: () => void;
}

const PreJoinPanel: React.FC<Props> = ({ onContinue, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const testAudioRef = useRef<HTMLAudioElement>(null);

  const [cams, setCams] = useState<DeviceInfo[]>([]);
  const [mics, setMics] = useState<DeviceInfo[]>([]);
  const [speakers, setSpeakers] = useState<DeviceInfo[]>([]);

  const [cameraId, setCameraId] = useState<string>();
  const [micId, setMicId] = useState<string>();
  const [speakerId, setSpeakerId] = useState<string>();

  const [stream, setStream] = useState<MediaStream>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState<boolean>(true);

  const micLevel = useMicLevel(stream);

  const speakerTestSrc = useMemo(() => {
    // Tiny 0.2s 1kHz beep WAV (base64) to avoid adding assets
    return 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABYAaW5mbyAgICAgICAgICAgICAg\
ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg\
AAAAAAAP///8AAP///wAA//8AAP//AAD//wAA';
  }, []);

  // Initial permissions + enumerate devices
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(undefined);
      const camOk = await getMediaPermissions('camera');
      const micOk = await getMediaPermissions('microphone');
      if (!camOk || !micOk) {
        setError('Please allow camera and microphone access in your browser settings.');
      }
      try {
        const { cams, mics, speakers } = await listDevices();
        setCams(cams as DeviceInfo[]);
        setMics(mics as DeviceInfo[]);
        setSpeakers(speakers as DeviceInfo[]);
        setCameraId((cams[0] as any)?.deviceId);
        setMicId((mics[0] as any)?.deviceId);
        setSpeakerId((speakers[0] as any)?.deviceId);
      } catch (e) {
        setError('Could not enumerate media devices.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Start/refresh local preview stream when device selection changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cameraId && !micId) {
        return;
      }
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: cameraId ? { deviceId: { exact: cameraId } } : false,
          audio: micId ? { deviceId: { exact: micId } } : false,
        } as MediaStreamConstraints);
        if (cancelled) {
          // Stop immediately if effect re-ran
          s.getTracks().forEach(t => t.stop());
          return;
        }
        // Stop previous stream tracks
        if (stream) {
          stream.getTracks().forEach(t => t.stop());
        }
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          try { await videoRef.current.play(); } catch (err) { /* ignore */ }
        }
      } catch (e) {
        setError('Could not start camera/microphone with the selected devices.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cameraId, micId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [stream]);

  const testSpeaker = async () => {
    const el = testAudioRef.current;
    if (!el) return;
    // Attach sinkId if supported and user selected a specific output
    try {
      if (speakerId && isSetSinkIdSupported(el)) {
        await (el as any).setSinkId(speakerId);
      }
    } catch (err) {
      // ignore inability to set sinkId (e.g., iOS Safari)
    }
    try {
      el.currentTime = 0;
      await el.play();
    } catch (err) {
      // Some browsers require interaction; button click counts as interaction
    }
  };

  const noCam = cams.length === 0;
  const noMic = mics.length === 0;
  const canContinue = !!stream && !loading && !error && !noCam && !noMic;

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: 16 }}>
      <h2 style={{ marginBottom: 8 }}>Check your devices</h2>
      <p style={{ marginTop: 0, color: '#555' }}>Make sure your camera, microphone, and speakers work before joining.</p>

      {loading && <div>Requesting permissions…</div>}
      {error && (
        <div role="alert" style={{ background: '#fff3f3', color: '#b00020', padding: 12, borderRadius: 8, marginTop: 8 }}>
          {error}
          <div style={{ marginTop: 8, fontSize: 14 }}>
            Tip: Check your browser/OS permissions. 
            <a href="https://support.google.com/chrome/answer/2693767" target="_blank" rel="noreferrer">Chrome</a> · 
            <a href="https://support.apple.com/guide/mac-help/mchlc06f36d1/mac" target="_blank" rel="noreferrer" style={{ marginLeft: 6 }}>macOS</a>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <div>
          <label htmlFor="cameraSel">Camera</label>
          <select id="cameraSel" value={cameraId} onChange={e => setCameraId(e.target.value)} style={{ display: 'block', width: '100%', marginTop: 6 }}>
            {cams.map(c => (
              <option key={c.deviceId} value={c.deviceId}>{c.label || 'Camera'}</option>
            ))}
          </select>
          <video ref={videoRef} muted playsInline style={{ width: '100%', borderRadius: 8, marginTop: 8, background: '#000' }} />
          {noCam && <div style={{ color: '#a00', marginTop: 8 }}>No camera detected.</div>}
        </div>

        <div>
          <label htmlFor="micSel">Microphone</label>
          <select id="micSel" value={micId} onChange={e => setMicId(e.target.value)} style={{ display: 'block', width: '100%', marginTop: 6 }}>
            {mics.map(m => (
              <option key={m.deviceId} value={m.deviceId}>{m.label || 'Microphone'}</option>
            ))}
          </select>
          <div aria-label="mic level" style={{ height: 8, background: '#eee', borderRadius: 4, marginTop: 8 }}>
            <div style={{ height: 8, width: `${Math.round((micLevel || 0) * 100)}%`, background: '#00d7c2', borderRadius: 4, transition: 'width 100ms linear' }} />
          </div>

          <label htmlFor="spkSel" style={{ marginTop: 16, display: 'block' }}>Speaker</label>
          <select id="spkSel" value={speakerId} onChange={e => setSpeakerId(e.target.value)} style={{ display: 'block', width: '100%', marginTop: 6 }}>
            {speakers.map(s => (
              <option key={s.deviceId} value={s.deviceId}>{s.label || 'Speaker'}</option>
            ))}
          </select>
          <button type="button" onClick={testSpeaker} style={{ marginTop: 8 }}>Test sound</button>
          <audio ref={testAudioRef} src={speakerTestSrc} preload="auto" />

          {(speakers.length === 0) && <div style={{ color: '#666', marginTop: 8 }}>No separate speakers detected. Using default output.</div>}
        </div>
      </div>

      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <button onClick={() => onCancel?.()} type="button">Cancel</button>
        <button onClick={() => onContinue({ cameraId, micId, speakerId })} disabled={!canContinue} type="button">
          Continue to class
        </button>
      </div>
    </div>
  );
};

export default PreJoinPanel;

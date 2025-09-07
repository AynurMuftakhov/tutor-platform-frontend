export async function getMediaPermissions(kind: 'camera' | 'microphone'): Promise<boolean> {
  try {
    const constraints = kind === 'camera'
      ? { video: true, audio: false }
      : { video: false, audio: true };
    const stream = await navigator.mediaDevices.getUserMedia(constraints as MediaStreamConstraints);
    stream.getTracks().forEach(t => t.stop());
    return true;
  } catch {
    return false;
  }
}

export async function listDevices() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const cams = devices.filter(d => d.kind === 'videoinput');
  const mics = devices.filter(d => d.kind === 'audioinput');
  const speakers = devices.filter(d => d.kind === 'audiooutput');
  return { cams, mics, speakers };
}

export function isSetSinkIdSupported(el?: HTMLMediaElement) {
  const anyEl = el as any;
  return !!anyEl && typeof anyEl.setSinkId === 'function';
}

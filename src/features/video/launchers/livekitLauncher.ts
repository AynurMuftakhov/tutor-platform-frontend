import type { LiveKitJoinPayload } from '../../../types/video';

export async function launchLiveKit(dom: HTMLElement, p: LiveKitJoinPayload, userName: string) {
  // Prefer an existing global starter if present to avoid code churn
  const start = (window as any)['startLiveKit'];
  if (typeof start === 'function') {
    return start(dom, p.serverUrl, p.token, { userName });
  }
  // Fallback: open the existing VideoCallPage route if available
  console.warn('startLiveKit helper not found. Ensure legacy LiveKit flow is still accessible.');
}

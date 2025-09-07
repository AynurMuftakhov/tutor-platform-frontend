import api from '../api';
import { RtcJoinResponse, RtcProviderId } from '../../types/rtc/adapter';

// Backend join contract: POST /api/video/join?userId=... with body { lessonId, role }
// Map provider (LIVEKIT|DAILY) to internal ids and normalize join payloads to { url, token? }.
export async function fetchRtcJoin(params: { userId: string; lessonId: string; role: string }): Promise<RtcJoinResponse> {
  const { userId, lessonId, role } = params;
  const res = await api.post('video-service/api/video/join', { lessonId, role }, { params: { userId } });
  const data = res.data as any;

  const providerRaw = (data.provider ?? '').toString().toUpperCase();
  let provider: RtcProviderId;
  if (providerRaw === 'LIVEKIT') provider = 'livekit';
  else if (providerRaw === 'DAILY') provider = 'daily';
  else throw new Error(`Unsupported provider: ${data.provider}`);

  // Normalize join info per provider to our RtcJoinInfo shape
  let join: RtcJoinResponse['join'];
  if (provider === 'livekit') {
    const lk = data.livekit ?? {};
    join = { url: lk.serverUrl, token: lk.token };
  } else {
    const d = data.daily ?? {};
    join = { url: d.roomUrl, token: d.token };
  }

  return {
    provider,
    role: (data.role ?? role)?.toString().toLowerCase(),
    lessonId: data.lessonId ?? lessonId,
    join,
  };
}

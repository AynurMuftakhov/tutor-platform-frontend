import api from '../api';
import { RtcJoinResponse, RtcProviderId } from '../../types/rtc/adapter';

// Backend join contract: POST /api/video/join?userId=... with body { lessonId, role }
// Map provider (DAILY) to internal ids and normalize join payloads to { url, token? }.
export async function fetchRtcJoin(params: { userId: string; lessonId: string; role: string }): Promise<RtcJoinResponse> {
  const { userId, lessonId, role } = params;
  const res = await api.post('video-service/api/video/join', { lessonId, role }, { params: { userId } });
  const data = res.data as any;

  const providerRaw = (data.provider ?? '').toString().toUpperCase();
  if (providerRaw && providerRaw !== 'DAILY') {
    console.warn('Unsupported RTC provider from backend, defaulting to Daily', providerRaw);
  }

  const provider: RtcProviderId = 'daily';

  const d = data.daily ?? data.join ?? {};
  const join: RtcJoinResponse['join'] = {
    url: d.roomUrl ?? d.url,
    token: d.token,
  };
  if (!join.url) {
    throw new Error('Missing Daily room URL in /video/join response');
  }

  return {
    provider,
    role: (data.role ?? role)?.toString().toLowerCase(),
    lessonId: data.lessonId ?? lessonId,
    join,
  };
}

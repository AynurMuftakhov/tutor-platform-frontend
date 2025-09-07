export type Provider = 'AGORA' | 'LIVEKIT';
export type Role = 'teacher' | 'student';

export interface JoinRequest { lessonId: string; role: Role; userId?: string }

export interface AgoraJoinPayload {
  appId: string;
  rtmToken: string;
  roomUuid: string;
  userUuid: string;
  region: 'eu' | 'ap' | 'na' | 'cn';
  ttl: number;
}

export interface LiveKitJoinPayload {
  serverUrl: string;
  token: string;
}

export interface JoinResponse {
  provider: Provider;
  agora?: AgoraJoinPayload;
  livekit?: LiveKitJoinPayload;
}
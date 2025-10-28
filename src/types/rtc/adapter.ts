// Neutral RTC types used across the app after removing custom adapters

export type RtcProviderId = 'daily';

export interface RtcJoinInfo {
  url: string;
  token?: string;
}

export interface RtcJoinResponse {
  provider: RtcProviderId;
  role?: string;
  lessonId?: string;
  join: RtcJoinInfo;
}

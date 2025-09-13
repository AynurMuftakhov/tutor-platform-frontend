# RTC Adapter Surface

This document defines the minimal, stable surface the app uses to interact with RTC providers (LiveKit, Daily).

## Types
- RtcProviderId: 'livekit'| 'daily'
- RtcEvent:
  - 'connected' | 'disconnected'
  - 'participant-joined' | 'participant-updated' | 'participant-left'
  - 'track-started' | 'track-stopped'
  - 'error'
- RtcErrorCategory:
  - 'network' | 'permissionDenied' | 'tokenExpired' | 'deviceUnavailable' | 'unknown'

## Interface (TypeScript)
See src/types/rtc/adapter.ts

Methods:
- connect(join: { url: string; token?: string }): Promise<void>
- disconnect(): Promise<void>
- setMic(enabled: boolean): Promise<void>
- setCam(enabled: boolean): Promise<void>
- setScreenShare(enabled: boolean): Promise<void>
- setDevices({ micId?, camId?, speakerId? }): Promise<void>
- on(event: RtcEvent, handler: (payload?: any) => void): () => void

Optional:
- getNetworkState(): { quality: 'good' | 'moderate' | 'poor' | 'unknown'; lastUpdatedAt: number }
- supports(cap: 'screenshare' | 'deviceSwitch' | 'setSpeaker'): boolean

## Error Taxonomy
- network: connectivity issues, timeouts
- permissionDenied: user or browser denied mic/cam/screen permissions
- tokenExpired: ephemeral token invalid/expired; should trigger rejoin flow
- deviceUnavailable: selected device removed/busy
- unknown: any uncategorized error

## Notes
- Daily Prebuilt has different API shapes (e.g., separate start/stop screenshare). The adapter normalizes to boolean toggles.
- LiveKit and Agora custom UIs differ; we keep UI provider‑agnostic by binding controls to the adapter only.

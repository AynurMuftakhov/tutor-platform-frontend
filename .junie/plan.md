# Dual-Provider RTC Migration Plan (LiveKit + Daily)

## 1) Goals & Non-Goals
**Goals**
- Keep **LiveKit** fully functional in prod.
- Add **Daily** as a selectable alternative via runtime **feature flag** and per-room override.
- Introduce a thin **RTC abstraction** so most UI remains provider-agnostic.
- Default 1:1 “Zoom-like” layout; add a **Workzone** right panel (Whiteboard/Media/Grammar tabs).
- Mobile web support (Android Chrome, iOS Safari) remains first-class.
- Server issues **ephemeral join credentials** only; no secrets in client.
- Add structured **observability** across both providers.

**Non-Goals**
- Rewriting existing LiveKit UX.
- Deep custom Daily UI (we start with **Prebuilt callFrame**; can move to custom later).
- Native mobile apps (web only, for now).

## 2) Current (LiveKit) vs Target (Dual) Architecture
```
Current                                    Target
--------                                   -----------------------------------------
[Frontend React]                           [Frontend React]
  LiveKit SDK                                 RtcProvider interface
  Room UI + Controls     ---------------->     Adapters: LiveKitAdapter | DailyAdapter
  Workzone (planned)                           Workzone right panel (tabs, iframe whiteboard)
       |                                                 |
[Backend Spring Boot]                         [Backend Spring Boot]
  /rtc/join (LiveKit token)                    /rtc/join (unified)
       |                                          ├─ LiveKitJoinService
  LiveKit Server/Auth                            └─ DailyJoinService (rooms + tokens)
       |
[Observability]                              [Observability]
  CLIENT_DIAG logs                            CLIENT_DIAG + provider, device, vis-changes
```

## 3) Feature Flag Strategy
- **Env:** `RTC_PROVIDER=livekit|daily` (default `livekit`).
- **Per-room override:** DB field `room.rtcProvider` or request query `?rtc=daily`. Server resolves: `override ?? env`.
- **Kill switch:** `RTC_DAILY_ENABLED=true|false` to force fallback to LiveKit.
- **Frontend runtime:** expose `/api/rtc/join` response `{provider,...}`; adapter loaded accordingly.

## 4) SDK Mapping (LiveKit ↔ Daily Prebuilt)
**Surface we need:** join/leave; mute/unmute; cam on/off; screenshare; device switch; events; network stats.

| Capability | LiveKit (JS) | Daily Prebuilt (callFrame) | Notes / Abstraction |
|---|---|---|---|
| Create/join | `room.connect(url, token)` | `callFrame.join({ url, token })` | Both use URL+token (Daily token optional for open rooms). |
| Leave | `room.disconnect()` | `callFrame.leave()` | Normalize to `disconnect()`. |
| Mic on/off | `room.localParticipant.setMicrophoneEnabled(bool)` | `callFrame.setLocalAudio(bool)` | Same boolean semantic. |
| Cam on/off | `room.localParticipant.setCameraEnabled(bool)` | `callFrame.setLocalVideo(bool)` | Same. |
| Screenshare | `room.localParticipant.setScreenShareEnabled(bool)` | `callFrame.startScreenShare()` / `stopScreenShare()` | Daily splits start/stop; hide behind `setScreenShareEnabled(bool)`. |
| Device change | pattern: enumerate + `room.switchActiveDevice()` | `callFrame.setInputDevicesAsync({...})` | Wrap as `setDevices({micId?, camId?})`. |
| Events (room/participant) | `room.on(RoomEvent.XXX, ...)` | `callFrame.on('participant-joined'|'participant-updated'|...)` | Map to common event enum. |
| Theme/UI | N/A (custom UI) | `createFrame(..., { theme })` or `setTheme()` | Wire brand via config. |
| Tokens | LiveKit server JWT | Daily meeting tokens (server-created, short TTL) | Backend creates & TTLs. |

**Incompatibilities to hide**
- Daily Prebuilt owns UI chrome; we run it **fullscreen** container and add our custom **Workzone** outside the iframe.
- Screenshare API differs (toggle vs explicit); adapter normalizes.
- Some events have different names/payloads; adapter translates to shared shapes.

## 7) Mobile & Background Behavior
- **iOS Safari** quirks: user gesture required for autoplay mic/cam; background tab suspends capture; screenshare limited. Communicate explicit prompts and fallbacks.
- **Page Visibility**: on `visibilitychange`, downgrade to audio-only or show “Paused: backgrounded” banner (configurable).
- **Wake Lock hint** (where supported) to reduce screen sleep during active call.
- **Permissions UX**: detect device changes; show “Try another mic/cam” with device picker.
- **Rejoin flow**: on page restore, adapter attempts soft-reconnect.

## 8) Observability
- **Client diag (extend `CLIENT_DIAG`)**
  - `provider`, `roomId`, `lessonId`, `role`, `deviceInfo` (model/OS/browser), `visibilityState`, `joinLatencyMs`, `reconnectCount`.
  - **Network stats** snapshot every 15s: `rttMs`, `bitrateUp/Down`, `jitterMs`, `packetLossPctUp/Down`.
- **Server logs/metrics**
  - `rtc_join_total{provider,role}`, `rtc_join_failures{reason}`, `rtc_token_issue_latency_ms`, `rtc_rate_limit_hits`.
- **User-facing indicator**
  - Small badge: “Network: Good/Moderate/Poor” driven by thresholds on jitter/packet loss.

## 9) Testing Matrix (minimum)
**Browsers**: Chrome (Win/Android), Edge, Safari (macOS/iOS), Firefox (desktop).
**Devices**: Laptop (cam/mic switch), mid-range Android, iPhone (recent iOS).
**Roles**: Tutor ↔ Student; 1:1.
**Scenarios**: join/leave, mute/cam, screenshare, device switch, theme applied, Workzone toggle, whiteboard iframe loads, reconnect after network drop, background/lock, permission denial, token expiry.


## 11) Risks & Mitigations
- **SDK parity gaps** (Prebuilt UI constraints) → start simple; plan future **custom call object** if needed.
- **Mobile background limits** (iOS) → inform users; auto-mute video on background; reconnect on foreground.
- **TURN / poor networks** → verify provider TURN; expose network indicator; advise wired/Wi-Fi.
- **Permissions friction** → preflight checks; device picker; clear error states.
- **Token TTL drift** → short TTL (e.g., 3–5 min) + refresh path.

**Workzone (layout hint)**
- Main grid content = RTC container `#rtc-root` (fills area; Daily Prebuilt renders inside).
- Right drawer = 360–420px; toggle via tray button; whiteboard `<iframe src="/whiteboard?lessonId=...">`.

---
**Assumptions**
- We have a Daily domain (e.g., `your-subdomain.daily.co`).
- Tutor ↔ student roles already known to backend.
- TURN coverage acceptable in our target regions.

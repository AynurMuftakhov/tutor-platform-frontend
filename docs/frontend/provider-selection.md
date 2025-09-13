# Provider Selection & Safe Fallback (Task 3)

This document describes the runtime provider selection flow and failure handling with a user-friendly fallback.

## Flow Overview
1. On lesson route entry, `RtcProvider` calls `/video-service/api/video/join`.
2. Backend responds with `{ provider, lessonId, role, join: { url, token? } }`.
3. Frontend lazy-loads the adapter via `resolveAdapter(provider)` and stores it in context.
4. UI renders based on effective provider:
   - `daily` → `<RtcHost/>` which mounts the Daily Prebuilt iframe and calls `adapter.connect(join)`.
   - `livekit` → existing `<LiveKitRoom/>` path remains unchanged.
5. If the adapter fails to initialize (e.g., token expired, network error), we:
   - Set a single `failureMessage` in `RtcContext`.
   - Show `RtcErrorBanner` with Retry and optional “Switch to LiveKit” actions.
6. Retry invokes `refreshJoin()` to re-fetch fresh join credentials and re-resolve the adapter (no infinite loop).
7. Fallback toggles `effectiveProvider` to `livekit` for this session so the page renders the LiveKit path.

## Failure Cases
- Token expired / invalid: banner appears; Retry triggers a new `/join` call; success proceeds.
- Network error (script load / join): banner appears; Retry re-attempts; no automatic retry storm.
- Unsupported browser/device (future): banner can suggest switching provider or device.

## Notes
- We deliberately do not leak tokens or URLs to console logs or UI.
- `effectiveProvider` is persisted in context for the page session (not localStorage) so other UI can check capabilities.
- Adapter-level reconnect/backoff is left to provider SDKs; we avoid starting our own infinite loops.

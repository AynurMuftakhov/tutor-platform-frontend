# Daily Prebuilt Embed Notes (Task 2)

This document captures container rules, z-index map, responsive behavior, and control overlap decisions for the Daily Prebuilt integration.

## Host Container
- Component: `src/components/rtc/RtcHost.tsx`
- DOM id: `#rtc-root` (for readability; not relied upon by adapter)
- Behavior:
  - Fills available space of its parent; in `VideoCallPage` it is hosted in a full-viewport Box (`height: 100vh`).
  - Prevents scrollbars and ensures the iframe is full-bleed: `& iframe { width:100%; height:100%; border:0; display:block; }`.
  - Background uses theme color `background.default`.

## Z-index & Stacking
- The Daily iframe is created inside the container and inherits the stacking context; we avoid custom z-index on the iframe to reduce overlay conflicts.
- App chrome (top app bar, drawers) are not rendered on `VideoCallPage` (existing layout already hides them).
- Any floating UI (e.g., future Workzone toggle) should use z-index ≥ 1000 to sit above Prebuilt if needed.

## Responsive Behavior
- Verified target sizes: desktop down to 1024×640, tablets down to 820×600, mobile down to 360×640.
- The container simply stretches; Prebuilt handles tile layout responsively inside the iframe.
- Safe areas (iOS) are handled by the browser; avoid placing additional overlays along the edges unless padded.

## Tokens & URL Hygiene
- Join parameters `{ url, token }` provided by the backend are passed to `callFrame.join({ url, token })` and are NOT appended to the browser URL.
- Do not log tokens or include them in error toasts.

## Control Overlap Decisions
- Daily Prebuilt includes its own mic/cam/leave controls.
- For Task 2 we DO NOT render our tray controls when provider is `daily` (VideoCallPage branches to `RtcHost` only).
- The built-in leave button returns to the app by listening for `disconnected` event and routing back.
- Future tasks (Task 4) will unify controls across providers using the adapter surface.

## Known Styling Rules
- The host container uses borderless iframe, no shadow/radius to match app fullscreen area.
- Any additional rounded corners or shadows must be applied to the host container, not the iframe.

## Notes
- Daily JS is loaded dynamically from CDN for now to avoid package changes; can be switched to npm dependency later.
- If the page unmounts or the user clicks leave, we call `callFrame.leave()` and destroy the frame to prevent leaks.

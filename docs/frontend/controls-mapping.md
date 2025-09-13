# Controls Mapping (Task 4)

This document maps the app tray controls to the unified RTC adapter and notes capability/visibility rules per provider.

## Controls → Adapter Methods
- Mic: `adapter.setMic(boolean)`
- Camera: `adapter.setCam(boolean)`
- Screen share: `adapter.setScreenShare(boolean)`
- Leave: `adapter.disconnect()` followed by route navigation
- Device change (future Task 9): `adapter.setDevices({ micId?, camId?, speakerId? })`

## Visibility/Disable Rules
- Daily Prebuilt provides its own chrome. We avoid duplicating mic/cam/share in our tray when provider is `daily`.
  - Our ControlsTray shows only the Leave button on Daily (guaranteed exit control).
  - For LiveKit, we keep existing LiveKit UI; in a later step, we may hide LiveKit chrome and use ControlsTray everywhere.
- Screen share button is disabled when `adapter.supports('screenshare') !== true` (e.g., iOS Safari limitations).
- Tooltips communicate disabled reasons: e.g., "Screen sharing not supported on this device".

## Cleanup
- On Leave: call `adapter.disconnect()` then unmounts the host container. ControlsTray cleans up event listeners on unmount.
- RtcHost also disconnects the adapter on unmount. This prevents orphaned listeners and iframes.

## Notes
- Further state reflection (mic/cam/sharing) can be improved by listening to adapter events once providers expose them uniformly.
- This keeps UI provider-agnostic and prepares for future addition of device picker and reconnect flows.

# Bootstrapping Flow (Runtime Provider Selection)

Sequence on lesson route entry:
1. RtcProvider (context) initializes and calls `/video-service/api/video/join`.
2. Backend responds with `{ provider, lessonId, role, join: { url, token? } }`.
3. Frontend calls `resolveAdapter(provider)` which lazy-loads the implementation module.
4. Adapter instance is stored in RtcContext; `adapterReady=true`.
5. UI can call `adapter.connect(join)` when appropriate and bind controls to adapter methods.

Notes:
- For Task 1 we only prepare the surface and lazy-loading resolver; UI continues to use existing LiveKitRoom until Task 4.
- This keeps bundles lean and enables switching provider via backend flag without redeploy.

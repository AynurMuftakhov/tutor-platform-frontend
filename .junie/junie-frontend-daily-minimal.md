# Frontend Tasks: Minimal Daily Integration (React + Vite)
**Audience:** Junie (IntelliJ agent)  
**Goal:** Add **Daily Prebuilt** as an alternative RTC provider without breaking existing LiveKit/Agora flows. Keep UI mostly provider‑agnostic. Do not write backend code; rely on `/api/video/join` to decide provider at runtime. No code in this doc—only execution instructions.

---

## Task 1 — Adapter Surface & Bootstrapping
**Why:** Decouple UI from provider specifics and enable runtime loading.
**Actions**
- Define a single adapter surface (methods: connect/disconnect, mic/cam, screenshare, device set, event subscription) in the app layer; keep the interface minimal and stable.
- Plan for **dynamic import** of provider adapters to keep bundle lean; adapter chosen after `/api/video/join` response.
- Ensure state management (existing context/store) can hold: `provider`, `join.url`, `join.token`, `role`, `lessonId`, `networkState`.
**Acceptance Criteria**
- App compiles with a single import point that resolves adapter at runtime.
- Switching provider via backend flag requires no frontend code changes.
**Artifacts**
- `docs/frontend/adapter-surface.md` (method list, event names, error taxonomy).

---

## Task 2 — Daily Prebuilt Embed (Fullscreen Container)
**Why:** Fastest path to Daily with minimal custom UI.
**Actions**
- Create a dedicated DOM container (e.g., `#rtc-root`) that fills the main area and hosts the Daily iframe; ensure z‑index and stacking work with app chrome.
- Define style rules: full width/height, no scrollbars, safe focus ring handling, consistent border radius (if any) with app design.
- Use the provider join URL/token from `/api/video/join`; do not store secrets in URL history.
- Verify the Daily UI chrome does not conflict with your app’s tray; hide duplicate controls if necessary (design decision documented).
**Acceptance Criteria**
- Teacher and student can join a 1:1 session on Daily; video tiles render, audio works, leave returns control to the app.
- No CSS bleeding between the iframe and host app; responsive behavior verified down to 360px width.
**Artifacts**
- `docs/frontend/daily-embed-notes.md` (container rules, z‑index map, responsive notes).

---

## Task 3 — Runtime Provider Selection & Safe Fallback
**Why:** Choose provider per lesson; recover gracefully on errors.
**Actions**
- On entering the lesson route, call `/api/video/join`; branch on `provider` to lazy‑load the matching adapter.
- If Daily branch fails to initialize (token expired, network error), show a user‑friendly message and **offer fallback to LiveKit** when backend allows; collect diag and stop retry storms.
- Persist effective provider choice in session state so the rest of the UI (tray, Workzone) knows which capabilities exist.
**Acceptance Criteria**
- Switching the backend flag flips provider without redeploy; failures surface with a single banner and a retry/fallback path.
- No infinite retries; exponential backoff for reconnect path is respected by adapter.
**Artifacts**
- `docs/frontend/provider-selection.md` (flow diagram & failure cases).

---

## Task 4 — Unified Controls Binding (Mic/Cam/Screenshare/Leave)
**Why:** Keep user controls stable regardless of provider.
**Actions**
- Map UI controls to adapter methods; decide which controls are hidden when Daily’s own chrome provides the same action to avoid duplication.
- Define disabled/hidden states for unavailable features (e.g., screenshare on iOS); include tooltip messaging.
- Ensure leave/cleanup clears timers, listeners, and UI state for all providers.
**Acceptance Criteria**
- Controls behave the same across LiveKit and Daily; disabled states match capability detection.
- No orphaned listeners after leave; memory usage remains stable after 5 join/leave cycles.
**Artifacts**
- `docs/frontend/controls-mapping.md` (matrix of controls vs provider).

---

## Task 5 — Workzone Right Drawer & Tabs (Whiteboard/Media/Grammar)
**Why:** Add side content without interfering with the call.
**Actions**
- Implement a right‑side drawer (360–420px) with tabs: **Whiteboard**, **Media**, **Grammar**; ensure it overlays or resizes the RTC container cleanly.
- Persist drawer open/closed state and last active tab per lesson.
- Ensure no layout shifts or scroll jank when toggling; test on small screens (<= 390px width) with an off‑canvas behavior.
**Acceptance Criteria**
- Workzone opens and closes with a tray button; video remains fluid (>25fps perceived, no reflow lag).
- Tab switching is instant; state persists across route reloads within a lesson.
**Artifacts**
- `docs/frontend/workzone-spec.md` (layout, breakpoints, persistence keys).

---

## Task 6 — Whiteboard MVP via Iframe Route
**Why:** Ship a usable whiteboard quickly with a clean upgrade path.
**Actions**
- Add a `/whiteboard` micro‑page route that can run in an iframe; minimum: simple drawing surface with toolbar placeholders (implementation can be basic now).
- Establish a `postMessage` channel name and origin checks for future host↔whiteboard sync (define message types and shape).
- Verify CSP and `frame-ancestors` settings allow the host to embed this route; document same‑origin policies.
**Acceptance Criteria**
- Whiteboard loads reliably inside Workzone; no mixed content or CSP violations.
- Message channel reserved with a no‑op handler and origin filtering in place.
**Artifacts**
- `docs/frontend/whiteboard-mvp.md` (route params, message contract, CSP notes).

---

## Task 7 — Permissions & Mobile Behavior (iOS/Android Web)
**Why:** Reduce join friction and undefined states.
**Actions**
- Implement a soft preflight: detect device availability and browser support; show friendly prompts before invoking getUserMedia (where applicable for provider).
- Handle iOS Safari constraints: require a user gesture to start audio/video; communicate background limitations and pause/resume expectations.
- Consider Wake Lock (where supported) to reduce screen sleep during active calls; provide a toggle for users.
**Acceptance Criteria**
- First‑time join flows show clear permission prompts; no “silent failure” states.
- On background/foreground, app shows a banner status and recovers media cleanly when returning.
**Artifacts**
- `docs/frontend/mobile-permissions.md` (flows, copy text, known quirks).

---

## Task 8 — Error States & Reconnect UX
**Why:** Keep the user informed and in control.
**Actions**
- Define a small set of error categories (network, permission denied, token expired, device in use). Map provider errors to these categories.
- Show a single consolidated error banner with retry action; suppress duplicate toasts.
- Implement a rejoin flow that tears down stale state and re‑requests `/api/video/join` if token‑related; otherwise adapter‑level reconnect only.
**Acceptance Criteria**
- Simulated network drop recovers within expected time; expired token prompts rejoin with fresh token.
- No duplicate banners or flicker; logs contain one diagnostic entry per failure episode.
**Artifacts**
- `docs/frontend/error-ux.md` (error taxonomy, decision tree).

---

## Task 9 — Device Management UX
**Why:** Let users switch mic/cam reliably.
**Actions**
- Build a simple device picker that lists microphones/cameras/speakers; reflect current selections; show “device not found” fallback when hot‑unplug occurs.
- Persist last good device per browser profile; on join, attempt to use it if available, otherwise fall back gracefully.
- Provide quick toggle to cycle through cameras on mobile where detailed IDs may be hidden.
**Acceptance Criteria**
- Switching devices works mid‑call on both providers; hot‑unplug shows a clear notice and auto‑fallback.
- Preferences persist across sessions in the same browser.
**Artifacts**
- `docs/frontend/device-management.md` (storage keys, UI copy, edge cases).

---

## Task 10 — Client Diagnostics & Network Indicator
**Why:** Enable support to triage issues quickly.
**Actions**
- Extend existing client diag to include: `provider`, `joinLatencyMs`, `reconnectCount`, `deviceInfo`, and periodic network stats (bitrate, jitter, packet loss) if the provider exposes them.
- Add a small “Network: Good/Moderate/Poor” indicator with threshold logic; reflect changes no more than every 10–15s.
- Ensure payload size stays under a safe cap; sample periodic stats to reduce noise.
**Acceptance Criteria**
- Diagnostics visible on the server with the new fields; indicator updates at the set cadence without UI jank.
- Stats sampling verified on low‑CPU devices.
**Artifacts**
- `docs/frontend/diagnostics.md` (field list, thresholds, sampling policy).

---

## Task 11 — Theming & CSS Tokens
**Why:** Keep brand consistency across providers and app chrome.
**Actions**
- Define CSS variables (colors, spacing, radii, shadows) used by tray/Workzone and pass matching tokens to Daily’s theme options so the iframe UI aligns visually.
- Verify dark/light modes and high‑contrast settings; ensure readable contrast ratios.
- Document any known clashes (fonts, button sizes) and design compromises for Prebuilt.
**Acceptance Criteria**
- Visual parity between LiveKit and Daily sessions for brand colors and text legibility.
- No unreadable states in dark mode; AA contrast achieved for key text.
**Artifacts**
- `docs/frontend/theming.md` (token table, screenshots).

---

## Task 12 — E2E & Manual QA Checklist
**Why:** Guard against regressions across browsers/devices.
**Actions**
- Write Playwright/Cypress flows: join, mute/cam, screenshare, device switch, error/reconnect path, Workzone toggle, whiteboard load, background/foreground.
- Cover browsers: Chrome, Safari (macOS+iOS), Edge, Firefox (desktop). Test mobile web on at least one Android + one iPhone model.
- Produce a manual QA script with steps and expected results; record short videos for two “golden paths” per provider.
**Acceptance Criteria**
- E2E suite green on CI against staging; manual checklist completed with links to recordings.
- Failures produce actionable traces (screenshots, logs).
**Artifacts**
- `docs/frontend/qa-checklist.md`, `docs/frontend/e2e-scenarios.md`.

---

### Execution Notes for Junie
- Keep tasks at PR‑granularity; 1–2 tasks per PR is okay when they share files.
- Reference the artifact paths in each PR; attach before/after screenshots or short recordings.
- Avoid leaking provider tokens or join URLs into commit messages or CI logs.

# Frontend Tasks: Minimal Daily Integration (React + Vite)
**Audience:** Junie (IntelliJ agent)  
**Goal:** Add **Daily Prebuilt** as an alternative RTC provider while keeping existing LiveKit/Agora flows intact. The UI should be mostly provider‑agnostic. Use the backend `/api/video/join` to decide provider at runtime. **No code inside this doc — only execution instructions.**

---

## Global Conventions (read once, apply to all tasks)
- **Do not** commit provider tokens, room URLs, or PII to source, logs, or PR descriptions.
- Treat `/api/video/join` as the **single source of truth** for provider selection and join parameters.
- Use a **single adapter surface** for UI controls (connect/disconnect, mic, cam, screenshare, device select, events).
- All UI strings must be **localizable** (use existing i18n mechanism if present; otherwise create placeholders).
- **Responsive targets:** desktop down to 1024×640, tablets down to 820×600, mobile down to 360×640. Respect safe areas on iOS.
- **Accessibility:** interactive elements reachable via keyboard; focus states visible; ARIA labels present where applicable.
- **Artifacts** listed per task must be created/updated and linked in the PR description.
- **Out of scope:** backend modifications, new design systems, or deep Daily custom UI (Prebuilt only).

---

## Task 1 — Adapter Surface & Bootstrapping
**Objective:** Decouple UI from provider details and enable runtime selection/loading.
**Inputs:** `/api/video/join` response (provider + provider‑specific join data), current LiveKit integration.
**Actions:**
- Define a single **adapter surface** at the app layer with methods: connect, disconnect, setMic, setCam, setScreenShare, setDevices, on(event, handler). Keep names stable.
- Add a **resolver** that, after calling `/api/video/join`, selects and lazy‑loads the matching adapter implementation (LiveKit or Daily).
- Ensure app state (existing context/store) contains: `provider`, `lessonId`, `role`, `join.url`, `join.token`, `networkState` (placeholder), and an `adapterReady` flag.
- Document supported **events** and a minimal **error taxonomy** (network, permissions, tokenExpired, deviceUnavailable, unknown).
**Acceptance Criteria:**
- Build passes with a single import point for adapters; runtime selection based on join response works.
- Changing provider on the backend flips behavior without a frontend rebuild.
**Artifacts:** `docs/frontend/adapter-surface.md` (method list, events, error taxonomy), `docs/frontend/bootstrapping-flow.md` (sequence diagram).

---

## Task 2 — Daily Prebuilt Embed (Fullscreen Container)
**Objective:** Integrate Daily Prebuilt quickly with a dedicated container that fills the main area.
**Inputs:** Daily join `url` and `token` from `/api/video/join`.
**Actions:**
- Create an RTC **host container** that occupies the main content area and hosts the Daily iframe. Ensure no scrollbars, proper stacking with app chrome, and predictable focus behavior.
- Define CSS/layout rules for the container: full width/height, pointer events limited to iframe, and consistent radii/shadows aligned to the app theme.
- Ensure join parameters are not persisted in browser history or logs; do not expose tokens in URLs or error toasts.
- Decide and document which overlapping controls (if any) are hidden to avoid duplicating the Daily chrome (e.g., leave/mute in our tray vs Prebuilt).
**Acceptance Criteria:**
- Teacher and student can join a 1:1 session on Daily; video/audio function; leaving returns control to the app.
- No CSS bleed between iframe and host; responsive behavior verified down to 360px width.
**Artifacts:** `docs/frontend/daily-embed-notes.md` (container rules, z‑index map, responsive notes, control overlap decisions).

---

## Task 3 — Runtime Provider Selection & Safe Fallback
**Objective:** Branch by provider at runtime; provide user‑friendly fallback on failures.
**Inputs:** `/api/video/join` response, adapter resolver from Task 1.
**Actions:**
- On entering the lesson route, call `/api/video/join`. Based on `provider`, lazy‑load the corresponding adapter and attempt connect.
- If Daily initialization fails (e.g., expired token, network), show a single actionable banner. Offer **fallback to LiveKit** if backend allows; otherwise provide a retry with exponential backoff.
- Persist the **effective provider** for the session so other UI pieces (tray, Workzone) can react appropriately.
**Acceptance Criteria:**
- Backend flag flips provider without redeploy; failures show a single banner with retry/backoff and optional fallback.
- No infinite retry loops; user can recover without a page refresh.
**Artifacts:** `docs/frontend/provider-selection.md` (flow diagram, failure matrix).

---

## Task 4 — Unified Controls Binding (Mic/Cam/Screenshare/Leave)
**Objective:** Keep controls consistent regardless of provider.
**Inputs:** Adapter surface; existing tray controls.
**Actions:**
- Bind UI controls to the adapter methods; introduce a capability check so controls are disabled/hidden when unsupported (e.g., iOS screenshare).
- Provide consistent tooltip copy for disabled states (e.g., permissions needed, not supported on this device).
- Ensure leave/cleanup clears listeners, timers, and adapter references to avoid memory leaks.
**Acceptance Criteria:**
- Controls behave consistently across LiveKit and Daily; capability‑based disabling verified.
- Join/leave exercised 5× in a row without memory growth or stale listeners.
**Artifacts:** `docs/frontend/controls-mapping.md` (control→method matrix, capability rules).

---

## Task 5 — Workzone Right Drawer & Tabs (Whiteboard/Media/Grammar)
**Objective:** Host side content without disrupting the RTC view.
**Inputs:** Existing app layout and tray.
**Actions:**
- Implement a right‑side drawer (width 360–420px) with tabs: **Whiteboard**, **Media**, **Grammar**. Ensure it overlays/resizes the RTC container smoothly.
- Persist drawer open/closed and last active tab **per lesson** using existing storage utilities.
- Validate ergonomics on small screens: use off‑canvas behavior ≤390px and avoid layout shifts when toggling.
**Acceptance Criteria:**
- Drawer toggles via tray button; video remains fluid (no noticeable reflow lag).
- Tab switching is instant; persisted state restored on route reload.
**Artifacts:** `docs/frontend/workzone-spec.md` (layout, breakpoints, persistence keys, interaction rules).

---

## Task 6 — Whiteboard MVP via Iframe Route
**Objective:** Ship a minimal whiteboard quickly; keep a path to deeper integration.
**Inputs:** App router; Workzone drawer from Task 5.
**Actions:**
- Add a `/whiteboard` micro‑page that runs in an iframe. It may be a basic drawing surface now; the key is isolation and reliability.
- Define a `postMessage` channel name and the **allowed origins**. List message types for future sync (reserve names; handlers can be no‑ops now).
- Confirm CSP and `frame‑ancestors` allow embedding. Document any required adjustments.
**Acceptance Criteria:**
- Whiteboard loads reliably in Workzone; no mixed‑content or CSP violations.
- Message channel reserved with origin filtering documented and a no‑op handler wired.
**Artifacts:** `docs/frontend/whiteboard-mvp.md` (route params, messaging contract, CSP notes).

---

## Task 7 — Permissions & Mobile Behavior (iOS/Android Web)
**Objective:** Reduce first‑join friction and undefined states on mobile.
**Inputs:** Adapter capability checks; browser detection utilities (if any).
**Actions:**
- Implement a **soft preflight**: surface device availability and browser support; present friendly prompts before attempting media capture.
- Handle iOS Safari constraints: require a user gesture to begin audio/video; clearly communicate background/lock behaviors and expected pause/resume.
- Consider **wake‑lock** where supported (behind a user setting) to reduce unintended sleeps during active lessons.
**Acceptance Criteria:**
- First‑time joins show clear permission prompts; no silent failure states.
- On background/foreground, app shows status and recovers media on return.
**Artifacts:** `docs/frontend/mobile-permissions.md` (flows, copy text, known quirks).

---

## Task 8 — Error States & Reconnect UX
**Objective:** Keep users informed and able to recover.
**Inputs:** Error taxonomy from Task 1; adapter reconnect capabilities.
**Actions:**
- Map provider‑specific errors to a **small set** of categories (network, permissionDenied, tokenExpired, deviceBusy, unknown).
- Show a single consolidated **error banner** with a retry action; dedupe repeated errors within a short window.
- Implement a **rejoin** flow for token errors that requests a fresh `/api/video/join` before reconnecting; use adapter‑level reconnect for transient network issues.
**Acceptance Criteria:**
- Simulated network drop recovers within the expected time; expired tokens trigger a rejoin that succeeds.
- No duplicate banners; each failure episode logs one diagnostic entry.
**Artifacts:** `docs/frontend/error-ux.md` (taxonomy, decision tree, banner copy).

---

## Task 9 — Device Management UX
**Objective:** Reliable device selection and graceful fallback on hot‑unplug.
**Inputs:** Adapter device APIs (or provider capabilities).
**Actions:**
- Build a simple device picker listing microphones, cameras, and speakers (if supported). Display the current selection and provide a reset/default option.
- Persist last known good devices per browser profile; on join, attempt to use them, otherwise fall back and notify.
- Provide a **quick camera toggle** on mobile where device IDs may be generic.
**Acceptance Criteria:**
- Mid‑call device switching works across providers; hot‑unplug shows a notice and auto‑fallback.
- Preferences persist across sessions in the same browser profile.
**Artifacts:** `docs/frontend/device-management.md` (storage keys, UI copy, edge cases).

---

## Task 10 — Client Diagnostics & Network Indicator
**Objective:** Enable fast support triage without flooding logs.
**Inputs:** Existing CLIENT_DIAG plumbing; adapter stats where available.
**Actions:**
- Extend client diagnostics with: `provider`, `joinLatencyMs`, `reconnectCount`, `deviceInfo`, and periodic lightweight network stats (bitrate, jitter, packet loss) if exposed.
- Add a **Network: Good/Moderate/Poor** badge with threshold logic; update no more than every 10–15s to avoid churn.
- Sample periodic stats (e.g., 1/2 or 1/3) to keep payload sizes safe on low‑end devices.
**Acceptance Criteria:**
- Server receives diagnostics with the new fields; badge updates at the chosen cadence without UI jank.
- Sampling policy verified on a low‑CPU device profile.
**Artifacts:** `docs/frontend/diagnostics.md` (field list, thresholds, sampling policy).

---

## Task 11 — Theming & CSS Tokens
**Objective:** Maintain brand consistency across providers and app chrome.
**Inputs:** Existing theme tokens (colors, radii, spacing, shadows).
**Actions:**
- Define or reuse **CSS variables** for RTC‑adjacent UI (tray, Workzone). Pass matching tokens to Daily’s theme options so the iframe UI aligns visually.
- Validate **dark/light** and high‑contrast modes; ensure minimum AA contrast for primary text and controls.
- Document any unavoidable mismatches with Prebuilt and the proposed compromises.
**Acceptance Criteria:**
- Visual parity for brand colors and text legibility across providers.
- No unreadable states in dark mode; AA contrast achieved.
**Artifacts:** `docs/frontend/theming.md` (token table, screenshots).

---

## Task 12 — E2E & Manual QA Checklist
**Objective:** Prevent regressions across browsers/devices.
**Inputs:** Staging environment; at least one Android and one iPhone device for mobile web.
**Actions:**
- Author Playwright/Cypress flows covering: join, mute/cam, screenshare, device switch, error/reconnect, Workzone toggle, whiteboard load, background/foreground.
- Cover browsers: Chrome, Safari (macOS+iOS), Edge, Firefox (desktop). Record short videos for two “golden paths” per provider.
- Produce a **manual QA script** with explicit steps and expected results, including screen size, role (teacher/student), and provider.
**Acceptance Criteria:**
- E2E suite passes on CI against staging; manual checklist completed with links to recordings.
- Failures attach screenshots/logs that a developer can action without reproducing locally.
**Artifacts:** `docs/frontend/qa-checklist.md`, `docs/frontend/e2e-scenarios.md`.

---

### Execution Notes for Junie
- Keep tasks at **PR‑granularity** (1–2 tasks per PR if they touch the same files).
- Reference all **Artifacts** in the PR description. Include screenshots and short recordings where visual behavior changes.
- Validate that no join tokens or room URLs appear in commit messages, screenshots, or CI logs.
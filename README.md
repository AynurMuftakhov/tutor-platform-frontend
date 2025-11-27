# Speakshire Frontend

Speakshire.com is the home for English tutors. This repo contains the Vite + React frontend that powers both the public marketing site and the authenticated teaching workspace (students, tutors, and admins).

## Overview

- **Marketing & onboarding** – Hero/landing content, FAQ, SEO tags, and onboarding token flow live in `src/pages/landing` and `src/pages/Onboarding*.tsx`.
- **Learning workspace** – `src/App.tsx` wires protected routes for dashboards, lesson planning, vocabulary, homework, and analytics.
- **Real‑time experience** – Daily.co video rooms, notification websockets, and lightweight activity tracking keep sessions synchronized.
- **Typed data layer** – Query hooks talk to modular API clients in `src/services/` that wrap the platform’s microservices (`users-service`, `lessons-service`, `video-service`, etc.).
- **Design system** – Shared theming lives under `src/styles`/`src/theme`, with feature folders (`components`, `features`, `hooks`, `utils`, …) keeping UI, state, and side effects scoped.

## Tech Stack

- React 18 + TypeScript on top of Vite 5 for lightning-fast dev feedback.
- React Router 7 for routing and nested layouts (`src/layout/AppWrapper.tsx`, `src/components/PrivateRoute.tsx`, `src/components/RoleGuard.tsx`).
- Material UI v7, BlockNote/Tiptap editors, `@dnd-kit` drag-and-drop, and FullCalendar for productivity workflows.
- TanStack Query 5 + Axios/Ky for declarative data fetching, caching, and error propagation via `ApiErrorProvider`.
- Keycloak JS for SSO plus role-aware guards, with session-backed tokens provided through `src/context/AuthContext.tsx`.
- Daily.co SDK for video lessons managed through `RtcContext`.
- Vitest + Testing Library are configured for smoke safety nets (tests are optional per current guidelines).

## Project Structure

```
├── docs/                     # Supplemental diagrams and design notes
├── public/                   # Static assets served as-is
├── src/
│   ├── components/           # Reusable UI, guards, rich editors
│   ├── context/              # Auth, RTC, notifications, workspace state
│   ├── features/             # Domain-specific slices (activity summary, etc.)
│   ├── pages/                # Route targets (landing, homework, lessons, admin…)
│   ├── services/             # API clients, Keycloak bootstrap, analytics & tracking
│   ├── styles/ & theme/      # Shared tokens and CSS modules
│   ├── utils/, hooks/, types/# Helper logic, hooks, and type declarations
│   └── index.tsx             # App bootstrap (AuthProvider, React Query, theming)
├── Dockerfile                # Production image served by nginx
├── nginx.conf                # Static hosting strategy for dist/
└── vite.config.ts            # Vite + React plugin config
```

## Getting Started

### Prerequisites

- Node.js ≥ 18.17 and npm ≥ 10 (align with Vite + ESLint requirements).
- Access to the Speakshire API gateway, WebSocket endpoint, and Keycloak realm.

### Installation

1. Clone the [tutor-platform-service](../tutor-platform-service) monorepo and `cd tutor-platform-frontend`.
2. Copy environment defaults: `cp .env.example .env` (create the file if it does not exist and fill the variables listed below).
3. Install dependencies: `npm install`.
4. Start the dev server: `npm run start` and open `http://localhost:5173`.

### Environment Variables

All runtime variables must be prefixed with `VITE_` for Vite to expose them to the client. Place them in `.env` (never commit credentials).

| Variable | Required | Description / Default |
| --- | --- | --- |
| `VITE_API_URL` | ✅ | Base REST URL for `users-service`, `lessons-service`, `video-service`, etc. Example: `https://api.speakshire.com`. |
| `VITE_WS_URL` | ✅ | WebSocket origin for notifications (`ws(s)://…/ws/notifications`). |
| `VITE_KEYCLOAK_URL` | ✅ | Base Keycloak auth URL. |
| `VITE_KEYCLOAK_REALM` | ✅ | Realm that issues Speakshire tokens. |
| `VITE_KEYCLOAK_CLIENT_ID` | ✅ | Public SPA client id configured in Keycloak. |
| `VITE_HOMEWORKS_BASE` | ⛔ | Optional override for homework API base; defaults to `/homework-service/api/homeworks`. |
| `VITE_LESSON_CONTENTS_ENABLED` | ⛔ | Feature flag for the lesson content library (`true` by default). |
| `VITE_ACTIVITY_TRACKING_ENABLED` | ⛔ | Enables client-side activity pings for students (`true` by default). |
| `VITE_ACTIVITY_TRACKING_DEBUG` | ⛔ | Verbose logging for tracking emitter in dev. |
| `VITE_FEATURES_ACTIVITY_SUMMARY` | ⛔ | Toggles the tutor activity summary feature (`true`). |
| `VITE_ACTIVITY_SUMMARY_POLL_MS` | ⛔ | Poll interval (ms) for summary data (default `15000`). |
| `VITE_ACTIVITY_CHIP_MUTED_MAX` | ⛔ | Minutes threshold for “muted” chip state (default `5`). |
| `VITE_ACTIVITY_CHIP_PRIMARY_MAX` | ⛔ | Minutes threshold for “primary” chip (default `20`). |
| `VITE_ACTIVITY_KPI_REFRESH_MS` | ⛔ | KPI refresh cadence in ms (default `15000`). |
| `VITE_ANALYTICS_ENDPOINT` | ⛔ | Optional outbound analytics collector URL. |
| `VITE_REVEAL_TRANSCRIPT_AFTER_COMPLETION` | ⛔ | Controls transcript reveal behavior in homework player. |

Restart `npm run start` whenever `.env` changes so Vite can inject new variables.

### NPM Scripts

| Command | Description |
| --- | --- |
| `npm run start` | Launches the Vite dev server on `http://localhost:5173` with `--host 0.0.0.0` for container/remote use. |
| `npm run build` | Runs `tsc` type-checking and then produces a production bundle in `dist/`. Execute before tagging a release. |
| `npm run preview` | Serves the most recent build locally to mimic production nginx behavior. |
| `npm run test` | Executes Vitest. Tests are minimal today, but the harness is ready for targeted coverage when needed. |

## Development Workflow

- **Coding style** – Follow the repo’s ESLint config (`eslint:recommended`, `@typescript-eslint`, `react`). Use 4-space indentation and single quotes. Verify with `npx eslint src --ext .ts,.tsx` before opening a PR.
- **Feature folders** – When adding new UI, prefer colocated folders under `src/pages` or `src/features` so routing, async hooks, and components stay isolated.
- **API access** – Extend the Axios instance in `src/services/api.ts` or the Ky vocabulary client instead of creating new fetch layers.
- **Context providers** – Wrap new global state in `src/context/` and register it in `src/index.tsx` alongside `AuthProvider`, `ApiErrorProvider`, `RtcProvider`, etc.
- **Assets & styling** – Keep shared tokens in `src/theme`/`src/styles`. Any static files should live in `public/` so Vite serves them verbatim.
- **Testing** – Snapshot/unit tests are optional per current guidelines, but Vitest is available for regression-prone areas (e.g., scheduling utilities or hooks).

## Architecture Notes

- **Routing** – `src/App.tsx` defines public landing routes plus private ones guarded by `PrivateRoute` and `RoleGuard`. `AppWrapper` supplies the main layout chrome, navigation, and notification toasts.
- **Authentication & roles** – `AuthContext` initializes Keycloak, stores session tokens in `sessionStorage`, and exposes `useAuth` helpers. Roles (`STUDENT`, `TEACHER`, `ADMIN`) flow through React Router to gate pages, homework views, and analytics.
- **Data fetching** – TanStack Query provides caching and optimistic updates for lesson schedules, student rosters, assignments, etc. Errors bubble via `ApiErrorProvider` for consistent banners/snackbars.
- **Real-time & RTC** – `NotificationsSocketContext` opens a WebSocket to `VITE_WS_URL` for toast and badge updates. `RtcContext` requests Daily room credentials (`video-service/api/video/join`) and shares `DailyCall` handles with `VideoCallPage`.
- **Content & homework** – Lesson content builder/editor pages live under `src/pages/lessonContents/` with feature flag support. Homework authoring/review lives under `src/pages/homework/` with shared UI in `src/components/homework/`.
- **Tracking & analytics** – `src/services/tracking/activityEmitter.ts` posts lightweight activity events back to `/users-service/api/tracking/events`. Optional analytics calls go through `src/services/analytics.ts`.
- **Docs** – Additional specs, design decisions, and diagrams live in `docs/` (see `docs/design-system.md` and `docs/frontend/`).

## Deployment

1. Ensure `npm run build` passes and produces `dist/`.
2. Run `npm run preview` for a production-like smoke test.
3. The provided `Dockerfile` builds the app and serves `dist/` via nginx using `nginx.conf`. Build with `docker build -t speakshire-frontend .` and run `docker run -p 8080:80 speakshire-frontend`.
4. Upload the `dist/` directory to the desired CDN or static host if Docker is not used.

## Troubleshooting

- **Blank page / endless loading** – Verify `.env` values, especially Keycloak URLs, and confirm the browser console is not blocking third-party cookies.
- **Notifications not arriving** – Ensure `VITE_WS_URL` points to a reachable `wss://` endpoint and that the user has permissions to subscribe.
- **Video join issues** – Inspect `RtcContext` logs (enable dev tools). Missing `lessonId` or `role` query parameters will abort Daily room creation.
- **Activity tracker noise** – Toggle `VITE_ACTIVITY_TRACKING_DEBUG=false` or disable the emitter entirely if backend support is unavailable.

## Additional Resources

- Product/design guidance in `docs/`.
- Backend APIs and contracts live in the sibling tutor-platform-service services.
- Reach out to the Speakshire platform team for credentials and release coordination.

Happy teaching!

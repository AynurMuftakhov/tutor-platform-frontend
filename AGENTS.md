# Repository Guidelines

- React + Vite source lives in `src/`; feature folders (`pages`, `components`, `features`, `hooks`, `services`, `context`, `utils`) keep routing, UI, and data logic isolated.
- Shared theming and styles reside in `src/styles` and `src/theme`; drop static assets in `public/` so Vite can serve them verbatim.
- API clients and auth providers live under `src/services` and `src/context`; extend existing clients instead of duplicating HTTP or Keycloak setup.
- Docs belong in `docs/`; production bundles land in `dist/`; leave `build/` and `out/` artifacts untouched unless explicitly requested.

## Build, Test, and Development Commands
- `npm install` restores dependencies after cloning or rebasing.
- `npm run start` launches the dev server at `http://localhost:5173`, binding to `0.0.0.0` for container use.
- `npm run build` runs `tsc` then bundles with Vite into `dist/`; run it before PRs that touch build config.
- `npm run preview` serves the last bundle for a production smoke test.
- `npm run test` executes Vitest; add `-- --watch` for focused local loops.

## Coding Style & Naming Conventions
- TypeScript + JSX is standard; prefer function components and React hooks.
- Use 4-space indentation and single quotes, matching the existing ESLint configuration (`eslint:recommended`, `@typescript-eslint`, `react`).
- Name files by responsibility: `PascalCase` components (`StudentCard.tsx`), `camelCase` utilities (`formatLessonDuration.ts`), and `kebab-case` styles.
- Run `npx eslint src --ext .ts,.tsx` before opening a PR to catch lint regressions.

## Testing Guidelines
- don't write tests 

## Commit & Pull Request Guidelines
- Mimic the existing imperative commit style (`add transcription functionality`, `fix embedded mode…`) and keep each commit focused.
- Reference issue IDs or tickets in the commit body when applicable and describe migrations or config toggles clearly.
- PR descriptions should summarise user impact, affected routes/components, test evidence, and include screenshots for UI changes.
- Verify `npm run build` and `npm run test` locally before requesting review; tag the relevant feature owner for sign-off.

## Environment & Configuration Tips
- Define runtime variables in `.env` using `VITE_` prefixes (e.g., `VITE_API_URL`, `VITE_KEYCLOAK_URL`, `VITE_WS_URL`); never commit secrets.
- Align updates in `vite.config.ts`, `Dockerfile`, and `nginx.conf` so local, preview, and production targets stay consistent.

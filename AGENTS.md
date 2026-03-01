# Repository Guidelines

## Project Structure & Module Organization
- `src/app/`: Next.js App Router pages, layouts, API routes, and server actions.
- `src/components/`: UI and feature components (`home/`, `reader/`, `layout/`, `ui/`).
- `src/lib/`: shared services (Komga/API access), auth, logger, utilities.
- `src/hooks/`, `src/contexts/`, `src/types/`, `src/constants/`: reusable runtime logic and typing.
- `src/i18n/messages/{en,fr}/`: translation dictionaries.
- `prisma/`: database schema and Prisma artifacts.
- `public/`: static files and PWA assets.
- `scripts/`: maintenance scripts (DB init, admin password reset, icon generation).
- `docs/` and `devbook.md`: implementation notes and architecture decisions.

## Build, Test, and Development Commands
Use `pnpm` (lockfile and `packageManager` are configured for it).
- `pnpm dev`: start local dev server.
- `pnpm build`: create production build.
- `pnpm start`: run production server.
- `pnpm lint`: run ESLint across the repo.
- `pnpm typecheck` or `pnpm -s tsc --noEmit`: strict TypeScript checks.
- `pnpm init-db`: initialize database data.
- `pnpm reset-admin-password`: reset admin credentials.

## Coding Style & Naming Conventions
- Language: TypeScript (`.ts/.tsx`) with React function components.
- Architecture priority: **server-first**. Default to React Server Components (RSC) for pages and feature composition.
- Data mutations: prefer **Server Actions** (`src/app/actions/`) over client-side fetch patterns when possible.
- Client components (`"use client"`): use only for browser-only concerns (event handlers, local UI state, effects, DOM APIs).
- Data fetching: do it on the server first (`page.tsx`, server components, services in `src/lib/services`), then pass serialized props down.
- Indentation: 2 spaces; keep imports grouped and sorted logically.
- Components/hooks/services: `PascalCase` for components, `camelCase` for hooks/functions, `*.service.ts` for service modules.
- Styling: Tailwind utility classes; prefer existing `src/components/ui` primitives before creating new ones.
- Quality gates: ESLint (`eslint.config.mjs`) + TypeScript must pass before merge.

## Testing Guidelines
- No dedicated unit test framework is currently configured.
- Minimum validation for each change: `pnpm lint` and `pnpm typecheck`.
- For UI changes, perform a quick manual smoke test on affected routes (home, libraries, series, reader) and both themes.

## Commit & Pull Request Guidelines
- Follow Conventional Commit style seen in history: `fix: ...`, `refactor: ...`, `feat: ...`.
- Keep subjects imperative and specific (e.g., `fix: reduce header/home spacing overlap`).
- PRs should include:
  - short problem/solution summary,
  - linked issue (if any),
  - screenshots or short video for UI updates,
  - verification steps/commands run.

## Security & Configuration Tips
- Never commit secrets; use `.env` based on `.env.example`.
- Validate Komga and auth-related config through settings flows before merging.
- Prefer server-side data fetching/services for sensitive operations.

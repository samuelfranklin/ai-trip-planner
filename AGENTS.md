# Repository Guidelines

## Project Structure & Module Organization
This pnpm workspace houses the backend in `apps/api` (Express + LangChain/LangGraph agent) and the React client in `apps/view` (Vite + Tailwind). Backend sources live in `apps/api/src`, with `config/` for env/logging, `services/` for LLM adapters, `tools/` for Prisma-backed LangChain tools, and generated Prisma types in `generated/`. Database schema, migrations, and seeds reside in `apps/api/prisma`. The frontend keeps UI code in `apps/view/src`, assets under `public/`, and build config at the package root.

## Build, Test, and Development Commands
- `pnpm dev` — start API and web dev servers with streaming logs.
- `pnpm dev:api` / `pnpm dev:view` — run a single package while iterating.
- `pnpm build` or `pnpm build:<target>` — compile all packages or a chosen one.
- `pnpm test` — execute every registered test suite (`--filter` to narrow).
- `pnpm lint` — run ESLint across the workspace.
- `pnpm db:migrate`, `pnpm db:seed`, `pnpm db:studio` — evolve schema, load fixtures, and inspect Prisma data.

## Coding Style & Naming Conventions
Code is TypeScript-first; keep two-space indentation, single quotes in TS/TSX, and relative imports within each package. React components stay in `PascalCase`, utilities and variables in `camelCase`, and env keys in `UPPER_SNAKE_CASE`. Let ESLint surface formatting issues (`apps/view/eslint.config.js`), and regenerate the Prisma client with `pnpm db:generate` after schema edits.

## Testing Guidelines
Backend tests use Jest (`apps/api/jest.config.js`) with `ts-jest` and ESM support (`NODE_OPTIONS=--experimental-vm-modules`). Eligible files live in `src/**/__tests__` or use the `*.test.ts` / `*.spec.ts` suffix. Add coverage for new services, LangChain tools, and agent flows, and confirm `pnpm --filter @ai-trip-planner/api test:coverage` passes before raising a PR. Frontend tests are not defined yet—introduce Vitest or React Testing Library cases under `apps/view/src/__tests__` as the UI grows.

## Commit & Pull Request Guidelines
Commits follow the conventional pattern visible in history (`feat(agent):`, `build:`); keep subjects imperative and scoped. PRs should summarise the change, list validation steps (tests run, migrations applied), and link related issues. Include UI screenshots or short clips whenever the view layer changes.

## Setup, Environment & Data
Install dependencies via `pnpm install`, then launch the local PostgreSQL stack with `docker compose up -d`. Environment variables load through `apps/api/src/config/env.ts`; create `apps/api/.env` with `DATABASE_URL`, `PORT`, `AI_ENGINE`, and provider-specific keys (`OPENAI_API_KEY` or Ollama settings). After touching `prisma/schema.prisma`, run `pnpm db:migrate` and `pnpm db:generate`, and keep the curated seed data in `apps/api/prisma/seeds/` (airports, destinations, hotels, flights, seasonality) aligned with schema changes.

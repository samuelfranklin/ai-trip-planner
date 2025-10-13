# Repository Guidelines

## Project Structure & Module Organization
This pnpm workspace hosts the Express + LangChain backend in `apps/api` and the Vite + Tailwind client in `apps/view`. Backend sources live under `apps/api/src` with `config/` for env and logging, `services/` for LLM adapters, `tools/` for Prisma-backed LangChain tools, and generated Prisma types in `generated/`. Database schema, migrations, and seeds sit in `apps/api/prisma`. Frontend UI code stays in `apps/view/src`, shared assets in `apps/view/public`, and package-level build config at each root.

## Build, Test, and Development Commands
- `pnpm dev` — start API and web dev servers with shared logs.
- `pnpm dev:api` / `pnpm dev:view` — focus on a single package during iteration.
- `pnpm build` or `pnpm build:<target>` — compile the entire workspace or a specific app.
- `pnpm test` — run all registered test suites; add `--filter @ai-trip-planner/api` to limit scope.
- `pnpm lint` — apply ESLint rules across packages.
- `pnpm db:migrate`, `pnpm db:seed`, `pnpm db:studio` — evolve schema, load fixtures, and inspect data.

## Coding Style & Naming Conventions
Favor TypeScript with two-space indentation and single quotes in TS/TSX. Keep imports relative within each package (`import service from '../services/foo'`). React components use PascalCase, utilities use camelCase, and environment keys stay in UPPER_SNAKE_CASE. Run `pnpm lint` to enforce formatting via the shared ESLint config in `apps/view/eslint.config.js`.

## Testing Guidelines
Backend tests use Jest with `ts-jest` and ESM support. Place specs in `apps/api/src/**/__tests__/` or as `*.test.ts` / `*.spec.ts`. Before publishing changes, ensure `pnpm --filter @ai-trip-planner/api test:coverage` passes and adds coverage for new services, tools, or agent flows. Frontend tests are not yet defined; if added, organize them under `apps/view/src/__tests__`.

## Commit & Pull Request Guidelines
Follow the conventional commit pattern observed in history (`feat(agent):`, `build:`). Keep subjects imperative and scoped. Pull requests should summarize the change, note validation steps (tests run, migrations applied), link related issues, and attach UI screenshots or clips when `apps/view` changes. Highlight any schema adjustments and reference the corresponding migration file.

## Environment & Data Setup
Install dependencies with `pnpm install`, then bring up PostgreSQL via `docker compose up -d`. Populate `apps/api/.env` with `DATABASE_URL`, `PORT`, `AI_ENGINE`, and provider credentials (e.g., `OPENAI_API_KEY`). After editing `apps/api/prisma/schema.prisma`, run `pnpm db:migrate` and `pnpm db:generate`, keeping the curated seeds in `apps/api/prisma/seeds/` aligned with schema changes.

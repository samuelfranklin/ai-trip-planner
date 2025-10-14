# LangGraph Server Thread Integration Plan

This document captures the planned adaptations for the Express API so it can cooperate with the LangGraph server and expose thread management features backed by the existing Prisma models.

## Responsibilities

- **LangGraph server** hosts the compiled graph exported from `src/agent.ts`, handles run execution, streaming, and checkpoint persistence (via `langgraph.config.ts`).
- **Express API** remains responsible for:
  - Managing thread metadata in `ConversationSession` (title, timestamps, user association).
  - Exposing REST endpoints that the frontend can call for thread CRUD operations.
  - Syncing `ConversationMessage` rows with LangGraph runs when human-in-the-loop operations require structured history outside of the checkpoint tables.

## Thread API Surface

1. `GET /threads` – List sessions ordered by `lastActivityAt`, returning `id`, `title`, `createdAt`, `updatedAt`, and assistant summary fields needed for the sidebar.
2. `POST /threads` – Create a new session. Generate a UUID (mirrors LangGraph `thread_id`), insert into `ConversationSession`, and return `threadId`.
3. `GET /threads/:id` – Retrieve thread metadata plus the latest conversation summary. Useful when hydrating on refresh.
4. `DELETE /threads/:id` – Soft-delete or hard-delete (TBD) the session, clear `ConversationMessage` rows, and call LangGraph SDK `client.threads.delete`.

## LangGraph Coordination

- When creating a thread, call LangGraph SDK `client.threads.create({ thread_id })` so the explicit ID matches the Prisma session. This keeps the checkpointer and our metadata aligned.
- After every run completes, fetch the latest messages from `client.threads.messages.list` and upsert them into `ConversationMessage` so reporting queries keep working.
- For streaming runs initiated from the frontend, proxy events back through the SDK (Phase 2) and, on completion, enqueue a background task to sync message rows.

## Follow-up Tasks

- Implement a small `langGraphClient` helper that reads base URL/API key from env and returns a configured `Client`.
- Replace `/agent` and `/agent/stream` endpoints with thin proxies to the SDK or retire them once the frontend migrates fully to the SDK.
- Add request validation (zod) for new thread endpoints and ensure errors map to the existing logging conventions.


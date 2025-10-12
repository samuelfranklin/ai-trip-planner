<!-- cspell:disable -->

## AI Trip Planner – API

This package exposes the Express server that wraps the LangGraph travel agent. It now includes interactive API docs so you can explore and exercise the endpoints while validating the CNF ↔ SFO scenario.

### Getting Started

1. Install dependencies from the workspace root:
	 ```bash
	 pnpm install
	 ```
2. Ensure the PostgreSQL services are running (see repository root instructions) and apply the schema:
	 ```bash
	 pnpm --filter @ai-trip-planner/api db:migrate
	 pnpm --filter @ai-trip-planner/api db:seed
	 ```
3. Start the API locally:
	 ```bash
	 pnpm --filter @ai-trip-planner/api dev
	 ```
4. Browse to `http://localhost:3000/docs` for Swagger UI or `http://localhost:3000/openapi.json` for the raw OpenAPI document.

### Available Endpoints

| Method | Path              | Description                                    |
| ------ | ----------------- | ---------------------------------------------- |
| GET    | `/health`         | Simple service readiness probe                 |
| GET    | `/openapi.json`   | Raw OpenAPI definition                         |
| GET    | `/docs`           | Swagger UI for interactive exploration         |
| POST   | `/agent`          | Chat-style interface to the LangGraph agent    |

### Sample Agent Flows

Use the `/agent` endpoint to drive tool usage. Payloads below are ready to paste into the Swagger “Try it out” interface or the VS Code `app.http` notebook.

#### 1. Start a Conversation and Fetch CNF → SFO Flights

```json
{
	"conversationId": "demo-thread-1",
	"message": "Quais opções de voo CNF para SFO com ida 2025-10-01 e volta 2025-10-10?"
}
```

#### 2. Book a Specific Itinerary

```json
{
	"conversationId": "demo-thread-1",
	"message": "Use book_flight no itinerário FLT-CNF-SFO-20251001-001 para 2 adultos. Passageiro Maria Passenger (maria@example.com, +55-31-99999-0000), classe business, fare basis J7NR, refeição vegetariana."
}
```

#### 3. Cancel the PNR Returned by the Booking

```json
{
	"conversationId": "demo-thread-1",
	"message": "Use cancel_flight para cancelar o PNR informado anteriormente."
}
```

#### 4. List and Reserve San Francisco Hotels

```json
{
	"conversationId": "demo-thread-1",
	"message": "Liste hotéis em San Francisco entre 2025-10-01 e 2025-10-05 com café da manhã."
}
```

```json
{
	"conversationId": "demo-thread-1",
	"message": "Use book_hotel no hotel-sfo-001 para João Hóspede (joao@example.com, +55-31-98888-0000), 2 adultos e 1 criança, solicitar berço."
}
```

```json
{
	"conversationId": "demo-thread-1",
	"message": "Use cancel_hotel para cancelar a última reserva feita."
}
```

> Tip: pass `"reset": true` alongside the `conversationId` to clear stored history for a fresh run.

### Running Tests

```bash
pnpm --filter @ai-trip-planner/api test
```

This validates the booking tools, destination lookups, and the new conversation persistence layer.

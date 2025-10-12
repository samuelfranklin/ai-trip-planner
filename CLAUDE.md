# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Trip Planner is a monorepo containing a travel planning application with an AI-powered backend and React frontend. The backend uses LangChain/LangGraph to create a conversational agent that helps users plan trips.

## Monorepo Structure

- **apps/api**: Express.js backend with LangGraph agent
- **apps/view**: React frontend with Vite and Tailwind CSS
- **pnpm workspace**: Uses pnpm for package management across workspaces

## Development Commands

### Setup
```bash
pnpm install                 # Install all dependencies
docker compose up -d         # Start PostgreSQL database
pnpm db:generate            # Generate Prisma client
pnpm db:migrate             # Run database migrations
```

### Development
```bash
pnpm dev                    # Run all apps in parallel
pnpm dev:api                # Run API only (tsx watch)
pnpm dev:view               # Run frontend only (Vite dev server)
```

### Testing
```bash
pnpm test                   # Run all tests across workspaces
pnpm --filter @ai-trip-planner/api test        # Run API tests only
pnpm --filter @ai-trip-planner/api test:watch  # Run API tests in watch mode
pnpm --filter @ai-trip-planner/api test:coverage  # Run with coverage
```

Note: Tests use Jest with `NODE_OPTIONS=--experimental-vm-modules` for ESM support.

### Building
```bash
pnpm build                  # Build all apps
pnpm build:api              # Build API only (TypeScript compilation)
pnpm build:view             # Build frontend only (Vite build)
```

### Linting
```bash
pnpm lint                   # Lint all workspaces
```

### Database Management
```bash
# From root (shortcuts that call api workspace)
pnpm db:generate            # Generate Prisma client
pnpm db:migrate             # Run database migrations
pnpm db:push                # Push schema changes without migration
pnpm db:studio              # Open Prisma Studio GUI
pnpm db:seed                # Seed database with sample data
pnpm db:reset               # Reset database (destructive)
pnpm db:migrate:deploy      # Deploy migrations to production

# Or directly from api workspace
cd apps/api
pnpm db:generate
pnpm db:migrate
# etc...
```

**Database Seeds:**
The project includes comprehensive seed data based on 2024-2025 travel trends:
- **Airports**: 35+ airports (Brazilian and international major hubs)
- **Destinations**: 20+ popular destinations including Rio, São Paulo, Buenos Aires, Santiago, Lisboa, Paris, Miami, Punta Cana
- **Hotels**: 20+ hotels with realistic pricing across different categories (luxury, boutique, budget)
- **Flights**: 15+ flight itineraries with realistic pricing and schedules
- **Categories**: Destination, hotel, and activity categorization
- **Seasonal Data**: Month-by-month climate, pricing, and crowd information for major destinations

Seeds are located in `apps/api/prisma/seeds/` and executed via `apps/api/prisma/seed.ts`.

## Architecture

### Backend (apps/api)

**Core Components:**
- `src/index.ts`: Express server with `/health` and `/agent` endpoints
- `src/agent.ts`: LangGraph agent configured with `createReactAgent`
- `src/services/llm.service.ts`: LLM provider abstraction (OpenAI or Ollama)
- `src/config/env.ts`: Environment configuration using Zod validation
- `src/config/logger.ts`: Pino logger setup

**AI Engine:**
- Supports both OpenAI (gpt-4o-mini) and Ollama (llama3.2) via `AI_ENGINE` env var
- Built with LangChain/LangGraph for conversational AI
- Agent receives messages via POST `/agent` endpoint and returns responses

**LangChain Tools:**
The agent has access to 7 tools for querying the database:
- **Destination Tools** (`src/tools/destination.tools.ts`):
  - `search_destinations`: Search destinations by name, city, country, or description
  - `get_seasonal_info`: Get seasonal information (climate, temperature, best time to visit) for destinations
- **Flight Tools** (`src/tools/flight.tools.ts`):
  - `search_flights`: Search flights between airports/cities with filtering by price, stops, and sorting
  - `get_airport_info`: Get information about airports including alternatives
- **Hotel Tools** (`src/tools/hotel.tools.ts`):
  - `search_hotels`: Search hotels by location with filtering by price, rating, and amenities
  - `get_hotel_categories`: Get list of available hotel categories
  - `get_hotel_amenities`: Get list of available hotel amenities

**Note:** Tool calling with Ollama models may have compatibility issues depending on the model. For production use with tools, OpenAI models are recommended. If using Ollama, ensure the model supports function calling.

**Database:**
- PostgreSQL database managed via Prisma ORM
- Schema: `apps/api/prisma/schema.prisma`
- Generated client output: `apps/api/src/generated/prisma`
- Comprehensive schema for travel planning with users, conversations, bookings, destinations, flights, hotels, recommendations, and agent memory

**TypeScript Configuration:**
- Uses ESNext modules with bundler resolution
- Strict type checking enabled
- Output directory: `dist/`

### Frontend (apps/view)

**Tech Stack:**
- React 19 with TypeScript
- Vite for build tooling
- Tailwind CSS (v4) for styling
- ESLint for code quality

### Database Schema Highlights

The Prisma schema models a sophisticated travel planning system:
- **Users & Profiles**: User preferences, interests, travel frequency
- **Conversations**: Message history with intent tracking and context accumulation
- **Agent Memory**: Long-term memory storage (preferences, facts, constraints) with confidence scoring
- **Flights & Hotels**: Comprehensive catalog with pricing, availability, and booking management
- **Destinations**: Rich destination data with POIs, seasonal information, and categorization
- **Recommendations**: AI-driven recommendations with engagement tracking
- **Search History**: Track user searches and patterns

## Environment Variables

Required environment variables (apps/api):
- `PORT`: Server port (default: 3000)
- `AI_ENGINE`: "ollama" or "openai" (default: openai)
- `OPENAI_API_KEY`: Required if using OpenAI
- `OLLAMA_BASE_URL`: Ollama server URL (default: http://localhost:11434)
- `OLLAMA_MODEL`: Ollama model name (default: llama3.2)
- `DATABASE_URL`: PostgreSQL connection string

## Testing Approach

- Jest configured for Node environment with ts-jest preset
- Tests should be placed in `__tests__` directories or named `*.test.ts` or `*.spec.ts`
- Coverage collection excludes type definitions and test files
- ESM modules require special Jest configuration (already set up)

## Key Patterns

**LLM Service Pattern:**
The `createLLM()` factory function abstracts LLM provider selection based on environment configuration, allowing seamless switching between OpenAI and Ollama.

**Agent Architecture:**
The conversational agent is built using LangGraph's `createReactAgent`, which provides a stateful conversation flow with tool integration capability.

**Monorepo Package Filtering:**
Use `--filter` flag to run commands for specific workspaces:
- `pnpm --filter @ai-trip-planner/api <command>`
- `pnpm --filter @ai-trip-planner/view <command>`

## Docker Setup

PostgreSQL runs in Docker via `Docker-compose.yaml`:
- Container name: `ai-trip-planner-db`
- Default credentials: postgres/postgres
- Database: `ai_trip_planner`
- Port: 5432 (configurable via env)
- Persistent volume for data storage

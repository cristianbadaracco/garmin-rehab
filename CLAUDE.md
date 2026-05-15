# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

AI-powered rehabilitation tracking platform. Integrates Garmin wearable data (HRV, sleep, stress, HR) with manual injury/pain tracking and Claude API-driven analysis. Targets users recovering from injuries/surgeries.

## Commands

```bash
# Full dev stack (DB + backend + frontend in parallel)
make dev

# Individual services
make dev-db        # PostgreSQL via Docker on :5432
make dev-back      # FastAPI on :8000
make dev-front     # Vite on :5173

# Deps
make install       # both
make install-back  # uv sync
make install-front # npm install

# Database
make migrate       # run Alembic migrations
make migrate-new   # create new migration

# Type generation
make generate-types  # OpenAPI → TypeScript types (run after backend schema changes)
```

No lint/test commands wired yet.

## Architecture

### Data Flow

```
Garmin Watch → Garmin Connect cloud → garminconnect lib → FastAPI backend
                                       + manual user input (sessions, pain logs)
                                                 ↓
                                          PostgreSQL
                                          Claude API → AIInsight records
                                                 ↓
                                         React dashboard
```

### Backend (`backend/app/`)

- **`main.py`** — FastAPI app, mounts 5 routers: `auth`, `garmin`, `medical`, `sessions`, `analysis`
- **`config.py`** — Pydantic Settings, loads from `.env`
- **`db/database.py`** — Async SQLAlchemy engine + `async_sessionmaker`
- **`models/models.py`** — ORM models: `User`, `Injury`, `PainLog`, `DailyMetrics`, `Activity`, `Session`, `SessionBlock`, `AIInsight`
- **`models/schemas.py`** — Pydantic v2 schemas (also drives OpenAPI → TypeScript generation)
- **`api/`** — Route handlers (5 files, one per router)
- **`services/`** — Empty; intended for Garmin sync logic and Claude AI engine

Auth uses JWT (python-jose) + bcrypt. Routes currently have hardcoded UUIDs with `# TODO` — auth not fully integrated yet.

### Frontend (`frontend/src/`)

- **`App.tsx`** — React Router v7, 4 routes: `/` Dashboard, `/medical` MedicalProfile, `/sessions` Sessions, `/progress` Progress
- **`lib/api.ts`** — HTTP client wrapper hitting `/api/*`
- **`pages/`** — All 4 pages are empty skeletons
- Types generated from OpenAPI into `src/types/api.ts` via `make generate-types`

### Database

PostgreSQL 16 (Docker for local). Alembic manages migrations. Schema is fully defined in `models.py` but initial migration not yet created.

### AI Integration

Claude API via `anthropic` SDK. `AIInsight` model stores results. Analysis router at `api/analysis.py` — implementation pending in `services/`.

## Key Docs

Detailed specs in `docs/`:
- `03-data-model.md` — full schema design
- `04-garmin-integration.md` — garminconnect auth flow + sync strategy
- `05-ai-engine.md` — Claude prompt strategy + insight types
- `07-api-reference.md` — endpoint reference

## Package Manager

Backend: `uv` (not pip). Use `uv add <pkg>` to add deps.  
Frontend: `npm`.

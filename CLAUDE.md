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
- **`lib/auth.tsx`** — Auth context + `useAuth()` hook, JWT stored in localStorage
- **`types/index.ts`** — Global TypeScript interfaces (`DailyMetrics`, `Activity`, `Injury`, `PainLog`)
- **`components/`** — Reusable components shared across pages (e.g. `Card`)
- **`pages/`** — One folder per page

### Frontend Conventions

**Page structure** — each page lives in its own folder:
```
pages/
  PageName/
    index.tsx           ← page component (entry point)
    utils.ts            ← page-specific helpers/formatters (if needed)
    components/
      ComponentA.tsx    ← components used only within this page
```

**Component placement rules:**
- Used in only one page → `pages/PageName/components/`
- Used in multiple pages → `src/components/`

**Size limit:** No component file over 250 lines. If it exceeds that, split into sub-components, extract logic to utils, or separate concerns.

**Types:** All shared interfaces go in `src/types/index.ts`. Page-specific types can be defined inline in the component file.

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

# Garmin Rehab Coach 🏃‍♂️🤖

AI-powered rehabilitation tracking integrated with Garmin wearables. Track your recovery from injuries and surgeries with real data from your watch, manual session logging, and intelligent AI analysis.

## Stack

| Layer      | Tech                          |
|------------|-------------------------------|
| Frontend   | React + Vite + TypeScript     |
| Backend    | Python + FastAPI              |
| Database   | PostgreSQL + SQLAlchemy       |
| AI         | Claude API (Anthropic)        |
| Garmin     | garminconnect (Python)        |

## Project structure

```
garmin-rehab/
├── backend/          # Python FastAPI
│   ├── app/
│   │   ├── api/          # Route handlers
│   │   ├── services/     # Business logic (Garmin sync, AI engine)
│   │   ├── models/       # SQLAlchemy models + Pydantic schemas
│   │   └── db/           # Database connection + migrations
│   └── pyproject.toml
├── frontend/         # React + Vite + TypeScript
│   ├── src/
│   │   ├── pages/        # Dashboard, Medical, Sessions, Progress
│   │   ├── components/   # Charts, forms, UI components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── types/        # TypeScript types (auto-generated from API)
│   │   └── lib/          # API client, utilities
│   └── package.json
├── docker-compose.yml    # PostgreSQL for local dev
├── Makefile              # Dev orchestration
└── .env.example
```

## Setup

### Prerequisites
- Python 3.12+
- Node.js 20+
- Docker (for PostgreSQL)
- [uv](https://docs.astral.sh/uv/) (Python package manager)

### 1. Clone and configure
```bash
cp .env.example .env
# Edit .env with your Garmin credentials and Anthropic API key
```

### 2. Install dependencies
```bash
make install
```

### 3. Start database
```bash
make db
```

### 4. Run migrations
```bash
make migrate
```

### 5. Start development
```bash
make dev
```

This starts:
- **Frontend** at http://localhost:5173
- **Backend** at http://localhost:8000
- **API docs** at http://localhost:8000/docs

### Generate TypeScript types from API
```bash
make generate-types
```

## MVP Roadmap

- [ ] Garmin data sync (HR, HRV, sleep, stress, body battery, activities)
- [ ] Dashboard with charts
- [ ] Medical profile (injuries, surgery dates, recovery phases)
- [ ] Pain logging
- [ ] Manual session registration with blocks
- [ ] AI daily analysis (Claude API)
- [ ] Recovery timeline and progress tracking

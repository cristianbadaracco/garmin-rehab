.PHONY: dev dev-back dev-front install install-back install-front db migrate sync generate-types build clean

# === Development ===
dev:
	@echo "🚀 Starting all services..."
	$(MAKE) -j3 dev-db dev-back dev-front

dev-db:
	docker compose up postgres -d

dev-back:
	cd backend && uv run uvicorn app.main:app --reload --port 8000

dev-front:
	cd frontend && npm run dev

# === Install ===
install: install-back install-front

install-back:
	cd backend && uv sync

install-front:
	cd frontend && npm install

# === Database ===
db:
	docker compose up postgres -d

migrate:
	cd backend && uv run alembic upgrade head

migrate-new:
	@read -p "Migration name: " name; \
	cd backend && uv run alembic revision --autogenerate -m "$$name"

# === Garmin Sync ===
sync:
	cd backend && uv run python -m app.services.sync_service

# === Type Generation (OpenAPI → TypeScript) ===
generate-types:
	cd backend && uv run python -c "import json; from app.main import app; print(json.dumps(app.openapi()))" > /tmp/openapi.json
	cd frontend && npx openapi-typescript /tmp/openapi.json -o src/types/api.generated.ts
	@echo "✅ Types generated at frontend/src/types/api.generated.ts"

# === Build ===
build:
	cd frontend && npm run build

# === Clean ===
clean:
	docker compose down -v
	rm -rf frontend/node_modules frontend/dist
	rm -rf backend/.venv

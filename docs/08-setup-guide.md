# Guía de setup y desarrollo

## Requisitos previos

- **Python 3.12+**
- **Node.js 20+**
- **Docker** (para PostgreSQL)
- **uv** (gestor de paquetes Python): `curl -LsSf https://astral.sh/uv/install.sh | sh`

## Setup inicial

### 1. Clonar y configurar

```bash
git clone <repo-url> garmin-rehab
cd garmin-rehab
cp .env.example .env
```

Editar `.env` con tus datos:

```
GARMIN_EMAIL=tu_email_de_garmin@ejemplo.com
GARMIN_PASSWORD=tu_password_de_garmin
ANTHROPIC_API_KEY=sk-ant-...
```

### 2. Instalar dependencias

```bash
make install
```

Esto ejecuta:
- `cd backend && uv sync` (instala dependencias Python en un venv local).
- `cd frontend && npm install` (instala dependencias Node).

### 3. Levantar base de datos

```bash
make db
```

Levanta PostgreSQL 16 en Docker (puerto 5432, user: dev, password: dev, database: garmin_rehab).

### 4. Correr migraciones

```bash
make migrate
```

### 5. Iniciar desarrollo

```bash
make dev
```

Levanta en paralelo:
- **Frontend**: http://localhost:5173 (Vite dev server con hot reload).
- **Backend**: http://localhost:8000 (FastAPI con auto-reload).
- **API docs**: http://localhost:8000/docs (Swagger UI interactivo).

## Comandos disponibles

| Comando              | Descripción                                              |
|----------------------|----------------------------------------------------------|
| `make dev`           | Levantar todo (DB + backend + frontend)                  |
| `make dev-back`      | Solo backend                                             |
| `make dev-front`     | Solo frontend                                            |
| `make install`       | Instalar todas las dependencias                          |
| `make db`            | Levantar PostgreSQL en Docker                            |
| `make migrate`       | Correr migraciones pendientes                            |
| `make migrate-new`   | Crear nueva migración (pide nombre)                      |
| `make sync`          | Sync manual con Garmin                                   |
| `make generate-types`| Generar tipos TS desde OpenAPI                           |
| `make build`         | Build de producción del frontend                         |
| `make clean`         | Limpiar todo (Docker, node_modules, venv)                |

## Estructura de desarrollo

### Backend

Los archivos principales para desarrollar:

- `backend/app/api/*.py` — Endpoints de la API. Cada archivo es un router de FastAPI.
- `backend/app/services/*.py` — Lógica de negocio (sync con Garmin, motor de IA, análisis).
- `backend/app/models/models.py` — Tablas de la base de datos (SQLAlchemy).
- `backend/app/models/schemas.py` — Schemas de validación (Pydantic) que definen el contrato de la API.

Para agregar un endpoint nuevo:
1. Definir el schema de request/response en `schemas.py`.
2. Crear el endpoint en el router correspondiente en `api/`.
3. Si necesita lógica compleja, crear un service en `services/`.
4. Correr `make generate-types` para actualizar los tipos del frontend.

### Frontend

- `frontend/src/pages/*.tsx` — Páginas principales (una por ruta).
- `frontend/src/components/` — Componentes organizados por dominio (charts, medical, sessions, analysis, ui).
- `frontend/src/lib/api.ts` — Cliente HTTP tipado para comunicarse con el backend.
- `frontend/src/hooks/` — Custom hooks para data fetching.
- `frontend/src/types/` — Tipos TypeScript (auto-generados desde OpenAPI).

El proxy de Vite redirige `/api/*` al backend en desarrollo, así el frontend siempre hace fetch a rutas relativas.

## Workflow de desarrollo típico

```
1. Definir/modificar modelo en backend/app/models/models.py
2. Crear migración: make migrate-new
3. Aplicar migración: make migrate
4. Agregar/modificar schema en backend/app/models/schemas.py
5. Crear endpoint en backend/app/api/
6. Generar tipos: make generate-types
7. Consumir desde el frontend con el api client tipado
```

## Testing

```bash
cd backend && uv run pytest
```

Los tests viven en `backend/tests/`.

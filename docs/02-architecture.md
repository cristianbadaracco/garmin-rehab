# Arquitectura

## Stack

| Capa       | Tecnología                    | Razón                                                                 |
|------------|-------------------------------|-----------------------------------------------------------------------|
| Frontend   | React + Vite + TypeScript     | SPA liviana. Vite como bundler (rápido, simple). No necesitamos SSR.  |
| Backend    | Python + FastAPI              | La librería `garminconnect` es Python. FastAPI es async y type-safe.  |
| Database   | PostgreSQL + SQLAlchemy       | Robusta para series temporales. SQLAlchemy con async support.         |
| AI         | Claude API (Anthropic)        | Análisis contextualizado, detección de patrones, recomendaciones.     |
| Garmin     | garminconnect (Python)        | Wrapper no oficial con 130+ endpoints. Auth vía mobile SSO.           |
| Migrations | Alembic                       | Migraciones de esquema integradas con SQLAlchemy.                     |
| Estilos    | Tailwind CSS                  | Utility-first, rápido para iterar UI.                                 |

## Decisiones de arquitectura

### ¿Por qué no Next.js?

Next.js brilla cuando el backend también es JavaScript/TypeScript. En nuestro caso el backend es Python (por la integración con Garmin), entonces Next.js obligaría a mantener dos servidores (Node + Python) sin ganancia real. Con React + Vite el frontend compila a archivos estáticos que se sirven desde cualquier lado. Un solo servidor Python maneja toda la lógica.

### ¿Por qué no Turborepo?

Turborepo está pensado para monorepos full JavaScript/TypeScript. Con un backend Python no aporta valor. Un `Makefile` simple orquesta todo: `make dev` levanta los servicios en paralelo, `make sync` dispara la sincronización con Garmin, `make generate-types` genera tipos TypeScript desde el OpenAPI del backend.

### ¿Por qué no hay carpeta `shared/`?

En un monorepo full TypeScript tendría sentido un package npm compartido. Pero con Python en el backend, no se pueden compartir packages entre lenguajes. La fuente de verdad es el schema OpenAPI que FastAPI genera automáticamente desde los modelos Pydantic. Con `openapi-typescript` se generan las interfaces de TypeScript del frontend con un solo comando.

### ¿Por qué `garminconnect` y no la API oficial de Garmin?

La API oficial (Garmin Connect Developer Program) es gratuita pero requiere aprobación, que solo se concede para uso comercial. Para el MVP personal usamos `garminconnect`, una librería open source que se autentica con las mismas credenciales de Garmin Connect. Cuando el producto escale a múltiples usuarios, se migra a la API oficial (responden en 2 días hábiles y dan acceso a un entorno de evaluación).

## Estructura del monorepo

```
garmin-rehab/
├── backend/                  # Python · FastAPI
│   ├── app/
│   │   ├── api/              # Route handlers (garmin, medical, sessions, analysis, auth)
│   │   ├── services/         # Lógica de negocio (garmin_client, ai_engine, sync, analysis)
│   │   ├── models/
│   │   │   ├── models.py     # SQLAlchemy ORM (tablas)
│   │   │   └── schemas.py    # Pydantic (validación + OpenAPI spec)
│   │   └── db/               # Conexión + migraciones Alembic
│   └── pyproject.toml
├── frontend/                 # React · Vite · TypeScript
│   ├── src/
│   │   ├── pages/            # Dashboard, MedicalProfile, Sessions, Progress
│   │   ├── components/       # charts/, medical/, sessions/, analysis/, ui/
│   │   ├── hooks/
│   │   ├── types/            # Auto-generados desde OpenAPI
│   │   └── lib/              # API client tipado
│   └── package.json
├── docs/                     # Esta documentación
├── docker-compose.yml        # PostgreSQL local
├── Makefile                  # Orquestación de dev
└── .env.example
```

## Flujo de datos

```
Garmin Forerunner 165
        │
        │ (sync al celular)
        ▼
  Garmin Connect (nube)
        │
        │ (garminconnect library)
        ▼
   Backend FastAPI ◄──── Input manual del usuario
        │                    (sesiones, dolor, notas)
        ├──► PostgreSQL (almacena todo)
        │
        ├──► Claude API (análisis + insights)
        │
        ▼
   Frontend React (dashboard, gráficos, alertas)
```

## Sincronización de tipos front ↔ back

```
Pydantic schemas (Python)
        │
        │ FastAPI auto-genera
        ▼
   OpenAPI spec (JSON)
        │
        │ openapi-typescript
        ▼
   TypeScript interfaces (frontend/src/types/api.generated.ts)
```

Comando: `make generate-types`

Esto garantiza que los tipos del frontend siempre reflejan lo que el backend espera y devuelve, sin mantener tipos manualmente en dos lugares.

## Comunicación front → back

El frontend corre en Vite dev server (puerto 5173). Todas las llamadas a `/api/*` se proxean al backend FastAPI (puerto 8000) via la config de Vite. En producción, el frontend compila a archivos estáticos que se sirven desde FastAPI o un CDN.

## Base de datos

PostgreSQL 16 corriendo en Docker para desarrollo local. El schema se gestiona con Alembic (migraciones). Ver `docs/03-data-model.md` para el detalle de las tablas.

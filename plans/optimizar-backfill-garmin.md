# Plan: Optimizar Backfill de Garmin Connect

## Problema

El endpoint `POST /api/garmin/backfill` ejecuta sincronización de forma **secuencial día por día**. Para 30 días = ~240 llamadas HTTP secuenciales (~30-60 segundos bloqueando el request). Para 90 días = ~720 llamadas (~90-180 segundos). Esto bloquea el HTTP response, causa timeouts, y da mala UX.

## Objetivo

Reducir el tiempo de backfill de ~60s (30 días) a <10s efectivos, sin bloquear el request HTTP, con progreso visible al usuario y protección contra rate limiting de Garmin.

---

## Archivos involucrados

| Archivo | Acción |
|---------|--------|
| `backend/app/services/garmin_client.py` | Modificar `backfill()` y agregar métodos auxiliares |
| `backend/app/api/garmin.py` | Modificar endpoints `/backfill` y `/connect`, agregar endpoint de status |
| `backend/app/models/models.py` | Agregar modelo `SyncJob` |
| `backend/app/models/schemas.py` | Agregar schemas `SyncJobResponse`, `BackfillResponse` |
| `backend/alembic/versions/` | Nueva migración para tabla `sync_jobs` |

---

## Fases de implementación

---

### FASE 1: Skip de días ya sincronizados

**Archivo:** `backend/app/services/garmin_client.py`
**Método:** `backfill()` (línea 265)

**Qué hacer:**
Antes del loop, consultar la DB para obtener las fechas que YA tienen datos para este usuario en el rango solicitado. Solo sincronizar los días faltantes.

**Código exacto a agregar** (insertar al inicio del método `backfill`, después de `today = date.today()`):

```python
async def backfill(self, days: int = 30) -> dict:
    """Descargar datos históricos de los últimos N días.
    Retorna resumen de lo sincronizado."""
    today = date.today()
    
    # --- NUEVO: Skip días ya sincronizados ---
    start_date = today - timedelta(days=days - 1)
    result = await self.db.execute(
        select(DailyMetrics.date).where(
            DailyMetrics.user_id == self.user.id,
            DailyMetrics.date >= start_date,
            DailyMetrics.date <= today,
        )
    )
    existing_dates: set[date] = {row[0] for row in result.all()}
    
    dates_to_sync = [
        today - timedelta(days=i)
        for i in range(days)
        if (today - timedelta(days=i)) not in existing_dates
    ]
    # --- FIN NUEVO ---
    
    metrics_count = 0
    for target in dates_to_sync:  # <-- Cambiar: era range(days)
        try:
            result = await self.sync_daily_metrics(target)
            if result:
                metrics_count += 1
        except Exception as e:
            logger.warning(f"Error syncing metrics for {target}: {e}")

    new_activities = await self.sync_activities(start=0, limit=100, fetch_details=False)

    return {
        "metrics_synced": metrics_count,
        "days_skipped": len(existing_dates),
        "new_activities": len(new_activities),
    }
```

**Imports necesarios:** Ya existen todos (`select`, `date`, `timedelta`, `DailyMetrics`).

**Validación:** Si `dates_to_sync` está vacío, el loop no ejecuta y retorna inmediatamente con `metrics_synced: 0`.

---

### FASE 2: Paralelización con semáforo

**Archivo:** `backend/app/services/garmin_client.py`
**Método:** `backfill()` (reemplazar el loop secuencial de FASE 1)

**Qué hacer:**
Reemplazar el `for target in dates_to_sync` por ejecución concurrente con `asyncio.gather` + `asyncio.Semaphore` para limitar concurrencia y no saturar la API de Garmin.

**Código exacto** (reemplaza el bloque `metrics_count = 0 ... for target in dates_to_sync`):

```python
    # Paralelizar con semáforo para respetar rate limits de Garmin
    sem = asyncio.Semaphore(5)  # máximo 5 días en paralelo
    
    async def _sync_one_day(target_date: date) -> DailyMetrics | None:
        async with sem:
            try:
                return await self.sync_daily_metrics(target_date)
            except Exception as e:
                logger.warning(f"Error syncing metrics for {target_date}: {e}")
                return None

    results = await asyncio.gather(*[_sync_one_day(d) for d in dates_to_sync])
    metrics_count = sum(1 for r in results if r is not None)
```

**IMPORTANTE:** El `Semaphore(5)` es clave. NO usar un valor mayor a 5. Garmin aplica rate limiting agresivo y con más de 5 requests paralelos puede devolver 429 o banear temporalmente.

**IMPORTANTE:** `asyncio.to_thread` dentro de `sync_daily_metrics` ya maneja el thread pool. El semáforo controla cuántas corrutinas corren simultáneamente, no los threads.

---

### FASE 3: Modelo SyncJob para tracking de progreso

**Archivo:** `backend/app/models/models.py`

**Qué hacer:** Agregar el modelo `SyncJob` al final del archivo (antes de cualquier línea vacía final). Este modelo registra jobs de backfill para reportar progreso.

**Código exacto a agregar:**

```python
# ─── Sync Jobs ───────────────────────────────────────────────────────────────


class SyncJob(Base):
    __tablename__ = "sync_jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, running, completed, failed
    total_days: Mapped[int] = mapped_column(Integer)
    days_synced: Mapped[int] = mapped_column(Integer, default=0)
    days_skipped: Mapped[int] = mapped_column(Integer, default=0)
    new_activities: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    user: Mapped["User"] = relationship()
```

**Agregar relationship en User** (en la clase `User`, después de `insights`):

```python
    sync_jobs: Mapped[list["SyncJob"]] = relationship(back_populates="user")
```

Y cambiar en SyncJob el relationship a:
```python
    user: Mapped["User"] = relationship(back_populates="sync_jobs")
```

---

### FASE 4: Schema Pydantic para SyncJob

**Archivo:** `backend/app/models/schemas.py`

**Qué hacer:** Agregar al final del archivo los schemas de respuesta para sync jobs.

**Código exacto:**

```python
# ─── Sync Jobs ───────────────────────────────────────────────────────────────


class SyncJobResponse(BaseModel):
    id: uuid.UUID
    status: str
    total_days: int
    days_synced: int
    days_skipped: int
    new_activities: int
    error_message: str | None = None
    created_at: datetime
    completed_at: datetime | None = None

    model_config = {"from_attributes": True}


class BackfillStartResponse(BaseModel):
    job_id: uuid.UUID
    status: str
    message: str
```

---

### FASE 5: Migración Alembic

**Comando a ejecutar:**

```bash
cd backend && uv run alembic revision --autogenerate -m "add_sync_jobs_table"
```

Luego ejecutar:

```bash
cd backend && uv run alembic upgrade head
```

**Validación:** Verificar que la migración generada contiene `create_table('sync_jobs', ...)` con todas las columnas del modelo.

---

### FASE 6: Background task en el endpoint

**Archivo:** `backend/app/api/garmin.py`

**Qué hacer:** Modificar el endpoint `/backfill` para que:
1. Cree un `SyncJob` en estado "pending"
2. Lance el backfill como `BackgroundTask` de FastAPI
3. Retorne inmediatamente con el `job_id` (HTTP 202 Accepted)

**Reemplazar el endpoint completo `backfill_history`** (líneas 79-103):

```python
from fastapi import BackgroundTasks
from app.models.models import Activity, DailyMetrics, SyncJob, User

# ... (imports existentes se mantienen, agregar BackgroundTasks y SyncJob)


async def _run_backfill(job_id: uuid.UUID, user_id: uuid.UUID, days: int):
    """Ejecuta el backfill en background. Usa su propia sesión de DB."""
    from app.db.database import async_session_factory
    
    async with async_session_factory() as db:
        # Cargar job y user
        job = await db.get(SyncJob, job_id)
        user = await db.get(User, user_id)
        
        if not job or not user:
            return
        
        job.status = "running"
        await db.commit()
        
        try:
            client = GarminClient(user, db)
            await client.login()
            summary = await client.backfill(days=days)
            
            job.status = "completed"
            job.days_synced = summary["metrics_synced"]
            job.days_skipped = summary.get("days_skipped", 0)
            job.new_activities = summary["new_activities"]
            job.completed_at = datetime.utcnow()
            await db.commit()
        except Exception as e:
            job.status = "failed"
            job.error_message = str(e)[:500]
            job.completed_at = datetime.utcnow()
            await db.commit()


@router.post("/backfill", status_code=status.HTTP_202_ACCEPTED)
async def backfill_history(
    data: BackfillRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lanza backfill histórico en background. Retorna job_id para polling."""
    if not user.garmin_tokens:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cuenta Garmin no conectada. Usar POST /api/garmin/connect primero.",
        )

    # Verificar que puede autenticar antes de lanzar background job
    client = GarminClient(user, db)
    try:
        await client.login()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Error de autenticación con Garmin: {e}",
        )
    await db.commit()  # Persistir tokens actualizados

    # Crear job
    job = SyncJob(user_id=user.id, total_days=data.days)
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Lanzar en background
    background_tasks.add_task(_run_backfill, job.id, user.id, data.days)

    return {
        "job_id": job.id,
        "status": "pending",
        "message": f"Backfill de {data.days} días iniciado en background.",
    }
```

**Import adicional necesario en la parte superior del archivo:**

```python
import uuid
from datetime import date, datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
```

---

### FASE 7: Endpoint de status del job

**Archivo:** `backend/app/api/garmin.py`

**Qué hacer:** Agregar un nuevo endpoint GET para consultar el estado del job.

**Código exacto** (agregar después del endpoint `/backfill`):

```python
@router.get("/backfill/{job_id}", response_model=SyncJobResponse)
async def get_backfill_status(
    job_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Consultar estado de un backfill job."""
    result = await db.execute(
        select(SyncJob).where(
            SyncJob.id == job_id,
            SyncJob.user_id == user.id,
        )
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job no encontrado.",
        )
    return job
```

**Import adicional en schemas:** Agregar `SyncJobResponse` al import de schemas:

```python
from app.models.schemas import ActivityResponse, DailyMetricsResponse, SyncJobResponse
```

---

### FASE 8: Exponer session factory

**Archivo:** `backend/app/db/database.py`

**Qué hacer:** Verificar que `async_session_factory` está exportado. El background task necesita crear su propia sesión independiente del request.

La función `_run_backfill` importa `async_session_factory` desde `app.db.database`. Verificar que ese nombre existe. Si el archivo usa otro nombre (por ejemplo `AsyncSessionLocal` o `get_db` como generador), crear un alias:

```python
# Si la session factory se llama distinto, agregar:
async_session_factory = AsyncSessionLocal  # o el nombre que tenga
```

El factory debe ser un `async_sessionmaker` que se pueda usar como context manager:
```python
async with async_session_factory() as session:
    ...
```

Si actualmente solo expone un generador `get_db()`, agregar la factory directamente:

```python
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine, AsyncSession

engine = create_async_engine(settings.database_url)
async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    async with async_session_factory() as session:
        yield session
```

---

### FASE 9: Retry con backoff para rate limiting

**Archivo:** `backend/app/services/garmin_client.py`
**Método:** `_fetch_day_data_sync()` (línea 52)

**Qué hacer:** Agregar retry con exponential backoff en la función `safe()` interna para manejar errores 429 (Too Many Requests) de Garmin.

**Reemplazar la función `safe` dentro de `_fetch_day_data_sync`:**

```python
    def safe(fn, *args, default=None):
        """Ejecutar con retry en caso de rate limit (429)."""
        max_retries = 3
        for attempt in range(max_retries):
            try:
                result = fn(*args)
                return result if result is not None else default
            except Exception as e:
                error_str = str(e)
                # Si es rate limit, esperar con backoff exponencial
                if "429" in error_str or "too many" in error_str.lower():
                    if attempt < max_retries - 1:
                        import time
                        time.sleep(2 ** attempt)  # 1s, 2s, 4s
                        continue
                return default
```

**NOTA:** `time.sleep` es correcto aquí porque estamos DENTRO de `asyncio.to_thread` (ya estamos en un thread separado). NO usar `asyncio.sleep` aquí.

---

### FASE 10: Actualizar endpoint /connect

**Archivo:** `backend/app/api/garmin.py`
**Endpoint:** `POST /connect` (línea 26)

**Qué hacer:** El `/connect` actual ejecuta `client.backfill(days=30)` de forma síncrona. Cambiarlo para que también use background task.

**Reemplazar el endpoint completo:**

```python
@router.post("/connect", status_code=status.HTTP_202_ACCEPTED)
async def connect_garmin(
    data: GarminConnectRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Conectar cuenta de Garmin Connect por primera vez.
    Guarda tokens y lanza backfill de 30 días en background."""
    client = GarminClient(user, db)
    try:
        await client.connect_account(data.email, data.password)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al conectar con Garmin: {e}",
        )
    await db.commit()

    # Crear job de backfill
    job = SyncJob(user_id=user.id, total_days=30)
    db.add(job)
    await db.commit()
    await db.refresh(job)

    background_tasks.add_task(_run_backfill, job.id, user.id, 30)

    return {
        "status": "connected",
        "job_id": job.id,
        "message": "Cuenta conectada. Backfill de 30 días iniciado en background.",
    }
```

---

## Resumen de cambios por archivo

### `backend/app/services/garmin_client.py`
1. FASE 1: Agregar consulta de fechas existentes antes del loop
2. FASE 2: Reemplazar loop secuencial por `asyncio.gather` + `Semaphore(5)`
3. FASE 9: Agregar retry con backoff en `safe()`

### `backend/app/api/garmin.py`
1. FASE 6: Convertir `/backfill` a background task (HTTP 202)
2. FASE 7: Agregar `GET /backfill/{job_id}`
3. FASE 10: Convertir `/connect` a background task

### `backend/app/models/models.py`
1. FASE 3: Agregar modelo `SyncJob`

### `backend/app/models/schemas.py`
1. FASE 4: Agregar `SyncJobResponse` y `BackfillStartResponse`

### `backend/app/db/database.py`
1. FASE 8: Exponer `async_session_factory`

### Migración Alembic
1. FASE 5: Generar y ejecutar migración

---

## Orden de ejecución obligatorio

```
FASE 3 → FASE 4 → FASE 5 → FASE 8 → FASE 1 → FASE 2 → FASE 9 → FASE 6 → FASE 7 → FASE 10
```

Razón: Los modelos y la DB deben existir antes de que el código los use.

---

## Restricciones

- **NO** modificar la lógica de extracción de datos dentro de `sync_daily_metrics()`. Los campos extraídos y la estructura del upsert se mantienen exactos.
- **NO** cambiar el modelo `DailyMetrics` ni `Activity`.
- **NO** agregar dependencias nuevas. Todo se resuelve con `asyncio`, `FastAPI.BackgroundTasks`, y SQLAlchemy que ya están en el proyecto.
- **NO** usar Celery, Redis, ni ningún broker externo. El `BackgroundTasks` de FastAPI es suficiente para este caso.
- **NO** cambiar los endpoints `GET /metrics` ni `GET /activities`. Solo se modifican `/backfill`, `/connect`, y se agrega `/backfill/{job_id}`.
- **Semaphore DEBE ser 5.** No subir. Garmin banea con concurrencia alta.
- **NO** cambiar la signature pública de `sync_daily_metrics()` ni `sync_activities()`.

---

## Validación final

Después de implementar todas las fases:

1. `POST /api/garmin/backfill` retorna HTTP 202 con `job_id` en <1 segundo
2. `GET /api/garmin/backfill/{job_id}` muestra progreso (pending → running → completed)
3. Un segundo `POST /api/garmin/backfill` con los mismos días skippea los ya sincronizados
4. El backfill de 30 días completa en <15 segundos (vs 30-60 antes)
5. No hay errores 429 de Garmin con Semaphore(5)
6. `POST /api/garmin/connect` retorna inmediatamente y backfill corre en background

---

## Impacto en frontend

El frontend deberá adaptarse para:
1. Recibir `job_id` del POST backfill/connect
2. Hacer polling a `GET /backfill/{job_id}` cada 2-3 segundos
3. Mostrar barra de progreso con `days_synced / total_days`

Esto es trabajo SEPARADO y NO está incluido en este plan. Este plan es solo backend.

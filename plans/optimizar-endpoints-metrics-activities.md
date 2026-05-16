# Plan: Optimizar endpoints de metrics y activities

## Context

Los endpoints GET `/api/garmin/metrics` y `/api/garmin/activities` tienen problemas de rendimiento: sin paginación, sin índices compuestos, carga de columnas JSONB innecesarias. Además, `sync_activities` tiene un problema N+1 (SELECT por cada actividad en loop) y el backfill filtra fechas en Python. Este plan cubre todas las optimizaciones identificadas.

---

## Paso 1: Índices compuestos en modelos ORM

**Archivo:** `backend/app/models/models.py`

### 1.1 Agregar import de `Index`

En línea 4, agregar `Index` al import de sqlalchemy:

```python
from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
```

### 1.2 Agregar `__table_args__` a DailyMetrics

Después de la línea `__tablename__ = "daily_metrics"` (línea 99), agregar:

```python
__table_args__ = (
    Index("ix_daily_metrics_user_date", "user_id", "date"),
)
```

### 1.3 Agregar `index=True` al `user_id` de DailyMetrics

Cambiar línea 102:
```python
# ANTES
user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
# DESPUÉS
user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
```

### 1.4 Agregar `__table_args__` a Activity

Después de la línea `__tablename__ = "activities"` (línea 145), agregar:

```python
__table_args__ = (
    Index("ix_activities_user_date", "user_id", "date"),
)
```

### 1.5 Agregar `index=True` al `user_id` de Activity

Cambiar línea 148:
```python
# ANTES
user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
# DESPUÉS
user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
```

---

## Paso 2: Migración Alembic para los nuevos índices

Ejecutar:
```bash
cd backend && uv run alembic revision --autogenerate -m "add composite indexes user_date on metrics and activities"
```

Verificar que el archivo generado contenga:
- `op.create_index('ix_daily_metrics_user_date', 'daily_metrics', ['user_id', 'date'])`
- `op.create_index('ix_activities_user_date', 'activities', ['user_id', 'date'])`
- Índices individuales en `user_id` para ambas tablas

Luego aplicar: `uv run alembic upgrade head`

---

## Paso 3: Paginación en endpoints

**Archivo:** `backend/app/api/garmin.py`

### 3.1 Endpoint GET `/metrics` (líneas 182-199)

Reemplazar la función completa por:

```python
@router.get("/metrics", response_model=list[DailyMetricsResponse])
async def get_metrics(
    start_date: date = Query(...),
    end_date: date = Query(...),
    limit: int = Query(default=90, ge=1, le=365),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Obtener métricas diarias en un rango de fechas."""
    result = await db.execute(
        select(DailyMetrics)
        .where(
            DailyMetrics.user_id == user.id,
            DailyMetrics.date >= start_date,
            DailyMetrics.date <= end_date,
        )
        .order_by(DailyMetrics.date)
        .limit(limit)
        .offset(offset)
    )
    return result.scalars().all()
```

### 3.2 Endpoint GET `/activities` (líneas 202-219)

Reemplazar la función completa por:

```python
@router.get("/activities", response_model=list[ActivityResponse])
async def get_activities(
    start_date: date = Query(...),
    end_date: date = Query(...),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Obtener actividades trackeadas en un rango de fechas."""
    result = await db.execute(
        select(Activity)
        .where(
            Activity.user_id == user.id,
            Activity.date >= start_date,
            Activity.date <= end_date,
        )
        .order_by(Activity.date.desc())
        .limit(limit)
        .offset(offset)
    )
    return result.scalars().all()
```

---

## Paso 4: Excluir `raw_data` de queries con `load_only`

**Archivo:** `backend/app/api/garmin.py`

### 4.1 Agregar import

Agregar al bloque de imports de sqlalchemy (línea 6):

```python
from sqlalchemy import select
from sqlalchemy.orm import load_only
```

### 4.2 Aplicar `load_only` en endpoint metrics

En el `select(DailyMetrics)` del endpoint GET `/metrics`, agregar `.options(...)` antes del `.where(...)`:

```python
result = await db.execute(
    select(DailyMetrics)
    .options(
        load_only(
            DailyMetrics.id,
            DailyMetrics.date,
            DailyMetrics.resting_hr,
            DailyMetrics.max_hr,
            DailyMetrics.avg_hr,
            DailyMetrics.hrv_weekly_avg,
            DailyMetrics.hrv_last_night,
            DailyMetrics.sleep_score,
            DailyMetrics.sleep_hours,
            DailyMetrics.deep_sleep_hours,
            DailyMetrics.light_sleep_hours,
            DailyMetrics.rem_sleep_hours,
            DailyMetrics.avg_stress,
            DailyMetrics.body_battery_morning,
            DailyMetrics.body_battery_end,
            DailyMetrics.training_readiness,
            DailyMetrics.vo2_max,
            DailyMetrics.steps,
            DailyMetrics.active_calories,
        )
    )
    .where(
        DailyMetrics.user_id == user.id,
        DailyMetrics.date >= start_date,
        DailyMetrics.date <= end_date,
    )
    .order_by(DailyMetrics.date)
    .limit(limit)
    .offset(offset)
)
```

### 4.3 Aplicar `load_only` en endpoint activities

En el `select(Activity)` del endpoint GET `/activities`, agregar `.options(...)`:

```python
result = await db.execute(
    select(Activity)
    .options(
        load_only(
            Activity.id,
            Activity.garmin_activity_id,
            Activity.date,
            Activity.activity_type,
            Activity.name,
            Activity.duration_seconds,
            Activity.distance_meters,
            Activity.avg_hr,
            Activity.max_hr,
            Activity.calories,
            Activity.avg_pace,
            Activity.cadence,
            Activity.ground_contact_time,
            Activity.ground_contact_balance,
            Activity.stride_length,
            Activity.vertical_oscillation,
            Activity.created_at,
        )
    )
    .where(
        Activity.user_id == user.id,
        Activity.date >= start_date,
        Activity.date <= end_date,
    )
    .order_by(Activity.date.desc())
    .limit(limit)
    .offset(offset)
)
```

---

## Paso 5: Fix N+1 en `sync_activities`

**Archivo:** `backend/app/services/garmin_client.py`

### 5.1 Reemplazar el loop con SELECT individual (líneas 209-218)

Reemplazar todo el bloque del método `sync_activities` desde línea 206 hasta 271. El nuevo código:

```python
async def sync_activities(self, start: int = 0, limit: int = 20, fetch_details: bool = True) -> list[Activity]:
    """Descargar actividades recientes y guardar las nuevas (dedup por garmin_activity_id).
    Retorna lista de actividades nuevas insertadas."""
    if not self.client:
        raise RuntimeError("Llamar a login() primero")

    raw_activities = self.client.get_activities(start, limit)
    new_activities: list[Activity] = []

    # Extraer todos los garmin_activity_id de las actividades descargadas
    garmin_ids = [str(raw.get("activityId", "")) for raw in raw_activities]
    garmin_ids = [gid for gid in garmin_ids if gid]  # Filtrar vacíos

    # UNA SOLA query para saber cuáles ya existen
    existing_result = await self.db.execute(
        select(Activity.garmin_activity_id).where(
            Activity.garmin_activity_id.in_(garmin_ids)
        )
    )
    existing_ids: set[str] = {row[0] for row in existing_result.all()}

    for raw in raw_activities:
        garmin_id = str(raw.get("activityId", ""))
        if not garmin_id or garmin_id in existing_ids:
            continue

        activity_date_str = raw.get("startTimeLocal", "")[:10]
        try:
            activity_date = date.fromisoformat(activity_date_str)
        except ValueError:
            activity_date = date.today()

        activity_type_raw = raw.get("activityType", {})
        activity_type = "other"
        if isinstance(activity_type_raw, dict):
            type_key = activity_type_raw.get("typeKey", "other")
            activity_type = type_key

        ground_contact_time = None
        ground_contact_balance = None
        stride_length = None
        vertical_oscillation = None
        if fetch_details:
            try:
                detail = self.client.get_activity(raw["activityId"])
                if isinstance(detail, dict):
                    summary = detail.get("summaryDTO", {})
                    if isinstance(summary, dict):
                        ground_contact_time = summary.get("groundContactTime")
                        ground_contact_balance = summary.get("groundContactBalanceLeft")
                        stride_length = summary.get("strideLength")
                        vertical_oscillation = summary.get("verticalOscillation")
            except Exception:
                pass

        activity = Activity(
            user_id=self.user.id,
            garmin_activity_id=garmin_id,
            date=activity_date,
            activity_type=activity_type,
            name=raw.get("activityName"),
            duration_seconds=int(raw["duration"]) if raw.get("duration") else None,
            distance_meters=raw.get("distance"),
            avg_hr=raw.get("averageHR"),
            max_hr=raw.get("maxHR"),
            calories=raw.get("calories"),
            avg_pace=raw.get("averageSpeed"),
            cadence=raw.get("averageRunningCadenceInStepsPerMinute"),
            ground_contact_time=ground_contact_time,
            ground_contact_balance=ground_contact_balance,
            stride_length=stride_length,
            vertical_oscillation=vertical_oscillation,
            raw_data=raw,
        )
        self.db.add(activity)
        new_activities.append(activity)

    await self.db.flush()
    return new_activities
```

**Cambio clave:** Se reemplaza N queries (`SELECT ... WHERE garmin_activity_id = X` dentro del loop) por 1 sola query con `IN(...)` antes del loop.

---

## Paso 6: Optimizar backfill — usar `load_only` en query de fechas existentes

**Archivo:** `backend/app/services/garmin_client.py`

La query actual en líneas 280-287 ya es razonable (solo selecciona `DailyMetrics.date`), pero el patrón de generar `dates_to_sync` en Python es correcto para este caso. La optimización real aquí es que **ya está optimizado** — solo trae la columna `date`, no el modelo completo. No requiere cambios.

> Nota: El filtrado en Python con set es O(1) por lookup y el dataset es pequeño (max 365 fechas). No hay ganancia real moviendo esto a SQL.

---

## Paso 7: Hacer `fetch_details` configurable en trigger_sync

**Archivo:** `backend/app/api/garmin.py`

Buscar la llamada a `sync_activities` dentro del endpoint o background task `trigger_sync`. Actualmente dice:

```python
await client.sync_activities(start=0, limit=10)
```

Cambiar a:

```python
await client.sync_activities(start=0, limit=10, fetch_details=False)
```

Esto evita N llamadas HTTP extra a Garmin API por cada actividad en syncs manuales rápidos. Los detalles de running dynamics se pueden obtener con un endpoint dedicado si se necesitan.

---

## Resumen de archivos a modificar

| Archivo | Cambios |
|---------|---------|
| `backend/app/models/models.py` | Import `Index`, `__table_args__` con índice compuesto en DailyMetrics y Activity, `index=True` en user_id |
| `backend/app/api/garmin.py` | Import `load_only`, paginación (limit/offset) en ambos endpoints, `load_only` para excluir raw_data, `fetch_details=False` en trigger_sync |
| `backend/app/services/garmin_client.py` | Reescribir `sync_activities` para eliminar N+1 con query batch `IN(...)` |
| Nueva migración Alembic | Crear y aplicar migración para los nuevos índices |

---

## Verificación

1. `make dev-db` — levantar PostgreSQL
2. `cd backend && uv run alembic upgrade head` — aplicar migración
3. `make dev-back` — verificar que el backend inicia sin errores
4. Probar endpoints manualmente:
   - `GET /api/garmin/metrics?start_date=2025-01-01&end_date=2025-12-31` → debe respetar limit=90 por default
   - `GET /api/garmin/metrics?start_date=2025-01-01&end_date=2025-12-31&limit=10&offset=5` → paginación funciona
   - `GET /api/garmin/activities?start_date=2025-01-01&end_date=2025-12-31&limit=5` → máximo 5 resultados
5. Verificar que el frontend no se rompe (no esperaba paginación, pero los defaults cubren el uso actual)
6. Verificar que `raw_data` NO aparece en la respuesta JSON (ya no estaba en el schema, pero ahora tampoco se carga de DB)

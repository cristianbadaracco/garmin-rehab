# Fase 1 — MVP: Dashboard + datos Garmin

Plan detallado para implementar la Fase 1 del roadmap. Cada tarea es autocontenida, con archivos exactos a crear/modificar, código a escribir, y criterio de verificación.

**Prerequisitos**: `make install` ejecutado, `.env` creado a partir de `.env.example` con credenciales reales, Docker corriendo (`make dev-db`).

---

## Orden de ejecución

```
T01 → T02 → T03 → T04 → T05 → T06 → T07 → T08 → T09 → T10
```

No hay tareas paralelizables. Cada tarea depende de la anterior.

---

## T01 — Migración inicial de base de datos

**Objetivo**: Crear las tablas en PostgreSQL a partir de los modelos ORM existentes.

**Estado actual**: Existe `backend/alembic/versions/0fda66f12673_initial.py` (migración ya generada). Alembic está configurado en `backend/alembic.ini` con URL async y `backend/alembic/env.py` importa `Base` de `app.models.models`.

**Acciones**:

1. Verificar que Docker postgres esté corriendo:
   ```bash
   make dev-db
   ```
2. Ejecutar la migración existente:
   ```bash
   make migrate
   ```
3. Verificar que las 8 tablas fueron creadas:
   ```bash
   docker exec -it $(docker ps -q -f ancestor=postgres:16-alpine) psql -U dev -d garmin_rehab -c "\dt"
   ```
   Tablas esperadas: `users`, `injuries`, `pain_logs`, `daily_metrics`, `activities`, `sessions`, `session_blocks`, `ai_insights`, `alembic_version`.

**Criterio de éxito**: `make migrate` sale sin error y las 8 tablas existen.

**Archivos modificados**: ninguno.

---

## T02 — Schemas de autenticación

**Objetivo**: Agregar schemas Pydantic para register, login, y token response.

**Archivo a modificar**: `backend/app/models/schemas.py`

**Acciones**:

1. Agregar al final de `backend/app/models/schemas.py` (antes de la sección `# ─── Dashboard Summary`), una nueva sección:

```python
# ─── Auth ────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: str = Field(max_length=255)
    password: str = Field(min_length=8)
    name: str = Field(max_length=100)


class UserLogin(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    created_at: datetime
    has_garmin: bool  # True si garmin_tokens no es None

    model_config = {"from_attributes": True}
```

**Criterio de éxito**: El backend arranca sin errores (`make dev-back`).

---

## T03 — Dependency de autenticación JWT

**Objetivo**: Crear la función `get_current_user` que extrae el usuario del JWT token en el header Authorization.

**Archivo a crear**: `backend/app/api/deps.py`

**Contenido exacto**:

```python
import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.database import get_db
from app.models.models import User

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extrae y valida el JWT del header Authorization.
    Retorna el User de la DB o lanza 401."""
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido: falta 'sub'",
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
        )

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado",
        )
    return user
```

**Criterio de éxito**: El archivo existe, el backend arranca sin errores.

---

## T04 — Implementar endpoints de auth

**Objetivo**: Register crea un usuario con password hasheado. Login verifica credenciales y devuelve JWT.

**Archivo a modificar**: `backend/app/api/auth.py`

**Reemplazar TODO el contenido** con:

```python
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.config import settings
from app.db.database import get_db
from app.models.models import User
from app.models.schemas import TokenResponse, UserLogin, UserRegister, UserResponse

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _create_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expiration_hours)
    return jwt.encode(
        {"sub": user_id, "exp": expire},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


@router.post("/register", response_model=TokenResponse)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    """Registrar nuevo usuario. Devuelve JWT."""
    # Verificar que el email no exista
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un usuario con ese email",
        )

    user = User(
        email=data.email,
        hashed_password=pwd_context.hash(data.password),
        name=data.name,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    return TokenResponse(access_token=_create_token(str(user.id)))


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    """Login con email/password. Devuelve JWT."""
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not pwd_context.verify(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o password incorrectos",
        )

    return TokenResponse(access_token=_create_token(str(user.id)))


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    """Obtener datos del usuario autenticado."""
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        created_at=user.created_at,
        has_garmin=user.garmin_tokens is not None,
    )
```

**Criterio de éxito**: Se puede llamar a los 3 endpoints desde terminal:
```bash
# Registrar
curl -s -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"12345678","name":"Test User"}' | python -m json.tool

# Login
curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"12345678"}' | python -m json.tool

# Me (usar token del paso anterior)
curl -s http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer <TOKEN>" | python -m json.tool
```

---

## T05 — Proteger rutas existentes con autenticación

**Objetivo**: Todas las rutas de medical, sessions, garmin, y analysis deben requerir JWT y usar el `user_id` del usuario autenticado en lugar de `uuid.uuid4()`.

### T05a — Modificar `backend/app/api/medical.py`

**Cambios**:

1. Agregar import de `get_current_user` y `User`:
   ```python
   from app.api.deps import get_current_user
   from app.models.models import Injury, PainLog, User
   ```

2. En `create_injury`: agregar parámetro `user: User = Depends(get_current_user)`. Reemplazar `user_id=uuid.uuid4()` por `user_id=user.id`.

3. En `get_injuries`: agregar parámetro `user: User = Depends(get_current_user)`. Agregar filtro `.where(Injury.user_id == user.id)` a la query.

4. En `update_injury_phase`: agregar parámetro `user: User = Depends(get_current_user)`. Agregar filtro `.where(Injury.user_id == user.id)` a la query del select.

5. En `create_pain_log`: agregar parámetro `user: User = Depends(get_current_user)`. Reemplazar `user_id=uuid.uuid4()` por `user_id=user.id`.

6. En `get_pain_logs`: agregar parámetro `user: User = Depends(get_current_user)`. Agregar filtro `.where(PainLog.user_id == user.id)` a la query.

7. Eliminar `import uuid` del archivo (ya no se usa).

### T05b — Modificar `backend/app/api/sessions.py`

**Cambios**:

1. Agregar import:
   ```python
   from app.api.deps import get_current_user
   from app.models.models import Session, SessionBlock, User
   ```

2. En `create_session`: agregar parámetro `user: User = Depends(get_current_user)`. Reemplazar `user_id=uuid.uuid4()` por `user_id=user.id`.

3. En `get_sessions`: agregar parámetro `user: User = Depends(get_current_user)`. Agregar filtro `.where(Session.user_id == user.id)`.

4. Eliminar `import uuid` del archivo.

### T05c — Modificar `backend/app/api/garmin.py`

**Cambios**:

1. Agregar import:
   ```python
   from app.api.deps import get_current_user
   from app.models.models import Activity, DailyMetrics, User
   ```

2. En `trigger_sync`: agregar parámetro `user: User = Depends(get_current_user)`.

3. En `get_metrics`: agregar parámetro `user: User = Depends(get_current_user)`. Agregar filtro `.where(DailyMetrics.user_id == user.id)`.

4. En `get_activities`: agregar parámetro `user: User = Depends(get_current_user)`. Agregar filtro `.where(Activity.user_id == user.id)`.

### T05d — Modificar `backend/app/api/analysis.py`

**Cambios**:

1. Agregar import:
   ```python
   from app.api.deps import get_current_user
   from app.models.models import AIInsight, User
   ```

2. En `get_insights`: agregar parámetro `user: User = Depends(get_current_user)`. Agregar filtro `.where(AIInsight.user_id == user.id)`.

3. En `generate_daily_analysis`: agregar parámetro `user: User = Depends(get_current_user)`.

4. En `get_recovery_progress`: agregar parámetro `user: User = Depends(get_current_user)`.

5. Eliminar `import uuid` si existe.

**Criterio de éxito**: Todas las rutas devuelven 403 sin token y funcionan con token válido.

---

## T06 — Garmin client service

**Objetivo**: Crear el servicio que se conecta a Garmin Connect, descarga métricas diarias y actividades, y las guarda en la DB.

**Archivo a crear**: `backend/app/services/garmin_client.py`

**Contenido**:

```python
"""Cliente de Garmin Connect. Descarga métricas diarias y actividades."""

import logging
from datetime import date, timedelta

from garminconnect import Garmin
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Activity, DailyMetrics, User

logger = logging.getLogger(__name__)


class GarminClient:
    """Wrapper sobre garminconnect que maneja auth y descarga datos."""

    def __init__(self, user: User, db: AsyncSession):
        self.user = user
        self.db = db
        self.client: Garmin | None = None

    async def login(self) -> None:
        """Autenticar con Garmin Connect usando tokens guardados o credenciales."""
        if self.user.garmin_tokens:
            self.client = Garmin()
            self.client.login(self.user.garmin_tokens)
        else:
            raise ValueError(
                "No hay tokens de Garmin guardados. "
                "El usuario debe conectar su cuenta primero."
            )
        # Actualizar tokens en DB después del login (pueden haber sido refrescados)
        self.user.garmin_tokens = self.client.session_data
        await self.db.flush()

    async def connect_account(self, email: str, password: str) -> None:
        """Primera conexión: login con credenciales y guardar tokens."""
        self.client = Garmin(email, password)
        self.client.login()
        self.user.garmin_tokens = self.client.session_data
        await self.db.flush()

    async def sync_daily_metrics(self, target_date: date) -> DailyMetrics | None:
        """Descargar métricas de un día y hacer upsert en DB.
        Retorna el registro creado/actualizado o None si no hay datos."""
        if not self.client:
            raise RuntimeError("Llamar a login() primero")

        date_str = target_date.isoformat()

        # Obtener datos de Garmin (cada llamada puede fallar si no hay datos para ese día)
        try:
            heart_rates = self.client.get_heart_rates(date_str)
        except Exception:
            heart_rates = {}

        try:
            hrv = self.client.get_hrv_data(date_str)
        except Exception:
            hrv = {}

        try:
            sleep = self.client.get_sleep_data(date_str)
        except Exception:
            sleep = {}

        try:
            stress = self.client.get_stress_data(date_str)
        except Exception:
            stress = {}

        try:
            body_battery = self.client.get_body_battery(date_str)
        except Exception:
            body_battery = []

        try:
            stats = self.client.get_stats(date_str)
        except Exception:
            stats = {}

        try:
            resting_hr_data = self.client.get_resting_heart_rate(date_str)
        except Exception:
            resting_hr_data = {}

        # Extraer valores. Los campos son nullable, así que None es válido.
        resting_hr = None
        if isinstance(resting_hr_data, dict):
            resting_hr = resting_hr_data.get("restingHeartRate")

        avg_hr = heart_rates.get("restingHeartRate") if isinstance(heart_rates, dict) else None
        max_hr = heart_rates.get("maxHeartRate") if isinstance(heart_rates, dict) else None

        hrv_weekly_avg = None
        hrv_last_night = None
        if isinstance(hrv, dict):
            hrv_summary = hrv.get("hrvSummary", {})
            if isinstance(hrv_summary, dict):
                hrv_weekly_avg = hrv_summary.get("weeklyAvg")
                hrv_last_night = hrv_summary.get("lastNight")

        sleep_score = None
        sleep_hours = None
        deep_sleep_hours = None
        light_sleep_hours = None
        rem_sleep_hours = None
        if isinstance(sleep, dict):
            daily_sleep = sleep.get("dailySleepDTO", {})
            if isinstance(daily_sleep, dict):
                sleep_score = daily_sleep.get("sleepScores", {}).get("overall", {}).get("value")
                sleep_seconds = daily_sleep.get("sleepTimeSeconds")
                sleep_hours = round(sleep_seconds / 3600, 2) if sleep_seconds else None
                deep_seconds = daily_sleep.get("deepSleepSeconds")
                deep_sleep_hours = round(deep_seconds / 3600, 2) if deep_seconds else None
                light_seconds = daily_sleep.get("lightSleepSeconds")
                light_sleep_hours = round(light_seconds / 3600, 2) if light_seconds else None
                rem_seconds = daily_sleep.get("remSleepSeconds")
                rem_sleep_hours = round(rem_seconds / 3600, 2) if rem_seconds else None

        avg_stress = None
        if isinstance(stress, dict):
            avg_stress = stress.get("overallStressLevel")

        body_battery_morning = None
        body_battery_end = None
        if isinstance(body_battery, list) and len(body_battery) > 0:
            body_battery_morning = body_battery[0].get("charged") if isinstance(body_battery[0], dict) else None
            body_battery_end = body_battery[-1].get("charged") if isinstance(body_battery[-1], dict) else None

        steps = stats.get("totalSteps") if isinstance(stats, dict) else None
        active_calories = stats.get("activeKilocalories") if isinstance(stats, dict) else None

        training_readiness = None
        try:
            tr_data = self.client.get_training_readiness(date_str)
            if isinstance(tr_data, dict):
                training_readiness = tr_data.get("score")
        except Exception:
            pass

        vo2_max = None
        try:
            max_metrics = self.client.get_max_metrics(date_str)
            if isinstance(max_metrics, dict):
                generic = max_metrics.get("generic", {})
                if isinstance(generic, dict):
                    vo2_max = generic.get("vo2MaxValue")
        except Exception:
            pass

        # Upsert: buscar registro existente para ese user+date
        result = await self.db.execute(
            select(DailyMetrics).where(
                DailyMetrics.user_id == self.user.id,
                DailyMetrics.date == target_date,
            )
        )
        metrics = result.scalar_one_or_none()

        if metrics is None:
            metrics = DailyMetrics(user_id=self.user.id, date=target_date)
            self.db.add(metrics)

        # Actualizar campos
        metrics.resting_hr = resting_hr
        metrics.max_hr = max_hr
        metrics.avg_hr = avg_hr
        metrics.hrv_weekly_avg = hrv_weekly_avg
        metrics.hrv_last_night = hrv_last_night
        metrics.sleep_score = sleep_score
        metrics.sleep_hours = sleep_hours
        metrics.deep_sleep_hours = deep_sleep_hours
        metrics.light_sleep_hours = light_sleep_hours
        metrics.rem_sleep_hours = rem_sleep_hours
        metrics.avg_stress = avg_stress
        metrics.body_battery_morning = body_battery_morning
        metrics.body_battery_end = body_battery_end
        metrics.training_readiness = training_readiness
        metrics.vo2_max = vo2_max
        metrics.steps = steps
        metrics.active_calories = active_calories
        metrics.raw_data = {
            "heart_rates": heart_rates if isinstance(heart_rates, dict) else {},
            "hrv": hrv if isinstance(hrv, dict) else {},
            "sleep": sleep if isinstance(sleep, dict) else {},
            "stress": stress if isinstance(stress, dict) else {},
            "stats": stats if isinstance(stats, dict) else {},
        }

        await self.db.flush()
        await self.db.refresh(metrics)
        return metrics

    async def sync_activities(self, start: int = 0, limit: int = 20) -> list[Activity]:
        """Descargar actividades recientes y guardar las nuevas (dedup por garmin_activity_id).
        Retorna lista de actividades nuevas insertadas."""
        if not self.client:
            raise RuntimeError("Llamar a login() primero")

        raw_activities = self.client.get_activities(start, limit)
        new_activities: list[Activity] = []

        for raw in raw_activities:
            garmin_id = str(raw.get("activityId", ""))
            if not garmin_id:
                continue

            # Dedup: si ya existe, skip
            existing = await self.db.execute(
                select(Activity).where(Activity.garmin_activity_id == garmin_id)
            )
            if existing.scalar_one_or_none():
                continue

            # Parsear fecha de la actividad
            activity_date_str = raw.get("startTimeLocal", "")[:10]  # "2025-01-15 08:30:00"
            try:
                activity_date = date.fromisoformat(activity_date_str)
            except ValueError:
                activity_date = date.today()

            # Mapear tipo de actividad
            activity_type_raw = raw.get("activityType", {})
            activity_type = "other"
            if isinstance(activity_type_raw, dict):
                type_key = activity_type_raw.get("typeKey", "other")
                activity_type = type_key

            # Obtener running dynamics si es actividad de running
            ground_contact_time = None
            ground_contact_balance = None
            stride_length = None
            vertical_oscillation = None
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
                avg_pace=raw.get("averageSpeed"),  # m/s, convertir a min/km en frontend
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

    async def backfill(self, days: int = 30) -> dict:
        """Descargar datos históricos de los últimos N días.
        Retorna resumen de lo sincronizado."""
        today = date.today()
        metrics_count = 0
        for i in range(days):
            target = today - timedelta(days=i)
            try:
                result = await self.sync_daily_metrics(target)
                if result:
                    metrics_count += 1
            except Exception as e:
                logger.warning(f"Error syncing metrics for {target}: {e}")

        new_activities = await self.sync_activities(start=0, limit=100)

        return {
            "metrics_synced": metrics_count,
            "new_activities": len(new_activities),
        }
```

**Criterio de éxito**: El archivo existe, el backend arranca sin errores. No se puede testear sin credenciales Garmin reales.

---

## T07 — Endpoints de conexión y sync Garmin

**Objetivo**: Agregar endpoint para conectar cuenta Garmin (primera vez) y mejorar el endpoint de sync.

**Archivo a modificar**: `backend/app/api/garmin.py`

**Reemplazar TODO el contenido** con:

```python
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.models import Activity, DailyMetrics, User
from app.models.schemas import ActivityResponse, DailyMetricsResponse
from app.services.garmin_client import GarminClient

router = APIRouter()


class GarminConnectRequest(BaseModel):
    email: str
    password: str


@router.post("/connect")
async def connect_garmin(
    data: GarminConnectRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Conectar cuenta de Garmin Connect por primera vez.
    Guarda tokens y hace backfill de 30 días."""
    client = GarminClient(user, db)
    try:
        await client.connect_account(data.email, data.password)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al conectar con Garmin: {e}",
        )

    # Backfill inicial
    summary = await client.backfill(days=30)
    return {"status": "connected", **summary}


@router.post("/sync")
async def trigger_sync(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Sync manual: descarga métricas de hoy y actividades recientes."""
    if not user.garmin_tokens:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cuenta Garmin no conectada. Usar POST /api/garmin/connect primero.",
        )

    client = GarminClient(user, db)
    try:
        await client.login()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Error de autenticación con Garmin: {e}",
        )

    today = date.today()
    await client.sync_daily_metrics(today)
    new_activities = await client.sync_activities(start=0, limit=10)

    return {
        "status": "synced",
        "date": today.isoformat(),
        "new_activities": len(new_activities),
    }


@router.get("/metrics", response_model=list[DailyMetricsResponse])
async def get_metrics(
    start_date: date = Query(...),
    end_date: date = Query(...),
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
    )
    return result.scalars().all()


@router.get("/activities", response_model=list[ActivityResponse])
async def get_activities(
    start_date: date = Query(...),
    end_date: date = Query(...),
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
    )
    return result.scalars().all()
```

**Criterio de éxito**: Backend arranca. `POST /api/garmin/connect` con credenciales reales descarga datos.

---

## T08 — Sync service periódico

**Objetivo**: APScheduler ejecuta sync de Garmin cada hora para todos los usuarios con cuenta conectada.

**Archivo a crear**: `backend/app/services/sync_service.py`

**Contenido**:

```python
"""Servicio de sincronización periódica con Garmin Connect."""

import asyncio
import logging
from datetime import date

from sqlalchemy import select

from app.db.database import async_session
from app.models.models import User
from app.services.garmin_client import GarminClient

logger = logging.getLogger(__name__)


async def sync_all_users() -> None:
    """Sincronizar métricas de hoy y actividades recientes para todos los usuarios
    que tengan cuenta Garmin conectada."""
    async with async_session() as db:
        result = await db.execute(
            select(User).where(User.garmin_tokens.isnot(None))
        )
        users = result.scalars().all()

        for user in users:
            try:
                client = GarminClient(user, db)
                await client.login()

                today = date.today()
                await client.sync_daily_metrics(today)
                await client.sync_activities(start=0, limit=10)

                await db.commit()
                logger.info(f"Sync OK para usuario {user.email}")
            except Exception as e:
                await db.rollback()
                logger.error(f"Sync FAILED para usuario {user.email}: {e}")


if __name__ == "__main__":
    # Ejecución manual: `make sync`
    asyncio.run(sync_all_users())
```

**Archivo a modificar**: `backend/app/main.py`

**Agregar** después de la línea `app.include_router(analysis.router, ...)`:

```python
# ─── Scheduler ────────────────────────────────────────────────────────────────
from contextlib import asynccontextmanager
```

Más específicamente, **reemplazar el archivo completo** `backend/app/main.py` con:

```python
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import analysis, auth, garmin, medical, sessions
from app.services.sync_service import sync_all_users

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: iniciar scheduler
    scheduler.add_job(sync_all_users, "interval", hours=1, id="garmin_sync")
    scheduler.start()
    yield
    # Shutdown: parar scheduler
    scheduler.shutdown()


app = FastAPI(
    title="Garmin Rehab Coach API",
    description="AI-powered rehabilitation tracking with Garmin integration",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(garmin.router, prefix="/api/garmin", tags=["Garmin"])
app.include_router(medical.router, prefix="/api/medical", tags=["Medical"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["Sessions"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
```

**Criterio de éxito**: Backend arranca, logs muestran "garmin_sync" job added. `make sync` ejecuta sin error (aunque puede no haber usuarios con Garmin conectado).

---

## T09 — Auth state en frontend + API client con JWT

**Objetivo**: Crear contexto de autenticación en React y actualizar el API client para enviar el token JWT en todas las requests.

### T09a — Crear auth context

**Archivo a crear**: `frontend/src/lib/auth.tsx`

**Contenido**:

```tsx
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
  has_garmin: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const TOKEN_KEY = "garmin_rehab_token";
const API_BASE = "/api";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem(TOKEN_KEY),
  );
  const [isLoading, setIsLoading] = useState(true);

  // Al montar, si hay token guardado, obtener usuario
  useEffect(() => {
    if (token) {
      fetchUser(token);
    } else {
      setIsLoading(false);
    }
  }, []);

  async function fetchUser(accessToken: string) {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setToken(accessToken);
      } else {
        // Token inválido, limpiar
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      }
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || "Error al iniciar sesión");
    }
    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.access_token);
    setToken(data.access_token);
    await fetchUser(data.access_token);
  }

  async function register(email: string, password: string, name: string) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || "Error al registrarse");
    }
    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.access_token);
    setToken(data.access_token);
    await fetchUser(data.access_token);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
```

### T09b — Actualizar API client para enviar JWT

**Archivo a modificar**: `frontend/src/lib/api.ts`

**Reemplazar** la función `request` (líneas 12-26) con:

```typescript
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("garmin_rehab_token");
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem("garmin_rehab_token");
      window.location.href = "/login";
    }
    throw new ApiError(res.status, await res.text());
  }

  return res.json();
}
```

### T09c — Crear página de login/register

**Archivo a crear**: `frontend/src/pages/Login.tsx`

**Contenido**:

```tsx
import { useState } from "react";
import { useAuth } from "../lib/auth";

export default function Login() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, password, name);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm rounded-xl border border-border-subtle bg-bg-card p-8">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20">
            <span className="text-lg font-bold text-accent">GR</span>
          </div>
          <span className="text-xl font-semibold text-white">
            Garmin Rehab Coach
          </span>
        </div>

        <h2 className="mb-6 text-center text-lg text-gray-300">
          {isRegister ? "Crear cuenta" : "Iniciar sesión"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <input
              type="text"
              placeholder="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-border-subtle bg-bg-primary px-4 py-2.5 text-white placeholder-gray-500 focus:border-accent focus:outline-none"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-border-subtle bg-bg-primary px-4 py-2.5 text-white placeholder-gray-500 focus:border-accent focus:outline-none"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full rounded-lg border border-border-subtle bg-bg-primary px-4 py-2.5 text-white placeholder-gray-500 focus:border-accent focus:outline-none"
          />

          {error && (
            <p className="text-sm text-danger">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent py-2.5 font-medium text-black transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            {loading
              ? "Cargando..."
              : isRegister
                ? "Crear cuenta"
                : "Iniciar sesión"}
          </button>
        </form>

        <button
          onClick={() => {
            setIsRegister(!isRegister);
            setError("");
          }}
          className="mt-4 w-full text-center text-sm text-gray-400 hover:text-white"
        >
          {isRegister
            ? "¿Ya tenés cuenta? Iniciá sesión"
            : "¿No tenés cuenta? Registrate"}
        </button>
      </div>
    </div>
  );
}
```

### T09d — Actualizar App.tsx con auth

**Archivo a modificar**: `frontend/src/App.tsx`

**Reemplazar TODO el contenido** con:

```tsx
import { Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import MedicalProfile from "./pages/MedicalProfile";
import Progress from "./pages/Progress";
import Sessions from "./pages/Sessions";

function AppContent() {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-400">Cargando...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <nav className="border-b border-border-subtle px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20">
              <span className="text-sm font-bold text-accent">GR</span>
            </div>
            <span className="font-semibold text-white">Garmin Rehab Coach</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <a href="/" className="text-gray-400 transition-colors hover:text-white">
              Dashboard
            </a>
            <a href="/medical" className="text-gray-400 transition-colors hover:text-white">
              Perfil médico
            </a>
            <a href="/sessions" className="text-gray-400 transition-colors hover:text-white">
              Sesiones
            </a>
            <a href="/progress" className="text-gray-400 transition-colors hover:text-white">
              Progreso
            </a>
            <span className="text-gray-500">|</span>
            <span className="text-gray-500">{user.name}</span>
            <button
              onClick={logout}
              className="text-gray-400 transition-colors hover:text-danger"
            >
              Salir
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/medical" element={<MedicalProfile />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/progress" element={<Progress />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
```

### T09e — Actualizar main.tsx para envolver con BrowserRouter

**Archivo a verificar**: `frontend/src/main.tsx`

El `BrowserRouter` ya debería estar ahí. Verificar que envuelve `<App />`. Si no está, agregar:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
```

**Criterio de éxito**: Frontend muestra pantalla de login. Se puede registrar, loguear, y ver el dashboard con nav + nombre + botón "Salir".

---

## T10 — Dashboard con gráficos de métricas Garmin

**Objetivo**: Dashboard que muestra los 7 gráficos del roadmap usando datos reales de la API.

**Archivo a modificar**: `frontend/src/pages/Dashboard.tsx`

**Reemplazar TODO el contenido** con:

```tsx
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

interface DailyMetrics {
  date: string;
  resting_hr: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  hrv_weekly_avg: number | null;
  hrv_last_night: number | null;
  sleep_score: number | null;
  sleep_hours: number | null;
  deep_sleep_hours: number | null;
  light_sleep_hours: number | null;
  rem_sleep_hours: number | null;
  avg_stress: number | null;
  body_battery_morning: number | null;
  body_battery_end: number | null;
  training_readiness: number | null;
  vo2_max: number | null;
  steps: number | null;
  active_calories: number | null;
}

interface Activity {
  id: string;
  date: string;
  activity_type: string;
  name: string | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  calories: number | null;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "-";
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

function formatDistance(meters: number | null) {
  if (!meters) return "-";
  return `${(meters / 1000).toFixed(1)} km`;
}

// Colores consistentes del design system
const CHART_COLORS = {
  accent: "#3ECF8E",
  warn: "#F5A524",
  danger: "#EF4444",
  blue: "#3B82F6",
  purple: "#A855F7",
  gray: "#6B7280",
};

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-card p-5">
      <h3 className="mb-4 text-sm font-medium text-gray-400">{title}</h3>
      {children}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DailyMetrics[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [days, setDays] = useState<7 | 30>(7);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [days]);

  async function loadData() {
    setLoading(true);
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);

    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    try {
      const [m, a] = await Promise.all([
        api.garmin.getMetrics(startStr, endStr) as Promise<DailyMetrics[]>,
        api.garmin.getActivities(startStr, endStr) as Promise<Activity[]>,
      ]);
      setMetrics(m);
      setActivities(a);
    } catch {
      // Si no hay datos, quedan vacíos
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      await api.garmin.sync();
      await loadData();
    } catch {
      // Error silencioso, el usuario ve que no hay datos
    } finally {
      setSyncing(false);
    }
  }

  const chartData = metrics.map((m) => ({
    ...m,
    dateLabel: formatDate(m.date),
  }));

  const todayMetrics = metrics.length > 0 ? metrics[metrics.length - 1] : null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-400">
            Hola {user?.name}. Métricas de los últimos {days} días.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-border-subtle">
            <button
              onClick={() => setDays(7)}
              className={`px-3 py-1.5 text-sm ${days === 7 ? "bg-accent/20 text-accent" : "text-gray-400"}`}
            >
              7d
            </button>
            <button
              onClick={() => setDays(30)}
              className={`px-3 py-1.5 text-sm ${days === 30 ? "bg-accent/20 text-accent" : "text-gray-400"}`}
            >
              30d
            </button>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="rounded-lg bg-accent/20 px-4 py-1.5 text-sm text-accent transition-colors hover:bg-accent/30 disabled:opacity-50"
          >
            {syncing ? "Sincronizando..." : "Sync Garmin"}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400">Cargando métricas...</p>
      ) : metrics.length === 0 ? (
        <div className="rounded-xl border border-border-subtle bg-bg-card p-12 text-center">
          <p className="text-lg text-gray-300">No hay datos de Garmin</p>
          <p className="mt-2 text-sm text-gray-500">
            Conectá tu cuenta Garmin y sincronizá datos para ver el dashboard.
          </p>
        </div>
      ) : (
        <>
          {/* Métricas de hoy */}
          {todayMetrics && (
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              {[
                { label: "FC reposo", value: todayMetrics.resting_hr, unit: "bpm" },
                { label: "HRV", value: todayMetrics.hrv_last_night, unit: "ms" },
                { label: "Sueño", value: todayMetrics.sleep_hours?.toFixed(1), unit: "h" },
                { label: "Body Battery", value: todayMetrics.body_battery_morning, unit: "%" },
                { label: "Estrés", value: todayMetrics.avg_stress, unit: "" },
                { label: "Training Ready", value: todayMetrics.training_readiness, unit: "" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-border-subtle bg-bg-card p-4"
                >
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className="mt-1 text-2xl font-semibold text-white">
                    {item.value ?? "-"}
                    <span className="ml-1 text-sm text-gray-500">{item.unit}</span>
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Gráficos */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* 1. FC en reposo */}
            <Card title="FC en reposo">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2433" />
                  <XAxis dataKey="dateLabel" tick={{ fill: "#6B7280", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#6B7280", fontSize: 12 }} domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#12161F", border: "1px solid #1E2433" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="resting_hr"
                    stroke={CHART_COLORS.danger}
                    strokeWidth={2}
                    dot={false}
                    name="FC reposo"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* 2. HRV */}
            <Card title="HRV (variabilidad cardíaca)">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2433" />
                  <XAxis dataKey="dateLabel" tick={{ fill: "#6B7280", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#6B7280", fontSize: 12 }} domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#12161F", border: "1px solid #1E2433" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="hrv_last_night"
                    stroke={CHART_COLORS.blue}
                    strokeWidth={2}
                    dot={false}
                    name="HRV noche"
                  />
                  <Line
                    type="monotone"
                    dataKey="hrv_weekly_avg"
                    stroke={CHART_COLORS.gray}
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Media semanal"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* 3. Sueño (barras apiladas) */}
            <Card title="Sueño (horas)">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2433" />
                  <XAxis dataKey="dateLabel" tick={{ fill: "#6B7280", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#6B7280", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#12161F", border: "1px solid #1E2433" }}
                  />
                  <Bar dataKey="deep_sleep_hours" stackId="sleep" fill={CHART_COLORS.blue} name="Profundo" />
                  <Bar dataKey="rem_sleep_hours" stackId="sleep" fill={CHART_COLORS.purple} name="REM" />
                  <Bar dataKey="light_sleep_hours" stackId="sleep" fill={CHART_COLORS.gray} name="Ligero" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* 4. Body battery (área) */}
            <Card title="Body Battery">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2433" />
                  <XAxis dataKey="dateLabel" tick={{ fill: "#6B7280", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#6B7280", fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#12161F", border: "1px solid #1E2433" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="body_battery_morning"
                    stroke={CHART_COLORS.accent}
                    fill={CHART_COLORS.accent}
                    fillOpacity={0.15}
                    strokeWidth={2}
                    name="Morning"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* 5. Estrés */}
            <Card title="Estrés promedio">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2433" />
                  <XAxis dataKey="dateLabel" tick={{ fill: "#6B7280", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#6B7280", fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#12161F", border: "1px solid #1E2433" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avg_stress"
                    stroke={CHART_COLORS.warn}
                    strokeWidth={2}
                    dot={false}
                    name="Estrés"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* 6. Training Readiness */}
            <Card title="Training Readiness">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2433" />
                  <XAxis dataKey="dateLabel" tick={{ fill: "#6B7280", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#6B7280", fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#12161F", border: "1px solid #1E2433" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="training_readiness"
                    stroke={CHART_COLORS.accent}
                    fill={CHART_COLORS.accent}
                    fillOpacity={0.1}
                    strokeWidth={2}
                    name="Readiness"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* 7. Actividades recientes */}
          <div className="mt-6">
            <Card title="Actividades recientes">
              {activities.length === 0 ? (
                <p className="text-sm text-gray-500">Sin actividades en este período.</p>
              ) : (
                <div className="space-y-3">
                  {activities.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between rounded-lg border border-border-subtle bg-bg-primary p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">
                          {a.name || a.activity_type}
                        </p>
                        <p className="text-xs text-gray-500">{formatDate(a.date)}</p>
                      </div>
                      <div className="flex gap-4 text-sm text-gray-400">
                        <span>{formatDuration(a.duration_seconds)}</span>
                        <span>{formatDistance(a.distance_meters)}</span>
                        {a.avg_hr && <span>{a.avg_hr} bpm</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
```

**Criterio de éxito**: El dashboard muestra los 7 gráficos (FC, HRV, sueño, body battery, estrés, training readiness, actividades). Con datos reales de Garmin se ven las líneas/barras. Sin datos, muestra mensaje "No hay datos de Garmin".

---

## Resumen de archivos

| Tarea | Acción | Archivo |
|-------|--------|---------|
| T01 | Ejecutar comando | `make migrate` |
| T02 | Modificar | `backend/app/models/schemas.py` |
| T03 | Crear | `backend/app/api/deps.py` |
| T04 | Reemplazar | `backend/app/api/auth.py` |
| T05a | Modificar | `backend/app/api/medical.py` |
| T05b | Modificar | `backend/app/api/sessions.py` |
| T05c | Modificar | `backend/app/api/garmin.py` |
| T05d | Modificar | `backend/app/api/analysis.py` |
| T06 | Crear | `backend/app/services/garmin_client.py` |
| T07 | Reemplazar | `backend/app/api/garmin.py` |
| T08 | Crear + Reemplazar | `backend/app/services/sync_service.py` + `backend/app/main.py` |
| T09a | Crear | `frontend/src/lib/auth.tsx` |
| T09b | Modificar | `frontend/src/lib/api.ts` |
| T09c | Crear | `frontend/src/pages/Login.tsx` |
| T09d | Reemplazar | `frontend/src/App.tsx` |
| T09e | Verificar/Modificar | `frontend/src/main.tsx` |
| T10 | Reemplazar | `frontend/src/pages/Dashboard.tsx` |

---

## Checklist final Fase 1

- [ ] T01: Tablas creadas en PostgreSQL
- [ ] T02: Schemas de auth definidos
- [ ] T03: `get_current_user` dependency creada
- [ ] T04: Register, login, y /me funcionando
- [ ] T05: Todas las rutas protegidas con JWT + user_id correcto
- [ ] T06: GarminClient puede descargar métricas y actividades
- [ ] T07: Endpoints `/garmin/connect` y `/garmin/sync` funcionando
- [ ] T08: Scheduler sincroniza cada hora + `make sync` funciona
- [ ] T09: Frontend tiene login, auth context, y JWT en requests
- [ ] T10: Dashboard con 7 gráficos renderizando datos reales

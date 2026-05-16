import uuid as uuid_lib
from datetime import date, datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import load_only
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import async_session, async_session_factory, get_db
from app.models.models import Activity, DailyMetrics, SyncJob, User
from app.models.schemas import ActivityResponse, DailyMetricsResponse, SyncJobResponse
from app.services.garmin_client import GarminClient

router = APIRouter()


class GarminConnectRequest(BaseModel):
    email: str
    password: str


class BackfillRequest(BaseModel):
    days: int = Field(default=90, ge=1, le=365)


async def _run_backfill(job_id: uuid_lib.UUID, user_id: uuid_lib.UUID, days: int):
    """Ejecuta el backfill en background. Usa su propia sesión de DB."""
    async with async_session_factory() as db:
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
    new_activities = await client.sync_activities(start=0, limit=10, fetch_details=False)

    return {
        "status": "synced",
        "date": today.isoformat(),
        "new_activities": len(new_activities),
    }


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

    client = GarminClient(user, db)
    try:
        await client.login()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Error de autenticación con Garmin: {e}",
        )
    await db.commit()

    job = SyncJob(user_id=user.id, total_days=data.days)
    db.add(job)
    await db.commit()
    await db.refresh(job)

    background_tasks.add_task(_run_backfill, job.id, user.id, data.days)

    return {
        "job_id": job.id,
        "status": "pending",
        "message": f"Backfill de {data.days} días iniciado en background.",
    }


@router.get("/backfill/{job_id}", response_model=SyncJobResponse)
async def get_backfill_status(
    job_id: uuid_lib.UUID,
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
    return result.scalars().all()


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
    return result.scalars().all()
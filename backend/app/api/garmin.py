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
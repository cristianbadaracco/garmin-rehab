from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.models import Activity, DailyMetrics, User
from app.models.schemas import ActivityResponse, DailyMetricsResponse

router = APIRouter()


@router.post("/sync")
async def trigger_sync(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Trigger manual Garmin data sync."""
    return {"status": "sync_triggered"}


@router.get("/metrics", response_model=list[DailyMetricsResponse])
async def get_metrics(
    start_date: date = Query(...),
    end_date: date = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get daily health metrics for a date range."""
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
    """Get tracked activities for a date range."""
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
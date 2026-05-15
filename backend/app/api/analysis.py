from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.models import AIInsight, User
from app.models.schemas import AIInsightResponse

router = APIRouter()


@router.get("/insights", response_model=list[AIInsightResponse])
async def get_insights(
    start_date: date = Query(...),
    end_date: date = Query(...),
    insight_type: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get AI-generated insights for a date range."""
    query = select(AIInsight).where(
        AIInsight.user_id == user.id,
        AIInsight.date >= start_date,
        AIInsight.date <= end_date,
    )
    if insight_type:
        query = query.where(AIInsight.insight_type == insight_type)
    result = await db.execute(query.order_by(AIInsight.date.desc()))
    return result.scalars().all()


@router.post("/generate-daily")
async def generate_daily_analysis(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Trigger daily AI analysis for the current user."""
    return {"status": "analysis_triggered"}


@router.get("/recovery-progress")
async def get_recovery_progress(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get recovery progress summary for active injuries."""
    return {"status": "not_implemented"}
import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.models import AIInsight
from app.models.schemas import AIInsightResponse

router = APIRouter()


@router.get("/insights", response_model=list[AIInsightResponse])
async def get_insights(
    start_date: date = Query(...),
    end_date: date = Query(...),
    insight_type: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Get AI-generated insights for a date range."""
    query = select(AIInsight).where(
        AIInsight.date >= start_date, AIInsight.date <= end_date
    )
    if insight_type:
        query = query.where(AIInsight.insight_type == insight_type)
    result = await db.execute(query.order_by(AIInsight.date.desc()))
    return result.scalars().all()


@router.post("/generate-daily")
async def generate_daily_analysis(db: AsyncSession = Depends(get_db)):
    """Trigger daily AI analysis for the current user."""
    # TODO: implement with ai_engine service
    return {"status": "analysis_triggered"}


@router.get("/recovery-progress")
async def get_recovery_progress(db: AsyncSession = Depends(get_db)):
    """Get recovery progress summary for active injuries."""
    # TODO: calculate from injury + pain logs + metrics
    return {"status": "not_implemented"}

import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.models import Injury, PainLog
from app.models.schemas import (
    InjuryCreate,
    InjuryResponse,
    InjuryUpdatePhase,
    PainLogCreate,
    PainLogResponse,
)

router = APIRouter()


# ─── Injuries ─────────────────────────────────────────────────────────────────


@router.post("/injuries", response_model=InjuryResponse)
async def create_injury(data: InjuryCreate, db: AsyncSession = Depends(get_db)):
    """Register a new injury or surgery."""
    injury = Injury(
        # TODO: get user_id from JWT
        user_id=uuid.uuid4(),
        **data.model_dump(),
        is_active=True,
    )
    db.add(injury)
    await db.flush()
    await db.refresh(injury)
    return injury


@router.get("/injuries", response_model=list[InjuryResponse])
async def get_injuries(
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_db),
):
    """Get user's injuries."""
    query = select(Injury)
    if active_only:
        query = query.where(Injury.is_active.is_(True))
    result = await db.execute(query.order_by(Injury.date_occurred.desc()))
    return result.scalars().all()


@router.patch("/injuries/{injury_id}/phase", response_model=InjuryResponse)
async def update_injury_phase(
    injury_id: uuid.UUID,
    data: InjuryUpdatePhase,
    db: AsyncSession = Depends(get_db),
):
    """Update recovery phase of an injury."""
    result = await db.execute(select(Injury).where(Injury.id == injury_id))
    injury = result.scalar_one()
    injury.current_phase = data.current_phase
    if data.notes:
        injury.notes = data.notes
    await db.flush()
    await db.refresh(injury)
    return injury


# ─── Pain Logs ────────────────────────────────────────────────────────────────


@router.post("/pain-logs", response_model=PainLogResponse)
async def create_pain_log(data: PainLogCreate, db: AsyncSession = Depends(get_db)):
    """Log pain level for an injury."""
    pain_log = PainLog(
        # TODO: get user_id from JWT
        user_id=uuid.uuid4(),
        date=date.today(),
        **data.model_dump(),
    )
    db.add(pain_log)
    await db.flush()
    await db.refresh(pain_log)
    return pain_log


@router.get("/pain-logs", response_model=list[PainLogResponse])
async def get_pain_logs(
    injury_id: uuid.UUID | None = Query(None),
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Get pain logs for a date range, optionally filtered by injury."""
    query = select(PainLog).where(PainLog.date >= start_date, PainLog.date <= end_date)
    if injury_id:
        query = query.where(PainLog.injury_id == injury_id)
    result = await db.execute(query.order_by(PainLog.date.desc()))
    return result.scalars().all()

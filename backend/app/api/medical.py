from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.models import Injury, PainLog, User
from app.models.schemas import (
    InjuryCreate,
    InjuryResponse,
    InjuryUpdatePhase,
    PainLogCreate,
    PainLogResponse,
)

router = APIRouter()


@router.post("/injuries", response_model=InjuryResponse)
async def create_injury(
    data: InjuryCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    injury = Injury(
        user_id=user.id,
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
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Injury).where(Injury.user_id == user.id)
    if active_only:
        query = query.where(Injury.is_active.is_(True))
    result = await db.execute(query.order_by(Injury.date_occurred.desc()))
    return result.scalars().all()


@router.patch("/injuries/{injury_id}/phase", response_model=InjuryResponse)
async def update_injury_phase(
    injury_id: UUID,
    data: InjuryUpdatePhase,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Injury).where(Injury.id == injury_id, Injury.user_id == user.id)
    )
    injury = result.scalar_one()
    injury.current_phase = data.current_phase
    if data.notes:
        injury.notes = data.notes
    await db.flush()
    await db.refresh(injury)
    return injury


@router.post("/pain-logs", response_model=PainLogResponse)
async def create_pain_log(
    data: PainLogCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    pain_log = PainLog(
        user_id=user.id,
        date=date.today(),
        **data.model_dump(),
    )
    db.add(pain_log)
    await db.flush()
    await db.refresh(pain_log)
    return pain_log


@router.get("/pain-logs", response_model=list[PainLogResponse])
async def get_pain_logs(
    injury_id: UUID | None = Query(None),
    start_date: date = Query(...),
    end_date: date = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(PainLog).where(
        PainLog.user_id == user.id,
        PainLog.date >= start_date,
        PainLog.date <= end_date,
    )
    if injury_id:
        query = query.where(PainLog.injury_id == injury_id)
    result = await db.execute(query.order_by(PainLog.date.desc()))
    return result.scalars().all()
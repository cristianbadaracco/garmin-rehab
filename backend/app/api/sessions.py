from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.models import Session, SessionBlock, User
from app.models.schemas import SessionCreate, SessionResponse

router = APIRouter()


@router.post("/", response_model=SessionResponse)
async def create_session(
    data: SessionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Register a training session with blocks."""
    session = Session(
        user_id=user.id,
        date=date.today(),
        session_type=data.session_type,
        title=data.title,
        total_duration_minutes=data.total_duration_minutes,
        overall_rpe=data.overall_rpe,
        overall_pain=data.overall_pain,
        notes=data.notes,
        activity_id=data.activity_id,
    )
    db.add(session)
    await db.flush()

    for i, block_data in enumerate(data.blocks):
        block = SessionBlock(
            session_id=session.id,
            order=i + 1,
            **block_data.model_dump(),
        )
        db.add(block)

    await db.flush()
    await db.refresh(session)

    result = await db.execute(
        select(Session).where(Session.id == session.id).options(selectinload(Session.blocks))
    )
    return result.scalar_one()


@router.get("/", response_model=list[SessionResponse])
async def get_sessions(
    start_date: date = Query(...),
    end_date: date = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get sessions for a date range."""
    result = await db.execute(
        select(Session)
        .where(
            Session.user_id == user.id,
            Session.date >= start_date,
            Session.date <= end_date,
        )
        .options(selectinload(Session.blocks))
        .order_by(Session.date.desc())
    )
    return result.scalars().all()
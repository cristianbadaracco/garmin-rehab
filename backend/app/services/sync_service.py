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
    asyncio.run(sync_all_users())
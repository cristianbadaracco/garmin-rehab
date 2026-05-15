from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import analysis, auth, garmin, medical, sessions
from app.services.sync_service import sync_all_users

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(sync_all_users, "interval", hours=1, id="garmin_sync")
    scheduler.start()
    yield
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
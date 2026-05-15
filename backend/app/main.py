from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import analysis, auth, garmin, medical, sessions

app = FastAPI(
    title="Garmin Rehab Coach API",
    description="AI-powered rehabilitation tracking with Garmin integration",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
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

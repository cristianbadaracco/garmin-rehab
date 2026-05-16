"""Pydantic schemas — these define the API contract and auto-generate the OpenAPI spec
that gets converted to TypeScript types for the frontend."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field


# ─── Medical Profile ─────────────────────────────────────────────────────────


class InjuryCreate(BaseModel):
    name: str = Field(examples=["Reconstrucción LCA rodilla derecha"])
    injury_type: str = Field(examples=["surgery", "fracture", "sprain", "tendinopathy"])
    body_part: str = Field(examples=["knee_right", "knee_left", "ankle_right"])
    date_occurred: date
    surgery_date: date | None = None
    estimated_recovery_months: int = 12
    current_phase: str = Field(examples=["immobilization", "mobility", "strength_base", "strength_stability", "running", "full_sport"])
    notes: str | None = None


class InjuryResponse(InjuryCreate):
    id: uuid.UUID
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class InjuryUpdatePhase(BaseModel):
    current_phase: str
    notes: str | None = None


# ─── Pain Log ─────────────────────────────────────────────────────────────────


class PainLogCreate(BaseModel):
    injury_id: uuid.UUID
    pain_level: int = Field(ge=0, le=10)
    context: str | None = Field(default=None, examples=["rest", "activity", "post_activity", "morning"])
    swelling: bool = False
    stiffness: bool = False
    notes: str | None = None


class PainLogResponse(PainLogCreate):
    id: uuid.UUID
    user_id: uuid.UUID
    date: date
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Sessions ─────────────────────────────────────────────────────────────────


class SessionBlockCreate(BaseModel):
    block_type: str = Field(examples=["strength", "stability", "mobility", "jumps", "running", "cardio"])
    duration_minutes: int | None = None
    exercises: str | None = Field(default=None, examples=["sentadillas, prensa, isquios"])
    pain_during: int | None = Field(default=None, ge=0, le=10)
    notes: str | None = None


class SessionCreate(BaseModel):
    session_type: str = Field(examples=["tracked", "manual", "mixed"])
    title: str | None = Field(default=None, examples=["Kine + carrera"])
    total_duration_minutes: int | None = None
    overall_rpe: int | None = Field(default=None, ge=1, le=10)
    overall_pain: int | None = Field(default=None, ge=0, le=10)
    notes: str | None = None
    activity_id: uuid.UUID | None = None
    blocks: list[SessionBlockCreate] = []


class SessionBlockResponse(SessionBlockCreate):
    id: uuid.UUID
    order: int

    model_config = {"from_attributes": True}


class SessionResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    date: date
    session_type: str
    title: str | None
    total_duration_minutes: int | None
    overall_rpe: int | None
    overall_pain: int | None
    notes: str | None
    activity_id: uuid.UUID | None
    blocks: list[SessionBlockResponse]
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Garmin Data ──────────────────────────────────────────────────────────────


class DailyMetricsResponse(BaseModel):
    id: uuid.UUID
    date: date
    resting_hr: int | None
    max_hr: int | None
    avg_hr: int | None
    hrv_weekly_avg: float | None
    hrv_last_night: float | None
    sleep_score: int | None
    sleep_hours: float | None
    deep_sleep_hours: float | None
    light_sleep_hours: float | None
    rem_sleep_hours: float | None
    avg_stress: int | None
    body_battery_morning: int | None
    body_battery_end: int | None
    training_readiness: int | None
    vo2_max: float | None
    steps: int | None
    active_calories: int | None

    model_config = {"from_attributes": True}


class ActivityResponse(BaseModel):
    id: uuid.UUID
    garmin_activity_id: str | None
    date: date
    activity_type: str
    name: str | None
    duration_seconds: int | None
    distance_meters: float | None
    avg_hr: int | None
    max_hr: int | None
    calories: int | None
    avg_pace: float | None
    cadence: int | None
    ground_contact_time: float | None
    ground_contact_balance: float | None
    stride_length: float | None
    vertical_oscillation: float | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── AI Insights ──────────────────────────────────────────────────────────────


class AIInsightResponse(BaseModel):
    id: uuid.UUID
    date: date
    insight_type: str
    severity: str
    title: str
    content: str
    related_metrics: dict | None
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Auth ────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: str = Field(max_length=255)
    password: str = Field(min_length=8)
    name: str = Field(max_length=100)


class UserLogin(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    created_at: datetime
    has_garmin: bool
    garmin_device_model: str | None

    model_config = {"from_attributes": True}


# ─── Dashboard Summary ────────────────────────────────────────────────────────


class RecoveryProgress(BaseModel):
    """Progreso de recuperación de la lesión activa."""

    injury_id: uuid.UUID
    injury_name: str
    current_phase: str
    days_since_surgery: int
    estimated_recovery_months: int
    progress_percentage: float
    pain_trend: str
    avg_pain_last_7_days: float
    avg_pain_previous_7_days: float


class DashboardSummary(BaseModel):
    """Respuesta agregada para el dashboard principal del MVP."""

    today_metrics: DailyMetricsResponse | None
    weekly_metrics: list[DailyMetricsResponse]
    recent_activities: list[ActivityResponse]
    active_injuries: list[InjuryResponse]
    recent_pain_logs: list[PainLogResponse]
    recent_insights: list[AIInsightResponse]
    recovery_progress: RecoveryProgress | None = None


# ─── Sync Jobs ───────────────────────────────────────────────────────────────


class SyncJobResponse(BaseModel):
    id: uuid.UUID
    status: str
    total_days: int
    days_synced: int
    days_skipped: int
    new_activities: int
    error_message: str | None = None
    created_at: datetime
    completed_at: datetime | None = None

    model_config = {"from_attributes": True}


class BackfillStartResponse(BaseModel):
    job_id: uuid.UUID
    status: str
    message: str

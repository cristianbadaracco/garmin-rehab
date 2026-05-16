import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


# ─── User ────────────────────────────────────────────────────────────────────


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Garmin auth tokens stored encrypted
    garmin_tokens: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    garmin_device_model: Mapped[str | None] = mapped_column(String(100), nullable=True)

    injuries: Mapped[list["Injury"]] = relationship(back_populates="user")
    daily_metrics: Mapped[list["DailyMetrics"]] = relationship(back_populates="user")
    activities: Mapped[list["Activity"]] = relationship(back_populates="user")
    sessions: Mapped[list["Session"]] = relationship(back_populates="user")
    pain_logs: Mapped[list["PainLog"]] = relationship(back_populates="user")
    insights: Mapped[list["AIInsight"]] = relationship(back_populates="user")


# ─── Medical Profile ─────────────────────────────────────────────────────────


class Injury(Base):
    """Lesión o cirugía del usuario (ej: LCA rodilla derecha)."""

    __tablename__ = "injuries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(200))  # "Reconstrucción LCA rodilla derecha"
    injury_type: Mapped[str] = mapped_column(String(50))  # surgery, fracture, sprain, etc.
    body_part: Mapped[str] = mapped_column(String(50))  # knee_right, ankle_left, etc.
    date_occurred: Mapped[date] = mapped_column(Date)
    surgery_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    estimated_recovery_months: Mapped[int] = mapped_column(Integer, default=12)
    current_phase: Mapped[str] = mapped_column(String(50))  # immobilization, mobility, strength, etc.
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="injuries")
    pain_logs: Mapped[list["PainLog"]] = relationship(back_populates="injury")


class PainLog(Base):
    """Registro diario de dolor asociado a una lesión."""

    __tablename__ = "pain_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    injury_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("injuries.id"))
    date: Mapped[date] = mapped_column(Date)
    pain_level: Mapped[int] = mapped_column(Integer)  # 0-10
    context: Mapped[str | None] = mapped_column(String(50), nullable=True)  # rest, activity, post_activity, morning
    swelling: Mapped[bool] = mapped_column(Boolean, default=False)
    stiffness: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="pain_logs")
    injury: Mapped["Injury"] = relationship(back_populates="pain_logs")


# ─── Garmin Data ──────────────────────────────────────────────────────────────


class DailyMetrics(Base):
    """Métricas diarias de salud del Garmin (1 registro por día)."""

    __tablename__ = "daily_metrics"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    date: Mapped[date] = mapped_column(Date, index=True)

    # Heart rate
    resting_hr: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_hr: Mapped[int | None] = mapped_column(Integer, nullable=True)
    avg_hr: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # HRV
    hrv_weekly_avg: Mapped[float | None] = mapped_column(Float, nullable=True)
    hrv_last_night: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Sleep
    sleep_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sleep_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    deep_sleep_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    light_sleep_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    rem_sleep_hours: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Stress & recovery
    avg_stress: Mapped[int | None] = mapped_column(Integer, nullable=True)
    body_battery_morning: Mapped[int | None] = mapped_column(Integer, nullable=True)
    body_battery_end: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Training
    training_readiness: Mapped[int | None] = mapped_column(Integer, nullable=True)
    vo2_max: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Activity
    steps: Mapped[int | None] = mapped_column(Integer, nullable=True)
    active_calories: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Raw JSON from Garmin (for future use)
    raw_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="daily_metrics")


class Activity(Base):
    """Actividad trackeada por el Garmin (carrera, caminata, etc.)."""

    __tablename__ = "activities"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    garmin_activity_id: Mapped[str | None] = mapped_column(String(50), nullable=True, unique=True)
    date: Mapped[date] = mapped_column(Date, index=True)

    activity_type: Mapped[str] = mapped_column(String(50))  # running, walking, cycling, strength, etc.
    name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    distance_meters: Mapped[float | None] = mapped_column(Float, nullable=True)
    avg_hr: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_hr: Mapped[int | None] = mapped_column(Integer, nullable=True)
    calories: Mapped[int | None] = mapped_column(Integer, nullable=True)
    avg_pace: Mapped[float | None] = mapped_column(Float, nullable=True)  # min/km
    cadence: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Running dynamics (important for LCA rehab)
    ground_contact_time: Mapped[float | None] = mapped_column(Float, nullable=True)
    ground_contact_balance: Mapped[float | None] = mapped_column(Float, nullable=True)  # L/R %
    stride_length: Mapped[float | None] = mapped_column(Float, nullable=True)
    vertical_oscillation: Mapped[float | None] = mapped_column(Float, nullable=True)

    raw_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="activities")


# ─── Sessions (manual + mixed) ───────────────────────────────────────────────


class Session(Base):
    """Sesión de entrenamiento — puede ser trackeada, manual o mixta."""

    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    date: Mapped[date] = mapped_column(Date, index=True)
    session_type: Mapped[str] = mapped_column(String(30))  # tracked, manual, mixed

    title: Mapped[str | None] = mapped_column(String(200), nullable=True)  # "Kine + carrera"
    total_duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    overall_rpe: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1-10
    overall_pain: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 0-10
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Link to Garmin activity if tracked/mixed
    activity_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("activities.id"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="sessions")
    blocks: Mapped[list["SessionBlock"]] = relationship(back_populates="session")


class SessionBlock(Base):
    """Bloque dentro de una sesión (ej: fuerza, estabilidad, saltos, carrera)."""

    __tablename__ = "session_blocks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sessions.id"))
    order: Mapped[int] = mapped_column(Integer)  # 1, 2, 3...

    block_type: Mapped[str] = mapped_column(String(50))  # strength, stability, mobility, jumps, running, etc.
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    exercises: Mapped[str | None] = mapped_column(Text, nullable=True)  # free text: "sentadillas, prensa, isquios"
    pain_during: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 0-10
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    session: Mapped["Session"] = relationship(back_populates="blocks")


# ─── AI Insights ──────────────────────────────────────────────────────────────


class AIInsight(Base):
    """Insight generado por la IA (recomendación, alerta, análisis)."""

    __tablename__ = "ai_insights"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    date: Mapped[date] = mapped_column(Date, index=True)

    insight_type: Mapped[str] = mapped_column(String(30))  # recommendation, alert, weekly_summary, pattern
    severity: Mapped[str] = mapped_column(String(20), default="info")  # info, warning, danger
    title: Mapped[str] = mapped_column(String(300))
    content: Mapped[str] = mapped_column(Text)

    # What data triggered this insight
    related_metrics: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    is_dismissed: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="insights")

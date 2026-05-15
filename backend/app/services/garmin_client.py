"""Cliente de Garmin Connect. Descarga métricas diarias y actividades."""

import logging
from datetime import date, timedelta

from garminconnect import Garmin
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Activity, DailyMetrics, User

logger = logging.getLogger(__name__)


class GarminClient:
    """Wrapper sobre garminconnect que maneja auth y descarga datos."""

    def __init__(self, user: User, db: AsyncSession):
        self.user = user
        self.db = db
        self.client: Garmin | None = None

    async def login(self) -> None:
        """Autenticar con Garmin Connect usando tokens guardados o credenciales."""
        if self.user.garmin_tokens:
            self.client = Garmin()
            self.client.login(self.user.garmin_tokens)
        else:
            raise ValueError(
                "No hay tokens de Garmin guardados. "
                "El usuario debe conectar su cuenta primero."
            )
        self.user.garmin_tokens = self.client.session_data
        await self.db.flush()

    async def connect_account(self, email: str, password: str) -> None:
        """Primera conexión: login con credenciales y guardar tokens."""
        self.client = Garmin(email, password)
        self.client.login()
        self.user.garmin_tokens = self.client.session_data
        await self.db.flush()

    async def sync_daily_metrics(self, target_date: date) -> DailyMetrics | None:
        """Descargar métricas de un día y hacer upsert en DB.
        Retorna el registro creado/actualizado o None si no hay datos."""
        if not self.client:
            raise RuntimeError("Llamar a login() primero")

        date_str = target_date.isoformat()

        try:
            heart_rates = self.client.get_heart_rates(date_str)
        except Exception:
            heart_rates = {}

        try:
            hrv = self.client.get_hrv_data(date_str)
        except Exception:
            hrv = {}

        try:
            sleep = self.client.get_sleep_data(date_str)
        except Exception:
            sleep = {}

        try:
            stress = self.client.get_stress_data(date_str)
        except Exception:
            stress = {}

        try:
            body_battery = self.client.get_body_battery(date_str)
        except Exception:
            body_battery = []

        try:
            stats = self.client.get_stats(date_str)
        except Exception:
            stats = {}

        try:
            resting_hr_data = self.client.get_resting_heart_rate(date_str)
        except Exception:
            resting_hr_data = {}

        resting_hr = None
        if isinstance(resting_hr_data, dict):
            resting_hr = resting_hr_data.get("restingHeartRate")

        avg_hr = heart_rates.get("restingHeartRate") if isinstance(heart_rates, dict) else None
        max_hr = heart_rates.get("maxHeartRate") if isinstance(heart_rates, dict) else None

        hrv_weekly_avg = None
        hrv_last_night = None
        if isinstance(hrv, dict):
            hrv_summary = hrv.get("hrvSummary", {})
            if isinstance(hrv_summary, dict):
                hrv_weekly_avg = hrv_summary.get("weeklyAvg")
                hrv_last_night = hrv_summary.get("lastNight")

        sleep_score = None
        sleep_hours = None
        deep_sleep_hours = None
        light_sleep_hours = None
        rem_sleep_hours = None
        if isinstance(sleep, dict):
            daily_sleep = sleep.get("dailySleepDTO", {})
            if isinstance(daily_sleep, dict):
                sleep_score = daily_sleep.get("sleepScores", {}).get("overall", {}).get("value")
                sleep_seconds = daily_sleep.get("sleepTimeSeconds")
                sleep_hours = round(sleep_seconds / 3600, 2) if sleep_seconds else None
                deep_seconds = daily_sleep.get("deepSleepSeconds")
                deep_sleep_hours = round(deep_seconds / 3600, 2) if deep_seconds else None
                light_seconds = daily_sleep.get("lightSleepSeconds")
                light_sleep_hours = round(light_seconds / 3600, 2) if light_seconds else None
                rem_seconds = daily_sleep.get("remSleepSeconds")
                rem_sleep_hours = round(rem_seconds / 3600, 2) if rem_seconds else None

        avg_stress = None
        if isinstance(stress, dict):
            avg_stress = stress.get("overallStressLevel")

        body_battery_morning = None
        body_battery_end = None
        if isinstance(body_battery, list) and len(body_battery) > 0:
            body_battery_morning = body_battery[0].get("charged") if isinstance(body_battery[0], dict) else None
            body_battery_end = body_battery[-1].get("charged") if isinstance(body_battery[-1], dict) else None

        steps = stats.get("totalSteps") if isinstance(stats, dict) else None
        active_calories = stats.get("activeKilocalories") if isinstance(stats, dict) else None

        training_readiness = None
        try:
            tr_data = self.client.get_training_readiness(date_str)
            if isinstance(tr_data, dict):
                training_readiness = tr_data.get("score")
        except Exception:
            pass

        vo2_max = None
        try:
            max_metrics = self.client.get_max_metrics(date_str)
            if isinstance(max_metrics, dict):
                generic = max_metrics.get("generic", {})
                if isinstance(generic, dict):
                    vo2_max = generic.get("vo2MaxValue")
        except Exception:
            pass

        result = await self.db.execute(
            select(DailyMetrics).where(
                DailyMetrics.user_id == self.user.id,
                DailyMetrics.date == target_date,
            )
        )
        metrics = result.scalar_one_or_none()

        if metrics is None:
            metrics = DailyMetrics(user_id=self.user.id, date=target_date)
            self.db.add(metrics)

        metrics.resting_hr = resting_hr
        metrics.max_hr = max_hr
        metrics.avg_hr = avg_hr
        metrics.hrv_weekly_avg = hrv_weekly_avg
        metrics.hrv_last_night = hrv_last_night
        metrics.sleep_score = sleep_score
        metrics.sleep_hours = sleep_hours
        metrics.deep_sleep_hours = deep_sleep_hours
        metrics.light_sleep_hours = light_sleep_hours
        metrics.rem_sleep_hours = rem_sleep_hours
        metrics.avg_stress = avg_stress
        metrics.body_battery_morning = body_battery_morning
        metrics.body_battery_end = body_battery_end
        metrics.training_readiness = training_readiness
        metrics.vo2_max = vo2_max
        metrics.steps = steps
        metrics.active_calories = active_calories
        metrics.raw_data = {
            "heart_rates": heart_rates if isinstance(heart_rates, dict) else {},
            "hrv": hrv if isinstance(hrv, dict) else {},
            "sleep": sleep if isinstance(sleep, dict) else {},
            "stress": stress if isinstance(stress, dict) else {},
            "stats": stats if isinstance(stats, dict) else {},
        }

        await self.db.flush()
        await self.db.refresh(metrics)
        return metrics

    async def sync_activities(self, start: int = 0, limit: int = 20) -> list[Activity]:
        """Descargar actividades recientes y guardar las nuevas (dedup por garmin_activity_id).
        Retorna lista de actividades nuevas insertadas."""
        if not self.client:
            raise RuntimeError("Llamar a login() primero")

        raw_activities = self.client.get_activities(start, limit)
        new_activities: list[Activity] = []

        for raw in raw_activities:
            garmin_id = str(raw.get("activityId", ""))
            if not garmin_id:
                continue

            existing = await self.db.execute(
                select(Activity).where(Activity.garmin_activity_id == garmin_id)
            )
            if existing.scalar_one_or_none():
                continue

            activity_date_str = raw.get("startTimeLocal", "")[:10]
            try:
                activity_date = date.fromisoformat(activity_date_str)
            except ValueError:
                activity_date = date.today()

            activity_type_raw = raw.get("activityType", {})
            activity_type = "other"
            if isinstance(activity_type_raw, dict):
                type_key = activity_type_raw.get("typeKey", "other")
                activity_type = type_key

            ground_contact_time = None
            ground_contact_balance = None
            stride_length = None
            vertical_oscillation = None
            try:
                detail = self.client.get_activity(raw["activityId"])
                if isinstance(detail, dict):
                    summary = detail.get("summaryDTO", {})
                    if isinstance(summary, dict):
                        ground_contact_time = summary.get("groundContactTime")
                        ground_contact_balance = summary.get("groundContactBalanceLeft")
                        stride_length = summary.get("strideLength")
                        vertical_oscillation = summary.get("verticalOscillation")
            except Exception:
                pass

            activity = Activity(
                user_id=self.user.id,
                garmin_activity_id=garmin_id,
                date=activity_date,
                activity_type=activity_type,
                name=raw.get("activityName"),
                duration_seconds=int(raw["duration"]) if raw.get("duration") else None,
                distance_meters=raw.get("distance"),
                avg_hr=raw.get("averageHR"),
                max_hr=raw.get("maxHR"),
                calories=raw.get("calories"),
                avg_pace=raw.get("averageSpeed"),
                cadence=raw.get("averageRunningCadenceInStepsPerMinute"),
                ground_contact_time=ground_contact_time,
                ground_contact_balance=ground_contact_balance,
                stride_length=stride_length,
                vertical_oscillation=vertical_oscillation,
                raw_data=raw,
            )
            self.db.add(activity)
            new_activities.append(activity)

        await self.db.flush()
        return new_activities

    async def backfill(self, days: int = 30) -> dict:
        """Descargar datos históricos de los últimos N días.
        Retorna resumen de lo sincronizado."""
        today = date.today()
        metrics_count = 0
        for i in range(days):
            target = today - timedelta(days=i)
            try:
                result = await self.sync_daily_metrics(target)
                if result:
                    metrics_count += 1
            except Exception as e:
                logger.warning(f"Error syncing metrics for {target}: {e}")

        new_activities = await self.sync_activities(start=0, limit=100)

        return {
            "metrics_synced": metrics_count,
            "new_activities": len(new_activities),
        }
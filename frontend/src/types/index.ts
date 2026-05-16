export interface DailyMetrics {
  id: string;
  date: string;
  resting_hr: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  hrv_weekly_avg: number | null;
  hrv_last_night: number | null;
  sleep_score: number | null;
  sleep_hours: number | null;
  deep_sleep_hours: number | null;
  light_sleep_hours: number | null;
  rem_sleep_hours: number | null;
  avg_stress: number | null;
  body_battery_morning: number | null;
  body_battery_end: number | null;
  training_readiness: number | null;
  vo2_max: number | null;
  steps: number | null;
  active_calories: number | null;
}

export interface Activity {
  id: string;
  date: string;
  activity_type: string;
  name: string | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  calories: number | null;
}

export interface Injury {
  id: string;
  name: string;
  injury_type: string;
  body_part: string;
  date_occurred: string;
  surgery_date: string | null;
  estimated_recovery_months: number;
  current_phase: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PainLog {
  id: string;
  user_id: string;
  injury_id: string;
  date: string;
  pain_level: number;
  context: string | null;
  swelling: boolean;
  stiffness: boolean;
  notes: string | null;
  created_at: string;
}

export interface SessionBlock {
  id: string;
  block_type: string;
  duration_minutes: number | null;
  exercises: string | null;
  pain_during: number | null;
  notes: string | null;
  order: number;
}

export interface Session {
  id: string;
  user_id: string;
  date: string;
  session_type: string;
  title: string | null;
  total_duration_minutes: number | null;
  overall_rpe: number | null;
  overall_pain: number | null;
  notes: string | null;
  activity_id: string | null;
  blocks: SessionBlock[];
  created_at: string;
}

export interface AIInsight {
  id: string;
  date: string;
  insight_type: string;
  severity: string;
  title: string;
  content: string;
  related_metrics: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export interface RecoveryProgress {
  injury_id: string;
  injury_name: string;
  current_phase: string;
  days_since_surgery: number;
  estimated_recovery_months: number;
  progress_percentage: number;
  pain_trend: string;
  avg_pain_last_7_days: number;
  avg_pain_previous_7_days: number;
}

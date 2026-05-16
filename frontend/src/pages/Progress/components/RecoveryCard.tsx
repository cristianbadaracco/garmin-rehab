import type { RecoveryProgress } from "../../../types/index";

const PHASE_LABELS: Record<string, string> = {
  immobilization: "Inmovilización",
  mobility: "Movilidad",
  strength_base: "Fuerza base",
  strength_stability: "Fuerza + estabilidad",
  running: "Carrera",
  full_sport: "Deporte completo",
};

const TREND_LABELS: Record<string, { label: string; color: string }> = {
  improving: { label: "Mejorando", color: "text-green-400" },
  stable: { label: "Estable", color: "text-yellow-400" },
  worsening: { label: "Empeorando", color: "text-red-400" },
};

interface Props {
  progress: RecoveryProgress;
}

export default function RecoveryCard({ progress }: Props) {
  const trend = TREND_LABELS[progress.pain_trend] ?? { label: progress.pain_trend, color: "text-gray-400" };
  const pct = Math.min(100, Math.max(0, Math.round(progress.progress_percentage)));

  return (
    <div className="rounded-xl border border-border-subtle bg-bg-card p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="font-medium text-white">{progress.injury_name}</h3>
          <p className="mt-0.5 text-sm text-gray-400">
            {PHASE_LABELS[progress.current_phase] ?? progress.current_phase}
          </p>
        </div>
        <span className={`text-sm font-medium ${trend.color}`}>{trend.label}</span>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Progreso de recuperación</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-bg-primary overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-lg font-semibold text-white">{progress.days_since_surgery}</p>
          <p className="text-xs text-gray-500">Días post-cirugía</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-white">
            {progress.avg_pain_last_7_days.toFixed(1)}
          </p>
          <p className="text-xs text-gray-500">Dolor promedio (7d)</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-white">
            {progress.estimated_recovery_months}
          </p>
          <p className="text-xs text-gray-500">Meses estimados</p>
        </div>
      </div>
    </div>
  );
}

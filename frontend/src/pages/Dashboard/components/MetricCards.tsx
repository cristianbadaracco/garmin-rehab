import type { DailyMetrics } from "../../../types";

interface Props {
  metrics: DailyMetrics;
}

export function MetricCards({ metrics }: Props) {
  const items = [
    { label: "FC reposo", value: metrics.resting_hr, unit: "bpm" },
    { label: "HRV", value: metrics.hrv_last_night, unit: "ms" },
    { label: "Sueño", value: metrics.sleep_hours?.toFixed(1), unit: "h" },
    { label: "Body Battery", value: metrics.body_battery_morning, unit: "%" },
    { label: "Estrés", value: metrics.avg_stress, unit: "" },
    ...(metrics.training_readiness != null
      ? [{ label: "Training Ready", value: metrics.training_readiness, unit: "" }]
      : []),
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-border-subtle bg-bg-card p-4"
        >
          <p className="text-xs text-gray-500">{item.label}</p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {item.value ?? "-"}
            <span className="ml-1 text-sm text-gray-500">{item.unit}</span>
          </p>
        </div>
      ))}
    </div>
  );
}

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

interface DailyMetrics {
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

interface Activity {
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

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "-";
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

function formatDistance(meters: number | null) {
  if (!meters) return "-";
  return `${(meters / 1000).toFixed(1)} km`;
}

const CHART_COLORS = {
  accent: "#3ECF8E",
  warn: "#F5A524",
  danger: "#EF4444",
  blue: "#3B82F6",
  purple: "#A855F7",
  gray: "#6B7280",
};

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-card p-5">
      <h3 className="mb-4 text-sm font-medium text-gray-400">{title}</h3>
      {children}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DailyMetrics[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [days, setDays] = useState<7 | 30>(7);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [days]);

  async function loadData() {
    setLoading(true);
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);

    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    try {
      const [m, a] = await Promise.all([
        api.garmin.getMetrics(startStr, endStr) as Promise<DailyMetrics[]>,
        api.garmin.getActivities(startStr, endStr) as Promise<Activity[]>,
      ]);
      setMetrics(m);
      setActivities(a);
    } catch {
      // Si no hay datos, quedan vacíos
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      await api.garmin.sync();
      await loadData();
    } catch {
      // Error silencioso
    } finally {
      setSyncing(false);
    }
  }

  const chartData = metrics.map((m) => ({
    ...m,
    dateLabel: formatDate(m.date),
  }));

  const todayMetrics = metrics.length > 0 ? metrics[metrics.length - 1] : null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-400">
            Hola {user?.name}. Métricas de los últimos {days} días.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-border-subtle">
            <button
              onClick={() => setDays(7)}
              className={`px-3 py-1.5 text-sm ${days === 7 ? "bg-accent/20 text-accent" : "text-gray-400"}`}
            >
              7d
            </button>
            <button
              onClick={() => setDays(30)}
              className={`px-3 py-1.5 text-sm ${days === 30 ? "bg-accent/20 text-accent" : "text-gray-400"}`}
            >
              30d
            </button>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="rounded-lg bg-accent/20 px-4 py-1.5 text-sm text-accent transition-colors hover:bg-accent/30 disabled:opacity-50"
          >
            {syncing ? "Sincronizando..." : "Sync Garmin"}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400">Cargando métricas...</p>
      ) : metrics.length === 0 ? (
        <div className="rounded-xl border border-border-subtle bg-bg-card p-12 text-center">
          <p className="text-lg text-gray-300">No hay datos de Garmin</p>
          <p className="mt-2 text-sm text-gray-500">
            Conectá tu cuenta Garmin y sincronizá datos para ver el dashboard.
          </p>
        </div>
      ) : (
        <>
          {todayMetrics && (
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              {[
                { label: "FC reposo", value: todayMetrics.resting_hr, unit: "bpm" },
                { label: "HRV", value: todayMetrics.hrv_last_night, unit: "ms" },
                { label: "Sueño", value: todayMetrics.sleep_hours?.toFixed(1), unit: "h" },
                { label: "Body Battery", value: todayMetrics.body_battery_morning, unit: "%" },
                { label: "Estrés", value: todayMetrics.avg_stress, unit: "" },
                { label: "Training Ready", value: todayMetrics.training_readiness, unit: "" },
              ].map((item) => (
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
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title="FC en reposo">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2433" />
                  <XAxis dataKey="dateLabel" tick={{ fill: "#6B7280", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#6B7280", fontSize: 12 }} domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#12161F", border: "1px solid #1E2433" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="resting_hr"
                    stroke={CHART_COLORS.danger}
                    strokeWidth={2}
                    dot={false}
                    name="FC reposo"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card title="HRV (variabilidad cardíaca)">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2433" />
                  <XAxis dataKey="dateLabel" tick={{ fill: "#6B7280", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#6B7280", fontSize: 12 }} domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#12161F", border: "1px solid #1E2433" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="hrv_last_night"
                    stroke={CHART_COLORS.blue}
                    strokeWidth={2}
                    dot={false}
                    name="HRV noche"
                  />
                  <Line
                    type="monotone"
                    dataKey="hrv_weekly_avg"
                    stroke={CHART_COLORS.gray}
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Media semanal"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Sueño (horas)">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2433" />
                  <XAxis dataKey="dateLabel" tick={{ fill: "#6B7280", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#6B7280", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#12161F", border: "1px solid #1E2433" }}
                  />
                  <Bar dataKey="deep_sleep_hours" stackId="sleep" fill={CHART_COLORS.blue} name="Profundo" />
                  <Bar dataKey="rem_sleep_hours" stackId="sleep" fill={CHART_COLORS.purple} name="REM" />
                  <Bar dataKey="light_sleep_hours" stackId="sleep" fill={CHART_COLORS.gray} name="Ligero" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Body Battery">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2433" />
                  <XAxis dataKey="dateLabel" tick={{ fill: "#6B7280", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#6B7280", fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#12161F", border: "1px solid #1E2433" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="body_battery_morning"
                    stroke={CHART_COLORS.accent}
                    fill={CHART_COLORS.accent}
                    fillOpacity={0.15}
                    strokeWidth={2}
                    name="Morning"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Estrés promedio">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2433" />
                  <XAxis dataKey="dateLabel" tick={{ fill: "#6B7280", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#6B7280", fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#12161F", border: "1px solid #1E2433" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avg_stress"
                    stroke={CHART_COLORS.warn}
                    strokeWidth={2}
                    dot={false}
                    name="Estrés"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Training Readiness">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2433" />
                  <XAxis dataKey="dateLabel" tick={{ fill: "#6B7280", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#6B7280", fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#12161F", border: "1px solid #1E2433" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="training_readiness"
                    stroke={CHART_COLORS.accent}
                    fill={CHART_COLORS.accent}
                    fillOpacity={0.1}
                    strokeWidth={2}
                    name="Readiness"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <div className="mt-6">
            <Card title="Actividades recientes">
              {activities.length === 0 ? (
                <p className="text-sm text-gray-500">Sin actividades en este período.</p>
              ) : (
                <div className="space-y-3">
                  {activities.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between rounded-lg border border-border-subtle bg-bg-primary p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">
                          {a.name || a.activity_type}
                        </p>
                        <p className="text-xs text-gray-500">{formatDate(a.date)}</p>
                      </div>
                      <div className="flex gap-4 text-sm text-gray-400">
                        <span>{formatDuration(a.duration_seconds)}</span>
                        <span>{formatDistance(a.distance_meters)}</span>
                        {a.avg_hr && <span>{a.avg_hr} bpm</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
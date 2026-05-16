import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

import type { Activity, DailyMetrics } from "@/types";

import { ActivityList } from "./components/ActivityList";
import { ChartsGrid } from "./components/ChartsGrid";
import { DashboardSkeleton } from "./components/DashboardSkeleton";
import { MetricCards } from "./components/MetricCards";

type DaysOption = 7 | 30 | 90 | 365;
const DAY_OPTIONS: DaysOption[] = [7, 30, 90, 365];

export default function Dashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DailyMetrics[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [days, setDays] = useState<DaysOption>(7);
  const [syncing, setSyncing] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
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
        api.garmin.getMetrics(startStr, endStr),
        api.garmin.getActivities(startStr, endStr),
      ]);
      setMetrics(m);
      setActivities(a);
    } catch {
      // no-op
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
      // no-op
    } finally {
      setSyncing(false);
    }
  }

  async function handleBackfill() {
    setBackfilling(true);
    try {
      await api.garmin.backfill(days);
      await loadData();
    } catch {
      // no-op
    } finally {
      setBackfilling(false);
    }
  }

  const todayMetrics = metrics.length > 0 ? metrics[metrics.length - 1] : null;
  const missingData = !loading && metrics.length < days * 0.5;

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
            {DAY_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  days === d ? "bg-accent/20 text-accent" : "text-gray-400 hover:text-white"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          <button
            onClick={handleSync}
            disabled={syncing || backfilling}
            className="rounded-lg border border-border-subtle px-4 py-1.5 text-sm text-gray-300 transition-colors hover:border-accent hover:text-white disabled:opacity-50"
          >
            {syncing ? "Sincronizando..." : "Sync hoy"}
          </button>
          <button
            onClick={handleBackfill}
            disabled={syncing || backfilling}
            className="rounded-lg bg-accent/20 px-4 py-1.5 text-sm text-accent transition-colors hover:bg-accent/30 disabled:opacity-50"
          >
            {backfilling ? `Descargando ${days}d...` : `Backfill ${days}d`}
          </button>
        </div>
      </div>

      {missingData && (
        <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-400">
          Faltan datos para este período ({metrics.length}/{days} días con data). Hacé backfill para descargar el historial completo.
        </div>
      )}

      {loading ? (
        <DashboardSkeleton />
      ) : metrics.length === 0 ? (
        <div className="rounded-xl border border-border-subtle bg-bg-card p-12 text-center">
          <p className="text-lg text-gray-300">No hay datos de Garmin</p>
          <p className="mt-2 text-sm text-gray-500">
            Conectá tu cuenta Garmin y sincronizá datos para ver el dashboard.
          </p>
        </div>
      ) : (
        <>
          {todayMetrics && <MetricCards metrics={todayMetrics} />}
          <ChartsGrid metrics={metrics} />
          <div className="mt-6">
            <ActivityList activities={activities} />
          </div>
        </>
      )}
    </div>
  );
}

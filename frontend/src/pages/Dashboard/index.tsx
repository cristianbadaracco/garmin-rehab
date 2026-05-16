import { useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

import type { Activity, DailyMetrics } from "@/types";

import { ActivityList } from "./components/ActivityList";
import { ChartsGrid } from "./components/ChartsGrid";
import { DashboardSkeleton } from "./components/DashboardSkeleton";
import { MetricCards } from "./components/MetricCards";

type DaysOption = 7 | 30 | 90 | 365;
const DAY_OPTIONS: DaysOption[] = [7, 30, 90, 365];

interface BackfillJob {
  jobId: string;
  pct: number;
  status: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DailyMetrics[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityOffset, setActivityOffset] = useState(0);
  const [activityTotal, setActivityTotal] = useState(0);
  const [days, setDays] = useState<DaysOption>(7);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [backfillJob, setBackfillJob] = useState<BackfillJob | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setActivityOffset(0);
    loadData(0);
  }, [days]);

  useEffect(() => {
    if (activityOffset === 0) return;
    loadActivities(activityOffset);
  }, [activityOffset]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const PAGE_SIZE = 10;

  function dateRange() {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    return {
      startStr: start.toISOString().slice(0, 10),
      endStr: end.toISOString().slice(0, 10),
    };
  }

  async function loadActivities(offset: number) {
    const { startStr, endStr } = dateRange();
    try {
      const fetched = await api.garmin.getActivities(
        startStr,
        endStr,
        PAGE_SIZE + 1,
        offset,
      );
      const hasMore = fetched.length > PAGE_SIZE;
      setActivities(fetched.slice(0, PAGE_SIZE));
      setActivityTotal(
        hasMore ? offset + PAGE_SIZE + 1 : offset + fetched.length,
      );
    } catch {
      // no-op
    }
  }

  async function loadData(offset = 0) {
    setLoading(true);
    const { startStr, endStr } = dateRange();
    try {
      const [m, fetched] = await Promise.all([
        api.garmin.getMetrics(startStr, endStr),
        api.garmin.getActivities(startStr, endStr, PAGE_SIZE + 1, offset),
      ]);
      const hasMore = fetched.length > PAGE_SIZE;
      setMetrics(m);
      setActivities(fetched.slice(0, PAGE_SIZE));
      setActivityTotal(
        hasMore ? offset + PAGE_SIZE + 1 : offset + fetched.length,
      );
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
      setActivityOffset(0);
      await loadData(0);
    } catch {
      // no-op
    } finally {
      setSyncing(false);
    }
  }

  async function handleBackfill() {
    try {
      const { job_id } = await api.garmin.backfill(days);
      setBackfillJob({ jobId: job_id, pct: 0, status: "running" });

      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const s = await api.garmin.backfillStatus(job_id);
          setBackfillJob({ jobId: job_id, pct: s.pct, status: s.status });
          if (s.status !== "running") {
            clearInterval(pollRef.current!);
            pollRef.current = null;
            if (s.status === "done") {
              setActivityOffset(0);
              await loadData(0);
              setBackfillJob(null);
            }
          }
        } catch {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setBackfillJob(null);
        }
      }, 2000);
    } catch {
      // no-op
    }
  }

  const todayMetrics = metrics.length > 0 ? metrics[metrics.length - 1] : null;
  const missingData = !loading && metrics.length < days * 0.5;
  const isBackfilling = backfillJob?.status === "running";

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
                disabled={isBackfilling}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  days === d
                    ? "bg-accent/20 text-accent"
                    : "text-gray-400 hover:text-white"
                } disabled:opacity-40`}
              >
                {d}d
              </button>
            ))}
          </div>

          <button
            onClick={handleSync}
            disabled={syncing || isBackfilling}
            className="rounded-lg border border-border-subtle px-4 py-1.5 text-sm text-gray-300 transition-colors hover:border-accent hover:text-white disabled:opacity-50"
          >
            {syncing ? "Sincronizando..." : "Sync hoy"}
          </button>

          {isBackfilling ? (
            <div className="flex items-center gap-2 min-w-[160px]">
              <div className="flex-1 h-1.5 rounded-full bg-bg-primary overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-500"
                  style={{ width: `${backfillJob.pct}%` }}
                />
              </div>
              <span className="text-sm text-accent tabular-nums w-9 text-right">
                {backfillJob.pct}%
              </span>
            </div>
          ) : (
            <button
              onClick={handleBackfill}
              disabled={syncing}
              className="rounded-lg bg-accent/20 px-4 py-1.5 text-sm text-accent transition-colors hover:bg-accent/30 disabled:opacity-50"
            >
              Backfill {days}d
            </button>
          )}
        </div>
      </div>

      {missingData && !isBackfilling && (
        <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-400">
          Faltan datos para este período ({metrics.length}/{days} días con
          data). Hacé backfill para descargar el historial completo.
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
            <ActivityList
                activities={activities}
                total={activityTotal}
                offset={activityOffset}
                onPrev={() => setActivityOffset((o) => o - PAGE_SIZE)}
                onNext={() => setActivityOffset((o) => o + PAGE_SIZE)}
              />
          </div>
        </>
      )}
    </div>
  );
}

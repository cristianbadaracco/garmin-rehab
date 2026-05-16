import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { AIInsight, RecoveryProgress } from "../../types/index";
import InsightCard from "./components/InsightCard";
import RecoveryCard from "./components/RecoveryCard";

export default function Progress() {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [recovery, setRecovery] = useState<RecoveryProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const endDate = new Date().toISOString().slice(0, 10);
      const startDate = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const [insightsData, recoveryData] = await Promise.allSettled([
        api.analysis.getInsights(startDate, endDate),
        api.analysis.getRecoveryProgress(),
      ]);
      if (insightsData.status === "fulfilled") setInsights(insightsData.value);
      if (recoveryData.status === "fulfilled" && recoveryData.value?.injury_id) {
        setRecovery(recoveryData.value);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      await api.analysis.generateDaily();
      await loadData();
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="text-gray-400">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Progreso</h1>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="rounded-lg border border-border-subtle px-4 py-2 text-sm text-gray-300 hover:border-accent hover:text-white disabled:opacity-50"
        >
          {generating ? "Generando..." : "Generar análisis"}
        </button>
      </div>

      {recovery && <RecoveryCard progress={recovery} />}

      <div>
        <h2 className="mb-3 text-sm font-medium text-gray-400">
          Insights IA — últimos 30 días
          {insights.length > 0 && (
            <span className="ml-2 rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent">
              {insights.length}
            </span>
          )}
        </h2>

        {insights.length === 0 ? (
          <div className="rounded-xl border border-border-subtle bg-bg-card p-10 text-center">
            <p className="text-gray-400">Sin análisis generados aún.</p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="mt-3 text-sm text-accent hover:underline disabled:opacity-50"
            >
              Generar primer análisis
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

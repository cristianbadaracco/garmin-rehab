import { useEffect, useState } from "react";
import Card from "../../components/Card";
import { api } from "../../lib/api";
import type { Injury, PainLog } from "../../types/index";
import InjuryCard from "./components/InjuryCard";
import InjuryForm from "./components/InjuryForm";
import PainChart from "./components/PainChart";
import PainLogForm from "./components/PainLogForm";

export default function MedicalProfile() {
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [painLogs, setPainLogs] = useState<PainLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInjuryForm, setShowInjuryForm] = useState(false);
  const [showPainForm, setShowPainForm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [injuriesData, logsData] = await Promise.all([
        api.medical.getInjuries(false),
        api.medical.getPainLogs(
          new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
          new Date().toISOString().slice(0, 10),
        ),
      ]);
      setInjuries(injuriesData);
      setPainLogs(logsData);
    } finally {
      setLoading(false);
    }
  }

  function handleInjuryCreated(injury: Injury) {
    setInjuries((prev) => [injury, ...prev]);
    setShowInjuryForm(false);
  }

  function handleInjuryUpdated(updated: Injury) {
    setInjuries((prev) => prev.map((inj) => (inj.id === updated.id ? updated : inj)));
  }

  function handlePainLogCreated(log: PainLog) {
    setPainLogs((prev) => [log, ...prev]);
    setShowPainForm(false);
  }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="text-gray-400">Cargando...</p>
      </div>
    );
  }

  const activeInjuries = injuries.filter((inj) => inj.is_active);
  const inactiveInjuries = injuries.filter((inj) => !inj.is_active);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Perfil médico</h1>
        <div className="flex gap-2">
          {activeInjuries.length > 0 && !showPainForm && (
            <button
              onClick={() => { setShowPainForm(true); setShowInjuryForm(false); }}
              className="rounded-lg border border-border-subtle px-4 py-2 text-sm text-gray-300 hover:border-accent hover:text-white"
            >
              + Registrar dolor
            </button>
          )}
          {!showInjuryForm && (
            <button
              onClick={() => { setShowInjuryForm(true); setShowPainForm(false); }}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent/90"
            >
              + Nueva lesión
            </button>
          )}
        </div>
      </div>

      {showInjuryForm && (
        <InjuryForm onCreated={handleInjuryCreated} onCancel={() => setShowInjuryForm(false)} />
      )}

      {showPainForm && activeInjuries.length > 0 && (
        <PainLogForm
          injuries={activeInjuries}
          onCreated={handlePainLogCreated}
          onCancel={() => setShowPainForm(false)}
        />
      )}

      {painLogs.length > 0 && (
        <Card title="Dolor últimos 30 días">
          <PainChart logs={painLogs} />
        </Card>
      )}

      {activeInjuries.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-gray-400">Lesiones activas</h2>
          <div className="space-y-3">
            {activeInjuries.map((inj) => (
              <InjuryCard key={inj.id} injury={inj} onUpdated={handleInjuryUpdated} />
            ))}
          </div>
        </div>
      )}

      {inactiveInjuries.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-gray-400">Historial</h2>
          <div className="space-y-3">
            {inactiveInjuries.map((inj) => (
              <InjuryCard key={inj.id} injury={inj} onUpdated={handleInjuryUpdated} />
            ))}
          </div>
        </div>
      )}

      {injuries.length === 0 && !showInjuryForm && (
        <div className="rounded-xl border border-border-subtle bg-bg-card p-10 text-center">
          <p className="text-gray-400">Sin lesiones registradas.</p>
          <button
            onClick={() => setShowInjuryForm(true)}
            className="mt-3 text-sm text-accent hover:underline"
          >
            Registrar primera lesión
          </button>
        </div>
      )}
    </div>
  );
}

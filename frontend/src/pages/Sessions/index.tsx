import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { Session } from "../../types/index";
import SessionCard from "./components/SessionCard";
import SessionForm from "./components/SessionForm";

export default function Sessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    setLoading(true);
    try {
      const endDate = new Date().toISOString().slice(0, 10);
      const startDate = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const data = await api.sessions.list(startDate, endDate);
      setSessions(data.sort((a, b) => b.date.localeCompare(a.date)));
    } finally {
      setLoading(false);
    }
  }

  function handleCreated(session: Session) {
    setSessions((prev) => [session, ...prev]);
    setShowForm(false);
  }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="text-gray-400">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Sesiones</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent/90"
          >
            + Nueva sesión
          </button>
        )}
      </div>

      {showForm && (
        <SessionForm onCreated={handleCreated} onCancel={() => setShowForm(false)} />
      )}

      {sessions.length === 0 && !showForm ? (
        <div className="rounded-xl border border-border-subtle bg-bg-card p-10 text-center">
          <p className="text-gray-400">Sin sesiones registradas en los últimos 30 días.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-3 text-sm text-accent hover:underline"
          >
            Registrar primera sesión
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}

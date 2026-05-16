import { useState } from "react";
import { api } from "../../../lib/api";
import type { Injury, PainLog } from "../../../types/index";

const CONTEXTS = [
  { value: "rest", label: "Reposo" },
  { value: "morning", label: "Mañana" },
  { value: "activity", label: "Durante actividad" },
  { value: "post_activity", label: "Post actividad" },
];

interface Props {
  injuries: Injury[];
  onCreated: (log: PainLog) => void;
  onCancel: () => void;
}

export default function PainLogForm({ injuries, onCreated, onCancel }: Props) {
  const [injuryId, setInjuryId] = useState(injuries[0]?.id ?? "");
  const [painLevel, setPainLevel] = useState(0);
  const [context, setContext] = useState("rest");
  const [swelling, setSwelling] = useState(false);
  const [stiffness, setStiffness] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const log = await api.medical.createPainLog({
        injury_id: injuryId,
        pain_level: painLevel,
        context,
        swelling,
        stiffness,
        notes: notes || null,
      });
      onCreated(log);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar dolor");
    } finally {
      setSaving(false);
    }
  }

  const painColor =
    painLevel <= 3 ? "text-green-400" : painLevel <= 6 ? "text-yellow-400" : "text-red-400";

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border-subtle bg-bg-card p-5 space-y-4">
      <h3 className="font-medium text-white">Registrar dolor</h3>

      <select value={injuryId} onChange={(e) => setInjuryId(e.target.value)}
        className="w-full rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-white focus:border-accent focus:outline-none">
        {injuries.map((inj) => (
          <option key={inj.id} value={inj.id}>{inj.name}</option>
        ))}
      </select>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-gray-400">Nivel de dolor</label>
          <span className={`text-2xl font-bold ${painColor}`}>{painLevel}</span>
        </div>
        <input
          type="range"
          min={0}
          max={10}
          value={painLevel}
          onChange={(e) => setPainLevel(Number(e.target.value))}
          className="w-full accent-accent"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Sin dolor</span>
          <span>Dolor máximo</span>
        </div>
      </div>

      <select value={context} onChange={(e) => setContext(e.target.value)}
        className="w-full rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-white focus:border-accent focus:outline-none">
        {CONTEXTS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>

      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input type="checkbox" checked={swelling} onChange={(e) => setSwelling(e.target.checked)}
            className="accent-accent" />
          Hinchazón
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input type="checkbox" checked={stiffness} onChange={(e) => setStiffness(e.target.checked)}
            className="accent-accent" />
          Rigidez
        </label>
      </div>

      <textarea
        placeholder="Notas (opcional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        className="w-full rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-accent focus:outline-none"
      />

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={saving}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent/90 disabled:opacity-50">
          {saving ? "Guardando..." : "Registrar"}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-gray-400 hover:text-white">
          Cancelar
        </button>
      </div>
    </form>
  );
}

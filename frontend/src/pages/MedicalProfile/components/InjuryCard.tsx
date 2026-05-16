import { useState } from "react";
import { api } from "../../../lib/api";
import type { Injury } from "../../../types/index";

const PHASES = [
  { value: "immobilization", label: "Inmovilización" },
  { value: "mobility", label: "Movilidad" },
  { value: "strength_base", label: "Fuerza base" },
  { value: "strength_stability", label: "Fuerza + estabilidad" },
  { value: "running", label: "Carrera" },
  { value: "full_sport", label: "Deporte completo" },
];

const PHASE_COLORS: Record<string, string> = {
  immobilization: "bg-red-500/20 text-red-400",
  mobility: "bg-orange-500/20 text-orange-400",
  strength_base: "bg-yellow-500/20 text-yellow-400",
  strength_stability: "bg-blue-500/20 text-blue-400",
  running: "bg-purple-500/20 text-purple-400",
  full_sport: "bg-green-500/20 text-green-400",
};

interface Props {
  injury: Injury;
  onUpdated: (injury: Injury) => void;
}

export default function InjuryCard({ injury, onUpdated }: Props) {
  const [editing, setEditing] = useState(false);
  const [phase, setPhase] = useState(injury.current_phase);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const phaseLabel = PHASES.find((p) => p.value === injury.current_phase)?.label ?? injury.current_phase;
  const phaseColor = PHASE_COLORS[injury.current_phase] ?? "bg-gray-500/20 text-gray-400";

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await api.medical.updatePhase(injury.id, { current_phase: phase, notes: notes || null });
      onUpdated(updated);
      setEditing(false);
      setNotes("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-medium text-white">{injury.name}</h3>
          <p className="mt-0.5 text-sm text-gray-400">
            {injury.body_part.replace(/_/g, " ")} · {injury.injury_type}
          </p>
          {injury.date_occurred && (
            <p className="mt-0.5 text-xs text-gray-500">
              Ocurrida: {injury.date_occurred}
              {injury.surgery_date && ` · Cirugía: ${injury.surgery_date}`}
            </p>
          )}
        </div>
        <span className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium ${phaseColor}`}>
          {phaseLabel}
        </span>
      </div>

      {injury.notes && (
        <p className="mt-3 text-sm text-gray-400">{injury.notes}</p>
      )}

      {!editing ? (
        <button
          onClick={() => setEditing(true)}
          className="mt-4 text-sm text-accent hover:underline"
        >
          Actualizar fase
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <select
            value={phase}
            onChange={(e) => setPhase(e.target.value)}
            className="w-full rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-white focus:border-accent focus:outline-none"
          >
            {PHASES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Notas (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-accent focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-black hover:bg-accent/90 disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="text-sm text-gray-400 hover:text-white"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

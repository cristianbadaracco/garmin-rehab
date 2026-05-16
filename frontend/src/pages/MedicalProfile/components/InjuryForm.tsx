import { useState } from "react";
import { api } from "../../../lib/api";
import type { Injury } from "../../../types/index";

const INJURY_TYPES = ["surgery", "fracture", "sprain", "tendinopathy", "other"];
const BODY_PARTS = [
  "knee_right", "knee_left", "ankle_right", "ankle_left",
  "hip_right", "hip_left", "shoulder_right", "shoulder_left",
  "back_lower", "back_upper", "quad_right", "quad_left",
  "hamstring_right", "hamstring_left",
];
const PHASES = [
  { value: "immobilization", label: "Inmovilización" },
  { value: "mobility", label: "Movilidad" },
  { value: "strength_base", label: "Fuerza base" },
  { value: "strength_stability", label: "Fuerza + estabilidad" },
  { value: "running", label: "Carrera" },
  { value: "full_sport", label: "Deporte completo" },
];

interface Props {
  onCreated: (injury: Injury) => void;
  onCancel: () => void;
}

export default function InjuryForm({ onCreated, onCancel }: Props) {
  const [name, setName] = useState("");
  const [injuryType, setInjuryType] = useState("surgery");
  const [bodyPart, setBodyPart] = useState("knee_right");
  const [dateOccurred, setDateOccurred] = useState("");
  const [surgeryDate, setSurgeryDate] = useState("");
  const [recoveryMonths, setRecoveryMonths] = useState(12);
  const [phase, setPhase] = useState("immobilization");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const injury = await api.medical.createInjury({
        name,
        injury_type: injuryType,
        body_part: bodyPart,
        date_occurred: dateOccurred,
        surgery_date: surgeryDate || null,
        estimated_recovery_months: recoveryMonths,
        current_phase: phase,
        notes: notes || null,
      });
      onCreated(injury);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear lesión");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border-subtle bg-bg-card p-5 space-y-4">
      <h3 className="font-medium text-white">Nueva lesión</h3>

      <input
        type="text"
        placeholder="Nombre (ej: Reconstrucción LCA rodilla derecha)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="w-full rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-accent focus:outline-none"
      />

      <div className="grid grid-cols-2 gap-3">
        <select value={injuryType} onChange={(e) => setInjuryType(e.target.value)}
          className="rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-white focus:border-accent focus:outline-none">
          {INJURY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={bodyPart} onChange={(e) => setBodyPart(e.target.value)}
          className="rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-white focus:border-accent focus:outline-none">
          {BODY_PARTS.map((p) => <option key={p} value={p}>{p.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-gray-400">Fecha lesión</label>
          <input type="date" value={dateOccurred} onChange={(e) => setDateOccurred(e.target.value)} required
            className="w-full rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-white focus:border-accent focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-400">Fecha cirugía (opcional)</label>
          <input type="date" value={surgeryDate} onChange={(e) => setSurgeryDate(e.target.value)}
            className="w-full rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-white focus:border-accent focus:outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-gray-400">Recuperación estimada (meses)</label>
          <input type="number" value={recoveryMonths} onChange={(e) => setRecoveryMonths(Number(e.target.value))} min={1} max={60}
            className="w-full rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-white focus:border-accent focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-400">Fase actual</label>
          <select value={phase} onChange={(e) => setPhase(e.target.value)}
            className="w-full rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-white focus:border-accent focus:outline-none">
            {PHASES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
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
          {saving ? "Guardando..." : "Crear lesión"}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-gray-400 hover:text-white">
          Cancelar
        </button>
      </div>
    </form>
  );
}

import { useState } from "react";
import { api } from "../../../lib/api";
import type { Session } from "../../../types/index";

const BLOCK_TYPES = ["strength", "stability", "mobility", "jumps", "running", "cardio"];
const BLOCK_TYPE_LABELS: Record<string, string> = {
  strength: "Fuerza", stability: "Estabilidad", mobility: "Movilidad",
  jumps: "Saltos", running: "Carrera", cardio: "Cardio",
};

interface BlockDraft {
  block_type: string;
  duration_minutes: string;
  exercises: string;
  pain_during: string;
  notes: string;
}

interface Props {
  onCreated: (session: Session) => void;
  onCancel: () => void;
}

function emptyBlock(): BlockDraft {
  return { block_type: "strength", duration_minutes: "", exercises: "", pain_during: "", notes: "" };
}

export default function SessionForm({ onCreated, onCancel }: Props) {
  const [title, setTitle] = useState("");
  const [sessionType] = useState("manual");
  const [totalDuration, setTotalDuration] = useState("");
  const [rpe, setRpe] = useState("");
  const [overallPain, setOverallPain] = useState("");
  const [notes, setNotes] = useState("");
  const [blocks, setBlocks] = useState<BlockDraft[]>([emptyBlock()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateBlock(index: number, field: keyof BlockDraft, value: string) {
    setBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)));
  }

  function addBlock() {
    setBlocks((prev) => [...prev, emptyBlock()]);
  }

  function removeBlock(index: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const session = await api.sessions.create({
        session_type: sessionType,
        title: title || null,
        total_duration_minutes: totalDuration ? Number(totalDuration) : null,
        overall_rpe: rpe ? Number(rpe) : null,
        overall_pain: overallPain ? Number(overallPain) : null,
        notes: notes || null,
        blocks: blocks.map((b) => ({
          block_type: b.block_type,
          duration_minutes: b.duration_minutes ? Number(b.duration_minutes) : null,
          exercises: b.exercises || null,
          pain_during: b.pain_during ? Number(b.pain_during) : null,
          notes: b.notes || null,
        })),
      });
      onCreated(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar sesión");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border-subtle bg-bg-card p-5 space-y-4">
      <h3 className="font-medium text-white">Nueva sesión</h3>

      <input type="text" placeholder="Título (ej: Kine + carrera)" value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-accent focus:outline-none" />

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-xs text-gray-400">Duración (min)</label>
          <input type="number" value={totalDuration} onChange={(e) => setTotalDuration(e.target.value)} min={1}
            className="w-full rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-white focus:border-accent focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-400">RPE (1-10)</label>
          <input type="number" value={rpe} onChange={(e) => setRpe(e.target.value)} min={1} max={10}
            className="w-full rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-white focus:border-accent focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-400">Dolor general (0-10)</label>
          <input type="number" value={overallPain} onChange={(e) => setOverallPain(e.target.value)} min={0} max={10}
            className="w-full rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-white focus:border-accent focus:outline-none" />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-gray-400">Bloques de entrenamiento</p>
          <button type="button" onClick={addBlock} className="text-xs text-accent hover:underline">
            + Agregar bloque
          </button>
        </div>
        <div className="space-y-3">
          {blocks.map((block, i) => (
            <div key={i} className="rounded-lg border border-border-subtle p-3 space-y-2">
              <div className="flex items-center justify-between">
                <select value={block.block_type} onChange={(e) => updateBlock(i, "block_type", e.target.value)}
                  className="rounded-lg border border-border-subtle bg-bg-primary px-3 py-1.5 text-sm text-white focus:border-accent focus:outline-none">
                  {BLOCK_TYPES.map((t) => <option key={t} value={t}>{BLOCK_TYPE_LABELS[t]}</option>)}
                </select>
                {blocks.length > 1 && (
                  <button type="button" onClick={() => removeBlock(i)} className="text-xs text-gray-500 hover:text-danger">
                    Quitar
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" placeholder="Minutos" value={block.duration_minutes}
                  onChange={(e) => updateBlock(i, "duration_minutes", e.target.value)}
                  className="rounded-lg border border-border-subtle bg-bg-primary px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:border-accent focus:outline-none" />
                <input type="number" placeholder="Dolor (0-10)" value={block.pain_during} min={0} max={10}
                  onChange={(e) => updateBlock(i, "pain_during", e.target.value)}
                  className="rounded-lg border border-border-subtle bg-bg-primary px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:border-accent focus:outline-none" />
              </div>
              <input type="text" placeholder="Ejercicios (ej: sentadillas, prensa)" value={block.exercises}
                onChange={(e) => updateBlock(i, "exercises", e.target.value)}
                className="w-full rounded-lg border border-border-subtle bg-bg-primary px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:border-accent focus:outline-none" />
            </div>
          ))}
        </div>
      </div>

      <textarea placeholder="Notas generales" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
        className="w-full rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-accent focus:outline-none" />

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={saving}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent/90 disabled:opacity-50">
          {saving ? "Guardando..." : "Guardar sesión"}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-gray-400 hover:text-white">
          Cancelar
        </button>
      </div>
    </form>
  );
}

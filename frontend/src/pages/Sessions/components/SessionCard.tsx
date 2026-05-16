import type { Session } from "../../../types/index";

const BLOCK_TYPE_LABELS: Record<string, string> = {
  strength: "Fuerza",
  stability: "Estabilidad",
  mobility: "Movilidad",
  jumps: "Saltos",
  running: "Carrera",
  cardio: "Cardio",
};

const SESSION_TYPE_LABELS: Record<string, string> = {
  tracked: "Garmin",
  manual: "Manual",
  mixed: "Mixta",
};

interface Props {
  session: Session;
}

export default function SessionCard({ session }: Props) {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">
              {session.title ?? "Sesión"}
            </span>
            <span className="rounded-md bg-accent/10 px-2 py-0.5 text-xs text-accent">
              {SESSION_TYPE_LABELS[session.session_type] ?? session.session_type}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-gray-500">{session.date}</p>
        </div>
        <div className="flex gap-4 text-right text-sm">
          {session.total_duration_minutes != null && (
            <div>
              <p className="text-white font-medium">{session.total_duration_minutes} min</p>
              <p className="text-xs text-gray-500">Duración</p>
            </div>
          )}
          {session.overall_rpe != null && (
            <div>
              <p className="text-white font-medium">{session.overall_rpe}/10</p>
              <p className="text-xs text-gray-500">RPE</p>
            </div>
          )}
          {session.overall_pain != null && (
            <div>
              <p className={`font-medium ${session.overall_pain <= 3 ? "text-green-400" : session.overall_pain <= 6 ? "text-yellow-400" : "text-red-400"}`}>
                {session.overall_pain}/10
              </p>
              <p className="text-xs text-gray-500">Dolor</p>
            </div>
          )}
        </div>
      </div>

      {session.blocks.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {session.blocks.map((block) => (
            <div key={block.id} className="rounded-lg border border-border-subtle px-3 py-2 text-xs">
              <span className="text-gray-300 font-medium">
                {BLOCK_TYPE_LABELS[block.block_type] ?? block.block_type}
              </span>
              {block.duration_minutes != null && (
                <span className="ml-1.5 text-gray-500">{block.duration_minutes} min</span>
              )}
              {block.pain_during != null && (
                <span className={`ml-1.5 ${block.pain_during <= 3 ? "text-green-400" : block.pain_during <= 6 ? "text-yellow-400" : "text-red-400"}`}>
                  dolor {block.pain_during}
                </span>
              )}
              {block.exercises && (
                <p className="mt-1 text-gray-500">{block.exercises}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {session.notes && (
        <p className="mt-3 text-sm text-gray-400">{session.notes}</p>
      )}
    </div>
  );
}

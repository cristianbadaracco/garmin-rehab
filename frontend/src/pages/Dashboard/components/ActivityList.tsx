import Card from "../../../components/Card";
import type { Activity } from "../../../types";
import { formatDate, formatDistance, formatDuration } from "../utils";

const PAGE_SIZE = 10;

interface Props {
  activities: Activity[];
  total: number;
  offset: number;
  onPrev: () => void;
  onNext: () => void;
}

export function ActivityList({ activities, total, offset, onPrev, onNext }: Props) {
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE_SIZE, total);
  const hasPrev = offset > 0;
  const hasNext = offset + PAGE_SIZE < total;

  return (
    <Card title="Actividades recientes">
      {activities.length === 0 ? (
        <p className="text-sm text-gray-500">Sin actividades en este período.</p>
      ) : (
        <>
          <div className="space-y-3">
            {activities.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-lg border border-border-subtle bg-bg-primary p-3"
              >
                <div>
                  <p className="text-sm font-medium text-white">{a.name || a.activity_type}</p>
                  <p className="text-xs text-gray-500">{formatDate(a.date)}</p>
                </div>
                <div className="flex gap-4 text-sm text-gray-400">
                  <span>{formatDuration(a.duration_seconds)}</span>
                  <span>{formatDistance(a.distance_meters)}</span>
                  {a.avg_hr && <span>{a.avg_hr} bpm</span>}
                </div>
              </div>
            ))}
          </div>

          {total > PAGE_SIZE && (
            <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
              <span>
                {from}–{to} de {total}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={onPrev}
                  disabled={!hasPrev}
                  className="rounded border border-border-subtle px-3 py-1 transition-colors hover:text-white disabled:opacity-30"
                >
                  ←
                </button>
                <button
                  onClick={onNext}
                  disabled={!hasNext}
                  className="rounded border border-border-subtle px-3 py-1 transition-colors hover:text-white disabled:opacity-30"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

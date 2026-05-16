import { useState } from "react";
import Card from "../../../components/Card";
import type { Activity } from "../../../types";
import { formatDate, formatDistance, formatDuration } from "../utils";

const PAGE_SIZE = 10;

interface Props {
  activities: Activity[];
}

export function ActivityList({ activities }: Props) {
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(activities.length / PAGE_SIZE);
  const visible = activities.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <Card title="Actividades recientes">
      {activities.length === 0 ? (
        <p className="text-sm text-gray-500">Sin actividades en este período.</p>
      ) : (
        <>
          <div className="space-y-3">
            {visible.map((a) => (
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

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
              <span>
                {page * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE + PAGE_SIZE, activities.length)} de {activities.length}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 0}
                  className="rounded border border-border-subtle px-3 py-1 transition-colors hover:text-white disabled:opacity-30"
                >
                  ←
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages - 1}
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

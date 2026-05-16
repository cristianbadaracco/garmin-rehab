import Card from "../../../components/Card";
import type { Activity } from "../../../types";
import { formatDate, formatDistance, formatDuration } from "../utils";

interface Props {
  activities: Activity[];
}

export function ActivityList({ activities }: Props) {
  return (
    <Card title="Actividades recientes">
      {activities.length === 0 ? (
        <p className="text-sm text-gray-500">Sin actividades en este período.</p>
      ) : (
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
      )}
    </Card>
  );
}

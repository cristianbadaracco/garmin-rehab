import type { AIInsight } from "../../../types/index";

const SEVERITY_STYLES: Record<string, string> = {
  info: "border-blue-500/30 bg-blue-500/5",
  warning: "border-yellow-500/30 bg-yellow-500/5",
  alert: "border-red-500/30 bg-red-500/5",
};

const SEVERITY_BADGE: Record<string, string> = {
  info: "bg-blue-500/20 text-blue-400",
  warning: "bg-yellow-500/20 text-yellow-400",
  alert: "bg-red-500/20 text-red-400",
};

const SEVERITY_LABELS: Record<string, string> = {
  info: "Info",
  warning: "Atención",
  alert: "Alerta",
};

interface Props {
  insight: AIInsight;
}

export default function InsightCard({ insight }: Props) {
  const borderStyle = SEVERITY_STYLES[insight.severity] ?? "border-border-subtle bg-bg-card";
  const badgeStyle = SEVERITY_BADGE[insight.severity] ?? "bg-gray-500/20 text-gray-400";

  return (
    <div className={`rounded-xl border p-4 ${borderStyle}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${badgeStyle}`}>
          {SEVERITY_LABELS[insight.severity] ?? insight.severity}
        </span>
        <span className="text-xs text-gray-500">{insight.date}</span>
      </div>
      <p className="text-sm font-medium text-white">{insight.title}</p>
      <p className="mt-1 text-sm text-gray-400">{insight.content}</p>
    </div>
  );
}

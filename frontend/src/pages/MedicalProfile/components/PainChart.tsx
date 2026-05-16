import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PainLog } from "../../../types/index";

interface Props {
  logs: PainLog[];
}

export default function PainChart({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-sm text-gray-500">Sin registros de dolor aún</p>
      </div>
    );
  }

  const data = [...logs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((log) => ({
      date: log.date.slice(5),
      dolor: log.pain_level,
    }));

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
        <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 11 }} />
        <YAxis domain={[0, 10]} tick={{ fill: "#9ca3af", fontSize: 11 }} width={20} />
        <Tooltip
          contentStyle={{ background: "#1a1a2e", border: "1px solid #ffffff15", borderRadius: 8 }}
          labelStyle={{ color: "#9ca3af" }}
          itemStyle={{ color: "#e5e7eb" }}
        />
        <Line
          type="monotone"
          dataKey="dolor"
          stroke="#f97316"
          strokeWidth={2}
          dot={{ fill: "#f97316", r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

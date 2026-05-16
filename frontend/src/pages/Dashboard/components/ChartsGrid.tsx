import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Card from "../../../components/Card";
import type { DailyMetrics } from "../../../types";
import { formatDate } from "../utils";

const COLORS = {
  accent: "#3ECF8E",
  warn: "#F5A524",
  danger: "#EF4444",
  blue: "#3B82F6",
  purple: "#A855F7",
  gray: "#6B7280",
};

const TOOLTIP = { backgroundColor: "#12161F", border: "1px solid #1E2433" };

interface Props {
  metrics: DailyMetrics[];
}

export function ChartsGrid({ metrics }: Props) {
  const data = metrics.map((m) => ({ ...m, dateLabel: formatDate(m.date) }));
  const hasTrainingReadiness = data.some((d) => d.training_readiness != null);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card title="FC en reposo">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2433" />
            <XAxis dataKey="dateLabel" tick={{ fill: "#6B7280", fontSize: 12 }} />
            <YAxis tick={{ fill: "#6B7280", fontSize: 12 }} domain={["auto", "auto"]} />
            <Tooltip contentStyle={TOOLTIP} />
            <Line type="monotone" dataKey="resting_hr" stroke={COLORS.danger} strokeWidth={2} dot={false} name="FC reposo" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card title="HRV (variabilidad cardíaca)">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2433" />
            <XAxis dataKey="dateLabel" tick={{ fill: "#6B7280", fontSize: 12 }} />
            <YAxis tick={{ fill: "#6B7280", fontSize: 12 }} domain={["auto", "auto"]} />
            <Tooltip contentStyle={TOOLTIP} />
            <Line type="monotone" dataKey="hrv_last_night" stroke={COLORS.blue} strokeWidth={2} dot={false} name="HRV noche" />
            <Line type="monotone" dataKey="hrv_weekly_avg" stroke={COLORS.gray} strokeWidth={1} strokeDasharray="5 5" dot={false} name="Media semanal" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Sueño (horas)">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2433" />
            <XAxis dataKey="dateLabel" tick={{ fill: "#6B7280", fontSize: 12 }} />
            <YAxis tick={{ fill: "#6B7280", fontSize: 12 }} />
            <Tooltip contentStyle={TOOLTIP} />
            <Bar dataKey="deep_sleep_hours" stackId="sleep" fill={COLORS.blue} name="Profundo" />
            <Bar dataKey="rem_sleep_hours" stackId="sleep" fill={COLORS.purple} name="REM" />
            <Bar dataKey="light_sleep_hours" stackId="sleep" fill={COLORS.gray} name="Ligero" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Body Battery">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2433" />
            <XAxis dataKey="dateLabel" tick={{ fill: "#6B7280", fontSize: 12 }} />
            <YAxis tick={{ fill: "#6B7280", fontSize: 12 }} domain={[0, 100]} />
            <Tooltip contentStyle={TOOLTIP} />
            <Area type="monotone" dataKey="body_battery_morning" stroke={COLORS.accent} fill={COLORS.accent} fillOpacity={0.15} strokeWidth={2} name="Morning" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Estrés promedio">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2433" />
            <XAxis dataKey="dateLabel" tick={{ fill: "#6B7280", fontSize: 12 }} />
            <YAxis tick={{ fill: "#6B7280", fontSize: 12 }} domain={[0, 100]} />
            <Tooltip contentStyle={TOOLTIP} />
            <Line type="monotone" dataKey="avg_stress" stroke={COLORS.warn} strokeWidth={2} dot={false} name="Estrés" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {hasTrainingReadiness && (
        <Card title="Training Readiness">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2433" />
              <XAxis dataKey="dateLabel" tick={{ fill: "#6B7280", fontSize: 12 }} />
              <YAxis tick={{ fill: "#6B7280", fontSize: 12 }} domain={[0, 100]} />
              <Tooltip contentStyle={TOOLTIP} />
              <Area type="monotone" dataKey="training_readiness" stroke={COLORS.accent} fill={COLORS.accent} fillOpacity={0.1} strokeWidth={2} name="Readiness" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}

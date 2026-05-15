import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, } from "recharts";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
function formatDate(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}
function formatDuration(seconds) {
    if (!seconds)
        return "-";
    const m = Math.floor(seconds / 60);
    const h = Math.floor(m / 60);
    if (h > 0)
        return `${h}h ${m % 60}m`;
    return `${m}m`;
}
function formatDistance(meters) {
    if (!meters)
        return "-";
    return `${(meters / 1000).toFixed(1)} km`;
}
const CHART_COLORS = {
    accent: "#3ECF8E",
    warn: "#F5A524",
    danger: "#EF4444",
    blue: "#3B82F6",
    purple: "#A855F7",
    gray: "#6B7280",
};
function Card({ title, children, }) {
    return (_jsxs("div", { className: "rounded-xl border border-border-subtle bg-bg-card p-5", children: [_jsx("h3", { className: "mb-4 text-sm font-medium text-gray-400", children: title }), children] }));
}
export default function Dashboard() {
    const { user } = useAuth();
    const [metrics, setMetrics] = useState([]);
    const [activities, setActivities] = useState([]);
    const [days, setDays] = useState(7);
    const [syncing, setSyncing] = useState(false);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        loadData();
    }, [days]);
    async function loadData() {
        setLoading(true);
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - days);
        const startStr = start.toISOString().slice(0, 10);
        const endStr = end.toISOString().slice(0, 10);
        try {
            const [m, a] = await Promise.all([
                api.garmin.getMetrics(startStr, endStr),
                api.garmin.getActivities(startStr, endStr),
            ]);
            setMetrics(m);
            setActivities(a);
        }
        catch {
            // Si no hay datos, quedan vacíos
        }
        finally {
            setLoading(false);
        }
    }
    async function handleSync() {
        setSyncing(true);
        try {
            await api.garmin.sync();
            await loadData();
        }
        catch {
            // Error silencioso
        }
        finally {
            setSyncing(false);
        }
    }
    const chartData = metrics.map((m) => ({
        ...m,
        dateLabel: formatDate(m.date),
    }));
    const todayMetrics = metrics.length > 0 ? metrics[metrics.length - 1] : null;
    return (_jsxs("div", { children: [_jsxs("div", { className: "mb-6 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-semibold text-white", children: "Dashboard" }), _jsxs("p", { className: "mt-1 text-sm text-gray-400", children: ["Hola ", user?.name, ". M\u00E9tricas de los \u00FAltimos ", days, " d\u00EDas."] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "flex rounded-lg border border-border-subtle", children: [_jsx("button", { onClick: () => setDays(7), className: `px-3 py-1.5 text-sm ${days === 7 ? "bg-accent/20 text-accent" : "text-gray-400"}`, children: "7d" }), _jsx("button", { onClick: () => setDays(30), className: `px-3 py-1.5 text-sm ${days === 30 ? "bg-accent/20 text-accent" : "text-gray-400"}`, children: "30d" })] }), _jsx("button", { onClick: handleSync, disabled: syncing, className: "rounded-lg bg-accent/20 px-4 py-1.5 text-sm text-accent transition-colors hover:bg-accent/30 disabled:opacity-50", children: syncing ? "Sincronizando..." : "Sync Garmin" })] })] }), loading ? (_jsx("p", { className: "text-gray-400", children: "Cargando m\u00E9tricas..." })) : metrics.length === 0 ? (_jsxs("div", { className: "rounded-xl border border-border-subtle bg-bg-card p-12 text-center", children: [_jsx("p", { className: "text-lg text-gray-300", children: "No hay datos de Garmin" }), _jsx("p", { className: "mt-2 text-sm text-gray-500", children: "Conect\u00E1 tu cuenta Garmin y sincroniz\u00E1 datos para ver el dashboard." })] })) : (_jsxs(_Fragment, { children: [todayMetrics && (_jsx("div", { className: "mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6", children: [
                            { label: "FC reposo", value: todayMetrics.resting_hr, unit: "bpm" },
                            { label: "HRV", value: todayMetrics.hrv_last_night, unit: "ms" },
                            { label: "Sueño", value: todayMetrics.sleep_hours?.toFixed(1), unit: "h" },
                            { label: "Body Battery", value: todayMetrics.body_battery_morning, unit: "%" },
                            { label: "Estrés", value: todayMetrics.avg_stress, unit: "" },
                            { label: "Training Ready", value: todayMetrics.training_readiness, unit: "" },
                        ].map((item) => (_jsxs("div", { className: "rounded-lg border border-border-subtle bg-bg-card p-4", children: [_jsx("p", { className: "text-xs text-gray-500", children: item.label }), _jsxs("p", { className: "mt-1 text-2xl font-semibold text-white", children: [item.value ?? "-", _jsx("span", { className: "ml-1 text-sm text-gray-500", children: item.unit })] })] }, item.label))) })), _jsxs("div", { className: "grid grid-cols-1 gap-6 lg:grid-cols-2", children: [_jsx(Card, { title: "FC en reposo", children: _jsx(ResponsiveContainer, { width: "100%", height: 200, children: _jsxs(LineChart, { data: chartData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E2433" }), _jsx(XAxis, { dataKey: "dateLabel", tick: { fill: "#6B7280", fontSize: 12 } }), _jsx(YAxis, { tick: { fill: "#6B7280", fontSize: 12 }, domain: ["auto", "auto"] }), _jsx(Tooltip, { contentStyle: { backgroundColor: "#12161F", border: "1px solid #1E2433" } }), _jsx(Line, { type: "monotone", dataKey: "resting_hr", stroke: CHART_COLORS.danger, strokeWidth: 2, dot: false, name: "FC reposo" })] }) }) }), _jsx(Card, { title: "HRV (variabilidad card\u00EDaca)", children: _jsx(ResponsiveContainer, { width: "100%", height: 200, children: _jsxs(LineChart, { data: chartData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E2433" }), _jsx(XAxis, { dataKey: "dateLabel", tick: { fill: "#6B7280", fontSize: 12 } }), _jsx(YAxis, { tick: { fill: "#6B7280", fontSize: 12 }, domain: ["auto", "auto"] }), _jsx(Tooltip, { contentStyle: { backgroundColor: "#12161F", border: "1px solid #1E2433" } }), _jsx(Line, { type: "monotone", dataKey: "hrv_last_night", stroke: CHART_COLORS.blue, strokeWidth: 2, dot: false, name: "HRV noche" }), _jsx(Line, { type: "monotone", dataKey: "hrv_weekly_avg", stroke: CHART_COLORS.gray, strokeWidth: 1, strokeDasharray: "5 5", dot: false, name: "Media semanal" })] }) }) }), _jsx(Card, { title: "Sue\u00F1o (horas)", children: _jsx(ResponsiveContainer, { width: "100%", height: 200, children: _jsxs(BarChart, { data: chartData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E2433" }), _jsx(XAxis, { dataKey: "dateLabel", tick: { fill: "#6B7280", fontSize: 12 } }), _jsx(YAxis, { tick: { fill: "#6B7280", fontSize: 12 } }), _jsx(Tooltip, { contentStyle: { backgroundColor: "#12161F", border: "1px solid #1E2433" } }), _jsx(Bar, { dataKey: "deep_sleep_hours", stackId: "sleep", fill: CHART_COLORS.blue, name: "Profundo" }), _jsx(Bar, { dataKey: "rem_sleep_hours", stackId: "sleep", fill: CHART_COLORS.purple, name: "REM" }), _jsx(Bar, { dataKey: "light_sleep_hours", stackId: "sleep", fill: CHART_COLORS.gray, name: "Ligero" })] }) }) }), _jsx(Card, { title: "Body Battery", children: _jsx(ResponsiveContainer, { width: "100%", height: 200, children: _jsxs(AreaChart, { data: chartData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E2433" }), _jsx(XAxis, { dataKey: "dateLabel", tick: { fill: "#6B7280", fontSize: 12 } }), _jsx(YAxis, { tick: { fill: "#6B7280", fontSize: 12 }, domain: [0, 100] }), _jsx(Tooltip, { contentStyle: { backgroundColor: "#12161F", border: "1px solid #1E2433" } }), _jsx(Area, { type: "monotone", dataKey: "body_battery_morning", stroke: CHART_COLORS.accent, fill: CHART_COLORS.accent, fillOpacity: 0.15, strokeWidth: 2, name: "Morning" })] }) }) }), _jsx(Card, { title: "Estr\u00E9s promedio", children: _jsx(ResponsiveContainer, { width: "100%", height: 200, children: _jsxs(LineChart, { data: chartData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E2433" }), _jsx(XAxis, { dataKey: "dateLabel", tick: { fill: "#6B7280", fontSize: 12 } }), _jsx(YAxis, { tick: { fill: "#6B7280", fontSize: 12 }, domain: [0, 100] }), _jsx(Tooltip, { contentStyle: { backgroundColor: "#12161F", border: "1px solid #1E2433" } }), _jsx(Line, { type: "monotone", dataKey: "avg_stress", stroke: CHART_COLORS.warn, strokeWidth: 2, dot: false, name: "Estr\u00E9s" })] }) }) }), _jsx(Card, { title: "Training Readiness", children: _jsx(ResponsiveContainer, { width: "100%", height: 200, children: _jsxs(AreaChart, { data: chartData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#1E2433" }), _jsx(XAxis, { dataKey: "dateLabel", tick: { fill: "#6B7280", fontSize: 12 } }), _jsx(YAxis, { tick: { fill: "#6B7280", fontSize: 12 }, domain: [0, 100] }), _jsx(Tooltip, { contentStyle: { backgroundColor: "#12161F", border: "1px solid #1E2433" } }), _jsx(Area, { type: "monotone", dataKey: "training_readiness", stroke: CHART_COLORS.accent, fill: CHART_COLORS.accent, fillOpacity: 0.1, strokeWidth: 2, name: "Readiness" })] }) }) })] }), _jsx("div", { className: "mt-6", children: _jsx(Card, { title: "Actividades recientes", children: activities.length === 0 ? (_jsx("p", { className: "text-sm text-gray-500", children: "Sin actividades en este per\u00EDodo." })) : (_jsx("div", { className: "space-y-3", children: activities.map((a) => (_jsxs("div", { className: "flex items-center justify-between rounded-lg border border-border-subtle bg-bg-primary p-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-white", children: a.name || a.activity_type }), _jsx("p", { className: "text-xs text-gray-500", children: formatDate(a.date) })] }), _jsxs("div", { className: "flex gap-4 text-sm text-gray-400", children: [_jsx("span", { children: formatDuration(a.duration_seconds) }), _jsx("span", { children: formatDistance(a.distance_meters) }), a.avg_hr && _jsxs("span", { children: [a.avg_hr, " bpm"] })] })] }, a.id))) })) }) })] }))] }));
}

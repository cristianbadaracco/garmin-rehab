import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import MedicalProfile from "./pages/MedicalProfile";
import Progress from "./pages/Progress";
import Sessions from "./pages/Sessions";
function AppContent() {
    const { user, isLoading, logout } = useAuth();
    if (isLoading) {
        return (_jsx("div", { className: "flex min-h-screen items-center justify-center", children: _jsx("p", { className: "text-gray-400", children: "Cargando..." }) }));
    }
    if (!user) {
        return _jsx(Login, {});
    }
    return (_jsxs("div", { className: "min-h-screen bg-bg-primary", children: [_jsx("nav", { className: "border-b border-border-subtle px-6 py-4", children: _jsxs("div", { className: "mx-auto flex max-w-7xl items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20", children: _jsx("span", { className: "text-sm font-bold text-accent", children: "GR" }) }), _jsx("span", { className: "font-semibold text-white", children: "Garmin Rehab Coach" })] }), _jsxs("div", { className: "flex items-center gap-6 text-sm", children: [_jsx("a", { href: "/", className: "text-gray-400 transition-colors hover:text-white", children: "Dashboard" }), _jsx("a", { href: "/medical", className: "text-gray-400 transition-colors hover:text-white", children: "Perfil m\u00E9dico" }), _jsx("a", { href: "/sessions", className: "text-gray-400 transition-colors hover:text-white", children: "Sesiones" }), _jsx("a", { href: "/progress", className: "text-gray-400 transition-colors hover:text-white", children: "Progreso" }), _jsx("span", { className: "text-gray-500", children: "|" }), _jsx("span", { className: "text-gray-500", children: user.name }), _jsx("button", { onClick: logout, className: "text-gray-400 transition-colors hover:text-danger", children: "Salir" })] })] }) }), _jsx("main", { className: "mx-auto max-w-7xl px-6 py-8", children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Dashboard, {}) }), _jsx(Route, { path: "/medical", element: _jsx(MedicalProfile, {}) }), _jsx(Route, { path: "/sessions", element: _jsx(Sessions, {}) }), _jsx(Route, { path: "/progress", element: _jsx(Progress, {}) })] }) })] }));
}
export default function App() {
    return (_jsx(AuthProvider, { children: _jsx(AppContent, {}) }));
}

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
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-400">Cargando...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <nav className="border-b border-border-subtle px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20">
              <span className="text-sm font-bold text-accent">GR</span>
            </div>
            <span className="font-semibold text-white">Garmin Rehab Coach</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <a href="/" className="text-gray-400 transition-colors hover:text-white">
              Dashboard
            </a>
            <a href="/medical" className="text-gray-400 transition-colors hover:text-white">
              Perfil médico
            </a>
            <a href="/sessions" className="text-gray-400 transition-colors hover:text-white">
              Sesiones
            </a>
            <a href="/progress" className="text-gray-400 transition-colors hover:text-white">
              Progreso
            </a>
            <span className="text-gray-500">|</span>
            <span className="text-gray-500">{user.name}</span>
            <button
              onClick={logout}
              className="text-gray-400 transition-colors hover:text-danger"
            >
              Salir
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/medical" element={<MedicalProfile />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/progress" element={<Progress />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
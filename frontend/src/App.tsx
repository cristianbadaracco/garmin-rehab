import { Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import MedicalProfile from "./pages/MedicalProfile";
import Progress from "./pages/Progress";
import Sessions from "./pages/Sessions";

export default function App() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <nav className="border-b border-border-subtle px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-accent/20 flex items-center justify-center">
              <span className="text-accent text-sm font-bold">GR</span>
            </div>
            <span className="font-semibold text-white">Garmin Rehab Coach</span>
          </div>
          <div className="flex gap-6 text-sm">
            <a href="/" className="text-gray-400 hover:text-white transition-colors">
              Dashboard
            </a>
            <a href="/medical" className="text-gray-400 hover:text-white transition-colors">
              Perfil médico
            </a>
            <a href="/sessions" className="text-gray-400 hover:text-white transition-colors">
              Sesiones
            </a>
            <a href="/progress" className="text-gray-400 hover:text-white transition-colors">
              Progreso
            </a>
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

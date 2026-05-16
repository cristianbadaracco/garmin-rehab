import { useAuth } from "@/lib/auth";

const Navbar = () => {
  const { user, logout } = useAuth();

  if (!user) return;

  return (
    <nav className="border-b border-border-subtle px-6 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20">
            <span className="text-sm font-bold text-accent">GR</span>
          </div>
          <span className="font-semibold text-white">Garmin Rehab Coach</span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <a
            href="/"
            className="text-gray-400 transition-colors hover:text-white"
          >
            Dashboard
          </a>
          <a
            href="/medical"
            className="text-gray-400 transition-colors hover:text-white"
          >
            Perfil médico
          </a>
          <a
            href="/sessions"
            className="text-gray-400 transition-colors hover:text-white"
          >
            Sesiones
          </a>
          <a
            href="/progress"
            className="text-gray-400 transition-colors hover:text-white"
          >
            Progreso
          </a>
          <span className="text-gray-500">|</span>
          <span className="text-gray-500">{user?.name}</span>
          {user?.garmin_device_model && (
            <span className="rounded-md bg-accent/10 px-2 py-0.5 text-xs text-accent">
              {user?.garmin_device_model}
            </span>
          )}
          <button
            onClick={logout}
            className="text-gray-400 transition-colors hover:text-danger"
          >
            Salir
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

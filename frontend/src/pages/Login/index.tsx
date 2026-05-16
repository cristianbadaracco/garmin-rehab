import { useState } from "react";
import { useAuth } from "@/lib/auth";

export default function Login() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, password, name);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm rounded-xl border border-border-subtle bg-bg-card p-8">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20">
            <span className="text-lg font-bold text-accent">GR</span>
          </div>
          <span className="text-xl font-semibold text-white">
            Garmin Rehab Coach
          </span>
        </div>

        <h2 className="mb-6 text-center text-lg text-gray-300">
          {isRegister ? "Crear cuenta" : "Iniciar sesión"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <input
              type="text"
              placeholder="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-border-subtle bg-bg-primary px-4 py-2.5 text-white placeholder-gray-500 focus:border-accent focus:outline-none"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-border-subtle bg-bg-primary px-4 py-2.5 text-white placeholder-gray-500 focus:border-accent focus:outline-none"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full rounded-lg border border-border-subtle bg-bg-primary px-4 py-2.5 text-white placeholder-gray-500 focus:border-accent focus:outline-none"
          />

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent py-2.5 font-medium text-black transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            {loading
              ? "Cargando..."
              : isRegister
                ? "Crear cuenta"
                : "Iniciar sesión"}
          </button>
        </form>

        <button
          onClick={() => {
            setIsRegister(!isRegister);
            setError("");
          }}
          className="mt-4 w-full text-center text-sm text-gray-400 hover:text-white"
        >
          {isRegister
            ? "¿Ya tenés cuenta? Iniciá sesión"
            : "¿No tenés cuenta? Registrate"}
        </button>
      </div>
    </div>
  );
}

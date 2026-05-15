import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useAuth } from "../lib/auth";
export default function Login() {
    const { login, register } = useAuth();
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            if (isRegister) {
                await register(email, password, name);
            }
            else {
                await login(email, password);
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Error desconocido");
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsx("div", { className: "flex min-h-screen items-center justify-center", children: _jsxs("div", { className: "w-full max-w-sm rounded-xl border border-border-subtle bg-bg-card p-8", children: [_jsxs("div", { className: "mb-6 flex items-center justify-center gap-2", children: [_jsx("div", { className: "flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20", children: _jsx("span", { className: "text-lg font-bold text-accent", children: "GR" }) }), _jsx("span", { className: "text-xl font-semibold text-white", children: "Garmin Rehab Coach" })] }), _jsx("h2", { className: "mb-6 text-center text-lg text-gray-300", children: isRegister ? "Crear cuenta" : "Iniciar sesión" }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [isRegister && (_jsx("input", { type: "text", placeholder: "Nombre", value: name, onChange: (e) => setName(e.target.value), required: true, className: "w-full rounded-lg border border-border-subtle bg-bg-primary px-4 py-2.5 text-white placeholder-gray-500 focus:border-accent focus:outline-none" })), _jsx("input", { type: "email", placeholder: "Email", value: email, onChange: (e) => setEmail(e.target.value), required: true, className: "w-full rounded-lg border border-border-subtle bg-bg-primary px-4 py-2.5 text-white placeholder-gray-500 focus:border-accent focus:outline-none" }), _jsx("input", { type: "password", placeholder: "Password", value: password, onChange: (e) => setPassword(e.target.value), required: true, minLength: 8, className: "w-full rounded-lg border border-border-subtle bg-bg-primary px-4 py-2.5 text-white placeholder-gray-500 focus:border-accent focus:outline-none" }), error && (_jsx("p", { className: "text-sm text-danger", children: error })), _jsx("button", { type: "submit", disabled: loading, className: "w-full rounded-lg bg-accent py-2.5 font-medium text-black transition-colors hover:bg-accent/90 disabled:opacity-50", children: loading
                                ? "Cargando..."
                                : isRegister
                                    ? "Crear cuenta"
                                    : "Iniciar sesión" })] }), _jsx("button", { onClick: () => {
                        setIsRegister(!isRegister);
                        setError("");
                    }, className: "mt-4 w-full text-center text-sm text-gray-400 hover:text-white", children: isRegister
                        ? "¿Ya tenés cuenta? Iniciá sesión"
                        : "¿No tenés cuenta? Registrate" })] }) }));
}

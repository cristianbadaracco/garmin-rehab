import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useState } from "react";
const AuthContext = createContext(null);
const TOKEN_KEY = "garmin_rehab_token";
const API_BASE = "/api";
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        if (token) {
            fetchUser(token);
        }
        else {
            setIsLoading(false);
        }
    }, []);
    async function fetchUser(accessToken) {
        try {
            const res = await fetch(`${API_BASE}/auth/me`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (res.ok) {
                const data = await res.json();
                setUser(data);
                setToken(accessToken);
            }
            else {
                localStorage.removeItem(TOKEN_KEY);
                setToken(null);
                setUser(null);
            }
        }
        catch {
            localStorage.removeItem(TOKEN_KEY);
            setToken(null);
            setUser(null);
        }
        finally {
            setIsLoading(false);
        }
    }
    async function login(email, password) {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.detail || "Error al iniciar sesión");
        }
        const data = await res.json();
        localStorage.setItem(TOKEN_KEY, data.access_token);
        setToken(data.access_token);
        await fetchUser(data.access_token);
    }
    async function register(email, password, name) {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, name }),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.detail || "Error al registrarse");
        }
        const data = await res.json();
        localStorage.setItem(TOKEN_KEY, data.access_token);
        setToken(data.access_token);
        await fetchUser(data.access_token);
    }
    function logout() {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
    }
    return (_jsx(AuthContext.Provider, { value: { user, token, isLoading, login, register, logout }, children: children }));
}
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx)
        throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}

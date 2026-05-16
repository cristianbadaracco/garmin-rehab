import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";

import { AuthProvider, useAuth } from "./lib/auth";

import Navbar from "./components/Navbar";

const Dashboard = lazy(() => import("./pages/Dashboard/index"));
const Login = lazy(() => import("./pages/Login/index"));
const MedicalProfile = lazy(() => import("./pages/MedicalProfile/index"));
const Progress = lazy(() => import("./pages/Progress/index"));
const Sessions = lazy(() => import("./pages/Sessions/index"));

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-400">Cargando...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            <p className="text-gray-400">Cargando...</p>
          </div>
        }
      >
        <Login />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <Navbar />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Suspense fallback={<div className="h-48" />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/medical" element={<MedicalProfile />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/progress" element={<Progress />} />
          </Routes>
        </Suspense>
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

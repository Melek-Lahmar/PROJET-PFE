import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../features/auth/store/authStore";

export function ProtectedRoute() {
  const token = useAuthStore((s) => s.token);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);

  // Pas de token persisté → redirection immédiate, inutile d'attendre /me.
  if (!token) return <Navigate to="/login" replace />;

  // Token présent mais bootstrap en cours → loader bref.
  if (!bootstrapped) {
    return <div className="card p-6">Chargement...</div>;
  }

  return <Outlet />;
}

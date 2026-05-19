import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../features/auth/store/authStore";

type Props = {
  roles: string[]; // ex: ["ADMIN"]
};

export function RoleRoute({ roles }: Props) {
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const isAuth = useAuthStore((s) => s.isAuthenticated());
  const userRoles = useAuthStore((s) => s.roles);

  if (!bootstrapped) return <div className="card p-6">Chargement...</div>;
  if (!isAuth) return <Navigate to="/login" replace />;

  const allowed = roles.some((r) => userRoles.includes(r));
  if (!allowed) return <Navigate to="/" replace />;

  return <Outlet />;
}

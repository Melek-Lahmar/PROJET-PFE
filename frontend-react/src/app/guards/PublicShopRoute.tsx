import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../features/auth/store/authStore";

function staffRedirect(roles: string[]) {
  if (roles.includes("ADMIN")) return "/admin";
  if (roles.includes("SUPERVISEUR")) return "/supervisor/zones";
  if (roles.includes("CONFIRMATEUR")) return "/confirmateur/commandes";
  if (roles.includes("LIVREUR")) return "/livreur/bl";
  if (roles.includes("VENDEUR")) return "/vendeur/articles";
  return "/articles";
}

export function PublicShopRoute() {
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const roles = useAuthStore((s) => s.roles);

  if (!bootstrapped) return <div className="card p-6">Chargement...</div>;

  if (
    roles.includes("ADMIN") ||
    roles.includes("CONFIRMATEUR") ||
    roles.includes("LIVREUR") ||
    roles.includes("SUPERVISEUR") ||
    roles.includes("VENDEUR")
  ) {
    return <Navigate to={staffRedirect(roles)} replace />;
  }

  return <Outlet />;
}
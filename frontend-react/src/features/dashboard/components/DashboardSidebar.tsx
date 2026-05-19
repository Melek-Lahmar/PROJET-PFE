import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../../features/auth/store/authStore";

const nav = [
  ["overview", "⌁", "/admin/dashboard/overview"],
  ["sales", "↗", "/admin/dashboard/sales"],
  ["orders", "□", "/admin/dashboard/orders"],
  ["products", "◇", "/admin/dashboard/products"],
  ["stock", "▣", "/admin/dashboard/stock"],
  ["depots", "⌂", "/admin/dashboard/depots"],
  ["logistics", "⇄", "/admin/dashboard/logistics"],
  ["drivers", "◉", "/admin/dashboard/drivers"],
  ["clients", "◎", "/admin/dashboard/clients"],
  ["reclamations", "!", "/admin/dashboard/reclamations"],
  ["sync", "⟳", "/admin/dashboard/sync"],
  ["insights", "✦", "/admin/dashboard/insights"],
] as const;

export function DashboardSidebar() {
  const { t } = useTranslation("admin");
  const email = useAuthStore((s) => s.email);
  const profile = useAuthStore((s) => s.profile);
  const name = profile?.nomComplet || email?.split("@")[0] || "Admin";

  return (
    <aside className="pro-sidebar">
      <div className="pro-admin-card">
        <div className="pro-admin-card__avatar">{name.slice(0, 1).toUpperCase()}</div>
        <div>
          <strong>{name}</strong>
          <span>{email || "admin@app.local"}</span>
          <small>{t("dashboard.admin.connected")}</small>
        </div>
      </div>
      <nav className="pro-nav" aria-label="Dashboard admin">
        {nav.map(([key, icon, href]) => (
          <NavLink key={key} to={href} className={({ isActive }) => `pro-nav__item ${isActive ? "is-active" : ""}`}>
            <span className="pro-nav__icon">{icon}</span>
            <span>{t(`dashboard.nav.${key}`)}</span>
          </NavLink>
        ))}
      </nav>
      <NavLink to="/admin" className="pro-nav__back">← {t("dashboard.nav.backAdmin")}</NavLink>
    </aside>
  );
}

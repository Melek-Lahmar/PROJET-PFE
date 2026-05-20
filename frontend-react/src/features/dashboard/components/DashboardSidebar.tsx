import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../../features/auth/store/authStore";
import type { ComponentType, ReactNode, SVGProps } from "react";

type DashboardIconName =
  | "overview"
  | "sales"
  | "orders"
  | "products"
  | "stock"
  | "depots"
  | "logistics"
  | "drivers"
  | "clients"
  | "reclamations"
  | "sync"
  | "insights"
  | "admin";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {children}
    </svg>
  );
}

const icons: Record<DashboardIconName, ComponentType<IconProps>> = {
  overview: (props) => <IconBase {...props}><path d="M4 13h6V4H4z" /><path d="M14 20h6V4h-6z" /><path d="M4 20h6v-3H4z" /></IconBase>,
  sales: (props) => <IconBase {...props}><path d="M4 18V8" /><path d="M10 18V5" /><path d="M16 18v-7" /><path d="M20 18H3" /><path d="m15 7 3-3 3 3" /></IconBase>,
  orders: (props) => <IconBase {...props}><path d="M7 3h10l2 4v14H5V7z" /><path d="M7 7h10" /><path d="M9 12h6" /><path d="M9 16h4" /></IconBase>,
  products: (props) => <IconBase {...props}><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" /><path d="m4 7.5 8 4.5 8-4.5" /><path d="M12 12v9" /></IconBase>,
  stock: (props) => <IconBase {...props}><path d="M4 20V8" /><path d="M20 20V8" /><path d="M3 8h18" /><path d="m7 8 5-5 5 5" /><path d="M8 13h3" /><path d="M13 13h3" /><path d="M8 17h8" /></IconBase>,
  depots: (props) => <IconBase {...props}><path d="M3 21h18" /><path d="M5 21V8l7-5 7 5v13" /><path d="M9 21v-7h6v7" /><path d="M8 10h8" /></IconBase>,
  logistics: (props) => <IconBase {...props}><path d="M3 7h11v10H3z" /><path d="M14 11h4l3 3v3h-7z" /><path d="M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /><path d="M17 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /></IconBase>,
  drivers: (props) => <IconBase {...props}><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /><path d="M4 21a8 8 0 0 1 16 0" /><path d="M16 11.5 19 14l2-2" /></IconBase>,
  clients: (props) => <IconBase {...props}><path d="M16 11a4 4 0 1 0-8 0" /><path d="M3 21a9 9 0 0 1 18 0" /><path d="M18 8h3" /><path d="M19.5 6.5v3" /></IconBase>,
  reclamations: (props) => <IconBase {...props}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" /><path d="M12 7v5" /><path d="M12 16h.01" /></IconBase>,
  sync: (props) => <IconBase {...props}><path d="M20 11a8 8 0 0 0-14.9-4" /><path d="M4 5v5h5" /><path d="M4 13a8 8 0 0 0 14.9 4" /><path d="M20 19v-5h-5" /></IconBase>,
  insights: (props) => <IconBase {...props}><path d="M12 2v4" /><path d="M12 18v4" /><path d="m4.93 4.93 2.83 2.83" /><path d="m16.24 16.24 2.83 2.83" /><path d="M2 12h4" /><path d="M18 12h4" /><path d="m4.93 19.07 2.83-2.83" /><path d="m16.24 7.76 2.83-2.83" /><circle cx="12" cy="12" r="3" /></IconBase>,
  admin: (props) => <IconBase {...props}><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /><path d="M19 5v14" /></IconBase>,
};

const nav: { key: Exclude<DashboardIconName, "admin">; href: string }[] = [
  { key: "overview", href: "/admin/dashboard/overview" },
  { key: "sales", href: "/admin/dashboard/sales" },
  { key: "orders", href: "/admin/dashboard/orders" },
  { key: "products", href: "/admin/dashboard/products" },
  { key: "stock", href: "/admin/dashboard/stock" },
  { key: "depots", href: "/admin/dashboard/depots" },
  { key: "logistics", href: "/admin/dashboard/logistics" },
  { key: "drivers", href: "/admin/dashboard/drivers" },
  { key: "clients", href: "/admin/dashboard/clients" },
  { key: "reclamations", href: "/admin/dashboard/reclamations" },
  { key: "sync", href: "/admin/dashboard/sync" },
  { key: "insights", href: "/admin/dashboard/insights" },
];

export function DashboardSidebar() {
  const { t } = useTranslation("admin");
  const email = useAuthStore((s) => s.email);
  const profile = useAuthStore((s) => s.profile);
  const name = profile?.nomComplet || email?.split("@")[0] || "Admin";
  const AdminIcon = icons.admin;

  return (
    <aside className="pro-sidebar">
      <div className="pro-admin-card" data-tooltip={`${name}${email ? ` - ${email}` : ""}`} aria-label={name}>
        <div className="pro-admin-card__avatar">{name.slice(0, 1).toUpperCase()}</div>
        <div className="pro-admin-card__meta">
          <strong>{name}</strong>
          <span>{email || "admin@app.local"}</span>
          <small>{t("dashboard.admin.connected")}</small>
        </div>
      </div>
      <nav className="pro-nav" aria-label="Dashboard admin">
        {nav.map(({ key, href }) => {
          const label = t(`dashboard.nav.${key}`);
          const Icon = icons[key];
          return (
          <NavLink key={key} to={href} title={label} aria-label={label} data-tooltip={label} className={({ isActive }) => `pro-nav__item ${isActive ? "is-active" : ""}`}>
            <span className="pro-nav__icon"><Icon /></span>
            <span className="pro-nav__label">{label}</span>
          </NavLink>
          );
        })}
      </nav>
      <NavLink to="/admin" className="pro-nav__back" title={t("dashboard.nav.backAdmin")} aria-label={t("dashboard.nav.backAdmin")} data-tooltip={t("dashboard.nav.backAdmin")}>
        <span className="pro-nav__icon"><AdminIcon /></span>
        <span className="pro-nav__label">{t("dashboard.nav.backAdmin")}</span>
      </NavLink>
    </aside>
  );
}

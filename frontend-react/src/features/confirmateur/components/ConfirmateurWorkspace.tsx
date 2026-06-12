import type { ReactNode, SVGProps } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LanguageSwitcher } from "../../../shared/components/LanguageSwitcher";
import { ThemeToggle } from "../../../shared/components/ThemeToggle";
import { useAuthStore } from "../../auth/store/authStore";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {children}
    </svg>
  );
}

const icons = {
  dashboard: (props: IconProps) => <Icon {...props}><path d="M4 13h6V4H4z" /><path d="M14 20h6V4h-6z" /><path d="M4 20h6v-3H4z" /></Icon>,
  commandes: (props: IconProps) => <Icon {...props}><path d="M7 3h10l2 4v14H5V7z" /><path d="M7 7h10" /><path d="M9 12h6" /><path d="M9 16h4" /></Icon>,
  bl: (props: IconProps) => <Icon {...props}><path d="M3 7h11v10H3z" /><path d="M14 10h4l3 3v4h-7z" /><circle cx="7" cy="19" r="2" /><circle cx="18" cy="19" r="2" /></Icon>,
  devis: (props: IconProps) => <Icon {...props}><path d="M6 2h9l5 5v15H6z" /><path d="M14 2v6h6" /><path d="M9 13h6" /><path d="M9 17h8" /></Icon>,
  history: (props: IconProps) => <Icon {...props}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 7v5l3 2" /></Icon>,
  settings: (props: IconProps) => <Icon {...props}><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></Icon>,
};

const groups = [
  {
    title: "Navigation",
    items: [
      { label: "Tableau de bord", href: "/confirmateur/dashboard", icon: icons.dashboard },
      { label: "Bons de commande (BC)", href: "/confirmateur/commandes", icon: icons.commandes },
      { label: "Bons de livraison (BL)", href: "/confirmateur/bl", icon: icons.bl },
      { label: "Devis B2B", href: "/confirmateur/devis", icon: icons.devis },
      { label: "Suivi client", href: "/confirmateur/suivi", icon: icons.history },
    ],
  },
  {
    title: "Paramètres",
    items: [
      { label: "Mes paramètres", href: "/confirmateur/parametres", icon: icons.settings },
    ],
  },
];

function isActivePath(current: string, href: string) {
  const path = href.split("?")[0];
  if (path === "/confirmateur/dashboard") return current === path;
  return current === path || current.startsWith(`${path}/`);
}

export function ConfirmateurWorkspace() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = useAuthStore((s) => s.email);
  const profile = useAuthStore((s) => s.profile);
  const clear = useAuthStore((s) => s.clear);
  const name = profile?.nomComplet || email?.split("@")[0] || "Admin";

  const handleLogout = () => {
    clear();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[286px] border-r border-border/70 bg-card/92 px-5 py-5 shadow-[18px_0_60px_-48px_rgba(15,23,42,0.55)] backdrop-blur-xl lg:block">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-sm font-black text-primary-foreground shadow-lg shadow-primary/20">C</div>
          <div className="min-w-0">
            <div className="text-sm font-black uppercase tracking-tight text-card-foreground">Confirmateur</div>
            <div className="truncate text-[11px] font-semibold text-muted-foreground">Contrôle · Valide · Perform</div>
          </div>
        </div>

        <nav className="mt-9 space-y-7">
          {groups.map((group) => (
            <div key={group.title}>
              <div className="px-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{group.title}</div>
              <div className="mt-3 space-y-1.5">
                {group.items.map((item) => {
                  const active = isActivePath(location.pathname, item.href);
                  const ItemIcon = item.icon;
                  return (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${
                        active
                          ? "bg-primary/10 text-primary ring-1 ring-primary/15"
                          : "text-muted-foreground hover:bg-muted/55 hover:text-card-foreground"
                      }`}
                    >
                      <ItemIcon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-border/70 bg-muted/30 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-card text-sm font-black text-primary ring-1 ring-border">{name.slice(0, 1).toUpperCase()}</div>
            <div className="min-w-0">
              <div className="truncate text-sm font-black text-card-foreground">{name}</div>
              <div className="truncate text-xs text-muted-foreground">Chef confirmateur</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-bold text-danger transition hover:bg-danger/15"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
            Déconnexion
          </button>
        </div>
      </aside>

      <div className="lg:pl-[286px]">
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/82 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs font-bold text-primary">Accueil / Centre de contrôle</div>
              <div className="mt-1 truncate text-sm text-muted-foreground">Espace confirmateur séparé pour BC, BL et Devis B2B.</div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <ThemeToggle />
              <button
                type="button"
                onClick={handleLogout}
                title="Déconnexion"
                aria-label="Déconnexion"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-card text-danger transition hover:bg-danger/10"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="M16 17l5-5-5-5" />
                  <path d="M21 12H9" />
                </svg>
              </button>
              <div className="hidden items-center gap-3 rounded-xl border border-border/70 bg-card px-3 py-2 sm:flex">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">{name.slice(0, 1).toUpperCase()}</div>
                <div className="min-w-0">
                  <div className="truncate text-xs font-black text-card-foreground">{name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{email || "connecté"}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {groups[0].items.map((item) => {
              const active = isActivePath(location.pathname, item.href);
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-black ${
                    active ? "border-primary/25 bg-primary text-primary-foreground" : "border-border/70 bg-card text-card-foreground"
                  }`}
                >
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        </header>

        <main className="px-4 py-5 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

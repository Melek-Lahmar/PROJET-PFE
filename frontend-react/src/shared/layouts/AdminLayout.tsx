import { Link, Outlet, useLocation } from "react-router-dom";

type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
  icon: React.ReactNode;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const Ico = {
  grid: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M3 3v18h18" /><path d="m7 16 4-4 4 4 4-4" />
    </svg>
  ),
  orders: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12h6M9 16h4" />
    </svg>
  ),
  clients: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  b2b: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  products: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  ),
  homepage: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M12 2 L21 7 L21 17 L12 22 L3 17 L3 7 Z" /><circle cx="9" cy="11" r="2" /><circle cx="15" cy="11" r="2" />
      <path d="M6 19c1-4 3-6 6-6s5 2 6 6" />
    </svg>
  ),
  staff: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <circle cx="12" cy="8" r="4" /><path d="M6 20v-2a6 6 0 0 1 12 0v2" />
    </svg>
  ),
  stock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2z" />
      <path d="M7 7h.01" />
    </svg>
  ),
  depots: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  zones: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z" /><circle cx="12" cy="9" r="2.5" />
    </svg>
  ),
  sync: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  ),
  chatbot: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
};

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Vue générale",
    items: [
      { href: "/admin", label: "Hub admin", exact: true, icon: Ico.grid },
      { href: "/admin/dashboard", label: "Analytics", icon: Ico.chart },
    ],
  },
  {
    label: "Commerce",
    items: [
      { href: "/admin/orders", label: "Commandes", icon: Ico.orders },
      { href: "/admin/clients", label: "Clients", icon: Ico.clients },
      { href: "/admin/clients/b2b", label: "Clients B2B", icon: Ico.b2b },
      { href: "/admin/articles", label: "Articles", icon: Ico.products },
      { href: "/admin/homepage", label: "Page d'accueil", icon: Ico.homepage },
    ],
  },
  {
    label: "Personnel",
    items: [
      { href: "/admin/users", label: "Utilisateurs", icon: Ico.users },
      { href: "/admin/personnel", label: "Personnel", icon: Ico.staff },
    ],
  },
  {
    label: "Logistique",
    items: [
      { href: "/admin/stocks", label: "Stock", icon: Ico.stock },
      { href: "/admin/depots", label: "Dépôts", icon: Ico.depots },
      { href: "/admin/depot-zones", label: "Zones livraison", icon: Ico.zones },
    ],
  },
  {
    label: "Système",
    items: [
      { href: "/admin/sync", label: "Sync Sage", icon: Ico.sync },
      { href: "/admin/chatbot", label: "Chatbot", icon: Ico.chatbot },
      { href: "/admin/settings", label: "Paramètres", icon: Ico.settings },
      { href: "/admin/settings/sage-x3", label: "Connexion Sage X3", icon: Ico.sync },
    ],
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  if (item.href === "/admin/clients" && pathname.startsWith("/admin/clients/b2b")) return false;
  return pathname.startsWith(item.href);
}

function NavItemEl({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item);
  return (
    <Link
      to={item.href}
      className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-semibold transition-all duration-150 ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-card-foreground/75 hover:bg-muted/60 hover:text-card-foreground"
      }`}
    >
      <span className="shrink-0">{item.icon}</span>
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function AdminLayout() {
  const { pathname } = useLocation();

  return (
    <div className="flex gap-6">
      <aside className="sticky top-20 hidden h-[calc(100vh-5.5rem)] w-52 shrink-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm lg:flex">
        {/* Brand header */}
        <div className="flex items-center gap-2.5 border-b border-border/70 px-3 py-3.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M12 2 L21 7 V17 L12 22 L3 17 V7 Z" />
              <path d="M12 22V12M21 7l-9 5-9-5" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-black text-card-foreground">Administration</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Panneau admin</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <div className="space-y-4">
            {NAV_SECTIONS.map((section) => (
              <div key={section.label}>
                <div className="mb-1 px-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/50">
                  {section.label}
                </div>
                <div className="space-y-0.5">
                  {section.items.map((item) => (
                    <NavItemEl key={item.href} item={item} pathname={pathname} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* Footer hint */}
        <div className="border-t border-border/70 px-3 py-3">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted/60 hover:text-card-foreground"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0">
              <path d="M9 19l-7-7 7-7" /><path d="M2 12h14" /><path d="M15 5a7 7 0 0 1 0 14" />
            </svg>
            Retour au site
          </Link>
        </div>
      </aside>

      {/* Page content */}
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}

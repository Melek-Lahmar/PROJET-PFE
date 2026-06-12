import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { SVGProps } from "react";

type AdminIconName =
  | "analytics"
  | "orders"
  | "users"
  | "addUser"
  | "clients"
  | "staff"
  | "b2b"
  | "products"
  | "images"
  | "stock"
  | "depots"
  | "zones"
  | "map"
  | "sync"
  | "homepage"
  | "chatbot"
  | "settings";

type AdminTile = {
  key: string;
  to: string;
  icon: AdminIconName;
  titleKey: string;
  titleFallback: string;
  descKey: string;
  descFallback: string;
  tone: string;
};

type AdminGroup = {
  titleKey: string;
  titleFallback: string;
  descKey: string;
  descFallback: string;
  tiles: AdminTile[];
};

function useAdminT() {
  const { t } = useTranslation("admin");

  return (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };
}

function AdminIcon({
  name,
  className,
}: {
  name: AdminIconName;
  className?: string;
}) {
  const props: SVGProps<SVGSVGElement> = {
    viewBox: "0 0 64 64",
    fill: "none",
    className,
  };

  switch (name) {
    case "analytics":
      return (
        <svg {...props}>
          <rect x="10" y="34" width="8" height="18" rx="2" fill="currentColor" opacity="0.45" />
          <rect x="24" y="24" width="8" height="28" rx="2" fill="currentColor" opacity="0.75" />
          <rect x="38" y="14" width="8" height="38" rx="2" fill="currentColor" />
          <path d="M10 54h44" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <path d="M13 27c10-1 16-6 21-13 4 5 8 8 17 8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case "orders":
      return (
        <svg {...props}>
          <rect x="15" y="9" width="34" height="46" rx="5" fill="currentColor" opacity="0.15" />
          <path d="M22 20h20M22 30h20M22 40h14" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <path d="M16 18h-5M16 32h-5M16 46h-5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <rect x="15" y="9" width="34" height="46" rx="5" stroke="currentColor" strokeWidth="4" />
        </svg>
      );

    case "users":
      return (
        <svg {...props}>
          <path d="M32 7 51 16v13c0 14-8 23-19 28-11-5-19-14-19-28V16L32 7Z" fill="currentColor" opacity="0.15" />
          <path d="M32 7 51 16v13c0 14-8 23-19 28-11-5-19-14-19-28V16L32 7Z" stroke="currentColor" strokeWidth="4" />
          <circle cx="25" cy="29" r="5" fill="currentColor" opacity="0.75" />
          <circle cx="40" cy="29" r="5" fill="currentColor" opacity="0.75" />
          <path d="M17 45c2-7 7-10 15-10s13 3 15 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );

    case "addUser":
      return (
        <svg {...props}>
          <circle cx="28" cy="21" r="10" fill="currentColor" opacity="0.16" />
          <circle cx="28" cy="21" r="10" stroke="currentColor" strokeWidth="4" />
          <path d="M10 55c3-14 9-21 18-21 6 0 11 3 15 9" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <circle cx="48" cy="46" r="10" fill="currentColor" opacity="0.18" />
          <path d="M48 38v16M40 46h16" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );

    case "clients":
      return (
        <svg {...props}>
          <circle cx="24" cy="24" r="9" fill="currentColor" opacity="0.22" />
          <circle cx="42" cy="27" r="7" fill="currentColor" opacity="0.35" />
          <path d="M10 54c2-11 8-17 17-17s15 6 17 17" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <path d="M35 54c2-8 7-12 14-12 5 0 9 3 11 9" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.55" />
          <circle cx="24" cy="24" r="9" stroke="currentColor" strokeWidth="4" />
        </svg>
      );

    case "staff":
      return (
        <svg {...props}>
          <circle cx="32" cy="20" r="10" fill="currentColor" opacity="0.18" />
          <circle cx="32" cy="20" r="10" stroke="currentColor" strokeWidth="4" />
          <path d="M14 54c3-13 9-20 18-20s15 7 18 20" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <path d="M22 46h20" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
        </svg>
      );

    case "b2b":
      return (
        <svg {...props}>
          <path d="M10 56V22L32 9l22 13v34" fill="currentColor" opacity="0.12" />
          <path d="M10 56V22L32 9l22 13v34" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
          <path d="M22 56V38h20v18" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
          <path d="M21 27h22M21 34h22" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
        </svg>
      );

    case "products":
      return (
        <svg {...props}>
          <path d="M12 20 32 10l20 10-20 10-20-10Z" fill="currentColor" opacity="0.25" />
          <path d="M12 20 32 10l20 10-20 10-20-10Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
          <path d="M12 32l20 10 20-10M12 44l20 10 20-10" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
        </svg>
      );

    case "images":
      return (
        <svg {...props}>
          <rect x="10" y="13" width="44" height="38" rx="6" fill="currentColor" opacity="0.12" />
          <rect x="10" y="13" width="44" height="38" rx="6" stroke="currentColor" strokeWidth="4" />
          <circle cx="25" cy="27" r="5" fill="currentColor" opacity="0.6" />
          <path d="M16 46 28 34l8 8 6-6 7 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case "stock":
      return (
        <svg {...props}>
          <rect x="12" y="18" width="40" height="34" rx="5" fill="currentColor" opacity="0.14" />
          <path d="M16 18V10h32v8M12 30h40M23 39h18" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <rect x="12" y="18" width="40" height="34" rx="5" stroke="currentColor" strokeWidth="4" />
        </svg>
      );

    case "depots":
      return (
        <svg {...props}>
          <path d="M9 27 32 10l23 17v29H9V27Z" fill="currentColor" opacity="0.12" />
          <path d="M9 27 32 10l23 17v29H9V27Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
          <path d="M23 56V39h18v17M20 30h24" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );

    case "zones":
      return (
        <svg {...props}>
          <path d="M14 17 28 10l16 7 10-5v35l-10 5-16-7-14 7V17Z" fill="currentColor" opacity="0.13" />
          <path d="M14 17 28 10l16 7 10-5v35l-10 5-16-7-14 7V17Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
          <path d="M28 10v35M44 17v35" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );

    case "map":
      return (
        <svg {...props}>
          <path d="M32 57s18-17 18-32A18 18 0 0 0 14 25c0 15 18 32 18 32Z" fill="currentColor" opacity="0.15" />
          <path d="M32 57s18-17 18-32A18 18 0 0 0 14 25c0 15 18 32 18 32Z" stroke="currentColor" strokeWidth="4" />
          <circle cx="32" cy="25" r="7" stroke="currentColor" strokeWidth="4" />
        </svg>
      );

    case "sync":
      return (
        <svg {...props}>
          <path d="M49 21A20 20 0 0 0 15 18" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <path d="M15 18h-5V9" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15 43a20 20 0 0 0 34 3" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <path d="M49 46h5v9" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="32" cy="32" r="10" fill="currentColor" opacity="0.15" />
        </svg>
      );

    case "homepage":
      return (
        <svg {...props}>
          <path d="M10 28 32 11l22 17v26H10V28Z" fill="currentColor" opacity="0.12" />
          <path d="M10 28 32 11l22 17v26H10V28Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
          <path d="M21 34h22M21 43h14" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );

    case "chatbot":
      return (
        <svg {...props}>
          <rect x="11" y="20" width="42" height="30" rx="8" fill="currentColor" opacity="0.13" />
          <rect x="11" y="20" width="42" height="30" rx="8" stroke="currentColor" strokeWidth="4" />
          <path d="M32 20v-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <circle cx="32" cy="10" r="3" fill="currentColor" />
          <circle cx="24" cy="34" r="3" fill="currentColor" />
          <circle cx="40" cy="34" r="3" fill="currentColor" />
          <path d="M25 43c4 3 10 3 14 0" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );

    case "settings":
      return (
        <svg {...props}>
          <circle cx="32" cy="32" r="8" fill="currentColor" opacity="0.16" />
          <circle cx="32" cy="32" r="8" stroke="currentColor" strokeWidth="4" />
          <path d="M32 8v7M32 49v7M8 32h7M49 32h7M15 15l5 5M44 44l5 5M49 15l-5 5M20 44l-5 5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );

    default:
      return null;
  }
}

const groups: AdminGroup[] = [
  {
    titleKey: "admin.control.group.account",
    titleFallback: "Pilotage & accès",
    descKey: "admin.control.group.account.desc",
    descFallback: "Modules essentiels pour piloter l’activité et sécuriser les accès.",
    tiles: [
      {
        key: "analytics",
        to: "/admin/dashboard",
        icon: "analytics",
        titleKey: "admin.control.analytics.title",
        titleFallback: "Dashboard analytique",
        descKey: "admin.control.analytics.desc",
        descFallback: "Ventes, commandes, stock, livraison et insights.",
        tone: "text-primary",
      },
      {
        key: "orders",
        to: "/admin/orders",
        icon: "orders",
        titleKey: "admin.control.orders.title",
        titleFallback: "Commandes",
        descKey: "admin.control.orders.desc",
        descFallback: "Suivi des commandes, statuts et bons de livraison.",
        tone: "text-warning",
      },
      {
        key: "users",
        to: "/admin/users",
        icon: "users",
        titleKey: "admin.control.users.title",
        titleFallback: "Utilisateurs & rôles",
        descKey: "admin.control.users.desc",
        descFallback: "Comptes, permissions et rôles applicatifs.",
        tone: "text-purple",
      },
      {
        key: "clients",
        to: "/admin/clients",
        icon: "clients",
        titleKey: "admin.control.clients.title",
        titleFallback: "Clients",
        descKey: "admin.control.clients.desc",
        descFallback: "Profils clients, adresses et informations commerciales.",
        tone: "text-success",
      },
    ],
  },
  {
    titleKey: "admin.control.group.business",
    titleFallback: "Catalogue & commerce",
    descKey: "admin.control.group.business.desc",
    descFallback: "Gestion des articles, clients B2B, contenus et données commerciales.",
    tiles: [
      {
        key: "staff",
        to: "/admin/personnel",
        icon: "staff",
        titleKey: "admin.control.staff.title",
        titleFallback: "Personnel",
        descKey: "admin.control.staff.desc",
        descFallback: "Vendeurs, confirmateurs, livreurs et superviseurs.",
        tone: "text-info",
      },
      {
        key: "add-user",
        to: "/admin/users?create=1",
        icon: "addUser",
        titleKey: "admin.control.addUser.title",
        titleFallback: "Ajouter un utilisateur",
        descKey: "admin.control.addUser.desc",
        descFallback: "Créer un client, un employé, un livreur, un superviseur ou un administrateur.",
        tone: "text-success",
      },
      {
        key: "b2b",
        to: "/admin/clients/b2b",
        icon: "b2b",
        titleKey: "admin.control.b2b.title",
        titleFallback: "Clients B2B",
        descKey: "admin.control.b2b.desc",
        descFallback: "Remises, comptes professionnels et conditions commerciales.",
        tone: "text-info",
      },
      {
        key: "products",
        to: "/admin/articles",
        icon: "products",
        titleKey: "admin.control.products.title",
        titleFallback: "Articles",
        descKey: "admin.control.products.desc",
        descFallback: "Catalogue produit, visibilité et données Sage.",
        tone: "text-purple",
      },
      {
        key: "images",
        to: "/admin/articles",
        icon: "images",
        titleKey: "admin.control.images.title",
        titleFallback: "Images articles",
        descKey: "admin.control.images.desc",
        descFallback: "Illustrations, qualité visuelle et publication.",
        tone: "text-danger/80",
      },
      {
        key: "homepage",
        to: "/admin/homepage",
        icon: "homepage",
        titleKey: "admin.control.homepage.title",
        titleFallback: "Page d’accueil",
        descKey: "admin.control.homepage.desc",
        descFallback: "Bannières, sections et contenu public.",
        tone: "text-danger",
      },
    ],
  },
  {
    titleKey: "admin.control.group.logistics",
    titleFallback: "Stock & logistique",
    descKey: "admin.control.group.logistics.desc",
    descFallback: "Organisation des dépôts, zones, disponibilité et couverture de livraison.",
    tiles: [
      {
        key: "stock",
        to: "/admin/stocks",
        icon: "stock",
        titleKey: "admin.control.stock.title",
        titleFallback: "Stock",
        descKey: "admin.control.stock.desc",
        descFallback: "Quantités disponibles, réservées et critiques.",
        tone: "text-info",
      },
      {
        key: "depots",
        to: "/admin/depots",
        icon: "depots",
        titleKey: "admin.control.depots.title",
        titleFallback: "Dépôts",
        descKey: "admin.control.depots.desc",
        descFallback: "Emplacements, disponibilité et affectations.",
        tone: "text-success",
      },
      {
        key: "zones",
        to: "/admin/depot-zones",
        icon: "zones",
        titleKey: "admin.control.zones.title",
        titleFallback: "Zones de livraison",
        descKey: "admin.control.zones.desc",
        descFallback: "Affectations dépôt-zone et gouvernorats couverts.",
        tone: "text-warning",
      },
      {
        key: "map",
        to: "/admin/coverage-map",
        icon: "map",
        titleKey: "admin.control.map.title",
        titleFallback: "Carte de couverture",
        descKey: "admin.control.map.desc",
        descFallback: "Visualisation géographique de la couverture.",
        tone: "text-danger",
      },
    ],
  },
  {
    titleKey: "admin.control.group.system",
    titleFallback: "Système & configuration",
    descKey: "admin.control.group.system.desc",
    descFallback: "Synchronisation, chatbot, paramètres, langue, thème et qualité des données.",
    tiles: [
      {
        key: "sync",
        to: "/admin/sync",
        icon: "sync",
        titleKey: "admin.control.sync.title",
        titleFallback: "Synchronisation Sage",
        descKey: "admin.control.sync.desc",
        descFallback: "Données Sage, intégrité et cohérence.",
        tone: "text-purple",
      },
      {
        key: "chatbot",
        to: "/admin/chatbot",
        icon: "chatbot",
        titleKey: "admin.control.chatbot.title",
        titleFallback: "Chatbot admin",
        descKey: "admin.control.chatbot.desc",
        descFallback: "Analyse, test et conversations clients.",
        tone: "text-indigo",
      },
      {
        key: "settings",
        to: "/admin/settings",
        icon: "settings",
        titleKey: "admin.control.settings.title",
        titleFallback: "Paramètres",
        descKey: "admin.control.settings.desc",
        descFallback: "Langue, thème, branding, SEO et coordonnées.",
        tone: "text-muted-foreground",
      },
    ],
  },
];

function ControlTile({ tile }: { tile: AdminTile }) {
  const tr = useAdminT();

  return (
    <Link
      to={tile.to}
      className="group flex min-h-[168px] flex-col items-center justify-center rounded-2xl border border-border bg-card px-4 py-5 text-center shadow-sm transition duration-200 hover:-translate-y-1 hover:border-primary/40 hover:bg-muted/30 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
    >
      <div
        className={[
          "mb-3 flex h-20 w-20 items-center justify-center rounded-3xl bg-muted/60 transition duration-200 group-hover:scale-105 group-hover:bg-background",
          tile.tone,
        ].join(" ")}
      >
        <AdminIcon name={tile.icon} className="h-14 w-14" />
      </div>

      <h3 className="text-base font-black tracking-tight text-card-foreground">
        {tr(tile.titleKey, tile.titleFallback)}
      </h3>

      <p className="mt-1 line-clamp-2 max-w-[220px] text-xs leading-5 text-muted-foreground">
        {tr(tile.descKey, tile.descFallback)}
      </p>
    </Link>
  );
}

function ControlGroup({ group }: { group: AdminGroup }) {
  const tr = useAdminT();

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/45 px-5 py-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.22em] text-primary">
            {tr(group.titleKey, group.titleFallback)}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {tr(group.descKey, group.descFallback)}
          </p>
        </div>

        <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-black text-muted-foreground">
          {group.tiles.length} modules
        </span>
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {group.tiles.map((tile) => (
          <ControlTile key={tile.key} tile={tile} />
        ))}
      </div>
    </section>
  );
}

export function AdminDashboardPage() {
  const tr = useAdminT();

  return (
    <div className="container-app space-y-6 py-6">
      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-muted/45 px-5 py-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.24em] text-primary">
              {tr("admin.control.kicker", "Panneau administrateur")}
            </div>

            <h1 className="mt-1 text-2xl font-black tracking-tight text-card-foreground md:text-3xl">
              {tr("admin.control.title", "Centre de contrôle")}
            </h1>

            <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
              {tr(
                "admin.control.description",
                "Accédez rapidement aux modules essentiels de gestion : commandes, clients, stock, dépôts, synchronisation Sage, personnel, paramètres et dashboard analytique."
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/dashboard"
              className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-black text-primary-foreground shadow-sm transition hover:opacity-90"
            >
              {tr("admin.control.openAnalytics", "Dashboard analytique")}
            </Link>

            <Link
              to="/admin/settings"
              className="inline-flex items-center justify-center rounded-full border border-border bg-background px-4 py-2 text-sm font-black text-card-foreground transition hover:border-primary/40 hover:text-primary"
            >
              {tr("admin.control.openSettings", "Langue & paramètres")}
            </Link>
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
              {tr("admin.control.quick.step1.kicker", "Étape 1")}
            </div>
            <div className="mt-1 font-black text-card-foreground">
              {tr("admin.control.quick.step1.title", "Suivre les commandes")}
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {tr("admin.control.quick.step1.desc", "Contrôler les commandes et leur statut de traitement.")}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
              {tr("admin.control.quick.step2.kicker", "Étape 2")}
            </div>
            <div className="mt-1 font-black text-card-foreground">
              {tr("admin.control.quick.step2.title", "Analyser l’activité")}
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {tr("admin.control.quick.step2.desc", "Utiliser le dashboard analytique pour ventes, stock et alertes.")}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
              {tr("admin.control.quick.step3.kicker", "Étape 3")}
            </div>
            <div className="mt-1 font-black text-card-foreground">
              {tr("admin.control.quick.step3.title", "Gérer les données")}
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {tr("admin.control.quick.step3.desc", "Administrer clients, articles, dépôts, stock et zones.")}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
              {tr("admin.control.quick.step4.kicker", "Étape 4")}
            </div>
            <div className="mt-1 font-black text-card-foreground">
              {tr("admin.control.quick.step4.title", "Configurer l’interface")}
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {tr("admin.control.quick.step4.desc", "Changer langue, thème, branding, SEO et coordonnées depuis Paramètres.")}
            </p>
          </div>
        </div>
      </section>

      {groups.map((group) => (
        <ControlGroup key={group.titleKey} group={group} />
      ))}
    </div>
  );
}

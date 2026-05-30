import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CatalogSidebar } from "./CatalogSidebar";
import { CartIconButton } from "./CartIconButton";
import { Input } from "./Input";
import { Button } from "./Button";
import { ThemeToggle } from "./ThemeToggle";
import { useAuthStore } from "../../features/auth/store/authStore";
import { useVendorCartStore } from "../../features/vendeur/store/vendorCartStore";
import { getFavoritesCount } from "../../features/favorites/api/favoritesApi";
import { LanguageSwitcher } from "./LanguageSwitcher";

function IconMenu(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}

function IconSearch(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function IconUser(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconProducts(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  );
}

function IconLogout(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

function IconOrders(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 7h18" />
      <path d="M3 12h18" />
      <path d="M3 17h18" />
      <path d="M7 7v14" />
    </svg>
  );
}

function IconHeart(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z" />
    </svg>
  );
}

function IconProfile(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconAdmin(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 2l7 4v6c0 5-3 9-7 10-4-1-7-5-7-10V6l7-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function IconConfirm(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function IconTruck(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 7h11v10H3z" />
      <path d="M14 10h4l3 3v4h-7z" />
      <circle cx="7" cy="19" r="2" />
      <circle cx="18" cy="19" r="2" />
    </svg>
  );
}

function IconStore(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 10l1.5-5h15L21 10" />
      <path d="M5 10v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9" />
      <path d="M9 21v-6h6v6" />
    </svg>
  );
}

function IconPin(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22s7-4.5 7-12a7 7 0 0 0-14 0c0 7.5 7 12 7 12z" />
      <circle cx="12" cy="10" r="2" />
    </svg>
  );
}

function IconBot(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="8" width="16" height="12" rx="3" />
      <circle cx="9" cy="14" r="1" />
      <circle cx="15" cy="14" r="1" />
      <path d="M12 8V4" />
      <path d="M9 17.5c1 .8 5 .8 6 0" />
    </svg>
  );
}

function staffHome(roles: string[]) {
  if (roles.includes("ADMIN")) return "/admin";
  if (roles.includes("SUPERVISEUR")) return "/supervisor/zones";
  if (roles.includes("CONFIRMATEUR")) return "/confirmateur/commandes";
  if (roles.includes("LIVREUR")) return "/livreur/bl";
  if (roles.includes("VENDEUR")) return "/vendeur/articles";
  return "/articles";
}

const shellButtonClass =
  "rounded-2xl border border-border bg-card text-card-foreground shadow-sm hover:-translate-y-0.5 hover:border-primary/25 hover:bg-accent hover:text-primary hover:shadow-md focus-visible:ring-primary/15";

export function Navbar() {
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [q, setQ] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isAuth = useAuthStore((s) => s.isAuthenticated());
  const email = useAuthStore((s) => s.email);
  const roles = useAuthStore((s) => (Array.isArray(s.roles) ? s.roles : []));
  const profile = useAuthStore((s) => s.profile);
  const clear = useAuthStore((s) => s.clear);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const vendorCartQty = useVendorCartStore((s) => s.totalQty());

  const isAdmin = roles.includes("ADMIN");
  const isConfirmateur = roles.includes("CONFIRMATEUR");
  const isLivreur = roles.includes("LIVREUR");
  const isSupervisor = roles.includes("SUPERVISEUR");
  const isVendeur = roles.includes("VENDEUR");
  const isStaff = isAdmin || isConfirmateur || isLivreur || isSupervisor || isVendeur;

  const homeHref = isStaff ? staffHome(roles) : "/";
  const canUseCart = !isStaff;
  const canSeeClientOrders = isAuth && !isStaff;
  const canSeeFavorites = isAuth && roles.includes("CLIENT") && !isStaff;
  const canSeeB2BQuotes = canSeeClientOrders && roles.includes("CLIENT") && profile?.typeClient === 1;
  const canUseVendorSearch = isVendeur;

  const favoritesCountQuery = useQuery({
    queryKey: ["favorites-count"],
    queryFn: getFavoritesCount,
    enabled: canSeeFavorites,
    staleTime: 30_000,
    retry: 1,
  });

  const favoritesCount = favoritesCountQuery.data?.count ?? 0;

  const quickLinks = useMemo(() => {
    const links: Array<{ key: string; label: string; onClick: () => void; icon: React.ReactNode }> = [];

    if (!isStaff) {
      links.push({
        key: "articles",
        label: t("header.articles"),
        onClick: () => navigate("/articles"),
        icon: <IconProducts className="h-4 w-4" />,
      });
    }

    if (isVendeur) {
      links.push(
        {
          key: "vendeur-articles",
          label: t("header.vendeur.products"),
          onClick: () => navigate("/vendeur/articles"),
          icon: <IconStore className="h-4 w-4" />,
        },
        {
          key: "vendeur-cart",
          label: `${t("header.vendeur.cart")}${vendorCartQty > 0 ? ` (${vendorCartQty})` : ""}`,
          onClick: () => navigate("/vendeur/cart"),
          icon: <IconOrders className="h-4 w-4" />,
        },
        {
          key: "vendeur-orders",
          label: t("header.vendeur.orders"),
          onClick: () => navigate("/vendeur/orders"),
          icon: <IconOrders className="h-4 w-4" />,
        },
        {
          key: "vendeur-quotes",
          label: "Devis",
          onClick: () => navigate("/vendeur/quotes"),
          icon: <IconOrders className="h-4 w-4" />,
        }
      );
    }

    if (isConfirmateur) {
      links.push({
        key: "confirm",
        label: t("role.confirmateur"),
        onClick: () => navigate("/confirmateur/commandes"),
        icon: <IconConfirm className="h-4 w-4" />,
      });
    }

    if (isLivreur) {
      links.push({
        key: "livreur",
        label: t("role.livreur"),
        onClick: () => navigate("/livreur/bl"),
        icon: <IconTruck className="h-4 w-4" />,
      });
    }

    if (isAdmin) {
      links.push({
        key: "admin",
        label: t("header.admin"),
        onClick: () => navigate("/admin"),
        icon: <IconAdmin className="h-4 w-4" />,
      });
      links.push({
        key: "admin-chatbot",
        label: t("header.admin.chatbot"),
        onClick: () => navigate("/admin/chatbot"),
        icon: <IconBot className="h-4 w-4" />,
      });
    }

    if (canSeeClientOrders) {
      if (canSeeB2BQuotes) {
        links.push({
          key: "my-b2b-quotes",
          label: "Mes devis",
          onClick: () => navigate("/b2b/devis"),
          icon: <IconOrders className="h-4 w-4" />,
        });
      }
      links.push({
        key: "favorites",
        label: `${t("header.favorites")}${favoritesCount > 0 ? ` (${favoritesCount})` : ""}`,
        onClick: () => navigate("/favorites"),
        icon: <IconHeart className="h-4 w-4" />,
      });
      links.push({
        key: "orders",
        label: t("header.orders"),
        onClick: () => navigate("/orders"),
        icon: <IconOrders className="h-4 w-4" />,
      });
      links.push({
        key: "addresses",
        label: t("header.addresses"),
        onClick: () => navigate("/profile/addresses"),
        icon: <IconPin className="h-4 w-4" />,
      });
    }

    if (!isStaff) {
      links.push({
        key: "compare",
        label: t("header.compare"),
        onClick: () => navigate("/compare"),
        icon: <IconProducts className="h-4 w-4" />,
      });
    }

    return links;
  }, [canSeeB2BQuotes, canSeeClientOrders, favoritesCount, isAdmin, isConfirmateur, isLivreur, isStaff, isVendeur, navigate, vendorCartQty, t]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    if (canUseVendorSearch) {
      navigate(`/vendeur/articles?search=${encodeURIComponent(query)}`);
      return;
    }
    navigate(`/articles?search=${encodeURIComponent(query)}`);
  };

  const onAccountClick = () => {
    if (!bootstrapped) return;
    if (!isAuth) navigate("/login");
    else navigate("/profile");
  };

  const logout = () => {
    clear();
    setUserMenuOpen(false);
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-user-menu]")) return;
      setUserMenuOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const showSearch = !isStaff || isVendeur;

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/88 text-foreground shadow-[0_10px_28px_-26px_rgba(15,23,42,0.45)] backdrop-blur-xl">
        <div className="container-app py-3">
          <div className="flex min-h-16 items-center gap-3 rounded-[22px] border border-border/70 bg-card/92 px-4 py-3 text-card-foreground shadow-[0_18px_45px_-38px_rgba(15,23,42,0.45)] backdrop-blur-xl md:px-5">
            <div className="flex items-center gap-2 lg:gap-4">
              {!isStaff ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setSidebarOpen(true)}
                    aria-label="Ouvrir les catégories"
                    className={`md:hidden ${shellButtonClass}`}
                  >
                    <IconMenu className="h-5 w-5" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setSidebarOpen(true)}
                    className={`hidden gap-2 px-4 md:inline-flex ${shellButtonClass}`}
                  >
                    <IconMenu className="h-5 w-5" />
                    <span className="text-sm">{t("header.categories")}</span>
                  </Button>
                </>
              ) : null}

              <Link to={homeHref} className="group flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-indigo-600 text-sm font-black text-white shadow-[0_18px_38px_-24px_hsl(var(--primary)/0.8)] transition-transform group-hover:scale-[1.03]">
                  E
                </div>
                <div className="hidden min-w-0 flex-col leading-tight sm:flex">
                  <span className="truncate text-sm font-bold text-card-foreground">{t("app.brand")}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {isVendeur ? t("app.subtitle.vendeur") : t("app.subtitle.client")}
                  </span>
                </div>
              </Link>
            </div>

            {showSearch ? (
              <form onSubmit={submitSearch} className="mx-auto hidden max-w-xl flex-1 md:block">
                <div className="relative">
                  <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={isVendeur ? t("header.search.placeholder.vendeur") : t("header.search.placeholder")}
                    className="h-11 rounded-2xl border-border bg-input pl-11 text-card-foreground placeholder:text-muted-foreground shadow-none focus:border-primary/45 focus:ring-primary/10"
                  />
                </div>
              </form>
            ) : (
              <div className="flex-1" />
            )}

            <div className="ml-auto flex items-center gap-2">
              <div className="hidden items-center gap-2 2xl:flex">
                {quickLinks.map((l) => (
                  <Button
                    key={l.key}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={l.onClick}
                    className={`gap-2 px-4 ${shellButtonClass}`}
                  >
                    {l.icon}
                    <span>{l.label}</span>
                  </Button>
                ))}
              </div>

              <LanguageSwitcher />

              <ThemeToggle />

              {canSeeFavorites ? (
                <button
                  type="button"
                  onClick={() => navigate("/favorites")}
                  className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card text-card-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-danger/30 hover:bg-danger/10 hover:text-danger hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-danger/15"
                  aria-label={t("header.favorites")}
                  title={t("header.favorites")}
                >
                  <IconHeart className="h-5 w-5" />
                  {favoritesCount > 0 ? (
                    <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-danger px-1.5 py-0.5 text-center text-[10px] font-black leading-none text-danger-foreground shadow">
                      {favoritesCount > 99 ? "99+" : favoritesCount}
                    </span>
                  ) : null}
                </button>
              ) : null}

              {canUseCart ? <CartIconButton /> : null}

              <div className="relative" data-user-menu>
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card text-card-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:bg-accent hover:text-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                  aria-label="Mon compte"
                  onClick={() => {
                    if (window.innerWidth < 640) return onAccountClick();
                    setUserMenuOpen((v) => !v);
                  }}
                >
                  <IconUser className="h-5 w-5" />
                </button>

                {userMenuOpen ? (
                  <div className="absolute right-0 mt-3 w-80 overflow-hidden rounded-[24px] border border-border bg-card text-card-foreground shadow-[0_35px_90px_-45px_rgba(2,6,23,0.55)]">
                    {!bootstrapped ? (
                      <div className="p-5 text-center text-sm text-muted-foreground">{t("common.loading")}</div>
                    ) : !isAuth ? (
                      <div className="space-y-1 p-2">
                        <div className="px-4 py-3">
                          <div className="app-kicker">{t("header.account")}</div>
                          <div className="mt-1 text-sm text-muted-foreground">{t("header.account.subtitle")}</div>
                        </div>

                        <button
                          type="button"
                          className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-semibold transition hover:bg-accent"
                          onClick={() => {
                            setUserMenuOpen(false);
                            navigate("/login");
                          }}
                        >
                          {t("header.login")}
                          <span className="text-muted-foreground">→</span>
                        </button>

                        <button
                          type="button"
                          className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-semibold transition hover:bg-accent"
                          onClick={() => {
                            setUserMenuOpen(false);
                            navigate("/register");
                          }}
                        >
                          {t("header.register")}
                          <span className="text-muted-foreground">→</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 p-2">
                        <div className="rounded-3xl border border-border/70 bg-muted/35 px-4 py-4">
                          <div className="app-kicker">{t("header.account.connected")}</div>
                          <div className="mt-1 truncate text-sm font-bold text-card-foreground">{email}</div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {isAdmin ? (
                              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold badge-neutral">{t("role.admin")}</span>
                            ) : isConfirmateur ? (
                              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold badge-warning">{t("role.confirmateur")}</span>
                            ) : isLivreur ? (
                              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold badge-info">{t("role.livreur")}</span>
                            ) : isVendeur ? (
                              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold badge-success">{t("role.vendeur")}</span>
                            ) : (
                              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold badge-success">{t("role.client")}</span>
                            )}
                          </div>
                        </div>

                        {!isStaff ? (
                          <button
                            type="button"
                            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition hover:bg-accent"
                            onClick={() => {
                              setUserMenuOpen(false);
                              navigate("/articles");
                            }}
                          >
                            <IconProducts className="h-4 w-4 text-muted-foreground" />
                            {t("header.articles")}
                          </button>
                        ) : null}

                        {isVendeur ? (
                          <>
                            <button
                              type="button"
                              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition hover:bg-accent"
                              onClick={() => {
                                setUserMenuOpen(false);
                                navigate("/vendeur/articles");
                              }}
                            >
                              <IconStore className="h-4 w-4 text-muted-foreground" />
                              {t("header.vendeur.products")}
                            </button>

                            <button
                              type="button"
                              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition hover:bg-accent"
                              onClick={() => {
                                setUserMenuOpen(false);
                                navigate("/vendeur/cart");
                              }}
                            >
                              <IconOrders className="h-4 w-4 text-muted-foreground" />
                              {t("header.vendeur.cart")}
                            </button>

                            <button
                              type="button"
                              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition hover:bg-accent"
                              onClick={() => {
                                setUserMenuOpen(false);
                                navigate("/vendeur/orders");
                              }}
                            >
                              <IconOrders className="h-4 w-4 text-muted-foreground" />
                              {t("header.vendeur.orders")}
                            </button>

                            <button
                              type="button"
                              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition hover:bg-accent"
                              onClick={() => {
                                setUserMenuOpen(false);
                                navigate("/vendeur/quotes");
                              }}
                            >
                              <IconOrders className="h-4 w-4 text-muted-foreground" />
                              Devis
                            </button>
                          </>
                        ) : null}

                        {canSeeClientOrders ? (
                          <>
                            {canSeeB2BQuotes ? (
                              <button
                                type="button"
                                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition hover:bg-accent"
                                onClick={() => {
                                  setUserMenuOpen(false);
                                  navigate("/b2b/devis");
                                }}
                              >
                                <IconOrders className="h-4 w-4 text-muted-foreground" />
                                Mes devis
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition hover:bg-accent"
                              onClick={() => {
                                setUserMenuOpen(false);
                                navigate("/favorites");
                              }}
                            >
                              <IconHeart className="h-4 w-4 text-muted-foreground" />
                              <span className="flex-1">{t("header.favorites")}</span>
                              {favoritesCount > 0 ? (
                                <span className="rounded-full bg-danger px-2 py-0.5 text-xs font-black text-danger-foreground">
                                  {favoritesCount}
                                </span>
                              ) : null}
                            </button>
                            <button
                              type="button"
                              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition hover:bg-accent"
                              onClick={() => {
                                setUserMenuOpen(false);
                                navigate("/orders");
                              }}
                            >
                              <IconOrders className="h-4 w-4 text-muted-foreground" />
                              {t("header.orders")}
                            </button>
                            <button
                              type="button"
                              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition hover:bg-accent"
                              onClick={() => {
                                setUserMenuOpen(false);
                                navigate("/profile/addresses");
                              }}
                            >
                              <IconPin className="h-4 w-4 text-muted-foreground" />
                              {t("header.addresses")}
                            </button>
                          </>
                        ) : null}

                        {isConfirmateur ? (
                          <button
                            type="button"
                            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition hover:bg-accent"
                            onClick={() => {
                              setUserMenuOpen(false);
                              navigate("/confirmateur/commandes");
                            }}
                          >
                            <IconConfirm className="h-4 w-4 text-muted-foreground" />
                            {t("header.confirmateur")}
                          </button>
                        ) : null}

                        {isLivreur ? (
                          <button
                            type="button"
                            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition hover:bg-accent"
                            onClick={() => {
                              setUserMenuOpen(false);
                              navigate("/livreur/bl");
                            }}
                          >
                            <IconTruck className="h-4 w-4 text-muted-foreground" />
                            {t("header.livreur")}
                          </button>
                        ) : null}

                        {isAdmin ? (
                          <>
                            <button
                              type="button"
                              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition hover:bg-accent"
                              onClick={() => {
                                setUserMenuOpen(false);
                                navigate("/admin");
                              }}
                            >
                              <IconAdmin className="h-4 w-4 text-muted-foreground" />
                              {t("header.admin")}
                            </button>
                            <button
                              type="button"
                              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition hover:bg-accent"
                              onClick={() => {
                                setUserMenuOpen(false);
                                navigate("/admin/chatbot");
                              }}
                            >
                              <IconBot className="h-4 w-4 text-muted-foreground" />
                              {t("header.admin.chatbot")}
                            </button>
                          </>
                        ) : null}

                        <button
                          type="button"
                          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition hover:bg-accent"
                          onClick={() => {
                            setUserMenuOpen(false);
                            navigate("/profile");
                          }}
                        >
                          <IconProfile className="h-4 w-4 text-muted-foreground" />
                          {t("header.profile")}
                        </button>

                        <div className="mx-2 h-px bg-border/70" />

                        <button
                          type="button"
                            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-danger transition hover:bg-danger/10"
                          onClick={logout}
                        >
                          <IconLogout className="h-4 w-4" />
                          {t("header.logout")}
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {showSearch ? (
          <div className="container-app pt-3 md:hidden">
            <form onSubmit={submitSearch} className="rounded-[22px] border border-border bg-card px-4 py-3 shadow-sm">
              <div className="relative">
                <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={isVendeur ? t("header.search.placeholder.vendeur") : t("header.search.placeholder")}
                  className="h-11 rounded-2xl border-border bg-input pl-11 text-card-foreground placeholder:text-muted-foreground shadow-none focus:border-primary/45 focus:ring-primary/10"
                />
              </div>
            </form>
          </div>
        ) : null}
      </header>

      {!isStaff ? <CatalogSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} /> : null}
    </>
  );
}

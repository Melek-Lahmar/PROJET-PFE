import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../shared/components/Button";
import {
  useSyncAll,
  useSyncArticles,
  useSyncCatalogues,
  useSyncDepots,
  useSyncStocks,
} from "../hooks/useSageSync";
import {
  PremiumHero,
} from "../../../shared/components/premium";

type SyncKey = "articles" | "catalogues" | "depots" | "stocks" | "all";

type SyncMutationLike = {
  mutateAsync: () => Promise<unknown>;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: unknown;
  reset: () => void;
};

type BannerState = {
  type: "idle" | "info" | "success" | "error";
  title: string;
  description?: string;
};

type HistoryItem = {
  id: number;
  label: string;
  status: "SUCCESS" | "ERROR";
  time: string;
  details?: string;
};

type SyncCardMeta = {
  key: Exclude<SyncKey, "all">;
  title: string;
  description: string;
  icon: string;
  accent: string;
};

const SYNC_CARDS: SyncCardMeta[] = [
  {
    key: "articles",
    title: "Articles",
    description: "Met à jour les fiches articles et les données principales du catalogue produit.",
    icon: "📦",
    accent: "from-blue-500/10 to-indigo-500/10",
  },
  {
    key: "catalogues",
    title: "Catalogues",
    description: "Synchronise les familles et rattachements catalogue utilisés dans la boutique.",
    icon: "🗂️",
    accent: "from-fuchsia-500/10 to-pink-500/10",
  },
  {
    key: "depots",
    title: "Dépôts",
    description: "Actualise les dépôts Sage pour fiabiliser la disponibilité par emplacement.",
    icon: "🏬",
    accent: "from-emerald-500/10 to-teal-500/10",
  },
  {
    key: "stocks",
    title: "Stocks",
    description: "Recharge les quantités en stock et les disponibilités utilisées côté e-commerce.",
    icon: "📊",
    accent: "from-amber-500/10 to-orange-500/10",
  },
];

function formatNow(): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) return maybeMessage;
  }
  return fallback;
}

function getSuccessMessage(data: unknown, fallback: string): string {
  if (typeof data === "string" && data.trim()) return data;
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const candidates = [obj.message, obj.details, obj.result, obj.status];
    for (const value of candidates) {
      if (typeof value === "string" && value.trim()) return value;
    }
  }
  return fallback;
}

function StatusBadge({
  state,
}: {
  state: "idle" | "running" | "success" | "error";
}) {
  const config =
    state === "running"
      ? {
          label: "En cours",
          cls: "badge-info",
        }
      : state === "success"
        ? {
            label: "Terminée",
            cls: "badge-success",
          }
        : state === "error"
          ? {
              label: "Erreur",
              cls: "badge-danger",
            }
          : {
              label: "Prête",
              cls: "badge-neutral",
            };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${config.cls}`}
    >
      {config.label}
    </span>
  );
}

type SyncCardProps = {
  title: string;
  description: string;
  icon: string;
  accent: string;
  state: "idle" | "running" | "success" | "error";
  onRun: () => void;
  disabled?: boolean;
};

function SyncCard({
  title,
  description,
  icon,
  accent,
  state,
  onRun,
  disabled = false,
}: SyncCardProps) {
  const buttonLabel =
    state === "running" ? "Synchronisation..." : `Synchroniser ${title}`;

  return (
    <div className="app-surface relative overflow-hidden p-5">
      <div className={`absolute inset-0 bg-gradient-to-br opacity-70 ${accent}`} />
      <div className="relative space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card text-2xl shadow-sm">
            {icon}
          </div>
          <StatusBadge state={state} />
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-black text-card-foreground">{title}</h3>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>

        <Button
          type="button"
          variant={state === "running" ? "secondary" : "outline"}
          className="w-full font-semibold"
          onClick={onRun}
          disabled={disabled}
          isLoading={state === "running"}
        >
          {buttonLabel}
        </Button>
      </div>
    </div>
  );
}

export function AdminSyncPage() {
  const navigate = useNavigate();

  const articles = useSyncArticles();
  const catalogues = useSyncCatalogues();
  const depots = useSyncDepots();
  const stocks = useSyncStocks();
  const all = useSyncAll();

  const [banner, setBanner] = useState<BannerState>({
    type: "info",
    title: "Centre de synchronisation Sage",
    description: "Lancez une synchronisation ciblée ou complète selon votre besoin.",
  });

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);

  const mutationMap: Record<SyncKey, SyncMutationLike> = {
    articles,
    catalogues,
    depots,
    stocks,
    all,
  };

  const anyPending = Object.values(mutationMap).some((m) => m.isPending);

  const stats = useMemo(() => {
    const successCount = history.filter((x) => x.status === "SUCCESS").length;
    const errorCount = history.filter((x) => x.status === "ERROR").length;

    return {
      modulesCount: SYNC_CARDS.length,
      successCount,
      errorCount,
    };
  }, [history]);

  async function runSync(key: SyncKey, label: string) {
    const mutation = mutationMap[key];

    try {
      setBanner({
        type: "info",
        title: `${label} en cours`,
        description: "Veuillez patienter pendant l’import et la mise à jour des données.",
      });

      const result = await mutation.mutateAsync();
      const details = getSuccessMessage(result, `${label} terminée avec succès.`);

      const now = formatNow();
      setLastRunAt(now);
      setBanner({
        type: "success",
        title: `${label} terminée`,
        description: details,
      });

      setHistory((prev) => [
        {
          id: Date.now(),
          label,
          status: "SUCCESS",
          time: now,
          details,
        },
        ...prev,
      ]);
    } catch (error) {
      const details = getErrorMessage(error, `Une erreur est survenue pendant ${label}.`);

      setBanner({
        type: "error",
        title: `${label} échouée`,
        description: details,
      });

      setHistory((prev) => [
        {
          id: Date.now(),
          label,
          status: "ERROR",
          time: formatNow(),
          details,
        },
        ...prev,
      ]);
    }
  }

  function getCardState(key: Exclude<SyncKey, "all">): "idle" | "running" | "success" | "error" {
    const mutation = mutationMap[key];
    if (mutation.isPending) return "running";
    if (mutation.isError) return "error";
    if (mutation.isSuccess) return "success";
    return "idle";
  }

  const bannerClasses =
    banner.type === "success"
      ? "border-[hsl(var(--success)/0.22)] bg-[hsl(var(--success)/0.08)]"
      : banner.type === "error"
        ? "border-[hsl(var(--danger)/0.22)] bg-[hsl(var(--danger)/0.08)]"
        : "border-[hsl(var(--info)/0.18)] bg-[hsl(var(--info)/0.07)]";

  return (
    <div className="container-app space-y-6 py-8">
      <PremiumHero
        kicker="Administration"
        title="Synchronisation Sage"
        description="Centralisez les synchronisations entre Sage X3 et la base locale : articles, catalogues, dépôts et stocks. L’administrateur peut lancer une action ciblée ou une synchronisation complète en un clic."
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              className="min-w-[200px] font-semibold"
              onClick={() => navigate("/admin")}
            >
              ← Retour au Dashboard
            </Button>

            <Button
              type="button"
              variant="primary"
              className="min-w-[200px] font-bold"
              onClick={() => runSync("all", "Synchronisation complète")}
              disabled={anyPending}
              isLoading={all.isPending}
            >
              Synchroniser tout
            </Button>
          </>
        }
      />

      <section className="app-surface px-6 py-5 md:px-7">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border border-border/70 bg-[hsl(var(--input))] px-3 py-1 text-xs font-semibold text-card-foreground">
            {stats.modulesCount} modules disponibles
          </span>
          <span className="inline-flex items-center rounded-full border border-border/70 bg-[hsl(var(--input))] px-3 py-1 text-xs font-semibold text-card-foreground">
            {stats.successCount} synchronisations réussies
          </span>
          <span className="inline-flex items-center rounded-full border border-border/70 bg-[hsl(var(--input))] px-3 py-1 text-xs font-semibold text-card-foreground">
            {stats.errorCount} erreurs détectées
          </span>
          {lastRunAt && (
            <span className="inline-flex items-center rounded-full border border-border/70 bg-[hsl(var(--input))] px-3 py-1 text-xs font-semibold text-card-foreground">
              Dernière exécution : {lastRunAt}
            </span>
          )}
        </div>
      </section>

      <section className={`app-surface px-6 py-5 md:px-7 ${bannerClasses}`}>
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="app-kicker">Statut</div>
            <h2 className="mt-1 text-lg font-black text-card-foreground">{banner.title}</h2>
            {banner.description && (
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{banner.description}</p>
            )}
          </div>

          <div className="pt-1">
            <StatusBadge
              state={
                anyPending
                  ? "running"
                  : banner.type === "success"
                    ? "success"
                    : banner.type === "error"
                      ? "error"
                      : "idle"
              }
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
        <div className="space-y-6">
          <div className="app-surface overflow-hidden p-0">
            <div className="border-b border-border/70 px-6 py-5 md:px-7">
              <div className="app-kicker">Actions ciblées</div>
              <h2 className="mt-1 text-xl font-black text-card-foreground">
                Synchronisations par module
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Utilisez ces actions lorsque vous souhaitez mettre à jour une seule
                famille de données sans relancer toute la chaîne.
              </p>
            </div>

            <div className="grid gap-5 p-6 md:grid-cols-2">
              {SYNC_CARDS.map((card) => (
                <SyncCard
                  key={card.key}
                  title={card.title}
                  description={card.description}
                  icon={card.icon}
                  accent={card.accent}
                  state={getCardState(card.key)}
                  disabled={anyPending}
                  onRun={() => runSync(card.key, `Synchronisation ${card.title}`)}
                />
              ))}
            </div>
          </div>

          <div className="app-surface overflow-hidden p-0">
            <div className="border-b border-border/70 px-6 py-5 md:px-7">
              <div className="app-kicker">Exécution complète</div>
              <h2 className="mt-1 text-xl font-black text-card-foreground">
                Synchronisation globale
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Recommandée après un import majeur Sage, un recalcul de stock global
                ou une mise à jour importante du référentiel.
              </p>
            </div>

            <div className="grid gap-5 p-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[24px] border border-primary/14 bg-gradient-to-br from-primary/8 via-card to-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card text-2xl shadow-sm">
                    🔄
                  </div>
                  <StatusBadge
                    state={
                      all.isPending
                        ? "running"
                        : all.isError
                          ? "error"
                          : all.isSuccess
                            ? "success"
                            : "idle"
                    }
                  />
                </div>

                <h3 className="mt-4 text-xl font-black text-card-foreground">
                  Synchroniser l’ensemble des données
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Lance successivement les synchronisations essentielles pour remettre
                  l’environnement e-commerce à jour avec Sage X3.
                </p>

                <div className="mt-5">
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    className="w-full font-bold"
                    onClick={() => runSync("all", "Synchronisation complète")}
                    disabled={anyPending}
                    isLoading={all.isPending}
                  >
                    Synchroniser tout maintenant
                  </Button>
                </div>
              </div>

              <div className="rounded-[24px] border border-border/70 bg-[hsl(var(--input))] p-5">
                <div className="app-kicker">Bonnes pratiques</div>
                <ul className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
                  <li>• Lancez une synchronisation complète après une mise à jour Sage importante.</li>
                  <li>• Préférez une action ciblée pour limiter l’impact pendant l’administration courante.</li>
                  <li>• Évitez de lancer plusieurs synchronisations en parallèle.</li>
                  <li>• Vérifiez le statut affiché après chaque exécution.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <section className="app-surface overflow-hidden p-0">
            <div className="border-b border-border/70 px-6 py-5">
              <div className="app-kicker">Journal rapide</div>
              <h2 className="mt-1 text-lg font-black text-card-foreground">
                Dernières opérations
              </h2>
            </div>

            <div className="p-6">
              {history.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-border/80 bg-[hsl(var(--input))] px-4 py-8 text-center text-sm text-muted-foreground">
                  Aucune synchronisation lancée pendant cette session.
                </div>
              ) : (
                <div className="space-y-3">
                  {history.slice(0, 6).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-[22px] border border-border/70 bg-[hsl(var(--input))] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-bold text-card-foreground">
                            {item.label}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">{item.time}</div>
                        </div>

                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${
                            item.status === "SUCCESS" ? "badge-success" : "badge-danger"
                          }`}
                        >
                          {item.status === "SUCCESS" ? "Réussie" : "Erreur"}
                        </span>
                      </div>

                      {item.details && (
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                          {item.details}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="app-surface overflow-hidden p-0">
            <div className="border-b border-border/70 px-6 py-5">
              <div className="app-kicker">Couverture</div>
              <h2 className="mt-1 text-lg font-black text-card-foreground">
                Modules disponibles
              </h2>
            </div>

            <div className="space-y-3 p-6">
              {SYNC_CARDS.map((card) => (
                <div
                  key={card.key}
                  className="flex items-center justify-between rounded-[20px] border border-border/70 bg-[hsl(var(--input))] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-card text-lg shadow-sm">
                      {card.icon}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-card-foreground">{card.title}</div>
                      <div className="text-xs text-muted-foreground">Synchronisation dédiée</div>
                    </div>
                  </div>

                  <StatusBadge state={getCardState(card.key)} />
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getArticles } from "../../catalog/api/articlesApi";
import { getDepots } from "../../catalog/api/depotsApi";
import { getStocksByArticle } from "../../catalog/api/stocksApi";
import { StockBadge } from "../../catalog/components/StockBadge";
import type { Article, StockStatus } from "../../catalog/types/article";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";
import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { Loader } from "../../../shared/components/Loader";
import { AdminSegmentedTabs, type SegmentedTab } from "../components/AdminSegmentedTabs";
import {
  EmptyView,
  PremiumHero,
} from "../../../shared/components/premium";

type StockFilterKey = "ALL" | StockStatus;

type ArticleDepotRow = {
  depotNo: number;
  depotLabel: string;
  availableStock: number;
  qteStock: number;
  qteReservee: number;
  isPrincipal: boolean;
};

const STOCK_TABS: Array<SegmentedTab<StockFilterKey>> = [
  { key: "ALL", label: "Tous" },
  { key: "IN_STOCK", label: "En stock" },
  { key: "LOW_STOCK", label: "Stock faible" },
  { key: "OUT_OF_STOCK", label: "Rupture" },
  { key: "NOT_TRACKED", label: "Non suivi" },
];

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function matchesArticle(article: Article, term: string) {
  const haystack = [
    article.aR_Ref,
    article.aR_Design,
    article.fA_CodeFamille,
    article.aR_CodeBarre,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(term);
}

function money(value: number) {
  return `${Number(value ?? 0).toFixed(3)} TND`;
}

function formatQty(value: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(value ?? 0);
}

export function AdminStockPage() {
  const [status, setStatus] = useState<StockFilterKey>("ALL");
  const [search, setSearch] = useState("");
  const [selectedRef, setSelectedRef] = useState<string | null>(null);

  const articlesQuery = useQuery({
    queryKey: ["admin-stock-articles"],
    queryFn: () =>
      getArticles({
        publishedOnly: false,
        includeSleeping: true,
        take: 1000,
        skip: 0,
        sortBy: "stock",
        sortDirection: "desc",
      }),
  });

  const depotsQuery = useQuery({
    queryKey: ["admin-stock-depots"],
    queryFn: () => getDepots(false),
  });

  const selectedArticle = useMemo(
    () => (articlesQuery.data?.items ?? []).find((item) => item.aR_Ref === selectedRef) ?? null,
    [articlesQuery.data?.items, selectedRef]
  );

  const articleStocksQuery = useQuery({
    queryKey: ["admin-stock-article-stocks", selectedRef],
    queryFn: () => getStocksByArticle(selectedRef as string),
    enabled: !!selectedRef,
  });

  const filteredArticles = useMemo(() => {
    const base = articlesQuery.data?.items ?? [];
    const term = normalizeSearch(search);

    return base.filter((article) => {
      const okStatus = status === "ALL" ? true : article.stockStatus === status;
      const okSearch = term ? matchesArticle(article, term) : true;
      return okStatus && okSearch;
    });
  }, [articlesQuery.data?.items, search, status]);

  useEffect(() => {
    if (!filteredArticles.length) {
      setSelectedRef(null);
      return;
    }

    if (!selectedRef || !filteredArticles.some((item) => item.aR_Ref === selectedRef)) {
      setSelectedRef(filteredArticles[0].aR_Ref);
    }
  }, [filteredArticles, selectedRef]);

  const depotRows = useMemo<ArticleDepotRow[]>(() => {
    const depots = depotsQuery.data ?? [];
    const stocks = articleStocksQuery.data ?? [];

    return stocks
      .map((row) => {
        const depot = depots.find((item) => item.dE_No === row.dE_No);
        const available = (row.aS_QteSto ?? 0) - (row.aS_QteRes ?? 0);

        return {
          depotNo: row.dE_No,
          depotLabel:
            depot?.dE_Intitule?.trim() || depot?.dE_Code?.trim() || `Dépôt ${row.dE_No}`,
          availableStock: available,
          qteStock: row.aS_QteSto ?? 0,
          qteReservee: row.aS_QteRes ?? 0,
          isPrincipal: row.aS_Principal === 1 || depot?.dE_Principal === 1,
        };
      })
      .sort(
        (a, b) =>
          Number(b.isPrincipal) - Number(a.isPrincipal) ||
          b.availableStock - a.availableStock ||
          a.depotLabel.localeCompare(b.depotLabel)
      );
  }, [articleStocksQuery.data, depotsQuery.data]);

  const stats = useMemo(() => {
    const all = articlesQuery.data?.items ?? [];
    const totalQty = filteredArticles.reduce((sum, item) => sum + (item.availableStock ?? 0), 0);

    return {
      all: all.length,
      inStock: all.filter((item) => item.stockStatus === "IN_STOCK").length,
      low: all.filter((item) => item.stockStatus === "LOW_STOCK").length,
      out: all.filter((item) => item.stockStatus === "OUT_OF_STOCK").length,
      untracked: all.filter((item) => item.stockStatus === "NOT_TRACKED").length,
      totalQty,
    };
  }, [articlesQuery.data?.items, filteredArticles]);

  const tabs = STOCK_TABS.map((tab) => ({
    ...tab,
    count:
      tab.key === "ALL"
        ? stats.all
        : tab.key === "IN_STOCK"
          ? stats.inStock
          : tab.key === "LOW_STOCK"
            ? stats.low
            : tab.key === "OUT_OF_STOCK"
              ? stats.out
              : stats.untracked,
  }));

  if (articlesQuery.isLoading) {
    return <Loader label="Chargement de la gestion de stock..." />;
  }

  if (articlesQuery.isError) {
    return (
      <div className="container-app space-y-6 py-8">
        <PremiumHero kicker="Administration" title="Gestion de stock" />
        <EmptyView
          title="Erreur de chargement"
          description={getApiErrorMessage(articlesQuery.error)}
          iconPath="M12 9v4 M12 17h.01 M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
        />
      </div>
    );
  }

  return (
    <div className="container-app space-y-6 py-8">
      <PremiumHero
        kicker="Administration"
        title="Gestion de stock"
        description="Consultez le stock total de chaque article, filtrez par état de disponibilité et visualisez la répartition par dépôt."
      />
      <section className="app-surface overflow-hidden p-0">
        <div className="border-b border-border/70 px-7 py-7">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-2">
              <div className="app-kicker">Synthèse</div>
              <h1 className="text-xl font-extrabold text-card-foreground">Vue d’ensemble</h1>
              <p className="app-description max-w-3xl">
                Synthèse des stocks et accès rapide à la répartition par dépôt.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-border/70 bg-[hsl(var(--input))] px-3 py-1 text-xs font-semibold text-card-foreground">
                {filteredArticles.length} article{filteredArticles.length > 1 ? "s" : ""}
              </span>
              <span className="inline-flex items-center rounded-full border border-border/70 bg-[hsl(var(--input))] px-3 py-1 text-xs font-semibold text-card-foreground">
                Qté cumulée : {formatQty(stats.totalQty)}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-7 py-6">
          <AdminSegmentedTabs tabs={tabs} value={status} onChange={setStatus} />

          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <label className="mb-2 block app-kicker">Recherche article</label>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Référence, désignation, famille, code barre..."
              />
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => articlesQuery.refetch()}>
                Actualiser
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <div className="app-surface overflow-hidden p-0">
          <div className="border-b border-border/70 px-6 py-5">
            <div className="app-kicker">Vue globale</div>
            <h2 className="mt-1 text-xl font-black text-card-foreground">
              Articles et stock total
            </h2>
          </div>

          <div className="max-h-[74vh] overflow-y-auto">
            {filteredArticles.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                Aucun article ne correspond au filtre sélectionné.
              </div>
            ) : (
              filteredArticles.map((article) => {
                const active = article.aR_Ref === selectedRef;

                return (
                  <button
                    key={article.aR_Ref}
                    type="button"
                    onClick={() => setSelectedRef(article.aR_Ref)}
                    className={`block w-full border-t border-border/60 px-6 py-5 text-left transition ${
                      active ? "bg-primary/6" : "hover:bg-accent/45"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-black text-card-foreground">
                            {article.aR_Ref}
                          </span>
                          <StockBadge
                            status={article.stockStatus}
                            availableStock={article.availableStock}
                            compact
                          />
                        </div>

                        <div className="text-sm font-semibold text-card-foreground">
                          {article.aR_Design}
                        </div>

                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>Famille : {article.fA_CodeFamille || "-"}</span>
                          <span>Code barre : {article.aR_CodeBarre || "-"}</span>
                        </div>
                      </div>

                      <div className="rounded-[18px] border border-border/70 bg-card px-4 py-3 text-right shadow-sm">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Stock dispo
                        </div>
                        <div className="mt-1 text-lg font-black text-card-foreground">
                          {formatQty(article.availableStock)}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {money(article.aR_PrixVen)}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="app-surface overflow-hidden p-0">
            <div className="border-b border-border/70 px-6 py-5">
              <div className="app-kicker">Article sélectionné</div>
              <h2 className="mt-1 text-xl font-black text-card-foreground">
                Répartition par dépôt
              </h2>
            </div>

            <div className="p-6">
              {!selectedArticle ? (
                <div className="text-sm text-muted-foreground">
                  Sélectionnez un article pour afficher le détail de son stock.
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-[24px] border border-border/70 bg-gradient-to-br from-primary/5 via-card to-card p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="app-kicker">Article</div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-black text-card-foreground">
                            {selectedArticle.aR_Ref}
                          </h3>
                          <StockBadge
                            status={selectedArticle.stockStatus}
                            availableStock={selectedArticle.availableStock}
                          />
                        </div>
                        <p className="text-sm font-semibold text-card-foreground">
                          {selectedArticle.aR_Design}
                        </p>
                      </div>

                      <div className="rounded-[20px] border border-primary/15 bg-card px-4 py-3 text-right shadow-sm">
                        <div className="app-kicker">Stock total</div>
                        <div className="mt-1 text-2xl font-black text-primary">
                          {formatQty(selectedArticle.availableStock)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {articleStocksQuery.isLoading ? (
                    <Loader label="Chargement des stocks par dépôt..." />
                  ) : articleStocksQuery.isError ? (
                    <div className="rounded-[22px] border border-danger/20 bg-danger/5 px-4 py-4 text-sm text-rose-700">
                      {getApiErrorMessage(articleStocksQuery.error)}
                    </div>
                  ) : depotRows.length === 0 ? (
                    <div className="rounded-[22px] border border-dashed border-border/80 bg-[hsl(var(--input))] px-4 py-8 text-center text-sm text-muted-foreground">
                      Aucun stock détaillé par dépôt n'a été trouvé pour cet article.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {depotRows.map((row) => (
                        <div
                          key={`${row.depotNo}-${row.depotLabel}`}
                          className="rounded-[22px] border border-border/70 bg-[hsl(var(--input))] p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="text-sm font-black text-card-foreground">
                                  {row.depotLabel}
                                </div>
                                {row.isPrincipal ? (
                                  <span className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold badge-info">
                                    Principal
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                Dépôt #{row.depotNo}
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">Disponible</div>
                              <div className="text-lg font-black text-card-foreground">
                                {formatQty(row.availableStock)}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-[18px] border border-border/70 bg-card px-3 py-3">
                              <div className="app-kicker">Qté stock</div>
                              <div className="mt-1 text-sm font-bold text-card-foreground">
                                {formatQty(row.qteStock)}
                              </div>
                            </div>
                            <div className="rounded-[18px] border border-border/70 bg-card px-3 py-3">
                              <div className="app-kicker">Qté réservée</div>
                              <div className="mt-1 text-sm font-bold text-card-foreground">
                                {formatQty(row.qteReservee)}
                              </div>
                            </div>
                            <div className="rounded-[18px] border border-border/70 bg-card px-3 py-3">
                              <div className="app-kicker">Qté dispo</div>
                              <div className="mt-1 text-sm font-bold text-card-foreground">
                                {formatQty(row.availableStock)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getArticles } from "../../catalog/api/articlesApi";
import { getDepots } from "../../catalog/api/depotsApi";
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

type DepotStockFilterKey = "ALL" | StockStatus;

const STOCK_TABS: Array<SegmentedTab<DepotStockFilterKey>> = [
  { key: "ALL", label: "Tous" },
  { key: "IN_STOCK", label: "En stock" },
  { key: "LOW_STOCK", label: "Stock faible" },
  { key: "OUT_OF_STOCK", label: "Rupture" },
  { key: "NOT_TRACKED", label: "Non suivi" },
];

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function matchesDepot(
  depot: { dE_Code: string; dE_Intitule: string },
  term: string
) {
  return `${depot.dE_Code} ${depot.dE_Intitule}`.toLowerCase().includes(term);
}

function matchesArticle(article: Article, term: string) {
  return `${article.aR_Ref} ${article.aR_Design} ${article.fA_CodeFamille} ${article.aR_CodeBarre}`
    .toLowerCase()
    .includes(term);
}

function formatQty(value: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(value ?? 0);
}

export function AdminDepotsPage() {
  const [searchDepot, setSearchDepot] = useState("");
  const [searchArticle, setSearchArticle] = useState("");
  const [status, setStatus] = useState<DepotStockFilterKey>("ALL");
  const [selectedDepotNo, setSelectedDepotNo] = useState<number | null>(null);

  const depotsQuery = useQuery({
    queryKey: ["admin-depots-list"],
    queryFn: () => getDepots(false),
  });

  const filteredDepots = useMemo(() => {
    const list = depotsQuery.data ?? [];
    const term = normalizeSearch(searchDepot);
    if (!term) return list;
    return list.filter((item) => matchesDepot(item, term));
  }, [depotsQuery.data, searchDepot]);

  useEffect(() => {
    if (!filteredDepots.length) {
      setSelectedDepotNo(null);
      return;
    }

    if (!selectedDepotNo || !filteredDepots.some((item) => item.dE_No === selectedDepotNo)) {
      setSelectedDepotNo(filteredDepots[0].dE_No);
    }
  }, [filteredDepots, selectedDepotNo]);

  const selectedDepot = useMemo(
    () => filteredDepots.find((item) => item.dE_No === selectedDepotNo) ?? null,
    [filteredDepots, selectedDepotNo]
  );

  const articlesQuery = useQuery({
    queryKey: ["admin-depot-articles", selectedDepotNo],
    queryFn: () =>
      getArticles({
        publishedOnly: false,
        includeSleeping: true,
        take: 1000,
        skip: 0,
        depotNo: selectedDepotNo ?? undefined,
        sortBy: "stock",
        sortDirection: "desc",
      }),
    enabled: !!selectedDepotNo,
  });

  const visibleArticles = useMemo(() => {
    const list = articlesQuery.data?.items ?? [];
    const term = normalizeSearch(searchArticle);

    return list.filter((item) => {
      const okStatus = status === "ALL" ? true : item.stockStatus === status;
      const okSearch = term ? matchesArticle(item, term) : true;
      return okStatus && okSearch;
    });
  }, [articlesQuery.data?.items, searchArticle, status]);

  const stockStats = useMemo(() => {
    const all = articlesQuery.data?.items ?? [];
    return {
      all: all.length,
      inStock: all.filter((item) => item.stockStatus === "IN_STOCK").length,
      low: all.filter((item) => item.stockStatus === "LOW_STOCK").length,
      out: all.filter((item) => item.stockStatus === "OUT_OF_STOCK").length,
      untracked: all.filter((item) => item.stockStatus === "NOT_TRACKED").length,
      qty: visibleArticles.reduce((sum, item) => sum + (item.availableStock ?? 0), 0),
    };
  }, [articlesQuery.data?.items, visibleArticles]);

  const tabs = STOCK_TABS.map((tab) => ({
    ...tab,
    count:
      tab.key === "ALL"
        ? stockStats.all
        : tab.key === "IN_STOCK"
          ? stockStats.inStock
          : tab.key === "LOW_STOCK"
            ? stockStats.low
            : tab.key === "OUT_OF_STOCK"
              ? stockStats.out
              : stockStats.untracked,
  }));

  if (depotsQuery.isLoading) {
    return <Loader label="Chargement des dépôts..." />;
  }

  if (depotsQuery.isError) {
    return (
      <div className="container-app space-y-6 py-8">
        <PremiumHero kicker="Administration" title="Gestion des dépôts" />
        <EmptyView
          title="Erreur de chargement"
          description={getApiErrorMessage(depotsQuery.error)}
          iconPath="M12 9v4 M12 17h.01 M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
        />
      </div>
    );
  }

  return (
    <div className="container-app space-y-6 py-8">
      <PremiumHero
        kicker="Administration"
        title="Gestion des dépôts"
        description="Parcourez la liste des dépôts puis consultez, pour chaque dépôt, les articles et leur stock disponible."
      />

      <section className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <div className="app-surface overflow-hidden p-0">
          <div className="border-b border-border/70 px-6 py-5">
            <div className="app-kicker">Liste des dépôts</div>
            <h2 className="mt-1 text-xl font-black text-card-foreground">Dépôts disponibles</h2>
          </div>

          <div className="space-y-4 px-6 py-5">
            <Input
              value={searchDepot}
              onChange={(event) => setSearchDepot(event.target.value)}
              placeholder="Rechercher un dépôt..."
            />
            <Button type="button" variant="outline" onClick={() => depotsQuery.refetch()}>
              Actualiser
            </Button>
          </div>

          <div className="max-h-[68vh] overflow-y-auto">
            {filteredDepots.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                Aucun dépôt ne correspond à votre recherche.
              </div>
            ) : (
              filteredDepots.map((depot) => {
                const active = depot.dE_No === selectedDepotNo;
                return (
                  <button
                    key={depot.dE_No}
                    type="button"
                    onClick={() => setSelectedDepotNo(depot.dE_No)}
                    className={`block w-full border-t border-border/60 px-6 py-5 text-left transition ${
                      active ? "bg-primary/6" : "hover:bg-accent/45"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-base font-black text-card-foreground">
                            {depot.dE_Intitule}
                          </div>
                          {depot.dE_Principal === 1 ? (
                            <span className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold badge-info">
                              Principal
                            </span>
                          ) : null}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Code :"
                          Code : {depot.dE_Code || "-"}
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        #{depot.dE_No}
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
              <div className="app-kicker">Dépôt sélectionné</div>
              <h2 className="mt-1 text-xl font-black text-card-foreground">
                {selectedDepot ? selectedDepot.dE_Intitule : "Articles par dépôt"}
              </h2>
              {selectedDepot ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Code {selectedDepot.dE_Code || "-"} • Dépôt #{selectedDepot.dE_No}
                </p>
              ) : null}
            </div>

            <div className="space-y-4 px-6 py-5">
              <AdminSegmentedTabs tabs={tabs} value={status} onChange={setStatus} />

              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <label className="mb-2 block app-kicker">Recherche article</label>
                  <Input
                    value={searchArticle}
                    onChange={(event) => setSearchArticle(event.target.value)}
                    placeholder="Référence, désignation, famille..."
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full border border-border/70 bg-[hsl(var(--input))] px-3 py-1 text-xs font-semibold text-card-foreground">
                    {visibleArticles.length} article{visibleArticles.length > 1 ? "s" : ""}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-border/70 bg-[hsl(var(--input))] px-3 py-1 text-xs font-semibold text-card-foreground">
                    Qté dispo : {formatQty(stockStats.qty)}
                  </span>
                </div>
              </div>
            </div>

            <div className="max-h-[62vh] overflow-y-auto border-t border-border/60">
              {articlesQuery.isLoading && selectedDepotNo ? (
                <Loader label="Chargement des articles du dépôt..." />
              ) : articlesQuery.isError ? (
                <div className="px-6 py-6 text-sm text-rose-700">
                  {getApiErrorMessage(articlesQuery.error)}
                </div>
              ) : !selectedDepot ? (
                <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                  Sélectionnez un dépôt pour consulter les articles disponibles.
                </div>
              ) : visibleArticles.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                  Aucun article trouvé pour ce dépôt avec le filtre courant.
                </div>
              ) : (
                visibleArticles.map((article) => (
                  <div
                    key={`${selectedDepotNo}-${article.aR_Ref}`}
                    className="border-t border-border/60 px-6 py-5 first:border-t-0 hover:bg-accent/35"
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
                          <span>Publié : {article.aR_Publie === 1 ? "Oui" : "Non"}</span>
                          <span>Sommeil : {article.aR_Sommeil === 1 ? "Oui" : "Non"}</span>
                        </div>
                      </div>

                      <div className="rounded-[18px] border border-border/70 bg-card px-4 py-3 text-right shadow-sm">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Stock disponible
                        </div>
                        <div className="mt-1 text-lg font-black text-card-foreground">
                          {formatQty(article.availableStock)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
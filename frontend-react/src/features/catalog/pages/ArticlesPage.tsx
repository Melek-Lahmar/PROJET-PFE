import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getArticleFilterMetadata, getArticles } from "../api/articlesApi";
import { getMainImagesMap } from "../api/articleImagesApi";
import { getDepots } from "../api/depotsApi";
import type { ArticleSortBy, SortDirection } from "../types/article";
import { Card } from "../../../shared/components/Card";
import { Pagination } from "../../../shared/components/Pagination";
import { env } from "../../../core/config/env";
import { resolveImageUrl } from "../../../shared/utils/image";
import { ArticleCard } from "../components/ArticleCard";
import { ArticlesFilterPanel } from "../components/ArticlesFilterPanel";
import { useCatalogueTree } from "../hooks/useCatalogueTree";
import { Button } from "../../../shared/components/Button";
import {
  EmptyView,
  PremiumHero,
  Skeleton,
  StaggeredColumn,
} from "../../../shared/components/premium";

const DEFAULT_TAKE = 24;

type FormFilters = {
  search: string;
  minPrice: string;
  maxPrice: string;
  stockStatus: string;
  catalogueNo: string;
  depotNos: string[];
  sortBy: ArticleSortBy;
  sortDirection: SortDirection;
};

function parsePositiveNumber(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function parsePositiveNumbers(values: string[]) {
  const parsed = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);

  return parsed.length > 0 ? parsed : undefined;
}

function getFiltersFromParams(params: URLSearchParams): FormFilters {
  const depotNos = params.getAll("depotNos");
  const legacyDepotNo = params.get("depotNo");
  const resolvedDepotNos = depotNos.length > 0 ? depotNos : legacyDepotNo ? [legacyDepotNo] : [];

  return {
    search: params.get("search") ?? params.get("q") ?? "",
    minPrice: params.get("minPrice") ?? "",
    maxPrice: params.get("maxPrice") ?? "",
    stockStatus: params.get("stockStatus") ?? "",
    catalogueNo: params.get("catalogueNo") ?? params.get("clNo") ?? "",
    depotNos: resolvedDepotNos,
    sortBy: (params.get("sortBy") as ArticleSortBy) ?? "designation",
    sortDirection: (params.get("sortDirection") as SortDirection) ?? "asc",
  };
}

function formatTnd(value: number | null | undefined) {
  return Number(value ?? 0).toFixed(3);
}

export function ArticlesPage() {
  const [params, setParams] = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const pageParam = Math.max(1, Number(params.get("page") ?? "1") || 1);
  const filtersFromParams = useMemo(() => getFiltersFromParams(params), [params]);
  const [filters, setFilters] = useState<FormFilters>(filtersFromParams);

  useEffect(() => {
    setFilters(filtersFromParams);
  }, [filtersFromParams]);

  const skip = (pageParam - 1) * DEFAULT_TAKE;
  const { roots, data: cataloguesData } = useCatalogueTree();

  const { data: depotsData = [] } = useQuery({
    queryKey: ["depots-filter"],
    queryFn: () => getDepots(false),
    staleTime: 5 * 60_000,
  });

  const depotsById = useMemo(
    () => new Map(depotsData.map((depot) => [String(depot.dE_No), depot])),
    [depotsData]
  );

  const cataloguesById = useMemo(
    () => new Map((cataloguesData?.items ?? []).map((catalogue) => [String(catalogue.cL_No), catalogue])),
    [cataloguesData]
  );

  const queryFilters = useMemo(
    () => ({
      search: filtersFromParams.search.trim() || undefined,
      minPrice: parsePositiveNumber(filtersFromParams.minPrice),
      maxPrice: parsePositiveNumber(filtersFromParams.maxPrice),
      stockStatus: filtersFromParams.stockStatus || undefined,
      catalogueNo: parsePositiveNumber(filtersFromParams.catalogueNo),
      depotNos: parsePositiveNumbers(filtersFromParams.depotNos),
      sortBy: filtersFromParams.sortBy,
      sortDirection: filtersFromParams.sortDirection,
    }),
    [filtersFromParams]
  );

  const { data, isPending, isError, error, isFetching, refetch } = useQuery({
    queryKey: ["articles", { skip, take: DEFAULT_TAKE, ...queryFilters }],
    queryFn: () =>
      getArticles({
        skip,
        take: DEFAULT_TAKE,
        ...queryFilters,
      }),
    placeholderData: keepPreviousData,
    retry: 1,
  });

  const { data: priceMetadata, isFetching: isPriceMetadataFetching } = useQuery({
    queryKey: [
      "articles-filter-metadata",
      {
        search: queryFilters.search,
        stockStatus: queryFilters.stockStatus,
        catalogueNo: queryFilters.catalogueNo,
        depotNos: queryFilters.depotNos,
      },
    ],
    queryFn: () =>
      getArticleFilterMetadata({
        search: queryFilters.search,
        stockStatus: queryFilters.stockStatus,
        catalogueNo: queryFilters.catalogueNo,
        depotNos: queryFilters.depotNos,
      }),
    retry: 1,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / DEFAULT_TAKE));
  const showBlockingError = isError && items.length === 0;
  const showInlineError = isError && items.length > 0;
  const arRefs = useMemo(() => items.map((a) => a.aR_Ref).filter(Boolean), [items]);

  const { data: mainImagesMap } = useQuery({
    queryKey: ["articles-main-images", arRefs],
    queryFn: () => getMainImagesMap(arRefs),
    enabled: arRefs.length > 0,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!data || total === 0) return;
    if (pageParam <= totalPages) return;

    const next = new URLSearchParams(params);
    next.set("page", String(totalPages));
    setParams(next, { replace: true });
  }, [data, total, totalPages, pageParam, params, setParams]);

  const applyFilters = () => {
    const next = new URLSearchParams();

    if (filters.search.trim()) next.set("search", filters.search.trim());
    if (filters.minPrice.trim()) next.set("minPrice", filters.minPrice.trim());
    if (filters.maxPrice.trim()) next.set("maxPrice", filters.maxPrice.trim());
    if (filters.stockStatus) next.set("stockStatus", filters.stockStatus);
    if (filters.catalogueNo) next.set("catalogueNo", filters.catalogueNo);

    for (const depotNo of filters.depotNos) {
      next.append("depotNos", depotNo);
    }

    if (filters.sortBy !== "designation") next.set("sortBy", filters.sortBy);
    if (filters.sortDirection !== "asc") next.set("sortDirection", filters.sortDirection);

    next.set("page", "1");
    setParams(next);
    setMobileFiltersOpen(false);
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      minPrice: "",
      maxPrice: "",
      stockStatus: "",
      catalogueNo: "",
      depotNos: [],
      sortBy: "designation",
      sortDirection: "asc",
    });

    setParams(new URLSearchParams());
    setMobileFiltersOpen(false);
  };

  const goToPage = (page: number) => {
    const safePage = Math.max(1, Math.min(page, totalPages || 1));
    if (safePage === pageParam) return;

    const next = new URLSearchParams(params);
    next.set("page", String(safePage));
    setParams(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activeFilterCount = [
    filtersFromParams.search,
    filtersFromParams.stockStatus,
    filtersFromParams.catalogueNo,
    filtersFromParams.depotNos.length > 0 ? "depots" : "",
    filtersFromParams.minPrice || filtersFromParams.maxPrice ? "price" : "",
  ].filter(Boolean).length;

  const filterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];

    if (filtersFromParams.search) {
      chips.push({
        key: "search",
        label: `Recherche: ${filtersFromParams.search}`,
        onRemove: () => {
          const next = new URLSearchParams(params);
          next.delete("search");
          next.delete("q");
          next.set("page", "1");
          setParams(next);
        },
      });
    }

    if (filtersFromParams.minPrice || filtersFromParams.maxPrice) {
      chips.push({
        key: "price",
        label: `Prix: ${filtersFromParams.minPrice || "0.000"} - ${filtersFromParams.maxPrice || "∞"} TND`,
        onRemove: () => {
          const next = new URLSearchParams(params);
          next.delete("minPrice");
          next.delete("maxPrice");
          next.set("page", "1");
          setParams(next);
        },
      });
    }

    if (filtersFromParams.stockStatus) {
      const stockLabels: Record<string, string> = {
        IN_STOCK: "Disponibilité: En stock",
        LOW_STOCK: "Disponibilité: Stock faible",
        OUT_OF_STOCK: "Disponibilité: Rupture",
        NOT_TRACKED: "Disponibilité: Non suivi",
      };

      chips.push({
        key: "stock",
        label: stockLabels[filtersFromParams.stockStatus] ?? `Disponibilité: ${filtersFromParams.stockStatus}`,
        onRemove: () => {
          const next = new URLSearchParams(params);
          next.delete("stockStatus");
          next.set("page", "1");
          setParams(next);
        },
      });
    }

    if (filtersFromParams.catalogueNo) {
      const catalogueLabel = cataloguesById.get(filtersFromParams.catalogueNo)?.cL_Intitule ?? filtersFromParams.catalogueNo;

      chips.push({
        key: "catalogue",
        label: `Famille: ${catalogueLabel}`,
        onRemove: () => {
          const next = new URLSearchParams(params);
          next.delete("catalogueNo");
          next.delete("clNo");
          next.set("page", "1");
          setParams(next);
        },
      });
    }

    for (const depotNo of filtersFromParams.depotNos) {
      const depotLabel = depotsById.get(depotNo)?.dE_Intitule ?? `Dépôt ${depotNo}`;

      chips.push({
        key: `depot-${depotNo}`,
        label: `Dépôt: ${depotLabel}`,
        onRemove: () => {
          const next = new URLSearchParams();
          params.forEach((value, key) => {
            if (key === "depotNos" && value === depotNo) return;
            if (key === "depotNo" && value === depotNo) return;
            next.append(key, value);
          });
          next.set("page", "1");
          setParams(next);
        },
      });
    }

    return chips;
  }, [cataloguesById, depotsById, filtersFromParams, params, setParams]);

  return (
    <div className="space-y-6 pb-10">
      <PremiumHero
        kicker={isFetching ? "Catalogue · synchronisation…" : "Catalogue"}
        title="Produits"gradientTitle
        description="Parcourez le catalogue avec un panneau latéral premium, un filtre prix par plage, un tri fiable côté API et une pagination intacte."
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => refetch()} className="px-5">
              Actualiser
            </Button>
            {activeFilterCount > 0 ? (
              <span className="inline-flex items-center rounded-full border border-white/30 bg-white/15 px-3 py-1.5 text-sm font-semibold text-white shadow-sm">
                {activeFilterCount} filtre{activeFilterCount > 1 ? "s" : ""} actif{activeFilterCount > 1 ? "s" : ""}
              </span>
            ) : null}
          </>
        }
      />

      <div className="flex items-center justify-between gap-3 xl:hidden">
        <Button type="button" variant="outline" onClick={() => setMobileFiltersOpen(true)} className="px-5">
          Filtres {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}
        </Button>
        <Button type="button" variant="ghost" onClick={() => refetch()} className="px-5">
          Actualiser
        </Button>
      </div>

      {mobileFiltersOpen ? (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button
            type="button"
            aria-label="Fermer les filtres"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-full max-w-[420px] p-3 sm:p-4">
            <ArticlesFilterPanel
              filters={filters}
              setFilters={setFilters}
              roots={roots}
              depots={depotsData}
              metadata={priceMetadata}
              metadataLoading={isPriceMetadataFetching}
              activeFilterCount={activeFilterCount}
              onApply={applyFilters}
              onReset={resetFilters}
              onClose={() => setMobileFiltersOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)] 2xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="hidden xl:block">
          <div className="sticky top-24">
            <ArticlesFilterPanel
              filters={filters}
              setFilters={setFilters}
              roots={roots}
              depots={depotsData}
              metadata={priceMetadata}
              metadataLoading={isPriceMetadataFetching}
              activeFilterCount={activeFilterCount}
              onApply={applyFilters}
              onReset={resetFilters}
            />
          </div>
        </aside>

        <div className="space-y-5">
          <section className="app-surface px-5 py-4 md:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-lg font-extrabold text-card-foreground">Catalogue disponible</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  <span className="font-semibold text-card-foreground">{total}</span> résultat{total > 1 ? "s" : ""} • page{" "}
                  <span className="font-semibold text-card-foreground">{Math.min(pageParam, totalPages)}</span> / {totalPages}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {filterChips.length > 0 ? (
                  filterChips.map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={chip.onRemove}
                      className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/35 px-3 py-1.5 text-sm font-semibold text-card-foreground transition hover:border-primary/20 hover:bg-accent/55"
                      title="Retirer ce filtre"
                    >
                      <span>{chip.label}</span>
                      <span className="text-muted-foreground">×</span>
                    </button>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">Aucun filtre actif.</span>
                )}
              </div>
            </div>
          </section>

          {showInlineError ? (
            <Card className="border-amber-200 bg-amber-50 p-4">
              <div className="text-sm font-semibold text-amber-800">Navigation temporairement indisponible</div>
              <div className="mt-1 text-sm text-amber-700">
                {(error as Error)?.message ?? "Le changement de page a échoué. Les derniers articles chargés restent affichés."}
              </div>
            </Card>
          ) : null}

          {isPending ? (
            <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="app-surface overflow-hidden p-0">
                  <Skeleton className="aspect-[4/3] w-full" rounded="sm" />
                  <div className="space-y-3 p-5">
                    <Skeleton width={96} height={12} rounded="full" />
                    <Skeleton width="75%" height={16} rounded="full" />
                    <Skeleton height={40} rounded="lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : showBlockingError ? (
            <Card className="p-6">
              <div className="text-sm font-semibold text-rose-700">Erreur</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {(error as Error)?.message ?? "Impossible de charger les articles."}
              </div>
            </Card>
          ) : items.length === 0 ? (
            <EmptyView
              title="Aucun article"
              description="Essayez de modifier vos filtres, vos dépôts ou votre famille catalogue."
              iconPath="M21 21l-4.35-4.35 M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"
              action={
                <Button type="button" variant="outline" onClick={resetFilters} className="h-11 rounded-2xl px-5">
                  Réinitialiser les filtres
                </Button>
              }
            />
          ) : (
            <>
              <StaggeredColumn className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3" step={45}>
                {items.map((article) => {
                  const raw = mainImagesMap?.[article.aR_Ref] ?? article.aR_Image ?? null;
                  const imgSrc = resolveImageUrl(raw, env.apiBaseUrl);
                  const detailsHref = `/articles/${encodeURIComponent(article.aR_Ref)}`;

                  return (
                    <ArticleCard
                      key={article.aR_Ref}
                      article={article}
                      imgSrc={imgSrc}
                      detailsHref={detailsHref}
                      formatTnd={formatTnd}
                    />
                  );
                })}
              </StaggeredColumn>

              <section className="app-surface px-5 py-4 md:px-6">
                <div className="flex flex-col items-center justify-between gap-4 lg:flex-row">
                  <div className="text-sm text-muted-foreground">
                    Page <span className="font-semibold text-card-foreground">{Math.min(pageParam, totalPages)}</span> / {totalPages} •{" "}
                    <span className="font-semibold text-card-foreground">{total}</span> articles
                  </div>

                  <Pagination
                    currentPage={Math.min(pageParam, totalPages)}
                    totalPages={totalPages}
                    onPageChange={goToPage}
                    disabled={isFetching}
                  />
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
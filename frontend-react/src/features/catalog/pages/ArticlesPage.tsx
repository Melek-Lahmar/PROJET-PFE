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
import { EmptyView, Skeleton } from "../../../shared/components/premium";

const DEFAULT_TAKE = 20;

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

function IconGrid(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function IconList(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </svg>
  );
}

function IconFilter(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 3H2l8 9.5V20l4 2v-9.5L22 3Z" />
    </svg>
  );
}

function HeroIllustration() {
  return (
    <div className="catalog-pro-hero-art" aria-hidden="true">
      <div className="catalog-pro-cube catalog-pro-cube-a" />
      <div className="catalog-pro-cube catalog-pro-cube-b" />
      <div className="catalog-pro-cart">
        <div className="catalog-pro-cart-basket" />
        <div className="catalog-pro-cart-handle" />
        <div className="catalog-pro-cart-wheel catalog-pro-cart-wheel-a" />
        <div className="catalog-pro-cart-wheel catalog-pro-cart-wheel-b" />
      </div>
    </div>
  );
}

export function ArticlesPage() {
  const [params, setParams] = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "compact">("grid");

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

  const updateSort = (sortBy: ArticleSortBy) => {
    const nextFilters = { ...filters, sortBy };
    setFilters(nextFilters);

    const next = new URLSearchParams(params);
    if (sortBy !== "designation") next.set("sortBy", sortBy);
    else next.delete("sortBy");
    next.set("page", "1");
    setParams(next);
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
        IN_STOCK: "En stock",
        LOW_STOCK: "Stock faible",
        OUT_OF_STOCK: "Rupture",
        NOT_TRACKED: "Non suivi",
      };

      chips.push({
        key: "stock",
        label: stockLabels[filtersFromParams.stockStatus] ?? filtersFromParams.stockStatus,
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
        label: catalogueLabel,
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
        label: depotLabel,
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

  const startItem = total === 0 ? 0 : skip + 1;
  const endItem = Math.min(skip + items.length, total);

  return (
    <div className="catalog-pro-page">
      <section className="catalog-pro-hero">
        <div className="relative z-10 max-w-xl">
          <div className="catalog-pro-breadcrumb">
            <span>Accueil</span>
            <span>›</span>
            <span>Catalogue</span>
          </div>

          <div className="catalog-pro-kicker">Produits</div>
          <h1 className="catalog-pro-title">Catalogue produits</h1>
          <p className="catalog-pro-description">
            Parcourez notre catalogue et ajoutez les articles nécessaires à votre panier.
          </p>

          <div className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-black text-primary shadow-sm">
            <span className="h-2 w-2 rounded-full bg-primary" />
            {total} produits disponibles
          </div>
        </div>

        <HeroIllustration />
      </section>

      <div className="mt-6 flex items-center justify-between gap-3 xl:hidden">
        <Button type="button" variant="outline" onClick={() => setMobileFiltersOpen(true)} className="h-11 rounded-2xl px-5">
          <IconFilter className="mr-2 h-4 w-4" />
          Filtres {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}
        </Button>

        <Button type="button" variant="ghost" onClick={() => refetch()} className="h-11 rounded-2xl px-5">
          Actualiser
        </Button>
      </div>

      {mobileFiltersOpen ? (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button
            type="button"
            aria-label="Fermer les filtres"
            className="absolute inset-0 bg-foreground/45 backdrop-blur-sm"
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

      <div className="catalog-pro-layout">
        <div className="hidden xl:block">
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
        </div>

        <main className="min-w-0 space-y-5">
          <section className="catalog-pro-toolbar">
            <div>
              <div className="text-sm font-black text-card-foreground">
                {total} résultat{total > 1 ? "s" : ""}
              </div>
              <div className="mt-1 text-xs font-medium text-muted-foreground">
                {startItem} - {endItem} sur {total} produits
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              {filterChips.length > 0 ? (
                <div className="hidden max-w-[520px] flex-wrap items-center gap-2 lg:flex">
                  {filterChips.slice(0, 3).map((chip) => (
                    <button key={chip.key} type="button" onClick={chip.onRemove} className="catalog-pro-chip" title="Retirer ce filtre">
                      <span>{chip.label}</span>
                      <span>×</span>
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <span className="hidden sm:inline">Trier par</span>
                <select
                  value={filtersFromParams.sortBy}
                  onChange={(e) => updateSort(e.target.value as ArticleSortBy)}
                  className="catalog-pro-sort-select"
                >
                  <option value="designation">Meilleures ventes</option>
                  <option value="price">Prix</option>
                  <option value="ref">Référence</option>
                  <option value="stock">Stock</option>
                </select>
              </div>

              <div className="catalog-pro-view-toggle">
                <button type="button" onClick={() => setViewMode("grid")} className={viewMode === "grid" ? "active" : ""} aria-label="Vue grille">
                  <IconGrid className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setViewMode("compact")} className={viewMode === "compact" ? "active" : ""} aria-label="Vue compacte">
                  <IconList className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>

          {showInlineError ? (
            <Card className="border-amber-200 bg-amber-50 p-4 dark:border-amber-400/20 dark:bg-amber-400/10">
              <div className="text-sm font-semibold text-amber-800 dark:text-amber-200">Navigation temporairement indisponible</div>
              <div className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                {(error as Error)?.message ?? "Le changement de page a échoué. Les derniers articles chargés restent affichés."}
              </div>
            </Card>
          ) : null}

          {isPending ? (
            <div className="catalog-pro-grid">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="catalog-pro-card overflow-hidden p-4">
                  <Skeleton className="aspect-[4/3] w-full" rounded="sm" />
                  <div className="space-y-3 pt-4">
                    <Skeleton width={96} height={12} rounded="full" />
                    <Skeleton width="75%" height={16} rounded="full" />
                    <Skeleton height={40} rounded="lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : showBlockingError ? (
            <Card className="p-6">
              <div className="text-sm font-semibold text-danger">Erreur</div>
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
              <div className={viewMode === "grid" ? "catalog-pro-grid" : "catalog-pro-grid catalog-pro-grid-compact"}>
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
              </div>

              <section className="catalog-pro-pagination-shell">
                <div className="flex flex-col items-center justify-between gap-4 lg:flex-row">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>Afficher</span>
                    <span className="rounded-xl border border-border bg-card px-3 py-2 font-black text-card-foreground">
                      {DEFAULT_TAKE}
                    </span>
                    <span>par page</span>
                  </div>

                  <div className="text-sm font-semibold text-muted-foreground">
                    {startItem} - {endItem} sur {total} produits
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
        </main>
      </div>
    </div>
  );
}

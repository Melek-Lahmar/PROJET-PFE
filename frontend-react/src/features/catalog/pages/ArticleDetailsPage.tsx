import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { getArticleByRef, getArticles } from "../api/articlesApi";
import { getArticleImageUrls, getMainImagesMap } from "../api/articleImagesApi";
import type { Article } from "../types/article";
import { useAvailability } from "../hooks/useAvailability";
import { AvailabilityCard } from "../components/AvailabilityCard";
import { useCartStore } from "../../cart/store/cartStore";
import { useVendorCartStore } from "../../vendeur/store/vendorCartStore";
import { getVendeurContext } from "../../vendeur/api/vendeurApi";
import { Button } from "../../../shared/components/Button";
import { Loader } from "../../../shared/components/Loader";
import { env } from "../../../core/config/env";
import { resolveImageUrl } from "../../../shared/utils/image";
import { SmartImage } from "../../../shared/components/SmartImage";
import { StockBadge } from "../components/StockBadge";
import { CompareToggleButton } from "../../compare/components/CompareToggleButton";
import { FavoriteToggleButton } from "../../favorites/components/FavoriteToggleButton";
import { canAddToCart } from "../utils/stock";
import { ArticleCard } from "../components/ArticleCard";
import {
  EmptyView,
  Skeleton,
  StaggeredColumn,
} from "../../../shared/components/premium";

type ArticleDetailsLocationState = {
  prefetchedArticle?: Article;
  prefetchedImage?: string | null;
};

function normalizeArticleRefForCompare(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .trim()
    .toUpperCase();
}

function isVendorArticleUnavailable(article: Article) {
  if (article.aR_Sommeil === 1) return true;
  if ((article.stockStatus ?? "").toUpperCase() === "OUT_OF_STOCK") return true;
  if (article.aR_SuiviStock === 1 && Number(article.availableStock ?? 0) <= 0) return true;
  return false;
}

function getPreferredCatalogueNo(article: Article | undefined): number | undefined {
  const ordered = [article?.cL_No4, article?.cL_No3, article?.cL_No2, article?.cL_No1];
  const value = ordered.find((candidate) => Number(candidate ?? 0) > 0);
  return typeof value === "number" && value > 0 ? value : undefined;
}

function mergeRelatedArticles(currentRef: string, primary: Article[], fallback: Article[], limit: number) {
  const normalizedCurrentRef = normalizeArticleRefForCompare(currentRef);
  const merged: Article[] = [];
  const seen = new Set<string>();

  for (const item of [...primary, ...fallback]) {
    const normalizedRef = normalizeArticleRefForCompare(item.aR_Ref);
    if (!normalizedRef || normalizedRef === normalizedCurrentRef || seen.has(normalizedRef)) continue;
    seen.add(normalizedRef);
    merged.push(item);
    if (merged.length >= limit) break;
  }

  return merged;
}

function formatTnd(value: number | null | undefined) {
  return Number(value ?? 0).toFixed(3);
}

export function ArticleDetailsPage() {
  const { arRef } = useParams<{ arRef: string }>();
  const normalizedArRef = useMemo(() => decodeURIComponent(arRef ?? "").trim(), [arRef]);
  const navigate = useNavigate();
  const location = useLocation();
  const isVendorRoute = location.pathname.startsWith("/vendeur/");

  const addClientItem = useCartStore((s) => s.addItem);
  const addVendorItem = useVendorCartStore((s) => s.addItem);

  const routeState = (location.state as ArticleDetailsLocationState | null) ?? null;

  const prefetchedArticle = useMemo(() => {
    const candidate = routeState?.prefetchedArticle;
    if (!candidate) return undefined;

    return normalizeArticleRefForCompare(candidate.aR_Ref) === normalizeArticleRefForCompare(normalizedArRef)
      ? candidate
      : undefined;
  }, [routeState, normalizedArRef]);

  const prefetchedImage = useMemo(() => {
    if (!prefetchedArticle) return null;
    return routeState?.prefetchedImage ?? prefetchedArticle.aR_Image ?? null;
  }, [routeState, prefetchedArticle]);

  const vendeurContextQuery = useQuery({
    queryKey: ["vendeur-context", "article-details"],
    queryFn: getVendeurContext,
    enabled: isVendorRoute,
    staleTime: 60_000,
    retry: 1,
  });

  const depotNo = isVendorRoute ? vendeurContextQuery.data?.depot.depotNo : undefined;

  const articleQuery = useQuery<Article>({
    queryKey: ["article", normalizedArRef, depotNo ?? "public"],
    queryFn: () => getArticleByRef(normalizedArRef, depotNo ? { depotNo } : undefined),
    enabled: !!normalizedArRef && (!isVendorRoute || typeof depotNo === "number"),
    retry: false,
    initialData: prefetchedArticle,
  });

  const { data: apiImages } = useQuery<string[]>({
    queryKey: ["article-images", normalizedArRef],
    queryFn: () => getArticleImageUrls(normalizedArRef),
    enabled: !!normalizedArRef,
    staleTime: 60_000,
  });

  const article = articleQuery.data;
  const availability = useAvailability(article?.aR_Ref || normalizedArRef);
  const [added, setAdded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [qty, setQtyState] = useState(1);

  const relatedFamilyCode = useMemo(() => article?.fA_CodeFamille?.trim() || "", [article?.fA_CodeFamille]);
  const relatedCatalogueNo = useMemo(() => getPreferredCatalogueNo(article), [article]);

  const relatedByFamilyQuery = useQuery({
    queryKey: ["related-articles", "family", article?.aR_Ref ?? "", relatedFamilyCode],
    queryFn: () =>
      getArticles({
        familyCode: relatedFamilyCode,
        take: 8,
        skip: 0,
        sortBy: "designation",
        sortDirection: "asc",
      }),
    enabled: !isVendorRoute && !!article?.aR_Ref && !!relatedFamilyCode,
    staleTime: 60_000,
    retry: 1,
  });

  const relatedFamilyItems = useMemo(
    () =>
      mergeRelatedArticles(
        article?.aR_Ref ?? "",
        relatedByFamilyQuery.data?.items ?? [],
        [],
        4
      ),
    [article?.aR_Ref, relatedByFamilyQuery.data?.items]
  );

  const relatedByCatalogueQuery = useQuery({
    queryKey: ["related-articles", "catalogue", article?.aR_Ref ?? "", relatedCatalogueNo ?? 0],
    queryFn: () =>
      getArticles({
        catalogueNo: relatedCatalogueNo,
        take: 12,
        skip: 0,
        sortBy: "designation",
        sortDirection: "asc",
      }),
    enabled:
      !isVendorRoute &&
      !!article?.aR_Ref &&
      typeof relatedCatalogueNo === "number" &&
      relatedCatalogueNo > 0 &&
      relatedFamilyItems.length < 4,
    staleTime: 60_000,
    retry: 1,
  });

  const relatedArticles = useMemo(
    () =>
      mergeRelatedArticles(
        article?.aR_Ref ?? "",
        relatedByFamilyQuery.data?.items ?? [],
        relatedByCatalogueQuery.data?.items ?? [],
        4
      ),
    [article?.aR_Ref, relatedByFamilyQuery.data?.items, relatedByCatalogueQuery.data?.items]
  );

  const relatedArRefs = useMemo(
    () => relatedArticles.map((item) => item.aR_Ref).filter(Boolean),
    [relatedArticles]
  );

  const { data: relatedImagesMap } = useQuery({
    queryKey: ["related-articles-main-images", relatedArRefs],
    queryFn: () => getMainImagesMap(relatedArRefs),
    enabled: relatedArRefs.length > 0,
    staleTime: 60_000,
  });

  const clampQty = (value: number) => {
    if (!Number.isFinite(value)) return 1;
    const n = Math.trunc(value);
    if (n < 1) return 1;
    if (isVendorRoute && article?.aR_SuiviStock === 1) {
      const max = Math.max(1, Number(article.availableStock ?? 0));
      return Math.min(n, max);
    }
    if (n > 999) return 999;
    return n;
  };

  const setQty = (value: number) => setQtyState(clampQty(value));
  const price = useMemo(() => Number(article?.aR_PrixVen ?? 0), [article]);

  const images = useMemo(() => {
    const list = [prefetchedImage ?? "", ...(apiImages ?? []), article?.aR_Image ?? ""]
      .map((u) => resolveImageUrl(u, env.apiBaseUrl))
      .filter((u): u is string => Boolean(u));

    const seen = new Set<string>();
    const unique: string[] = [];
    for (const u of list) {
      if (seen.has(u)) continue;
      seen.add(u);
      unique.push(u);
    }
    return unique;
  }, [prefetchedImage, apiImages, article?.aR_Image]);

  const safeIndex = Math.min(activeIndex, Math.max(0, images.length - 1));
  const currentImage = images.length > 0 ? images[safeIndex] : "";
  const canNavigate = images.length > 1;
  const stockState = article?.stockStatus ?? "OUT_OF_STOCK";
  const canOrder = article
    ? isVendorRoute
      ? !isVendorArticleUnavailable(article)
      : canAddToCart(stockState)
    : false;

  const relatedSectionLoading = relatedByFamilyQuery.isFetching || relatedByCatalogueQuery.isFetching;
  const relatedSectionError = relatedByFamilyQuery.isError && relatedByCatalogueQuery.isError;

  const prev = () => {
    if (!canNavigate) return;
    setActiveIndex((i) => (i - 1 + images.length) % images.length);
  };

  const next = () => {
    if (!canNavigate) return;
    setActiveIndex((i) => (i + 1) % images.length);
  };

  const onAddToCart = () => {
    if (!article || !canOrder) return;

    const payload = {
      arRef: article.aR_Ref,
      designation: article.aR_Design,
      unitPrice: Number.isFinite(price) ? price : 0,
    };

    if (isVendorRoute) {
      addVendorItem(payload, qty);
    } else {
      addClientItem(payload, qty);
    }

    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  };

  if (isVendorRoute && vendeurContextQuery.isPending) {
    return <Loader label="Chargement du dépôt vendeur..." />;
  }

  if (articleQuery.isLoading && !article) {
    return (
      <div className="w-full space-y-8 py-10">
        <Skeleton width={192} height={44} rounded="lg" />
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Skeleton height={520} rounded="xl" />
          </div>
          <div className="lg:col-span-5 space-y-6">
            <Skeleton height={160} rounded="xl" />
            <Skeleton height={256} rounded="xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="w-full py-10">
        <EmptyView
          title="Produit introuvable"
          description={`La référence ${normalizedArRef || "-"} n’a pas pu être retrouvée depuis l’API détail.`}
          iconPath="M21 21l-4.35-4.35 M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"
          action={
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(isVendorRoute ? "/vendeur/articles" : "/articles")}
              className="h-11 rounded-2xl px-5"
            >
              Retour au catalogue
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-10">
      <nav className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-4 py-2 text-sm font-semibold text-card-foreground shadow-sm">
        <Link to={isVendorRoute ? "/vendeur/articles" : "/articles"} className="transition-colors hover:text-primary">
          {isVendorRoute ? "Catalogue vendeur" : "Catalogue"}
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="max-w-[220px] truncate text-muted-foreground">{article.aR_Ref}</span>
      </nav>

      {articleQuery.isError ? (
        <div className="ds-alert ds-alert-warning">
          Le rafraîchissement du détail a échoué, mais l’article chargé depuis le catalogue reste affiché.
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
        <div className="lg:col-span-7">
          <div className="app-surface overflow-hidden p-0">
            <div className="relative h-[520px] w-full bg-card">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.10),_transparent_62%)]" />
              <div className="relative z-10 h-full w-full p-6">
                <SmartImage
                  src={currentImage}
                  alt={article.aR_Design}
                  fit="contain"
                  className="h-full w-full"
                  loading="eager"
                />
              </div>

              {canNavigate ? (
                <>
                  <button
                    type="button"
                    onClick={prev}
                    className="absolute left-5 top-1/2 z-20 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/95 text-base font-bold text-card-foreground shadow-sm transition hover:-translate-y-[52%] hover:border-primary/20"
                    aria-label="Image précédente"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    className="absolute right-5 top-1/2 z-20 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/95 text-base font-bold text-card-foreground shadow-sm transition hover:-translate-y-[52%] hover:border-primary/20"
                    aria-label="Image suivante"
                  >
                    →
                  </button>
                </>
              ) : null}
            </div>

            {images.length > 1 ? (
              <div className="grid grid-cols-4 gap-3 border-t border-border/70 p-4 md:grid-cols-5">
                {images.slice(0, 10).map((u, idx) => {
                  const active = idx === safeIndex;
                  return (
                    <button
                      key={`${u}-${idx}`}
                      type="button"
                      onClick={() => setActiveIndex(idx)}
                      className={`aspect-square overflow-hidden rounded-[22px] border bg-card transition ${
                        active
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border hover:border-primary/20"
                      }`}
                      aria-label={`Image ${idx + 1}`}
                    >
                      <SmartImage src={u} alt={article.aR_Design} fit="cover" className="h-full w-full" />
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-6 lg:col-span-5">
          <div className="app-surface p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="app-kicker">Réf. {article.aR_Ref}</div>
                <h1 className="mt-2 text-4xl font-black leading-tight tracking-tight text-card-foreground">
                  {article.aR_Design}
                </h1>
              </div>

              <StockBadge status={article.stockStatus} availableStock={article.availableStock} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-muted/55 px-3 py-1 font-semibold ring-1 ring-border">
                Référence article: {article.aR_Ref}
              </span>
              {isVendorRoute && vendeurContextQuery.data ? (
                <span className="rounded-full bg-muted/55 px-3 py-1 font-semibold ring-1 ring-border">
                  Dépôt vendeur: {vendeurContextQuery.data.depot.depotIntitule || vendeurContextQuery.data.depot.depotCode || vendeurContextQuery.data.depot.depotNo}
                </span>
              ) : null}
            </div>

            <div className="mt-6 rounded-[28px] border border-border/70 bg-muted/30 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="app-kicker">Prix unitaire</div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-5xl font-black tracking-tight text-card-foreground">
                      {Number(article.aR_PrixVen ?? 0).toFixed(3)}
                    </span>
                    <span className="text-lg font-bold text-muted-foreground">TND</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant={canOrder ? "primary" : "outline"}
                  onClick={onAddToCart}
                  disabled={!canOrder}
                  className="h-12 min-w-[240px] rounded-2xl text-base font-bold"
                >
                  {added
                    ? isVendorRoute
                      ? "Ajouté au panier vendeur"
                      : "Ajouté"
                    : isVendorRoute
                      ? "Ajouter au panier vendeur"
                      : "Ajouter au panier"}
                </Button>
              </div>

              {canOrder ? (
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="app-kicker">Quantité</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Choisissez la quantité avant ajout au panier.
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-[22px] border border-border/70 bg-card p-1 shadow-sm">
                    <button
                      type="button"
                      className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[hsl(var(--input))] text-lg font-bold text-card-foreground transition hover:bg-accent disabled:opacity-40"
                      onClick={() => setQty(qty - 1)}
                      disabled={qty <= 1}
                    >
                      −
                    </button>
                    <input
                      inputMode="numeric"
                      value={qty}
                      onChange={(e) => setQty(Number(e.target.value.replace(/[^\d]/g, "") || 1))}
                      onBlur={() => setQty(qty)}
                      className="h-11 w-20 rounded-2xl border border-border bg-[hsl(var(--input))] text-center text-lg font-black text-card-foreground outline-none focus:border-primary/40"
                      aria-label="Quantité"
                    />
                    <button
                      type="button"
                      className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[hsl(var(--input))] text-lg font-bold text-card-foreground transition hover:bg-accent disabled:opacity-40"
                      onClick={() => setQty(qty + 1)}
                      disabled={isVendorRoute && article.aR_SuiviStock === 1 && qty >= Math.max(1, Number(article.availableStock ?? 0))}
                    >
                      +
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {!canOrder ? (
              <div className="ds-alert ds-alert-danger mt-4">
                {isVendorRoute
                  ? "Cet article est indisponible dans le dépôt du vendeur. Consultez le détail de disponibilité ci-dessous pour voir les autres dépôts."
                  : "Cet article est en rupture. Ajout au panier désactivé."}
              </div>
            ) : null}

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {!isVendorRoute ? (
                <FavoriteToggleButton
                  arRef={article.aR_Ref}
                  designation={article.aR_Design}
                  mode="details"
                  className="sm:col-span-2"
                />
              ) : null}
              <CompareToggleButton
                article={article}
                image={currentImage || article.aR_Image || undefined}
                className="w-full"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(isVendorRoute ? "/vendeur/cart" : "/cart")}
                className="h-12 w-full rounded-2xl text-base font-semibold"
              >
                {isVendorRoute ? "Voir le panier vendeur" : "Voir le panier"}
              </Button>
            </div>
          </div>

          <AvailabilityCard data={availability.data ?? []} />
        </div>
      </div>

      {!isVendorRoute ? (
        <section className="space-y-4">
          <div className="app-surface px-6 py-5 md:px-7">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="app-kicker">Suggestions</div>
                <h2 className="text-2xl font-black tracking-tight text-card-foreground">Articles similaires</h2>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Priorité aux articles de la même famille, puis repli sur le catalogue de rattachement pour garder une sélection utile et cohérente.
                </p>
              </div>

              {relatedFamilyCode ? (
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Base principale : {relatedFamilyCode}
                </div>
              ) : null}
            </div>
          </div>

          {relatedSectionLoading && relatedArticles.length === 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="app-surface overflow-hidden p-0">
                  <Skeleton className="aspect-[4/3] w-full" rounded="sm" />
                  <div className="space-y-3 p-5">
                    <Skeleton width={96} height={12} rounded="full" />
                    <Skeleton width="75%" height={16} rounded="full" />
                    <Skeleton height={40} rounded="lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : relatedSectionError ? (
            <div className="app-surface px-5 py-4 text-sm text-muted-foreground">
              Impossible de charger les articles liés pour le moment.
            </div>
          ) : relatedArticles.length > 0 ? (
            <StaggeredColumn className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4" step={50}>
              {relatedArticles.map((relatedArticle) => {
                const rawImage = relatedImagesMap?.[relatedArticle.aR_Ref] ?? relatedArticle.aR_Image ?? null;
                const imgSrc = resolveImageUrl(rawImage, env.apiBaseUrl);

                return (
                  <ArticleCard
                    key={relatedArticle.aR_Ref}
                    article={relatedArticle}
                    imgSrc={imgSrc}
                    detailsHref={`/articles/${encodeURIComponent(relatedArticle.aR_Ref)}`}
                    formatTnd={formatTnd}
                  />
                );
              })}
            </StaggeredColumn>
          ) : (
            <div className="app-surface px-5 py-4 text-sm text-muted-foreground">
              Aucun article similaire pertinent n’a été trouvé pour cette référence.
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

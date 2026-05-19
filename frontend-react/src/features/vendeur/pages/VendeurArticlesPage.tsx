import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getArticles } from "../../catalog/api/articlesApi";
import { getMainImagesMap } from "../../catalog/api/articleImagesApi";
import { env } from "../../../core/config/env";
import { resolveImageUrl } from "../../../shared/utils/image";
import { SmartImage } from "../../../shared/components/SmartImage";
import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { Pagination } from "../../../shared/components/Pagination";
import { Loader } from "../../../shared/components/Loader";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";
import { useVendorCartStore } from "../store/vendorCartStore";
import { getVendeurContext } from "../api/vendeurApi";

const DEFAULT_TAKE = 12;

function parsePositiveNumber(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function money(value: number) {
  return `${Number(value ?? 0).toFixed(3)} TND`;
}

function stockStatusLabel(value: string) {
  switch ((value ?? "").toUpperCase()) {
    case "IN_STOCK":
      return "En stock";
    case "LOW_STOCK":
      return "Stock faible";
    case "OUT_OF_STOCK":
      return "Rupture de stock";
    case "NOT_TRACKED":
      return "Stock non suivi";
    default:
      return value || "-";
  }
}

function isVendorArticleUnavailable(article: {
  aR_SuiviStock: number;
  aR_Sommeil: number;
  stockStatus: string;
  availableStock: number;
}) {
  if (article.aR_Sommeil === 1) return true;
  if ((article.stockStatus ?? "").toUpperCase() === "OUT_OF_STOCK") return true;
  if (article.aR_SuiviStock === 1 && Number(article.availableStock ?? 0) <= 0) return true;
  return false;
}

export function VendeurArticlesPage() {
  const [params, setParams] = useSearchParams();
  const addItem = useVendorCartStore((s) => s.addItem);
  const totalQty = useVendorCartStore((s) => s.totalQty());
  const cartItems = useVendorCartStore((s) => s.items);

  const [search, setSearch] = useState(params.get("search") ?? "");
  const [stockStatus, setStockStatus] = useState(params.get("stockStatus") ?? "");
  const [minPrice, setMinPrice] = useState(params.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(params.get("maxPrice") ?? "");

  useEffect(() => {
    setSearch(params.get("search") ?? "");
    setStockStatus(params.get("stockStatus") ?? "");
    setMinPrice(params.get("minPrice") ?? "");
    setMaxPrice(params.get("maxPrice") ?? "");
  }, [params]);

  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);
  const skip = (page - 1) * DEFAULT_TAKE;

  const vendeurContextQuery = useQuery({
    queryKey: ["vendeur-context"],
    queryFn: getVendeurContext,
    staleTime: 60_000,
    retry: 1,
  });

  const depotNo = vendeurContextQuery.data?.depot.depotNo;

  const queryFilters = useMemo(
    () => ({
      search: (params.get("search") ?? "").trim() || undefined,
      stockStatus: params.get("stockStatus") || undefined,
      minPrice: parsePositiveNumber(params.get("minPrice")),
      maxPrice: parsePositiveNumber(params.get("maxPrice")),
    }),
    [params]
  );

  const { data, isPending, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["vendeur-articles", { depotNo, skip, take: DEFAULT_TAKE, ...queryFilters }],
    queryFn: () =>
      getArticles({
        skip,
        take: DEFAULT_TAKE,
        search: queryFilters.search,
        stockStatus: queryFilters.stockStatus,
        minPrice: queryFilters.minPrice,
        maxPrice: queryFilters.maxPrice,
        depotNo,
      }),
    enabled: typeof depotNo === "number" && depotNo > 0,
    placeholderData: keepPreviousData,
    retry: 1,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / DEFAULT_TAKE));
  const arRefs = items.map((x) => x.aR_Ref).filter(Boolean);

  const { data: mainImagesMap } = useQuery({
    queryKey: ["vendeur-main-images", arRefs],
    queryFn: () => getMainImagesMap(arRefs),
    enabled: arRefs.length > 0,
    staleTime: 60_000,
  });

  const applyFilters = () => {
    const next = new URLSearchParams();
    if (search.trim()) next.set("search", search.trim());
    if (stockStatus) next.set("stockStatus", stockStatus);
    if (minPrice.trim()) next.set("minPrice", minPrice.trim());
    if (maxPrice.trim()) next.set("maxPrice", maxPrice.trim());
    next.set("page", "1");
    setParams(next);
  };

  const resetFilters = () => {
    setSearch("");
    setStockStatus("");
    setMinPrice("");
    setMaxPrice("");
    setParams(new URLSearchParams());
  };

  const goToPage = (nextPage: number) => {
    const safePage = Math.max(1, Math.min(nextPage, totalPages || 1));
    const next = new URLSearchParams(params);
    next.set("page", String(safePage));
    setParams(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (vendeurContextQuery.isPending) {
    return <Loader label="Chargement du contexte vendeur..." />;
  }

  if (vendeurContextQuery.isError || !vendeurContextQuery.data) {
    return (
      <div className="space-y-6 pb-10">
        <section className="app-surface px-6 py-6 md:px-7 md:py-7">
          <div className="space-y-2">
            <div className="app-kicker">Espace vendeur</div>
            <h1 className="app-title">Catalogue vendeur</h1>
            <p className="app-description max-w-3xl">
              Impossible de charger le dépôt du vendeur connecté. Vérifiez le profil vendeur et son rattachement dépôt.
            </p>
          </div>
        </section>
        <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-5 text-sm text-rose-700 shadow-sm">
          {getApiErrorMessage(vendeurContextQuery.error)}
        </div>
      </div>
    );
  }

  const vendeurContext = vendeurContextQuery.data;

  return (
    <div className="space-y-6 pb-10">
      <section className="app-surface px-6 py-6 md:px-7 md:py-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="app-kicker">Espace vendeur</div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="app-title">Catalogue vendeur</h1>
              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold badge-success">
                Panier vendeur : {totalQty} article{totalQty > 1 ? "s" : ""}
              </span>
              {isFetching ? (
                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold badge-info">
                  Actualisation...
                </span>
              ) : null}
            </div>
            <p className="app-description max-w-3xl">
              Tous les articles restent visibles, mais la disponibilité vendeur est calculée uniquement sur le dépôt du vendeur connecté.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/vendeur/cart">
              <Button type="button" variant="primary" className="px-5">
                Voir le panier vendeur
              </Button>
            </Link>
            <Button type="button" variant="outline" onClick={() => refetch()} className="px-5">
              Actualiser
            </Button>
          </div>
        </div>
      </section>

      <section className="app-surface px-6 py-6 md:px-7 md:py-7 space-y-5">
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-3xl border border-primary/15 bg-primary/5 px-5 py-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-primary/80">Remise vendeur</div>
            <div className="mt-1 text-lg font-extrabold text-card-foreground">{vendeurContext.modeRemise}</div>
            <div className="mt-2 text-sm text-muted-foreground">
              Ajout au panier autorisé seulement si l’article est disponible dans le dépôt vendeur.
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card px-5 py-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dépôt vendeur</div>
            <div className="mt-1 text-lg font-extrabold text-card-foreground">
              {vendeurContext.depot.depotIntitule || `Dépôt #${vendeurContext.depot.depotNo}`}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {vendeurContext.depot.depotCode
                ? `Code : ${vendeurContext.depot.depotCode}`
                : `N° ${vendeurContext.depot.depotNo}`}
            </div>
            <div className="mt-2 text-sm text-card-foreground">
              {vendeurContext.depot.address || "Adresse dépôt non renseignée"}
            </div>
            <div className="text-sm text-muted-foreground">
              {[vendeurContext.depot.postalCode, vendeurContext.depot.city].filter(Boolean).join(" ") || "-"}
            </div>
          </div>
        </div>
      </section>

      <section className="app-surface px-6 py-6 md:px-7 md:py-7 space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-card-foreground">Recherche</label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Référence, désignation, code barre..."
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-card-foreground">Prix min</label>
            <Input type="number" min="0" step="0.001" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-card-foreground">Prix max</label>
            <Input type="number" min="0" step="0.001" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-card-foreground">Disponibilité</label>
            <select
              className="flex h-11 w-full rounded-2xl border border-border bg-[hsl(var(--input))] px-4 text-sm text-card-foreground shadow-sm"
              value={stockStatus}
              onChange={(e) => setStockStatus(e.target.value)}
            >
              <option value="">Toutes</option>
              <option value="IN_STOCK">En stock</option>
              <option value="LOW_STOCK">Stock faible</option>
              <option value="OUT_OF_STOCK">Rupture de stock</option>
              <option value="NOT_TRACKED">Stock non suivi</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="primary" onClick={applyFilters}>Appliquer</Button>
          <Button type="button" variant="ghost" onClick={resetFilters}>Reset</Button>
        </div>
      </section>

      {isPending ? <Loader label="Chargement du catalogue vendeur..." /> : null}

      {isError ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-5 text-sm text-rose-700 shadow-sm">
          {getApiErrorMessage(error)}
        </div>
      ) : null}

      {!isPending && items.length === 0 ? (
        <div className="app-surface px-8 py-10 text-center">
          <h2 className="text-xl font-extrabold text-card-foreground">Aucun produit trouvé</h2>
          <p className="mt-2 text-sm text-muted-foreground">Ajustez vos filtres ou relancez une nouvelle recherche.</p>
        </div>
      ) : null}

      {items.length > 0 ? (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((article) => {
            const imageSrc = resolveImageUrl(mainImagesMap?.[article.aR_Ref] ?? null, env.apiBaseUrl);
            const disabled = isVendorArticleUnavailable(article);
            const cartQty = cartItems.find((x) => x.arRef === article.aR_Ref)?.qty ?? 0;
            const detailsState = {
              prefetchedArticle: article,
              prefetchedImage: imageSrc ?? null,
            };

            return (
              <article key={article.aR_Ref} className="app-surface flex h-full flex-col overflow-hidden p-0">
                <div className="relative h-56 overflow-hidden border-b border-border/70 bg-card">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.10),_transparent_60%)]" />
                  <div className="relative z-10 h-full w-full p-5">
                    <div className="h-full w-full overflow-hidden rounded-[22px] bg-card">
                      <SmartImage
                        src={imageSrc}
                        alt={article.aR_Design}
                        fit="contain"
                        className="h-full w-full object-contain"
                        placeholderClassName="flex h-full w-full items-center justify-center bg-card text-muted-foreground/60"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-4 px-6 py-5">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2 text-xs font-semibold">
                      <span className="inline-flex items-center rounded-full px-3 py-1 badge-neutral">Réf {article.aR_Ref}</span>
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 ${
                          (article.stockStatus ?? "").toUpperCase() === "OUT_OF_STOCK"
                            ? "badge-danger"
                            : (article.stockStatus ?? "").toUpperCase() === "LOW_STOCK"
                              ? "badge-warning"
                              : (article.stockStatus ?? "").toUpperCase() === "IN_STOCK"
                                ? "badge-success"
                                : "badge-neutral"
                        }`}
                      >
                        {stockStatusLabel(article.stockStatus)}
                      </span>
                      {cartQty > 0 ? (
                        <span className="inline-flex items-center rounded-full px-3 py-1 badge-info">
                          Dans le panier : {cartQty}
                        </span>
                      ) : null}
                    </div>
                    <h2 className="line-clamp-2 text-lg font-extrabold tracking-tight text-card-foreground">{article.aR_Design}</h2>
                  </div>

                  <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    <div>
                      Prix vente : <span className="font-semibold text-card-foreground">{money(article.aR_PrixVen)}</span>
                    </div>
                    <div>
                      Stock dépôt vendeur : <span className="font-semibold text-card-foreground">
                        {article.aR_SuiviStock === 1 ? article.availableStock : "Non suivi"}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-[hsl(var(--input))] px-4 py-3 text-xs text-muted-foreground">
                    {vendeurContext.depot.depotIntitule || `Dépôt #${vendeurContext.depot.depotNo}`}
                    {vendeurContext.depot.depotCode ? ` • ${vendeurContext.depot.depotCode}` : ""}
                  </div>

                  <div className="mt-auto flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="primary"
                      className="flex-1"
                      disabled={disabled}
                      onClick={() =>
                        addItem(
                          {
                            arRef: article.aR_Ref,
                            designation: article.aR_Design,
                            unitPrice: article.aR_PrixVen,
                          },
                          1
                        )
                      }
                    >
                      {disabled ? "Rupture dans ce dépôt" : "Ajouter au panier vendeur"}
                    </Button>
                    <Link to={`/vendeur/articles/${encodeURIComponent(article.aR_Ref)}`} state={detailsState} className="sm:w-auto">
                      <Button type="button" variant="outline">Détail</Button>
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}

      <div className="pt-2">
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={goToPage} disabled={isFetching} />
      </div>
    </div>
  );
}
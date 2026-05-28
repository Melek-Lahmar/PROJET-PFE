import { Link } from "react-router-dom";
import { useMemo, type ReactNode, type SVGProps } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";

import { useCompareStore } from "../store/compareStore";
import { getArticleByRef } from "../../catalog/api/articlesApi";
import { getDepots } from "../../catalog/api/depotsApi";
import { getStocksByArticle } from "../../catalog/api/stocksApi";
import { StockBadge } from "../../catalog/components/StockBadge";
import { Button } from "../../../shared/components/Button";
import { env } from "../../../core/config/env";
import { resolveImageUrl } from "../../../shared/utils/image";
import type { Article } from "../../catalog/types/article";
import { EmptyView } from "../../../shared/components/premium";
import { useCartStore } from "../../cart/store/cartStore";
import { useToast } from "../../../shared/components/premium/Toast";

function money(v: number | null | undefined) {
  return `${Number(v ?? 0).toFixed(3)} TND`;
}

function IconScale(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3v18" />
      <path d="M5 6h14" />
      <path d="M6 6 3 13h6L6 6Z" />
      <path d="m18 6-3 7h6l-3-7Z" />
      <path d="M8 21h8" />
    </svg>
  );
}

function IconTag(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </svg>
  );
}

function IconCube(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m21 8-9-5-9 5 9 5 9-5Z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </svg>
  );
}

function IconDepot(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 21h18" />
      <path d="M5 21V8l7-4 7 4v13" />
      <path d="M9 21v-7h6v7" />
      <path d="M8 10h.01" />
      <path d="M12 10h.01" />
      <path d="M16 10h.01" />
    </svg>
  );
}

function IconCart(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="9" cy="21" r="1.2" />
      <circle cx="19" cy="21" r="1.2" />
      <path d="M2.5 3h2l2.7 12.4a2 2 0 0 0 2 1.6h9.3a2 2 0 0 0 2-1.5L21.5 8H6" />
    </svg>
  );
}

function IconFile(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </svg>
  );
}

function IconTrash(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 15H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function IconInfo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function MetricCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  tone: "violet" | "blue" | "green" | "amber";
}) {
  return (
    <div className="compare-pro-metric-card">
      <div className={`compare-pro-metric-icon compare-pro-metric-icon-${tone}`}>{icon}</div>
      <div className="min-w-0">
        <div className="compare-pro-metric-label">{label}</div>
        <div className="compare-pro-metric-value">{value}</div>
        <div className="compare-pro-metric-hint">{hint}</div>
      </div>
    </div>
  );
}

function HeroIllustration() {
  return (
    <div className="compare-pro-hero-art" aria-hidden="true">
      <div className="compare-pro-art-platform" />
      <div className="compare-pro-art-card compare-pro-art-card-a">
        <span />
        <span />
        <span />
      </div>
      <div className="compare-pro-art-card compare-pro-art-card-b">
        <span />
        <span />
      </div>
      <div className="compare-pro-art-card compare-pro-art-card-c" />
      <div className="compare-pro-art-dot compare-pro-art-dot-a" />
      <div className="compare-pro-art-dot compare-pro-art-dot-b" />
    </div>
  );
}

type AvailabilitySummary = {
  inStockDepotCount: number;
  topDepotName: string | null;
  topDepotQty: number;
  principalDepotName: string | null;
  principalDepotQty: number | null;
};

type CompareProduct = {
  base: ReturnType<typeof useCompareStore.getState>["items"][number];
  article?: Article;
  availability: AvailabilitySummary;
  loading: boolean;
};

function buildAvailabilitySummary(
  depots: Awaited<ReturnType<typeof getDepots>> | undefined,
  stocks: Awaited<ReturnType<typeof getStocksByArticle>> | undefined
): AvailabilitySummary {
  const safeDepots = depots ?? [];
  const safeStocks = stocks ?? [];

  const rows = safeDepots.map((depot) => {
    const stock = safeStocks.find((item) => item.dE_No === depot.dE_No);
    const dispo = Number(stock?.aS_QteSto ?? 0) - Number(stock?.aS_QteRes ?? 0);

    return {
      depotNo: depot.dE_No,
      depotName: depot.dE_Intitule,
      principal: Number(depot.dE_Principal ?? 0) === 1,
      dispo,
    };
  });

  const positiveRows = rows
    .filter((row) => row.dispo > 0)
    .sort((a, b) => b.dispo - a.dispo || a.depotName.localeCompare(b.depotName));

  const principal = rows.find((row) => row.principal);

  return {
    inStockDepotCount: positiveRows.length,
    topDepotName: positiveRows[0]?.depotName ?? null,
    topDepotQty: positiveRows[0]?.dispo ?? 0,
    principalDepotName: principal?.depotName ?? null,
    principalDepotQty: typeof principal?.dispo === "number" ? principal.dispo : null,
  };
}

function rowValueClass(
  isWinner: boolean,
  tone: "price" | "stock" | "coverage" | "neutral"
) {
  if (!isWinner) return "compare-pro-table-value";
  if (tone === "price") return "compare-pro-table-value compare-pro-winner-price";
  if (tone === "stock") return "compare-pro-table-value compare-pro-winner-stock";
  if (tone === "coverage") return "compare-pro-table-value compare-pro-winner-coverage";
  return "compare-pro-table-value";
}

export function ComparePage() {
  const items = useCompareStore((s) => s.items);
  const removeItem = useCompareStore((s) => s.removeItem);
  const clear = useCompareStore((s) => s.clear);
  const addItem = useCartStore((s) => s.addItem);
  const toast = useToast();

  const handleAddProductToCart = (product: CompareProduct) => {
    const ref = product.article?.aR_Ref ?? product.base.arRef;
    const designation = product.article?.aR_Design ?? product.base.designation;
    const price = Number(product.article?.aR_PrixVen ?? product.base.price ?? 0);
    const stock = Number(product.article?.availableStock ?? product.base.availableStock ?? 0);

    if (stock <= 0) {
      toast.error("Indisponible", `${designation} est en rupture de stock`);
      return;
    }

    addItem({ arRef: ref, designation, unitPrice: price }, 1);
    toast.success("Ajouté au panier", designation);
  };

  const depotsQuery = useQuery({
    queryKey: ["compare-depots"],
    queryFn: () => getDepots(false),
    staleTime: 5 * 60_000,
  });

  const articleQueries = useQueries({
    queries: items.map((item) => ({
      queryKey: ["compare-article", item.arRef],
      queryFn: () => getArticleByRef(item.arRef),
      enabled: !!item.arRef,
      staleTime: 60_000,
    })),
  });

  const stockQueries = useQueries({
    queries: items.map((item) => ({
      queryKey: ["compare-stocks", item.arRef],
      queryFn: () => getStocksByArticle(item.arRef),
      enabled: !!item.arRef,
      staleTime: 60_000,
    })),
  });

  const products: CompareProduct[] = items.map((item, index) => ({
    base: item,
    article: articleQueries[index]?.data,
    availability: buildAvailabilitySummary(depotsQuery.data, stockQueries[index]?.data),
    loading: Boolean(
      articleQueries[index]?.isPending ||
        stockQueries[index]?.isPending ||
        depotsQuery.isPending
    ),
  }));

  const cheapestRef = useMemo(() => {
    if (products.length === 0) return null;

    let best: { ref: string; price: number } | null = null;

    for (const product of products) {
      const price = Number(product.article?.aR_PrixVen ?? product.base.price ?? 0);
      if (!best || price < best.price) {
        best = { ref: product.base.arRef, price };
      }
    }

    return best?.ref ?? null;
  }, [products]);

  const bestStockRef = useMemo(() => {
    if (products.length === 0) return null;

    let best: { ref: string; stock: number } | null = null;

    for (const product of products) {
      const stock = Number(
        product.article?.availableStock ?? product.base.availableStock ?? 0
      );
      if (!best || stock > best.stock) {
        best = { ref: product.base.arRef, stock };
      }
    }

    return best?.ref ?? null;
  }, [products]);

  const bestCoverageRef = useMemo(() => {
    if (products.length === 0) return null;

    let best: { ref: string; coverage: number } | null = null;

    for (const product of products) {
      const coverage = product.availability.inStockDepotCount;
      if (!best || coverage > best.coverage) {
        best = { ref: product.base.arRef, coverage };
      }
    }

    return best?.ref ?? null;
  }, [products]);

  const cheapestProduct =
    products.find((product) => product.base.arRef === cheapestRef) ?? null;

  const bestStockProduct =
    products.find((product) => product.base.arRef === bestStockRef) ?? null;

  const bestCoverageProduct =
    products.find((product) => product.base.arRef === bestCoverageRef) ?? null;

  if (items.length === 0) {
    return (
      <div className="compare-pro-page">
        <section className="compare-pro-hero">
          <div className="compare-pro-breadcrumb">
            <span>Accueil</span>
            <span>›</span>
            <span>Comparateur</span>
          </div>

          <div className="compare-pro-hero-content">
            <div className="compare-pro-kicker">Comparateur</div>
            <h1 className="compare-pro-title">
              Comparaison de <span>produits</span>
            </h1>
            <p className="compare-pro-description">
              Sélectionnez 2 à 4 articles pour comparer les prix, stocks,
              dépôts et disponibilités.
            </p>
          </div>

          <HeroIllustration />
        </section>

        <EmptyView
          title="Comparateur vide"
          description="Ajoutez entre 2 et 4 produits depuis le catalogue ou la fiche produit pour afficher une comparaison côte à côte."
          iconPath="M3 6h18 M6 6v14 M18 6v14 M3 20h18 M9 10h6 M9 14h6"
          action={
            <Link to="/articles">
              <Button
                type="button"
                className="h-12 rounded-2xl px-7 text-base font-bold shadow-lg shadow-primary/20"
              >
                Retour au catalogue
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const compareRows = [
    {
      key: "price",
      label: "Prix",
      tone: "price" as const,
      render: (product: CompareProduct) =>
        money(product.article?.aR_PrixVen ?? product.base.price),
      winnerRef: cheapestRef,
    },
    {
      key: "stock",
      label: "Stock disponible",
      tone: "stock" as const,
      render: (product: CompareProduct) =>
        String(
          Number(product.article?.availableStock ?? product.base.availableStock ?? 0)
        ),
      winnerRef: bestStockRef,
    },
    {
      key: "status",
      label: "Disponibilité",
      tone: "neutral" as const,
      render: (product: CompareProduct) => (
        <StockBadge
          status={product.article?.stockStatus ?? product.base.stockStatus}
          availableStock={
            product.article?.availableStock ?? product.base.availableStock
          }
        />
      ),
      winnerRef: null,
    },
    {
      key: "family",
      label: "Famille",
      tone: "neutral" as const,
      render: (product: CompareProduct) =>
        product.article?.fA_CodeFamille ?? product.base.family ?? "-",
      winnerRef: null,
    },
    {
      key: "barcode",
      label: "Code barre",
      tone: "neutral" as const,
      render: (product: CompareProduct) => product.article?.aR_CodeBarre || "-",
      winnerRef: null,
    },
    {
      key: "tracking",
      label: "Suivi stock",
      tone: "neutral" as const,
      render: (product: CompareProduct) =>
        Number(product.article?.aR_SuiviStock ?? 0) === 1 ? "Oui" : "Non",
      winnerRef: null,
    },
    {
      key: "coverage",
      label: "Dépôts en stock",
      tone: "coverage" as const,
      render: (product: CompareProduct) =>
        String(product.availability.inStockDepotCount),
      winnerRef: bestCoverageRef,
    },
    {
      key: "topDepot",
      label: "Meilleur dépôt",
      tone: "neutral" as const,
      render: (product: CompareProduct) =>
        product.availability.topDepotName
          ? `${product.availability.topDepotName} (${product.availability.topDepotQty})`
          : "Aucun dépôt disponible",
      winnerRef: null,
    },
    {
      key: "principalDepot",
      label: "Dépôt principal",
      tone: "neutral" as const,
      render: (product: CompareProduct) =>
        product.availability.principalDepotName
          ? `${product.availability.principalDepotName} (${product.availability.principalDepotQty ?? 0})`
          : "Non défini",
      winnerRef: null,
    },
  ] as const;

  return (
    <div className="compare-pro-page">
      <section className="compare-pro-hero">
        <div className="compare-pro-breadcrumb">
          <span>Accueil</span>
          <span>›</span>
          <span>Comparateur</span>
          <span>›</span>
          <span>Produits comparés</span>
        </div>

        <div className="compare-pro-hero-content">
          <div className="compare-pro-kicker">Comparateur</div>
          <h1 className="compare-pro-title">
            Comparaison de <span>produits</span>
          </h1>
          <p className="compare-pro-description">
            Comparez les critères clés des données d’e-commerce disponibles :
            image, référence, prix, famille, stock, disponibilité, couverture par
            dépôt et meilleur dépôt disponible.
          </p>

          <div className="compare-pro-actions">
            <Link to="/articles" className="compare-pro-secondary-action">
              Ajouter d’autres produits
            </Link>

            <button
              type="button"
              onClick={clear}
              className="compare-pro-ghost-action"
            >
              Vider le comparateur
            </button>
          </div>
        </div>

        <HeroIllustration />
      </section>

      <section className="compare-pro-metrics-grid">
        <MetricCard
          label="Produits comparés"
          value={String(products.length)}
          hint="Le comparateur accepte jusqu’à 4 produits."
          icon={<IconScale className="h-6 w-6" />}
          tone="violet"
        />

        <MetricCard
          label="Meilleur prix"
          value={
            cheapestProduct
              ? money(cheapestProduct.article?.aR_PrixVen ?? cheapestProduct.base.price)
              : "-"
          }
          hint={
            cheapestProduct
              ? `${cheapestProduct.article?.aR_Design ?? cheapestProduct.base.designation}`
              : "Aucun produit"
          }
          icon={<IconTag className="h-6 w-6" />}
          tone="blue"
        />

        <MetricCard
          label="Stock le plus élevé"
          value={
            bestStockProduct
              ? String(
                  Number(
                    bestStockProduct.article?.availableStock ??
                      bestStockProduct.base.availableStock ??
                      0
                  )
                )
              : "-"
          }
          hint={
            bestStockProduct
              ? `${bestStockProduct.article?.aR_Design ?? bestStockProduct.base.designation}`
              : "Aucun produit"
          }
          icon={<IconCube className="h-6 w-6" />}
          tone="green"
        />

        <MetricCard
          label="Couverture dépôt"
          value={
            bestCoverageProduct
              ? String(bestCoverageProduct.availability.inStockDepotCount)
              : "-"
          }
          hint={
            bestCoverageProduct
              ? `${bestCoverageProduct.article?.aR_Design ?? bestCoverageProduct.base.designation}`
              : "Aucun produit"
          }
          icon={<IconDepot className="h-6 w-6" />}
          tone="amber"
        />
      </section>

      {items.length < 2 ? (
        <section className="compare-pro-info-strip">
          <IconInfo className="h-5 w-5" />
          <span>
            Ajoutez au moins un second produit pour une comparaison plus utile.
          </span>
        </section>
      ) : null}

      <section className="compare-pro-info-strip">
        <IconInfo className="h-5 w-5" />
        <span>
          Les attributs numériques bruts sans libellé métier fiable, comme
          certains codes internes d’unité ou de type article, ne sont pas
          affichés pour éviter une comparaison trompeuse. Les informations
          visibles ci-dessous proviennent toutes des API réelles déjà exposées
          par le projet.
        </span>
      </section>

      <section className="compare-pro-table-shell hidden lg:block">
        <table className="compare-pro-table">
          <thead>
            <tr>
              <th className="compare-pro-criterion-head">Critère</th>

              {products.map((product) => {
                const current =
                  product.article ?? (product.base as unknown as Article);

                const imageUrl = resolveImageUrl(
                  product.article?.aR_Image ?? product.base.image ?? "",
                  env.apiBaseUrl
                );

                const isCheapest = cheapestRef === product.base.arRef;
                const isBestStock = bestStockRef === product.base.arRef;
                const isBestCoverage = bestCoverageRef === product.base.arRef;

                return (
                  <th
                    key={product.base.arRef}
                    className="compare-pro-product-head"
                  >
                    <div className="compare-pro-product-topline">
                      <div>
                        <div className="compare-pro-product-ref">
                          {product.article?.aR_Ref ?? product.base.arRef}
                        </div>

                        <div className="compare-pro-product-name">
                          {product.article?.aR_Design ?? product.base.designation}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="compare-pro-remove-btn"
                        onClick={() => removeItem(product.base.arRef)}
                      >
                        <IconTrash className="h-4 w-4" />
                        Retirer
                      </button>
                    </div>

                    <div className="compare-pro-badges-row">
                      {isCheapest ? (
                        <span className="compare-pro-badge compare-pro-badge-green">
                          Meilleur prix
                        </span>
                      ) : null}

                      {isBestStock ? (
                        <span className="compare-pro-badge compare-pro-badge-blue">
                          Meilleur stock
                        </span>
                      ) : null}

                      {isBestCoverage ? (
                        <span className="compare-pro-badge compare-pro-badge-violet">
                          Meilleure couverture dépôt
                        </span>
                      ) : null}
                    </div>

                    <div className="compare-pro-product-image-box">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={current.aR_Design ?? product.base.designation}
                          className="compare-pro-product-image"
                        />
                      ) : (
                        <div className="compare-pro-no-image">Aucune image</div>
                      )}
                    </div>

                    {product.loading ? (
                      <div className="compare-pro-loading-note">
                        Chargement des disponibilités dépôt...
                      </div>
                    ) : null}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {compareRows.map((row) => (
              <tr key={row.key}>
                <td className="compare-pro-criterion-cell">{row.label}</td>

                {products.map((product) => {
                  const isWinner = row.winnerRef === product.base.arRef;

                  return (
                    <td
                      key={`${product.base.arRef}-${row.key}`}
                      className={rowValueClass(isWinner, row.tone)}
                    >
                      <div className="compare-pro-value-line">
                        <span>{row.render(product)}</span>

                        {isWinner ? (
                          <span className="compare-pro-top-chip">Top</span>
                        ) : null}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}

            <tr>
              <td className="compare-pro-criterion-cell">Action</td>

              {products.map((product) => {
                const stock = Number(
                  product.article?.availableStock ??
                    product.base.availableStock ??
                    0
                );

                return (
                  <td
                    key={`${product.base.arRef}-action`}
                    className="compare-pro-action-cell"
                  >
                    <button
                      type="button"
                      className="compare-pro-cart-btn"
                      disabled={stock <= 0}
                      onClick={() => handleAddProductToCart(product)}
                    >
                      <IconCart className="h-4 w-4" />
                      {stock <= 0 ? "Rupture" : "Ajouter au panier"}
                    </button>

                    <Link
                      to={`/articles/${encodeURIComponent(product.base.arRef)}`}
                      className="compare-pro-file-btn"
                    >
                      <IconFile className="h-4 w-4" />
                      Voir la fiche
                    </Link>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </section>

      <div className="compare-pro-mobile-list lg:hidden">
        {products.map((product) => {
          const current = product.article ?? (product.base as unknown as Article);

          const imageUrl = resolveImageUrl(
            product.article?.aR_Image ?? product.base.image ?? "",
            env.apiBaseUrl
          );

          const isCheapest = cheapestRef === product.base.arRef;
          const isBestStock = bestStockRef === product.base.arRef;
          const isBestCoverage = bestCoverageRef === product.base.arRef;

          const stock = Number(
            product.article?.availableStock ?? product.base.availableStock ?? 0
          );

          return (
            <section key={product.base.arRef} className="compare-pro-mobile-card">
              <div className="compare-pro-product-topline">
                <div>
                  <div className="compare-pro-product-ref">
                    {product.article?.aR_Ref ?? product.base.arRef}
                  </div>

                  <h2 className="compare-pro-product-name">
                    {product.article?.aR_Design ?? product.base.designation}
                  </h2>
                </div>

                <button
                  type="button"
                  className="compare-pro-remove-btn"
                  onClick={() => removeItem(product.base.arRef)}
                >
                  <IconTrash className="h-4 w-4" />
                  Retirer
                </button>
              </div>

              <div className="compare-pro-badges-row">
                {isCheapest ? (
                  <span className="compare-pro-badge compare-pro-badge-green">
                    Meilleur prix
                  </span>
                ) : null}

                {isBestStock ? (
                  <span className="compare-pro-badge compare-pro-badge-blue">
                    Meilleur stock
                  </span>
                ) : null}

                {isBestCoverage ? (
                  <span className="compare-pro-badge compare-pro-badge-violet">
                    Meilleure couverture dépôt
                  </span>
                ) : null}
              </div>

              <div className="compare-pro-product-image-box">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={current.aR_Design ?? product.base.designation}
                    className="compare-pro-product-image"
                  />
                ) : (
                  <div className="compare-pro-no-image">Aucune image</div>
                )}
              </div>

              <div className="compare-pro-mobile-rows">
                {compareRows.map((row) => {
                  const isWinner = row.winnerRef === product.base.arRef;

                  return (
                    <div
                      key={`${product.base.arRef}-${row.key}`}
                      className="compare-pro-mobile-row"
                    >
                      <span>{row.label}</span>

                      <strong className={rowValueClass(isWinner, row.tone)}>
                        {row.render(product)}
                      </strong>
                    </div>
                  );
                })}
              </div>

              <div className="compare-pro-mobile-actions">
                <button
                  type="button"
                  className="compare-pro-cart-btn"
                  disabled={stock <= 0}
                  onClick={() => handleAddProductToCart(product)}
                >
                  <IconCart className="h-4 w-4" />
                  {stock <= 0 ? "Rupture" : "Ajouter au panier"}
                </button>

                <Link
                  to={`/articles/${encodeURIComponent(product.base.arRef)}`}
                  className="compare-pro-file-btn"
                >
                  <IconFile className="h-4 w-4" />
                  Voir la fiche
                </Link>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
import { Link } from "react-router-dom";
import { useMemo } from "react";
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
import {
  EmptyView,
  PremiumHero,
} from "../../../shared/components/premium";
import { useCartStore } from "../../cart/store/cartStore";
import { useToast } from "../../../shared/components/premium/Toast";

function money(v: number) {
  return `${Number(v ?? 0).toFixed(3)} TND`;
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

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[24px] border border-border/70 bg-muted/25 px-4 py-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-black tracking-tight text-card-foreground">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

function rowValueClass(isWinner: boolean) {
  return isWinner ? "font-bold text-emerald-700" : "text-card-foreground";
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
    loading: Boolean(articleQueries[index]?.isPending || stockQueries[index]?.isPending || depotsQuery.isPending),
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
      const stock = Number(product.article?.availableStock ?? product.base.availableStock ?? 0);
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

  const cheapestProduct = products.find((product) => product.base.arRef === cheapestRef) ?? null;
  const bestStockProduct = products.find((product) => product.base.arRef === bestStockRef) ?? null;
  const bestCoverageProduct = products.find((product) => product.base.arRef === bestCoverageRef) ?? null;

  if (items.length === 0) {
    return (
      <div className="w-full space-y-6">
        <PremiumHero
          kicker="Comparateur"
          title="Comparer les produits"gradientTitle
          description="Sélectionnez 2 à 4 articles pour les comparer côte à côte (prix, stock, dépôts disponibles, attributs)."
        />
        <EmptyView
          title="Comparateur vide"
          description="Ajoutez entre 2 et 4 produits depuis le catalogue ou la fiche produit pour afficher une comparaison côte à côte."
          iconPath="M3 6h18 M6 6v14 M18 6v14 M3 20h18 M9 10h6 M9 14h6"
          action={
            <Link to="/articles">
              <Button type="button" className="h-12 rounded-2xl px-7 text-base font-bold shadow-lg shadow-primary/20">
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
      render: (product: CompareProduct) => money(product.article?.aR_PrixVen ?? product.base.price),
      winnerRef: cheapestRef,
    },
    {
      key: "stock",
      label: "Stock disponible",
      render: (product: CompareProduct) => String(Number(product.article?.availableStock ?? product.base.availableStock ?? 0)),
      winnerRef: bestStockRef,
    },
    {
      key: "status",
      label: "Disponibilité",
      render: (product: CompareProduct) => (
        <StockBadge
          status={product.article?.stockStatus ?? product.base.stockStatus}
          availableStock={product.article?.availableStock ?? product.base.availableStock}
        />
      ),
      winnerRef: null,
    },
    {
      key: "family",
      label: "Famille",
      render: (product: CompareProduct) => product.article?.fA_CodeFamille ?? product.base.family ?? "-",
      winnerRef: null,
    },
    {
      key: "barcode",
      label: "Code barre",
      render: (product: CompareProduct) => product.article?.aR_CodeBarre || "-",
      winnerRef: null,
    },
    {
      key: "tracking",
      label: "Suivi stock",
      render: (product: CompareProduct) => (Number(product.article?.aR_SuiviStock ?? 0) === 1 ? "Oui" : "Non"),
      winnerRef: null,
    },
    {
      key: "coverage",
      label: "Dépôts en stock",
      render: (product: CompareProduct) => String(product.availability.inStockDepotCount),
      winnerRef: bestCoverageRef,
    },
    {
      key: "topDepot",
      label: "Meilleur dépôt",
      render: (product: CompareProduct) =>
        product.availability.topDepotName
          ? `${product.availability.topDepotName} (${product.availability.topDepotQty})`
          : "Aucun dépôt disponible",
      winnerRef: null,
    },
    {
      key: "principalDepot",
      label: "Dépôt principal",
      render: (product: CompareProduct) =>
        product.availability.principalDepotName
          ? `${product.availability.principalDepotName} (${product.availability.principalDepotQty ?? 0})`
          : "Non défini",
      winnerRef: null,
    },
  ] as const;

  return (
    <div className="w-full space-y-6 pb-10">
      <PremiumHero
        kicker="Comparateur"
        title="Comparer les produits"gradientTitle
        description="Comparaison enrichie à partir des données réellement disponibles : image, référence, prix, famille, stock, disponibilité, couverture par dépôt et meilleur dépôt disponible."
        actions={
          <>
            <Link to="/articles">
              <Button type="button" variant="outline">
                Ajouter d’autres produits
              </Button>
            </Link>
            <Button type="button" variant="ghost" onClick={clear} className="text-white hover:bg-white/10">
              Vider le comparateur
            </Button>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Produits comparés"
          value={String(products.length)}
          hint="Le comparateur accepte jusqu’à 4 produits."
        />
        <MetricCard
          label="Meilleur prix"
          value={cheapestProduct ? money(cheapestProduct.article?.aR_PrixVen ?? cheapestProduct.base.price) : "-"}
          hint={cheapestProduct ? `${cheapestProduct.article?.aR_Design ?? cheapestProduct.base.designation}` : "Aucun produit"}
        />
        <MetricCard
          label="Stock le plus élevé"
          value={bestStockProduct ? String(Number(bestStockProduct.article?.availableStock ?? bestStockProduct.base.availableStock ?? 0)) : "-"}
          hint={bestStockProduct ? `${bestStockProduct.article?.aR_Design ?? bestStockProduct.base.designation}` : "Aucun produit"}
        />
        <MetricCard
          label="Couverture dépôt"
          value={bestCoverageProduct ? String(bestCoverageProduct.availability.inStockDepotCount) : "-"}
          hint={bestCoverageProduct ? `${bestCoverageProduct.article?.aR_Design ?? bestCoverageProduct.base.designation}` : "Aucun produit"}
        />
      </section>

      {items.length < 2 ? (
        <section className="app-surface px-6 py-5 text-sm text-muted-foreground">
          Ajoutez au moins un second produit pour une comparaison plus utile.
        </section>
      ) : null}

      <section className="rounded-[28px] border border-border/70 bg-muted/20 px-5 py-5 text-sm text-muted-foreground shadow-sm">
        Les attributs numériques bruts sans libellé métier fiable, comme certains codes internes d’unité ou de type article,
        ne sont pas affichés pour éviter une comparaison trompeuse. Les informations visibles ci-dessous proviennent toutes
        des API réelles déjà exposées par le projet.
      </section>

      <section className="hidden overflow-x-auto rounded-3xl border border-border bg-card shadow-sm lg:block">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-card/70">
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Critère</th>
              {products.map((product) => {
                const current = product.article ?? (product.base as unknown as Article);
                const imageUrl = resolveImageUrl(product.article?.aR_Image ?? product.base.image ?? "", env.apiBaseUrl);
                const isCheapest = cheapestRef === product.base.arRef;
                const isBestStock = bestStockRef === product.base.arRef;
                const isBestCoverage = bestCoverageRef === product.base.arRef;

                return (
                  <th key={product.base.arRef} className="min-w-[260px] px-5 py-4 text-left align-top">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {current.aR_Ref ?? product.base.arRef}
                          </div>
                          <div className="mt-1 text-base font-extrabold text-card-foreground">
                            {current.aR_Design ?? product.base.designation}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="text-sm font-semibold text-rose-600"
                          onClick={() => removeItem(product.base.arRef)}
                        >
                          Retirer
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {isCheapest ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                            Meilleur prix
                          </span>
                        ) : null}
                        {isBestStock ? (
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-100">
                            Meilleur stock
                          </span>
                        ) : null}
                        {isBestCoverage ? (
                          <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-100">
                            Meilleure couverture dépôt
                          </span>
                        ) : null}
                      </div>

                      <div className="h-40 overflow-hidden rounded-[24px] border border-border bg-card p-4">
                        {imageUrl ? (
                          <img src={imageUrl} alt={current.aR_Design ?? product.base.designation} className="h-full w-full object-contain" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Aucune image</div>
                        )}
                      </div>

                      {product.loading ? (
                        <div className="text-xs font-semibold text-muted-foreground">Chargement des disponibilités dépôt...</div>
                      ) : null}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {compareRows.map((row) => (
              <tr key={row.key} className="border-b border-border last:border-b-0">
                <td className="px-5 py-4 font-semibold text-card-foreground">{row.label}</td>
                {products.map((product) => {
                  const isWinner = row.winnerRef === product.base.arRef;
                  return (
                    <td key={`${product.base.arRef}-${row.key}`} className={`px-5 py-4 ${rowValueClass(isWinner)}`}>
                      <div className="flex items-center gap-2">
                        <span>{row.render(product)}</span>
                        {isWinner ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100">
                            Top
                          </span>
                        ) : null}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <td className="px-5 py-4 font-semibold text-card-foreground">Action</td>
              {products.map((product) => {
                const stock = Number(product.article?.availableStock ?? product.base.availableStock ?? 0);
                return (
                  <td key={`${product.base.arRef}-action`} className="px-5 py-4 space-y-2">
                    <Button
                      type="button"
                      variant="primary"
                      className="w-full"
                      disabled={stock <= 0}
                      onClick={() => handleAddProductToCart(product)}
                    >
                      {stock <= 0 ? "Rupture" : "Ajouter au panier"}
                    </Button>
                    <Link to={`/articles/${encodeURIComponent(product.base.arRef)}`}>
                      <Button type="button" variant="outline" className="w-full">
                        Voir la fiche
                      </Button>
                    </Link>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </section>

      <div className="grid gap-4 lg:hidden">
        {products.map((product) => {
          const current = product.article ?? (product.base as unknown as Article);
          const imageUrl = resolveImageUrl(product.article?.aR_Image ?? product.base.image ?? "", env.apiBaseUrl);
          const isCheapest = cheapestRef === product.base.arRef;
          const isBestStock = bestStockRef === product.base.arRef;
          const isBestCoverage = bestCoverageRef === product.base.arRef;

          return (
            <section key={product.base.arRef} className="app-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="app-kicker">{current.aR_Ref ?? product.base.arRef}</div>
                  <h2 className="text-xl font-extrabold text-card-foreground">{current.aR_Design ?? product.base.designation}</h2>
                </div>
                <button type="button" className="text-sm font-semibold text-rose-600" onClick={() => removeItem(product.base.arRef)}>
                  Retirer
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {isCheapest ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                    Meilleur prix
                  </span>
                ) : null}
                {isBestStock ? (
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-100">
                    Meilleur stock
                  </span>
                ) : null}
                {isBestCoverage ? (
                  <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-100">
                    Meilleure couverture dépôt
                  </span>
                ) : null}
              </div>

              <div className="mt-4 h-48 overflow-hidden rounded-[24px] border border-border bg-card p-4">
                {imageUrl ? (
                  <img src={imageUrl} alt={current.aR_Design ?? product.base.designation} className="h-full w-full object-contain" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Aucune image</div>
                )}
              </div>

              <div className="mt-4 grid gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Prix</span>
                  <span className={`font-semibold ${isCheapest ? "text-emerald-700" : "text-card-foreground"}`}>
                    {money(current.aR_PrixVen ?? product.base.price)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Stock</span>
                  <span className={`font-semibold ${isBestStock ? "text-blue-700" : "text-card-foreground"}`}>
                    {Number(current.availableStock ?? product.base.availableStock ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Disponibilité</span>
                  <StockBadge status={current.stockStatus ?? product.base.stockStatus} availableStock={current.availableStock ?? product.base.availableStock} compact />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Famille</span>
                  <span className="font-semibold text-card-foreground">{current.fA_CodeFamille ?? product.base.family ?? "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Code barre</span>
                  <span className="font-semibold text-card-foreground">{current.aR_CodeBarre || "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Suivi stock</span>
                  <span className="font-semibold text-card-foreground">{Number(current.aR_SuiviStock ?? 0) === 1 ? "Oui" : "Non"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Dépôts en stock</span>
                  <span className={`font-semibold ${isBestCoverage ? "text-violet-700" : "text-card-foreground"}`}>
                    {product.availability.inStockDepotCount}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-muted-foreground">Meilleur dépôt</span>
                  <span className="text-right font-semibold text-card-foreground">
                    {product.availability.topDepotName
                      ? `${product.availability.topDepotName} (${product.availability.topDepotQty})`
                      : "Aucun dépôt disponible"}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-muted-foreground">Dépôt principal</span>
                  <span className="text-right font-semibold text-card-foreground">
                    {product.availability.principalDepotName
                      ? `${product.availability.principalDepotName} (${product.availability.principalDepotQty ?? 0})`
                      : "Non défini"}
                  </span>
                </div>
              </div>

              {product.loading ? (
                <div className="mt-4 text-xs font-semibold text-muted-foreground">Chargement des disponibilités dépôt...</div>
              ) : null}

              <div className="mt-4 grid gap-2">
                <Button
                  type="button"
                  variant="primary"
                  className="w-full"
                  disabled={Number(current.availableStock ?? product.base.availableStock ?? 0) <= 0}
                  onClick={() => handleAddProductToCart(product)}
                >
                  {Number(current.availableStock ?? product.base.availableStock ?? 0) <= 0 ? "Rupture" : "Ajouter au panier"}
                </Button>
                <Link to={`/articles/${encodeURIComponent(product.base.arRef)}`}>
                  <Button type="button" variant="outline" className="w-full">
                    Voir la fiche
                  </Button>
                </Link>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
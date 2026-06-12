import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { getArticles } from "../../catalog/api/articlesApi";
import { getMainImagesMap } from "../../catalog/api/articleImagesApi";
import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { env } from "../../../core/config/env";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";
import { resolveImageUrl } from "../../../shared/utils/image";
import { StockBadge } from "../../catalog/components/StockBadge";
import {
  PremiumHero,
} from "../../../shared/components/premium";

const apiBaseUrl = (env.apiBaseUrl && env.apiBaseUrl.trim().replace(/\/+$/, "")) || "http://localhost:5123";

function buildPageNumbers(currentPage: number, totalPages: number): Array<number | "..."> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages: Array<number | "..."> = [1];
  if (currentPage > 3) pages.push("...");
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  for (let p = start; p <= end; p++) pages.push(p);
  if (currentPage < totalPages - 2) pages.push("...");
  pages.push(totalPages);
  return pages;
}

export function AdminArticlesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const take = 20;
  const skip = (page - 1) * take;
  const normalizedSearch = search.trim();

  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-articles-page", skip, take, normalizedSearch],
    queryFn: () =>
      getArticles({
        take,
        skip,
        search: normalizedSearch || undefined,
        publishedOnly: false,
        includeSleeping: true,
      }),
  });

  const { data: summaryData } = useQuery({
    queryKey: ["admin-articles-summary", normalizedSearch],
    queryFn: () =>
      getArticles({
        take: 2000,
        skip: 0,
        search: normalizedSearch || undefined,
        publishedOnly: false,
        includeSleeping: true,
      }),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / take));
  const articleRefs = useMemo(() => items.map((article) => article.aR_Ref.trim()).filter(Boolean), [items]);

  const { data: mainImagesMap } = useQuery({
    queryKey: ["admin-articles-main-images", articleRefs],
    queryFn: () => getMainImagesMap(articleRefs),
    enabled: articleRefs.length > 0,
    staleTime: 60_000,
  });

  const pageNumbers = useMemo(() => buildPageNumbers(page, totalPages), [page, totalPages]);
  const summaryBase = summaryData?.items ?? items;
  const summary = useMemo(
    () => ({
      total: summaryData?.total ?? summaryBase.length,
      outOfStock: summaryBase.filter((article) => article.stockStatus === "OUT_OF_STOCK").length,
      lowStock: summaryBase.filter((article) => article.stockStatus === "LOW_STOCK").length,
      inStock: summaryBase.filter((article) => article.stockStatus === "IN_STOCK").length,
    }),
    [summaryBase, summaryData?.total]
  );

  const goToPage = (targetPage: number) => {
    const safePage = Math.max(1, Math.min(targetPage, totalPages));
    setPage(safePage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="container-app space-y-6 py-8">
      <PremiumHero
        kicker="Administration"
        title="Gestion des articles"gradientTitle
        description="Pilotage des images et visibilité immédiate des ruptures et stocks faibles."
        actions={
          <Button type="button" variant="outline" onClick={() => refetch()} className="px-5">
            {isFetching ? "Actualisation..." : "Actualiser"}
          </Button>
        }
      />

      <section className="app-surface px-6 py-6 md:px-7 md:py-7">
        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Rechercher par référence ou désignation..." className="sm:min-w-[320px]" />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-border bg-card/70 p-4"><div className="text-sm text-muted-foreground">Articles filtrés</div><div className="mt-1 text-2xl font-black text-card-foreground">{summary.total}</div></div>
          <div className="rounded-3xl border border-border bg-card/70 p-4"><div className="text-sm text-muted-foreground">En stock</div><div className="mt-1 text-2xl font-black text-success">{summary.inStock}</div></div>
          <div className="rounded-3xl border border-border bg-card/70 p-4"><div className="text-sm text-muted-foreground">Stock faible</div><div className="mt-1 text-2xl font-black text-warning">{summary.lowStock}</div></div>
          <div className="rounded-3xl border border-border bg-card/70 p-4"><div className="text-sm text-muted-foreground">Ruptures</div><div className="mt-1 text-2xl font-black text-danger">{summary.outOfStock}</div></div>
        </div>
      </section>

      <section className="table-shell">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-5 py-4">Image</th>
                <th className="px-5 py-4">Référence</th>
                <th className="px-5 py-4">Désignation</th>
                <th className="px-5 py-4">Famille</th>
                <th className="px-5 py-4">Prix</th>
                <th className="px-5 py-4">Stock</th>
                <th className="px-5 py-4">Action</th>
              </tr>
            </thead>

            <tbody>
              {isPending ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">Chargement des articles...</td></tr>
              ) : isError ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center"><div className="text-sm font-semibold text-rose-700">Erreur lors du chargement des articles.</div><div className="mt-2 text-xs text-muted-foreground">{getApiErrorMessage(error)}</div><div className="mt-1 text-xs text-muted-foreground">API utilisée : {apiBaseUrl}/api/articles</div></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">Aucun article trouvé.</td></tr>
              ) : (
                items.map((article) => {
                  const articleRef = article.aR_Ref.trim();
                  const rawImage = mainImagesMap?.[articleRef] ?? article.aR_Image ?? null;
                  const imageUrl = resolveImageUrl(rawImage, apiBaseUrl);
                  return (
                    <tr key={articleRef} className="table-row">
                      <td className="px-5 py-4"><div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[20px] border border-border/70 bg-card shadow-sm">{imageUrl ? <img src={imageUrl} alt={article.aR_Design || articleRef} className="h-full w-full object-cover" loading="lazy" /> : <span className="text-xs font-medium text-muted-foreground">Aucune</span>}</div></td>
                      <td className="px-5 py-4 font-bold text-card-foreground">{articleRef}</td>
                      <td className="px-5 py-4 text-card-foreground">{article.aR_Design || "-"}</td>
                      <td className="px-5 py-4 text-muted-foreground">{article.fA_CodeFamille || "-"}</td>
                      <td className="px-5 py-4 text-muted-foreground">{typeof article.aR_PrixVen === "number" ? `${article.aR_PrixVen.toFixed(3)} TND` : "-"}</td>
                      <td className="px-5 py-4"><div className="space-y-2"><StockBadge status={article.stockStatus} availableStock={article.availableStock} compact /><div className="text-xs text-muted-foreground">Disponible: {Number(article.availableStock ?? 0)}</div></div></td>
                      <td className="px-5 py-4"><Link to={`/admin/articles/${encodeURIComponent(articleRef)}/images`} className="inline-flex h-11 items-center rounded-2xl border border-primary/20 bg-primary px-4 text-sm font-semibold text-white shadow-[0_18px_40px_-24px_hsl(var(--primary)/0.8)] transition hover:-translate-y-0.5 hover:brightness-110">Gérer images</Link></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="app-surface px-5 py-4 md:px-6">
        <div className="flex flex-col items-center justify-between gap-4 lg:flex-row">
          <div className="text-sm text-muted-foreground">Page <span className="font-semibold text-card-foreground">{page}</span> / {totalPages} • <span className="font-semibold text-card-foreground">{total}</span> articles</div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button type="button" variant="outline" disabled={page <= 1} onClick={() => goToPage(page - 1)}>Précédent</Button>
            {pageNumbers.map((pageItem, index) => pageItem === "..." ? <span key={`dots-${index}`} className="inline-flex h-11 min-w-[44px] items-center justify-center px-2 text-sm font-semibold text-muted-foreground">...</span> : <button key={pageItem} type="button" onClick={() => goToPage(pageItem)} className={`inline-flex h-11 min-w-[44px] items-center justify-center rounded-2xl px-3 text-sm font-semibold transition ${pageItem === page ? "border border-primary/20 bg-primary text-white shadow-[0_18px_40px_-24px_hsl(var(--primary)/0.8)]" : "border border-border bg-[hsl(var(--input))] text-card-foreground shadow-sm hover:-translate-y-0.5 hover:bg-card"}`}>{pageItem}</button>)}
            <Button type="button" variant="outline" disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>Suivant</Button>
          </div>
        </div>
      </section>
    </div>
  );
}

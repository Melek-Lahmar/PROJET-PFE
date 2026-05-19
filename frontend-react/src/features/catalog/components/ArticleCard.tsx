import { Link } from "react-router-dom";

import type { Article } from "../types/article";
import { SmartImage } from "../../../shared/components/SmartImage";
import { StockBadge } from "./StockBadge";
import { CompareToggleButton } from "../../compare/components/CompareToggleButton";
import { useCartStore } from "../../cart/store/cartStore";
import { useToast } from "../../../shared/components/premium/Toast";

type Props = {
  article: Article;
  imgSrc?: string | null;
  detailsHref: string;
  formatTnd: (v: number | null | undefined) => string;
};

export function ArticleCard({ article, imgSrc, detailsHref, formatTnd }: Props) {
  const addItem = useCartStore((s) => s.addItem);
  const toast = useToast();

  const isOutOfStock = article.stockStatus === "OUT_OF_STOCK" || Number(article.availableStock ?? 0) <= 0;
  const unitPrice = Number(article.aR_PrixVen ?? 0);

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addItem({
      arRef: article.aR_Ref,
      designation: article.aR_Design,
      unitPrice,
    }, 1);
    toast.success("Ajouté au panier", article.aR_Design);
  };

  const detailsState = {
    prefetchedArticle: article,
    prefetchedImage: imgSrc ?? article.aR_Image ?? null,
  };

  return (
    <div className="app-surface group flex h-full flex-col overflow-hidden p-0 transition hover:-translate-y-1 hover:shadow-[0_34px_80px_-44px_rgba(15,23,42,0.55)]">
      <Link to={detailsHref} state={detailsState} className="relative block w-full">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.10),_transparent_62%)]" />
        <div className="relative p-4">
          <div className="aspect-[4/3] w-full overflow-hidden rounded-[24px] border border-border/70 bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <div className="flex h-full w-full items-center justify-center p-4">
              <SmartImage
                src={imgSrc ?? ""}
                alt={article.aR_Design}
                fit="contain"
                className="h-full w-full"
                placeholderClassName="flex h-full w-full items-center justify-center rounded-[22px] bg-card text-muted-foreground/60"
              />
            </div>
          </div>
        </div>

        <div className="absolute left-4 top-4">
          <StockBadge status={article.stockStatus} availableStock={article.availableStock} compact />
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-3 px-5 pb-5">
        <Link to={detailsHref} state={detailsState} className="space-y-1">
          <div className="app-kicker">Réf. {article.aR_Ref ?? ""}</div>
          <div className="line-clamp-2 min-h-[2.8rem] text-base font-bold text-card-foreground transition-colors group-hover:text-primary">
            {article.aR_Design || "Produit"}
          </div>
        </Link>

        <div className="mt-auto flex items-end justify-between border-t border-border/60 pt-4">
          <div>
            <div className="text-xs font-medium text-muted-foreground">Prix</div>
            <div className="text-2xl font-black tracking-tight text-card-foreground">
              {formatTnd(article.aR_PrixVen)} <span className="text-xs font-semibold text-muted-foreground">TND</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          aria-label={isOutOfStock ? `Rupture de stock pour ${article.aR_Design}` : `Ajouter ${article.aR_Design} au panier`}
          title={isOutOfStock ? "Produit en rupture de stock" : "Ajouter au panier"}
          className={[
            "inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold shadow-md transition",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            isOutOfStock
              ? "cursor-not-allowed bg-muted text-muted-foreground opacity-70"
              : "bg-primary text-primary-foreground hover:-translate-y-0.5 hover:shadow-lg active:scale-95",
          ].join(" ")}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1" />
            <circle cx="19" cy="21" r="1" />
            <path d="M2 3h2l2.7 12.4a2 2 0 0 0 2 1.6h9.5a2 2 0 0 0 2-1.5L21 8H6" />
          </svg>
          <span>{isOutOfStock ? "Rupture de stock" : "Ajouter au panier"}</span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <CompareToggleButton article={article} image={imgSrc} className="w-full" />
          <Link
            to={detailsHref}
            state={detailsState}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-[hsl(var(--input))] px-4 text-sm font-semibold text-card-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-primary/20 hover:bg-card"
          >
            Détails
          </Link>
        </div>
      </div>
    </div>
  );
}
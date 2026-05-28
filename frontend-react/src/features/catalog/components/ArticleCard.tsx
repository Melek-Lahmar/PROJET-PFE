import { Link } from "react-router-dom";

import type { Article } from "../types/article";
import { SmartImage } from "../../../shared/components/SmartImage";
import { StockBadge } from "./StockBadge";
import { useCartStore } from "../../cart/store/cartStore";
import { useToast } from "../../../shared/components/premium/Toast";
import { FavoriteToggleButton } from "../../favorites/components/FavoriteToggleButton";

type Props = {
  article: Article;
  imgSrc?: string | null;
  detailsHref: string;
  formatTnd: (v: number | null | undefined) => string;
};

function IconCart(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="9" cy="21" r="1.2" />
      <circle cx="19" cy="21" r="1.2" />
      <path d="M2.5 3h2l2.7 12.4a2 2 0 0 0 2 1.6h9.3a2 2 0 0 0 2-1.5L21.5 8H6" />
    </svg>
  );
}

function IconFile(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.15"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </svg>
  );
}

export function ArticleCard({
  article,
  imgSrc,
  detailsHref,
  formatTnd,
}: Props) {
  const addItem = useCartStore((s) => s.addItem);
  const toast = useToast();

  const isOutOfStock =
    article.stockStatus === "OUT_OF_STOCK" ||
    Number(article.availableStock ?? 0) <= 0;

  const unitPrice = Number(article.aR_PrixVen ?? 0);

  const detailsState = {
    prefetchedArticle: article,
    prefetchedImage: imgSrc ?? article.aR_Image ?? null,
  };

  const handleAddToCart = () => {
    if (isOutOfStock) return;

    addItem(
      {
        arRef: article.aR_Ref,
        designation: article.aR_Design,
        unitPrice,
      },
      1
    );

    toast.success("Ajouté au panier", article.aR_Design);
  };

  return (
    <article className="catalog-product-card-v2 group">
      <Link to={detailsHref} state={detailsState} className="block">
        <div className="catalog-product-image-area-v2">
          <div className="catalog-product-stock-v2">
            <StockBadge
              status={article.stockStatus}
              availableStock={article.availableStock}
              compact
            />
          </div>

          <div className="catalog-product-image-inner-v2">
            <SmartImage
              src={imgSrc ?? ""}
              alt={article.aR_Design || "Produit"}
              fit="contain"
              className="catalog-product-image-v2"
              placeholderClassName="flex h-full w-full items-center justify-center rounded-[22px] bg-slate-50 text-slate-400 dark:bg-slate-900 dark:text-slate-500"
            />
          </div>
        </div>
      </Link>

      <div className="catalog-product-body-v2">
        <Link to={detailsHref} state={detailsState} className="block">
          <h3 className="catalog-product-title-v2 line-clamp-2">
            {article.aR_Design || "Produit"}
          </h3>

          <p className="catalog-product-ref-v2">
            Réf. {article.aR_Ref || "—"}
          </p>
        </Link>

        <div className="catalog-product-divider-v2" />

        <div className="catalog-product-price-block-v2">
          <div className="catalog-product-price-label-v2">Prix</div>

          <div className="catalog-product-price-value-v2">
            {formatTnd(article.aR_PrixVen)}
            <span className="catalog-product-price-currency-v2">TND</span>
          </div>
        </div>

        <div className="catalog-product-actions-v2">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            aria-label={
              isOutOfStock
                ? `Rupture de stock pour ${article.aR_Design}`
                : `Ajouter ${article.aR_Design} au panier`
            }
            title={
              isOutOfStock
                ? "Produit en rupture de stock"
                : "Ajouter au panier"
            }
            className="catalog-product-cart-btn-v2"
          >
            <IconCart className="h-5 w-5" />
            <span>{isOutOfStock ? "Rupture" : "Ajouter au panier"}</span>
          </button>

          <FavoriteToggleButton arRef={article.aR_Ref} designation={article.aR_Design} mode="card" />
        </div>

        <Link
          to={detailsHref}
          state={detailsState}
          className="catalog-product-details-link-v2"
        >
          <IconFile className="h-5 w-5" />
          <span>Voir la fiche</span>
        </Link>
      </div>
    </article>
  );
}

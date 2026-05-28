import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";
import { env } from "../../../core/config/env";
import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { SmartImage } from "../../../shared/components/SmartImage";
import { EmptyView, Skeleton } from "../../../shared/components/premium";
import { useToast } from "../../../shared/components/premium/Toast";
import { resolveImageUrl } from "../../../shared/utils/image";
import { useCartStore } from "../../cart/store/cartStore";
import { StockBadge } from "../../catalog/components/StockBadge";
import { canAddToCart } from "../../catalog/utils/stock";
import { getFavorites, removeFavorite } from "../api/favoritesApi";
import type { FavoriteArticleDto } from "../types/favorite";

function formatTnd(value: number | null | undefined) {
  return Number(value ?? 0).toFixed(3);
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("fr-TN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function IconHeart(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z" />
    </svg>
  );
}

function FavoriteCard({ item }: { item: FavoriteArticleDto }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const addItem = useCartStore((s) => s.addItem);

  const removeMutation = useMutation({
    mutationFn: () => removeFavorite(item.arRef),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({ queryKey: ["favorites-count"] });
      queryClient.invalidateQueries({ queryKey: ["favorite-exists", item.arRef] });
      toast.success(data.message);
    },
    onError: (error) => toast.error("Suppression impossible", getApiErrorMessage(error)),
  });

  const canOrder = canAddToCart(item.stockStatus);
  const image = resolveImageUrl(item.image, env.apiBaseUrl);

  const addToCart = () => {
    if (!canOrder) return;
    addItem(
      {
        arRef: item.arRef,
        designation: item.designation,
        unitPrice: Number(item.price ?? 0),
      },
      1
    );
    toast.success("Ajouté au panier", item.designation);
  };

  return (
    <article className="favorites-card">
      <Link to={`/articles/${encodeURIComponent(item.arRef)}`} className="favorites-card-image">
        <SmartImage
          src={image}
          alt={item.designation}
          fit="contain"
          className="h-full w-full"
          placeholderClassName="flex h-full w-full items-center justify-center bg-slate-50 text-slate-400 dark:bg-slate-900 dark:text-slate-500"
        />
      </Link>

      <div className="favorites-card-body">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="app-kicker">Réf. {item.arRef}</div>
            <h2 className="mt-2 line-clamp-2 text-lg font-black text-card-foreground">
              {item.designation}
            </h2>
            {item.family ? (
              <p className="mt-1 truncate text-sm font-semibold text-muted-foreground">{item.family}</p>
            ) : null}
          </div>
          <StockBadge status={item.stockStatus} availableStock={item.availableStock} compact />
        </div>

        <div className="mt-5 flex items-end justify-between gap-3 border-t border-border/70 pt-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Prix</div>
            <div className="mt-1 text-2xl font-black text-card-foreground">
              {formatTnd(item.price)} <span className="text-xs text-muted-foreground">TND</span>
            </div>
          </div>
          <div className="text-right text-xs font-semibold text-muted-foreground">
            Ajouté le<br />
            <span className="text-card-foreground">{formatDate(item.addedAt)}</span>
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="primary" onClick={addToCart} disabled={!canOrder}>
            Ajouter au panier
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => removeMutation.mutate()}
            isLoading={removeMutation.isPending}
          >
            Retirer
          </Button>
        </div>

        <Link to={`/articles/${encodeURIComponent(item.arRef)}`} className="favorites-details-link">
          Détails
        </Link>
      </div>
    </article>
  );
}

export function FavoritesPage() {
  const navigate = useNavigate();

  const favoritesQuery = useQuery({
    queryKey: ["favorites"],
    queryFn: getFavorites,
    retry: 1,
  });

  const items = favoritesQuery.data ?? [];

  if (favoritesQuery.isPending) {
    return (
      <div className="favorites-page">
        <Skeleton width={220} height={44} rounded="lg" />
        <div className="favorites-grid">
          {[...Array(6)].map((_, index) => (
            <Card key={index} noPadding className="overflow-hidden">
              <Skeleton height={220} rounded="sm" />
              <div className="space-y-3 p-5">
                <Skeleton width={120} height={12} rounded="full" />
                <Skeleton width="80%" height={18} rounded="full" />
                <Skeleton height={44} rounded="lg" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (favoritesQuery.isError) {
    return (
      <div className="favorites-page">
        <Card className="border-rose-200 bg-rose-50 dark:border-rose-400/20 dark:bg-rose-400/10">
          <div className="text-sm font-bold text-rose-700 dark:text-rose-200">Impossible de charger vos favoris.</div>
          <div className="mt-1 text-sm text-rose-700/80 dark:text-rose-200/80">
            {getApiErrorMessage(favoritesQuery.error)}
          </div>
          <Button type="button" variant="outline" onClick={() => favoritesQuery.refetch()} className="mt-4">
            Réessayer
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="favorites-page">
      <section className="favorites-hero">
        <div>
          <div className="app-kicker">Espace client</div>
          <h1 className="favorites-title">Mes favoris</h1>
          <p className="favorites-subtitle">
            Retrouvez les articles que vous suivez et ajoutez-les au panier quand ils sont disponibles.
          </p>
        </div>
        <div className="favorites-count-pill">
          <IconHeart className="h-5 w-5" />
          {items.length} favori{items.length > 1 ? "s" : ""}
        </div>
      </section>

      {items.length === 0 ? (
        <EmptyView
          title="Aucun favori pour le moment"
          description="Ajoutez vos articles préférés depuis le catalogue pour les retrouver ici après reconnexion."
          iconPath="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"
          action={
            <Button type="button" variant="primary" onClick={() => navigate("/articles")}>
              Découvrir le catalogue
            </Button>
          }
        />
      ) : (
        <div className="favorites-grid">
          {items.map((item) => (
            <FavoriteCard key={item.arRef} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

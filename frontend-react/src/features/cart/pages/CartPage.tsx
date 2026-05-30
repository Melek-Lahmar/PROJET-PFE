import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";

import { useCartStore } from "../store/cartStore";
import { useAuthStore } from "../../auth/store/authStore";
import { me } from "../../auth/api/authApi";
import { Button } from "../../../shared/components/Button";
import { SmartImage } from "../../../shared/components/SmartImage";
import { resolveImageUrl } from "../../../shared/utils/image";
import { env } from "../../../core/config/env";
import { getMainImagesMap, type MainImagesMap } from "../../catalog/api/articleImagesApi";
import { CheckoutChoiceModal } from "../../checkout/components/CheckoutChoiceModal";
import { createQuote } from "../../b2bQuotes/api/b2bQuotesApi";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";
import { useToast } from "../../../shared/components/premium/Toast";
import {
  EmptyView,
  PremiumHero,
  StaggeredColumn,
} from "../../../shared/components/premium";

export function CartPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const items = useCartStore((s) => s.items);
  const deliveryMode = useCartStore((s) => s.deliveryMode);

  const setDeliveryMode = useCartStore((s) => s.setDeliveryMode);
  const setQty = useCartStore((s) => s.setQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const clear = useCartStore((s) => s.clear);

  const subtotal = useCartStore((s) => s.subtotal());
  const shipping = useCartStore((s) => s.shipping());
  const stamp = useCartStore((s) => s.stamp());
  const total = useCartStore((s) => s.total());

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const userId = useAuthStore((s) => s.userId);
  const profile = useAuthStore((s) => s.profile);
  const roles = useAuthStore((s) => (Array.isArray(s.roles) ? s.roles : []));
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => me(),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
  const effectiveProfile = profile ?? meQuery.data?.profile ?? null;
  const isClientB2B =
    isAuthenticated &&
    roles.map((role) => role.toUpperCase()).includes("CLIENT") &&
    effectiveProfile?.typeClient === 1;

  const formatTnd = (v: number) => v.toFixed(3);
  const arRefs = items.map((x) => x.arRef).filter(Boolean);

  const { data: mainImagesMap } = useQuery<MainImagesMap>({
    queryKey: ["cart-main-images", arRefs],
    queryFn: () => getMainImagesMap(arRefs),
    enabled: arRefs.length > 0,
    staleTime: 60_000,
  });

  function handleCheckoutClick() {
    if (items.length === 0) return;

    if (isAuthenticated) {
      navigate("/checkout");
      return;
    }

    setIsChoiceModalOpen(true);
  }

  const quoteMutation = useMutation({
    mutationFn: () =>
      createQuote({
        clientUserId: userId ?? "",
        sendImmediately: true,
        clientNote: "Demande créée depuis le panier client.",
        lines: items.map((item) => ({
          articleRef: item.arRef,
          qty: item.qty,
        })),
      }),
    onSuccess: (quote) => {
      clear();
      toast.success("Demande de devis créée", quote.piece);
      navigate(`/b2b/devis/${encodeURIComponent(quote.piece)}`);
    },
    onError: (error) => {
      toast.error("Devis indisponible", getApiErrorMessage(error));
    },
  });

  if (items.length === 0) {
    return (
      <div className="w-full space-y-6">
        <PremiumHero
          kicker="Panier"
          title="Mon panier"gradientTitle
          description="Ajoutez des articles depuis le catalogue pour démarrer votre commande."
        />
        <EmptyView
          title="Votre panier est vide"
          description="Livraison domicile : 8 TND • Timbre fiscal : 1 TND"
          iconPath="M3 3h2l.4 2 M7 13h10l4-8H5.4 M7 13 5.4 5 M7 13l-2 7h13 M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z M19 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
          action={
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to="/articles">
                <Button type="button" size="lg" className="h-12 rounded-2xl px-7 text-base font-bold">
                  Aller au catalogue
                </Button>
              </Link>
              <Link to="/">
                <Button type="button" variant="outline" size="lg" className="h-12 rounded-2xl px-7 text-base">
                  Retour à l’accueil
                </Button>
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <>
      <div className="w-full space-y-6 pb-10">
        <PremiumHero
          kicker="Panier"
          title="Mon panier"gradientTitle
          description="Vérifiez vos articles, ajustez les quantités et choisissez votre mode de livraison avant de passer commande."
          actions={
            <>
              <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold text-card-foreground shadow-sm">
                {items.length} article{items.length > 1 ? "s" : ""}
              </span>
              <Button
                type="button"
                variant="outline"
                className="text-danger hover:bg-danger/10"
                onClick={() => clear()}
              >
                Tout vider
              </Button>
            </>
          }
        />

        <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
          <StaggeredColumn className="space-y-4 lg:col-span-7" step={55}>
            {items.map((x) => {
              const raw = mainImagesMap?.[x.arRef] ?? null;
              const imgSrc = resolveImageUrl(raw, env.apiBaseUrl);

              return (
                <div
                  key={x.arRef}
                  className="app-surface group flex flex-col gap-4 p-0 transition hover:-translate-y-0.5 hover:shadow-[0_30px_90px_-52px_rgba(15,23,42,0.65)]"
                >
                  <div className="flex gap-5 p-5">
                    <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-[24px] border border-border/70 bg-card shadow-sm">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.10),_transparent_60%)]" />
                      <div className="relative z-10 h-full w-full p-3">
                        <div className="h-full w-full overflow-hidden rounded-[18px] bg-card">
                          <SmartImage
                            src={imgSrc}
                            alt={x.designation}
                            fit="contain"
                            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                            placeholderClassName="flex h-full w-full items-center justify-center bg-card text-muted-foreground/60"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col justify-between">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="line-clamp-2 text-lg font-black tracking-tight text-card-foreground transition-colors group-hover:text-primary">
                            {x.designation}
                          </h3>
                          <div className="mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold badge-neutral">
                            Réf <span className="font-mono text-card-foreground">{x.arRef}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(x.arRef)}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-input text-muted-foreground shadow-sm transition hover:border-danger/25 hover:bg-danger/10 hover:text-danger"
                          aria-label="Supprimer"
                          title="Supprimer"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-baseline gap-2">
                          <div className="text-4xl font-black tracking-tight text-card-foreground">{formatTnd(x.unitPrice)}</div>
                          <div className="text-sm font-semibold text-muted-foreground">TND</div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 lg:justify-end">
                          <div className="inline-flex items-center gap-1 rounded-[22px] border border-border/70 bg-card p-1 shadow-sm">
                            <button
                              type="button"
                              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[hsl(var(--input))] text-base font-bold text-card-foreground shadow-sm transition hover:bg-accent"
                              onClick={() => setQty(x.arRef, x.qty - 1)}
                              aria-label="Diminuer quantité"
                            >
                              −
                            </button>
                            <span className="min-w-[48px] text-center text-sm font-black text-card-foreground">{x.qty}</span>
                            <button
                              type="button"
                              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[hsl(var(--input))] text-base font-bold text-card-foreground shadow-sm transition hover:bg-accent"
                              onClick={() => setQty(x.arRef, x.qty + 1)}
                              aria-label="Augmenter quantité"
                            >
                              +
                            </button>
                          </div>

                          <div className="text-right">
                            <div className="text-xs font-medium text-muted-foreground">Total ligne</div>
                            <div className="text-2xl font-black tracking-tight text-card-foreground">
                              {formatTnd(x.unitPrice * x.qty)} <span className="text-xs font-semibold text-muted-foreground">TND</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-muted/30 px-5 py-3 text-xs text-muted-foreground">
                    <div className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-success" />
                      Disponible
                    </div>
                    <div className="font-semibold text-card-foreground/75">
                      Livraison domicile : 8 TND • Timbre fiscal : 1 TND
                    </div>
                  </div>
                </div>
              );
            })}
          </StaggeredColumn>

          <div className="space-y-6 lg:col-span-5">
            <div className="app-surface sticky top-24 p-0">
              <div className="flex items-start justify-between gap-3 border-b border-border/70 px-6 py-5">
                <div>
                  <div className="app-kicker">Checkout</div>
                  <h2 className="mt-1 text-2xl font-black text-card-foreground">Résumé de la commande</h2>
                </div>
                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold badge-neutral">
                  Étape 1 / 2
                </span>
              </div>

              <div className="space-y-6 px-6 py-6">
                <div className="space-y-3">
                  <div className="app-kicker">Mode de livraison</div>

                  <div className="grid gap-3">
                    <button
                      type="button"
                      onClick={() => setDeliveryMode("HOME")}
                      className={`flex items-center gap-4 rounded-[24px] border p-4 text-left transition ${
                        deliveryMode === "HOME"
                      ? "border-primary/35 bg-primary/[0.08] shadow-sm"
                          : "border-border bg-card hover:border-primary/15 hover:bg-accent/40"
                      }`}
                    >
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
                        🚚
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-card-foreground">Livraison à domicile</div>
                        <div className="text-xs text-muted-foreground">Frais fixes : 8 TND</div>
                      </div>
                      <div className="text-sm font-black text-card-foreground">
                        + {formatTnd(8)} <span className="text-xs font-semibold text-muted-foreground">TND</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeliveryMode("PICKUP")}
                      className={`flex items-center gap-4 rounded-[24px] border p-4 text-left transition ${
                        deliveryMode === "PICKUP"
                      ? "border-primary/35 bg-primary/[0.08] shadow-sm"
                          : "border-border bg-card hover:border-primary/15 hover:bg-accent/40"
                      }`}
                    >
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
                        🏪
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-card-foreground">Retrait au dépôt</div>
                        <div className="text-xs text-muted-foreground">Frais : 0 TND</div>
                      </div>
                      <div className="text-sm font-black text-success">Gratuit</div>
                    </button>
                  </div>
                </div>

                <div className="space-y-4 border-t border-border/70 pt-5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Sous-total</span>
                    <span className="font-semibold text-card-foreground">{formatTnd(subtotal)} TND</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Livraison domicile</span>
                    <span className="font-semibold text-card-foreground">{formatTnd(shipping)} TND</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Timbre fiscal</span>
                    <span className="font-semibold text-card-foreground">{formatTnd(stamp)} TND</span>
                  </div>

                  <div className="border-t border-dashed border-border pt-4">
                    <div className="flex items-end justify-between gap-3">
                      <div className="text-base font-black text-card-foreground">Total TTC</div>
                      <div className="text-right text-4xl font-black tracking-tight text-primary">
                        {formatTnd(total)} <span className="text-sm font-semibold text-muted-foreground">TND</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  size="lg"
                  className="h-12 w-full rounded-2xl text-base font-bold"
                  onClick={handleCheckoutClick}
                >
                  Terminer la commande
                </Button>

                {isClientB2B ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="h-12 w-full rounded-2xl text-base font-bold"
                    isLoading={quoteMutation.isPending}
                    disabled={quoteMutation.isPending || items.length === 0}
                    onClick={() => quoteMutation.mutate()}
                  >
                    Demander un devis B2B
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <CheckoutChoiceModal
        open={isChoiceModalOpen}
        onClose={() => setIsChoiceModalOpen(false)}
        itemsCount={items.length}
        subtotal={subtotal}
        shipping={shipping}
        stamp={stamp}
        total={total}
      />
    </>
  );
}

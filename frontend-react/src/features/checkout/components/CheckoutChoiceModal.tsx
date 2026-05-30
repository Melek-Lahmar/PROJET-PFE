import { useEffect } from "react";
import { Link } from "react-router-dom";
import { createPortal } from "react-dom";

import { Button } from "../../../shared/components/Button";

type Props = {
  open: boolean;
  onClose: () => void;
  itemsCount: number;
  subtotal: number;
  shipping: number;
  stamp: number;
  total: number;
};

type ChoiceCardProps = {
  icon: string;
  title: string;
  description: string;
  badges: string[];
  actionLabel: string;
  actionTo: string;
  onClose: () => void;
  variant?: "primary" | "outline";
  accentClassName?: string;
};

function SummaryChip({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="rounded-[22px] border border-border/70 bg-card px-4 py-3 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-2 ${
          emphasized
            ? "text-2xl font-black tracking-tight text-primary"
            : "text-lg font-black tracking-tight text-card-foreground"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function ChoiceCard({
  icon,
  title,
  description,
  badges,
  actionLabel,
  actionTo,
  onClose,
  variant = "outline",
  accentClassName = "",
}: ChoiceCardProps) {
  return (
    <div
      className={`flex h-full flex-col rounded-[28px] border border-border/70 bg-card p-5 shadow-[0_20px_55px_-38px_rgba(15,23,42,0.38)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_28px_70px_-38px_rgba(15,23,42,0.45)] ${accentClassName}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-[hsl(var(--input))] text-2xl shadow-sm">
        {icon}
      </div>

      <h3 className="mt-4 text-xl font-black tracking-tight text-card-foreground">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {description}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {badges.map((badge) => (
          <span
            key={badge}
            className="inline-flex items-center rounded-full border border-border/70 bg-muted/55 px-3 py-1 text-[11px] font-semibold text-muted-foreground"
          >
            {badge}
          </span>
        ))}
      </div>

      <div className="mt-6 pt-1">
        <Link to={actionTo} onClick={onClose} className="block">
          <Button
            type="button"
            variant={variant}
            className="h-12 w-full rounded-2xl text-sm font-bold"
          >
            {actionLabel}
          </Button>
        </Link>
      </div>
    </div>
  );
}

export function CheckoutChoiceModal({
  open,
  onClose,
  itemsCount,
  subtotal,
  shipping,
  stamp,
  total,
}: Props) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  const loginHref = `/login?returnTo=${encodeURIComponent("/checkout")}`;
  const registerHref = `/register?returnTo=${encodeURIComponent("/checkout")}`;

  return createPortal(
    <div className="fixed inset-0 z-[200]">
      <button
        type="button"
        aria-label="Fermer la fenêtre"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/72 backdrop-blur-[8px]"
      />

      <div className="absolute inset-0 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full items-start justify-center px-4 pb-8 pt-24 md:px-6 md:pt-28 lg:pt-32">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-choice-title"
            className="w-full max-w-[1120px]"
          >
            <div className="overflow-hidden rounded-[34px] border border-white/45 bg-card/98 text-card-foreground shadow-[0_45px_140px_-52px_rgba(2,6,23,0.92)]">
              <div className="border-b border-border/70 px-5 py-5 md:px-7 md:py-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="app-kicker">Checkout</div>
                    <h2
                      id="checkout-choice-title"
                      className="mt-2 text-[1.8rem] font-black tracking-tight text-card-foreground md:text-[2.15rem]"
                    >
                      Comment souhaitez-vous continuer ?
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                      Choisissez un parcours rapide et clair. Votre panier reste
                      conservé dans tous les cas.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Fermer"
                    className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-[hsl(var(--input))] text-muted-foreground shadow-sm transition hover:bg-accent hover:text-card-foreground"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M18 6 6 18" />
                      <path d="M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="space-y-5 px-5 py-5 md:px-7 md:py-6">
                <div className="rounded-[28px] border border-border/70 bg-muted/35 p-4 md:p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-card-foreground">
                        Résumé rapide du panier
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Un aperçu court, sans voler l’attention à l’action principale.
                      </div>
                    </div>

                    <div className="inline-flex items-center rounded-full border border-border/70 bg-card px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
                      {itemsCount} article{itemsCount > 1 ? "s" : ""}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <SummaryChip
                      label="Sous-total"
                      value={`${subtotal.toFixed(3)} TND`}
                    />
                    <SummaryChip
                      label="Livraison"
                      value={`${shipping.toFixed(3)} TND`}
                    />
                    <SummaryChip
                      label="Timbre fiscal"
                      value={`${stamp.toFixed(3)} TND`}
                    />
                    <SummaryChip
                      label="Total TTC"
                      value={`${total.toFixed(3)} TND`}
                      emphasized
                    />
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-3">
                  <ChoiceCard
                    icon="🔐"
                    title="Se connecter"
                    description="Retrouvez votre profil, vos adresses enregistrées et accédez ensuite au suivi de commande."
                    badges={["Profil prérempli", "Suivi disponible"]}
                    actionLabel="Me connecter"
                    actionTo={loginHref}
                    onClose={onClose}
                    variant="outline"
                  />

                  <ChoiceCard
                    icon="✨"
                    title="Créer un compte"
                    description="Créez votre espace client pour centraliser vos commandes et informations."
                    badges={["Compte client", "Historique futur"]}
                    actionLabel="Créer mon compte"
                    actionTo={registerHref}
                    onClose={onClose}
                    variant="outline"
                  />

                  <ChoiceCard
                    icon="🛍️"
                    title="Continuer comme invité"
                    description="Passez votre commande immédiatement via le formulaire invité, sans créer de compte."
                    badges={["Commande rapide", "Panier conservé"]}
                    actionLabel="Continuer sans se connecter"
                    actionTo="/checkout/guest"
                    onClose={onClose}
                    variant="primary"
                    accentClassName="border-primary/18 bg-[linear-gradient(180deg,rgba(79,70,229,0.06),rgba(255,255,255,0.98))]"
                  />
                </div>

                <div className="rounded-[22px] border border-border/70 bg-card px-4 py-3 text-xs leading-5 text-muted-foreground shadow-sm">
                  Le suivi détaillé des commandes reste réservé aux utilisateurs
                  connectés, mais la commande invitée sera bien créée côté système.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

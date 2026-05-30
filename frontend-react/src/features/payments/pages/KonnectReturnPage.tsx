import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { Button } from "../../../shared/components/Button";
import { Loader } from "../../../shared/components/Loader";
import {
  getKonnectPaymentStatus,
  getPendingKonnectPaymentByPiece,
} from "../api/konnectPaymentsApi";
import type { KonnectPublicPaymentStatusDto } from "../types/konnectPayment";
import {
  EmptyView,
} from "../../../shared/components/premium";

function money(value: number, currency: string) {
  return `${value.toFixed(3)} ${currency}`;
}

function formatUtc(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fr-TN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function normalizeSource(value: string | null) {
  return value === "guest" ? "guest" : "account";
}

function getStatusPresentation(status?: string | null) {
  const normalized = (status ?? "").trim().toUpperCase();

  switch (normalized) {
    case "SUCCES":
      return {
        title: "Paiement confirmé",
        description:
          "Le backend a confirmé le paiement. L’état affiché ici provient du service serveur, pas uniquement du retour visuel.",
        icon: "✓",
        panelClassName: "border-success/25 bg-success/10",
        badgeClassName: "badge-success",
      };
    case "ECHEC":
      return {
        title: "Paiement échoué",
        description:
          "Le paiement n’a pas été confirmé. Tu peux revenir à la commande et retenter un paiement plus tard si besoin.",
        icon: "!",
        panelClassName: "border-danger/25 bg-danger/10",
        badgeClassName: "badge-danger",
      };
    case "ANNULE":
      return {
        title: "Paiement annulé",
        description:
          "Le paiement a été interrompu ou annulé. La commande locale existe toujours, mais elle n’est pas réglée.",
        icon: "↺",
        panelClassName: "border-warning/25 bg-warning/10",
        badgeClassName: "badge-warning",
      };
    case "EXPIRE":
      return {
        title: "Lien de paiement expiré",
        description:
          "La tentative de paiement a expiré. Il faudra relancer un paiement depuis l’application si tu veux continuer.",
        icon: "⌛",
        panelClassName: "border-warning/25 bg-warning/10",
        badgeClassName: "badge-warning",
      };
    default:
      return {
        title: "Paiement en attente",
        description:
          "Le backend attend encore une confirmation finale. La page interroge automatiquement l’API pour récupérer l’état réel.",
        icon: "…",
        panelClassName: "border-info/25 bg-info/10",
        badgeClassName: "badge-info",
      };
  }
}

function StatusOverview({ data }: { data: KonnectPublicPaymentStatusDto }) {
  const presentation = getStatusPresentation(data.localStatus);

  return (
    <>
      <section
        className={`app-surface px-8 py-8 shadow-[0_38px_110px_-55px_rgba(15,23,42,0.9)] ${presentation.panelClassName}`}
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${presentation.badgeClassName}`}
            >
              Retour Konnect
            </span>

            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-[24px] border border-border bg-card text-3xl text-card-foreground shadow-sm">
                {presentation.icon}
              </div>

              <div>
                <h1 className="text-3xl font-black tracking-tight text-card-foreground">
                  {presentation.title}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                  {presentation.description}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-border/70 bg-card px-5 py-4 shadow-sm lg:min-w-[280px]">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Montant
            </div>
            <div className="mt-2 text-3xl font-black tracking-tight text-primary">
              {money(data.amount, data.currency)}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              Provider : {data.provider}
              {data.isMock ? " (mock)" : data.isSandbox ? " (sandbox)" : ""}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[24px] border border-border bg-card px-5 py-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Référence BC
          </div>
          <div className="mt-2 font-mono text-base font-bold text-card-foreground">
            {data.piece}
          </div>
        </div>

        <div className="rounded-[24px] border border-border bg-card px-5 py-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Référence paiement
          </div>
          <div className="mt-2 font-mono text-base font-bold text-card-foreground">
            {data.paymentRef}
          </div>
        </div>

        <div className="rounded-[24px] border border-border bg-card px-5 py-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Statut local
          </div>
          <div className="mt-2 text-base font-bold text-card-foreground">
            {data.localStatus}
          </div>
        </div>

        <div className="rounded-[24px] border border-border bg-card px-5 py-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Statut provider
          </div>
          <div className="mt-2 text-base font-bold text-card-foreground">
            {data.externalStatus ?? "—"}
          </div>
        </div>
      </section>

      <section className="app-surface p-7">
        <h2 className="text-2xl font-black tracking-tight text-card-foreground">
          Détails de la tentative
        </h2>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-[22px] border border-border/70 bg-muted/20 p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Créé le
            </div>
            <div className="mt-2 text-sm font-semibold text-card-foreground">
              {formatUtc(data.createdAtUtc)}
            </div>
          </div>

          <div className="rounded-[22px] border border-border/70 bg-muted/20 p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Dernière mise à jour
            </div>
            <div className="mt-2 text-sm font-semibold text-card-foreground">
              {formatUtc(data.lastModifiedAtUtc)}
            </div>
          </div>

          <div className="rounded-[22px] border border-border/70 bg-muted/20 p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Date de paiement
            </div>
            <div className="mt-2 text-sm font-semibold text-card-foreground">
              {formatUtc(data.paidAtUtc)}
            </div>
          </div>
        </div>

        {!data.isFinal ? (
          <div className="mt-5 rounded-[22px] border border-info/25 bg-info/10 p-4 text-sm text-card-foreground">
            Cette page continue d’interroger automatiquement le backend tant que le statut n’est pas final.
          </div>
        ) : null}
      </section>
    </>
  );
}

export function KonnectReturnPage() {
  const [searchParams] = useSearchParams();

  const piece = (searchParams.get("piece") ?? "").trim();
  const source = normalizeSource(searchParams.get("source"));
  const directPaymentRef = (searchParams.get("paymentRef") ?? "").trim();

  const pendingPayment = useMemo(() => {
    if (!piece) return null;
    return getPendingKonnectPaymentByPiece(piece);
  }, [piece]);

  const resolvedPaymentRef = directPaymentRef || pendingPayment?.paymentRef || "";

  const statusQuery = useQuery({
    queryKey: ["konnect-payment-status", piece, resolvedPaymentRef],
    queryFn: () => getKonnectPaymentStatus(piece, resolvedPaymentRef, true),
    enabled: Boolean(piece && resolvedPaymentRef),
    refetchInterval: 3000,
  });

  const backToCheckout = "/checkout";

  return (
    <div className="w-full space-y-8 py-10">
      {!piece ? (
        <EmptyView
          title="Retour de paiement incomplet"
          description="La référence de commande est absente du retour. Impossible de vérifier l’état réel du paiement."
          iconPath="M12 9v4 M12 17h.01 M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
          action={
            <div className="flex flex-wrap gap-3">
              <Link to={backToCheckout}>
                <Button type="button" size="lg">
                  Retour au checkout
                </Button>
              </Link>
              <Link to="/cart">
                <Button type="button" variant="outline" size="lg">
                  Retour au panier
                </Button>
              </Link>
            </div>
          }
        />
      ) : statusQuery.isLoading ? (
        <section className="app-surface p-8">
          <Loader />
        </section>
      ) : statusQuery.isError ? (
        <section className="app-surface space-y-4 p-8">
          <h1 className="text-2xl font-black tracking-tight text-card-foreground">
            Impossible de vérifier le paiement
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Le retour Konnect a bien eu lieu, mais le frontend n’a pas encore pu lire l’état réel depuis le backend.
          </p>

          <div className="rounded-[22px] border border-[hsl(var(--danger)/0.25)] bg-[hsl(var(--danger)/0.12)] p-4 text-sm text-[hsl(var(--danger))]">
            Vérifie que `piece` et `paymentRef` sont bien disponibles et que l’API `/api/payments/konnect/status` répond correctement.
          </div>

          <div className="flex flex-wrap gap-3">
            {source === "account" ? (
              <Link to={`/orders/${encodeURIComponent(piece)}`}>
                <Button type="button" size="lg">
                  Ouvrir la commande
                </Button>
              </Link>
            ) : null}

            <Link to={backToCheckout}>
              <Button type="button" variant="outline" size="lg">
                Retour au checkout
              </Button>
            </Link>
          </div>
        </section>
      ) : statusQuery.data ? (
        <>
          <StatusOverview data={statusQuery.data} />

          <section className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {source === "account" ? (
              <Link to={`/orders/${encodeURIComponent(piece)}`}>
                <Button type="button" size="lg" className="h-12 rounded-2xl px-6 text-base font-bold">
                  Ouvrir le détail de la commande
                </Button>
              </Link>
            ) : null}

            <Link to={backToCheckout}>
              <Button type="button" variant="outline" size="lg" className="h-12 rounded-2xl px-6 text-base">
                Retour au checkout
              </Button>
            </Link>

            <Link to="/articles">
              <Button type="button" variant="ghost" size="lg" className="h-12 rounded-2xl px-6 text-base">
                Continuer mes achats
              </Button>
            </Link>
          </section>
        </>
      ) : null}
    </div>
  );
}

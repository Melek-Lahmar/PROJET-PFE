import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { Button } from "../../../shared/components/Button";
import { Loader } from "../../../shared/components/Loader";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";
import {
  getPendingVirtualPaymentByPiece,
  getVirtualPaymentStatus,
  removePendingVirtualPayment,
} from "../api/virtualPaymentsApi";
import type { VirtualPaymentStatusDto } from "../types/virtualPayment";
import { EmptyView } from "../../../shared/components/premium";

function money(value: number, currency: string) {
  return `${value.toFixed(3)} ${currency}`;
}

function formatUtc(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fr-TN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getStatusPresentation(data?: VirtualPaymentStatusDto) {
  const normalized = (data?.localStatus ?? "").trim().toUpperCase();

  switch (normalized) {
    case "SUCCES":
      return {
        title: "Paiement virtuel confirmé",
        badge: "Succès",
        panelClassName: "border-success/25 bg-success/10 text-card-foreground",
        badgeClassName: "badge-success",
      };
    case "ECHEC":
      return {
        title: "Paiement virtuel refusé",
        badge: "Echec",
        panelClassName: "border-danger/25 bg-danger/10 text-card-foreground",
        badgeClassName: "badge-danger",
      };
    case "ANNULE":
      return {
        title: "Paiement virtuel annulé",
        badge: "Annulé",
        panelClassName: "border-warning/25 bg-warning/10 text-card-foreground",
        badgeClassName: "badge-warning",
      };
    case "EXPIRE":
      return {
        title: "Session de paiement expirée",
        badge: "Expiré",
        panelClassName: "border-warning/25 bg-warning/10 text-card-foreground",
        badgeClassName: "badge-warning",
      };
    default:
      return {
        title: "Paiement virtuel en attente",
        badge: "En attente",
        panelClassName: "border-info/25 bg-info/10 text-card-foreground",
        badgeClassName: "badge-info",
      };
  }
}

function StatusDetails({ data }: { data: VirtualPaymentStatusDto }) {
  const presentation = getStatusPresentation(data);

  return (
    <>
      <section className={`app-surface p-8 ${presentation.panelClassName}`}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${presentation.badgeClassName}`}
            >
              {presentation.badge}
            </span>
            <h1 className="mt-4 text-3xl font-black tracking-tight">{presentation.title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 opacity-80">{data.message}</p>
          </div>

          <div className="rounded-2xl border border-border bg-card px-5 py-4 text-card-foreground shadow-sm lg:min-w-[280px]">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Montant
            </div>
            <div className="mt-2 text-3xl font-black tracking-tight text-primary">
              {money(data.amount, data.currency)}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {data.provider} {data.isSandbox ? "(sandbox)" : ""}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Commande
          </div>
          <div className="mt-2 font-mono text-sm font-bold text-card-foreground">{data.piece}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Paiement
          </div>
          <div className="mt-2 break-all font-mono text-sm font-bold text-card-foreground">
            {data.paymentRef}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Statut local
          </div>
          <div className="mt-2 text-sm font-bold text-card-foreground">{data.localStatus}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Statut externe
          </div>
          <div className="mt-2 text-sm font-bold text-card-foreground">
            {data.externalStatus ?? "-"}
          </div>
        </div>
      </section>

      <section className="app-surface p-7">
        <h2 className="text-2xl font-black tracking-tight text-card-foreground">
          Statut réel retourné par le backend
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Créé le
            </div>
            <div className="mt-2 text-sm font-semibold text-card-foreground">
              {formatUtc(data.createdAtUtc)}
            </div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Dernière mise à jour
            </div>
            <div className="mt-2 text-sm font-semibold text-card-foreground">
              {formatUtc(data.lastModifiedAtUtc)}
            </div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Payé le
            </div>
            <div className="mt-2 text-sm font-semibold text-card-foreground">
              {formatUtc(data.paidAtUtc)}
            </div>
          </div>
        </div>

        {!data.isFinal ? (
          <div className="mt-5 rounded-2xl border border-info/25 bg-info/10 p-4 text-sm text-card-foreground">
            Le statut est encore en attente. La page interroge périodiquement l’API pour afficher la vérité backend.
          </div>
        ) : null}
      </section>
    </>
  );
}

export function VirtualPaymentReturnPage() {
  const [searchParams] = useSearchParams();

  const piece = (searchParams.get("piece") ?? "").trim();
  const paymentRef = (searchParams.get("paymentRef") ?? "").trim();

  const pendingPayment = useMemo(() => {
    if (!piece) return null;
    return getPendingVirtualPaymentByPiece(piece);
  }, [piece]);

  const source = pendingPayment?.source ?? "guest";

  const statusQuery = useQuery({
    queryKey: ["virtual-payment-return-status", piece, paymentRef],
    queryFn: async () => {
      const status = await getVirtualPaymentStatus(piece, paymentRef);
      if (status.isFinal) removePendingVirtualPayment(piece, paymentRef);
      return status;
    },
    enabled: Boolean(piece && paymentRef),
    refetchInterval: 3000,
  });

  const status = statusQuery.data;
  const canRetry =
    status &&
    ["ECHEC", "EXPIRE", "ANNULE"].includes(status.localStatus.trim().toUpperCase());

  if (!piece || !paymentRef) {
    return (
      <div className="w-full py-10">
        <EmptyView
          title="Retour de paiement incomplet"
          description="La référence de commande ou de paiement est absente. Le backend ne peut pas vérifier le statut."
          iconPath="M12 9v4 M12 17h.01 M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
          action={
            <Link to="/articles">
              <Button type="button" size="lg">
                Retour boutique
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 py-10">
      {statusQuery.isLoading ? (
        <section className="app-surface p-8">
          <Loader />
        </section>
      ) : statusQuery.isError ? (
        <section className="app-surface space-y-4 p-8">
          <h1 className="text-2xl font-black tracking-tight text-card-foreground">
            Impossible de vérifier le paiement virtuel
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Le frontend n’a pas pu lire le statut réel depuis l’API ASP.NET Core.
          </p>
          <div className="rounded-2xl border border-[hsl(var(--danger)/0.25)] bg-[hsl(var(--danger)/0.12)] p-4 text-sm text-[hsl(var(--danger))]">
            {getApiErrorMessage(statusQuery.error)}
          </div>
          <Link to="/cart">
            <Button type="button" variant="outline" size="lg">
              Retour au panier
            </Button>
          </Link>
        </section>
      ) : status ? (
        <>
          <StatusDetails data={status} />

          <section className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link to="/articles">
              <Button type="button" size="lg" className="h-12 rounded-2xl px-6 text-base font-bold">
                Retour boutique
              </Button>
            </Link>

            {source === "account" ? (
              <Link to={`/orders/${encodeURIComponent(piece)}`}>
                <Button type="button" variant="outline" size="lg" className="h-12 rounded-2xl px-6 text-base">
                  Retour commandes
                </Button>
              </Link>
            ) : null}

            {canRetry ? (
              <Link to="/cart">
                <Button type="button" variant="ghost" size="lg" className="h-12 rounded-2xl px-6 text-base">
                  Réessayer
                </Button>
              </Link>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}

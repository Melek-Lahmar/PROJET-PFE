import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Button } from "../../../shared/components/Button";
import { Loader } from "../../../shared/components/Loader";
import {
  AnimatedCounter,
  EmptyView,
  PremiumHero,
  StaggeredColumn,
} from "../../../shared/components/premium";
import { getMyOrders } from "../api/ordersApi";
import type { BonCommandeResponseDto } from "../types/order";

type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

type StatusMeta = {
  label: string;
  tone: StatusTone;
};

type DeliveryMeta = {
  label: string;
  badgeClass: string;
  summary: string;
};

function formatTnd(value: number) {
  return `${Number(value ?? 0).toFixed(3)} TND`;
}

function formatDate(value?: string | null) {
  if (!value) return "Date indisponible";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Date indisponible";

  return parsed.toLocaleString("fr-FR", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeStatus(status?: string | null) {
  return (status ?? "").trim().toUpperCase();
}

function getStatusMeta(order: Pick<BonCommandeResponseDto, "status" | "statusCode">): StatusMeta {
  const normalized = normalizeStatus(order.status);

  if (order.statusCode === 1 || normalized.includes("CONFIR") || normalized.includes("VALID")) {
    return { label: order.status?.trim() || "Confirmée", tone: "success" };
  }

  if (order.statusCode === 2 || normalized.includes("TENT")) {
    return { label: order.status?.trim() || "Tentative", tone: "info" };
  }

  if (order.statusCode === 3 || normalized.includes("REFUS")) {
    return { label: order.status?.trim() || "Refusée", tone: "danger" };
  }

  if (normalized.includes("ATTENTE") || normalized.includes("PENDING")) {
    return { label: order.status?.trim() || "En attente", tone: "warning" };
  }

  return { label: order.status?.trim() || "Statut indisponible", tone: "neutral" };
}

function getStatusBadgeClass(tone: StatusTone) {
  switch (tone) {
    case "success":
      return "badge-success";
    case "warning":
      return "badge-warning";
    case "danger":
      return "badge-danger";
    case "info":
      return "badge-info";
    default:
      return "bg-muted/55 text-muted-foreground ring-1 ring-border";
  }
}

function getDeliveryMeta(order: Pick<BonCommandeResponseDto, "deliveryType" | "city" | "depotNo">): DeliveryMeta {
  const deliveryType = (order.deliveryType ?? "").trim().toUpperCase();

  if (deliveryType === "HOME") {
    return {
      label: "Livraison à domicile",
      badgeClass: "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
      summary: order.city?.trim() ? `Destination : ${order.city.trim()}` : "Adresse client renseignée",
    };
  }

  if (deliveryType === "PICKUP") {
    return {
      label: "Retrait au dépôt",
      badgeClass: "bg-violet-50 text-violet-700 ring-1 ring-violet-100",
      summary: order.depotNo > 0 ? `Dépôt n°${order.depotNo}` : "Retrait en point dépôt",
    };
  }

  return {
    label: order.deliveryType?.trim() || "Livraison non précisée",
    badgeClass: "bg-muted/55 text-card-foreground/90 ring-1 ring-border",
    summary: "Mode de livraison disponible dans le détail",
  };
}

function getPaymentLabel(paymentMethod?: string | null) {
  return paymentMethod?.trim() || "Méthode non précisée";
}

function summarizeOrder(order: BonCommandeResponseDto) {
  const delivery = getDeliveryMeta(order);
  const payment = getPaymentLabel(order.paymentMethod);
  const linesCount = order.lines?.length ?? 0;

  return {
    deliverySummary: delivery.summary,
    paymentSummary: payment,
    linesSummary: `${linesCount} ligne${linesCount > 1 ? "s" : ""}`,
  };
}

function SummaryMetric({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="hover-lift rounded-[24px] border border-border/70 bg-muted/25 px-4 py-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-2xl font-black tracking-tight text-card-foreground">
        {typeof value === "number" ? <AnimatedCounter value={value} /> : value}
      </div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

function OrderListCard({ order }: { order: BonCommandeResponseDto }) {
  const status = getStatusMeta(order);
  const delivery = getDeliveryMeta(order);
  const summary = summarizeOrder(order);
  const linesCount = order.lines?.length ?? 0;

  return (
    <article className="overflow-hidden rounded-[30px] border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-muted/55 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground ring-1 ring-border">
                  Commande
                </span>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(status.tone)}`}>
                  {status.label}
                </span>
              </div>

              <div className="text-2xl font-black tracking-tight text-card-foreground">{order.piece}</div>
              <div className="text-sm text-muted-foreground">Passée le {formatDate(order.date)}</div>
            </div>

            <div className="rounded-[24px] border border-border/70 bg-muted/20 px-4 py-3 md:min-w-[180px] md:text-right">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Net à payer</div>
              <div className="mt-2 text-2xl font-black tracking-tight text-primary">{formatTnd(Number(order.netAPayer ?? 0))}</div>
              <div className="mt-1 text-xs text-muted-foreground">TTC : {formatTnd(Number(order.totalTTC ?? 0))}</div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[22px] border border-border/70 bg-muted/20 px-4 py-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Livraison</div>
              <div className="mt-2">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${delivery.badgeClass}`}>
                  {delivery.label}
                </span>
              </div>
              <div className="mt-3 text-sm font-medium text-card-foreground">{summary.deliverySummary}</div>
            </div>

            <div className="rounded-[22px] border border-border/70 bg-muted/20 px-4 py-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Paiement</div>
              <div className="mt-2 text-sm font-semibold text-card-foreground">{summary.paymentSummary}</div>
              <div className="mt-3 text-xs text-muted-foreground">Consultable sans ouvrir le détail.</div>
            </div>

            <div className="rounded-[22px] border border-border/70 bg-muted/20 px-4 py-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Articles</div>
              <div className="mt-2 text-sm font-semibold text-card-foreground">{summary.linesSummary}</div>
              <div className="mt-3 text-xs text-muted-foreground">Commande structurée et prête à être consultée.</div>
            </div>

            <div className="rounded-[22px] border border-border/70 bg-muted/20 px-4 py-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Résumé</div>
              <div className="mt-2 text-sm font-semibold text-card-foreground">
                {status.tone === "success"
                  ? "Commande validée côté métier"
                  : status.tone === "warning"
                    ? "Commande en cours de traitement"
                    : status.tone === "danger"
                      ? "Commande clôturée en refus"
                      : status.tone === "info"
                        ? "Commande à surveiller"
                        : "Suivi disponible dans le détail"}
              </div>
              <div className="mt-3 text-xs text-muted-foreground">Référence : {order.piece || "—"}</div>
            </div>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-3 lg:w-auto lg:min-w-[190px]">
          <Link to={`/orders/${encodeURIComponent(order.piece)}`} className="w-full">
            <Button type="button" variant="outline" className="h-11 w-full rounded-2xl px-5">
              Voir le détail
            </Button>
          </Link>
          <Link to="/articles" className="w-full">
            <Button type="button" variant="ghost" className="h-11 w-full rounded-2xl text-card-foreground/90 hover:bg-muted/55">
              Continuer mes achats
            </Button>
          </Link>
          <div className="rounded-[20px] border border-dashed border-border/70 bg-card/70 px-4 py-3 text-xs text-muted-foreground">
            {linesCount > 0
              ? `La commande contient ${linesCount} ligne${linesCount > 1 ? "s" : ""}.`
              : "Le détail permet de vérifier les lignes de commande."}
          </div>
        </div>
      </div>
    </article>
  );
}

export function OrdersPage() {
  const q = useQuery({ queryKey: ["my-orders"], queryFn: () => getMyOrders() });

  const orders = q.data ?? [];

  const metrics = useMemo(() => {
    let confirmed = 0;
    let pending = 0;
    let attention = 0;

    for (const order of orders) {
      const tone = getStatusMeta(order).tone;
      if (tone === "success") confirmed += 1;
      else if (tone === "warning") pending += 1;
      else if (tone === "danger" || tone === "info") attention += 1;
    }

    return {
      total: orders.length,
      confirmed,
      pending,
      attention,
    };
  }, [orders]);

  if (q.isLoading) {
    return <Loader label="Chargement des commandes..." />;
  }

  if (q.isError) {
    return (
      <div className="w-full py-10">
        <div className="rounded-[28px] border border-rose-200 bg-rose-50/60 p-6 shadow-sm">
          <div className="text-sm font-bold text-rose-700">Erreur</div>
          <div className="mt-1 text-sm text-muted-foreground">Impossible de charger vos commandes.</div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button type="button" onClick={() => q.refetch()} className="h-11 rounded-2xl px-5">
              Réessayer
            </Button>
            <Link to="/articles">
              <Button type="button" variant="outline" className="h-11 rounded-2xl px-5">
                Retour au catalogue
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="w-full space-y-7">
        <PremiumHero
          kicker="Commandes"
          title="Mes commandes"
          description="Retrouvez ici vos commandes client, leur statut et l’accès au détail complet."
        />

        <EmptyView
          title="Aucune commande"
          description="Vous n’avez pas encore passé de commande. Explorez le catalogue pour démarrer votre parcours d’achat."
          iconPath="M3 7h18 M5 7v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7 M9 11h6 M9 15h6"
          action={
            <Link to="/articles">
              <Button type="button" className="h-12 rounded-2xl px-7 text-base font-bold shadow-lg shadow-primary/20">
                Découvrir le catalogue
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-10">
      <PremiumHero
        kicker="Commandes client"
        title="Mes commandes"
        gradientTitle
        description="Une vue plus professionnelle, plus lisible et centrée sur l’essentiel : numéro, date, statut, livraison, lignes et montant."
        actions={
          <>
            <Link to="/articles">
              <Button type="button" variant="outline" className="h-11 rounded-2xl px-5">
                Continuer mes achats
              </Button>
            </Link>
            <Link to="/compare">
              <Button type="button" variant="outline" className="h-11 rounded-2xl px-5">
                Comparer mes favoris
              </Button>
            </Link>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric label="Total commandes" value={metrics.total} hint="Historique client disponible" />
        <SummaryMetric label="Confirmées" value={metrics.confirmed} hint="Validées côté métier" />
        <SummaryMetric label="En attente" value={metrics.pending} hint="Traitement en cours" />
        <SummaryMetric label="À surveiller" value={metrics.attention} hint="Tentatives ou refus" />
      </section>

      <section className="app-surface px-5 py-5 md:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-lg font-extrabold text-card-foreground">Liste des commandes</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Timeline retirée de la liste pour privilégier une lecture plus claire et plus premium.
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-card-foreground">{orders.length}</span> commande{orders.length > 1 ? "s" : ""} affichée{orders.length > 1 ? "s" : ""}
          </div>
        </div>
      </section>

      <StaggeredColumn className="grid gap-4" step={60} animation="fade-up">
        {orders.map((order) => (
          <OrderListCard key={order.piece} order={order} />
        ))}
      </StaggeredColumn>
    </div>
  );
}
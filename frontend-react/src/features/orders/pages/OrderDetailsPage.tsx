import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { getOrderByPiece, getOrderTimeline } from "../api/ordersApi";
import type { BonCommandeResponseDto, OrderTimelineDto } from "../types/order";
import { Button } from "../../../shared/components/Button";
import { OrderTimeline } from "../components/OrderTimeline";
import {
  EmptyView,
  PremiumHero,
  Skeleton,
} from "../../../shared/components/premium";

function money(value: number) {
  return `${Number(value ?? 0).toFixed(3)} TND`;
}

function safeText(value?: string | null) {
  return value && value.trim() ? value.trim() : "-";
}

function formatDateTime(value?: string | null) {
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

function getStatusBadgeClass(status?: string | null, statusCode?: number | null) {
  const normalized = normalizeStatus(status);

  if (statusCode === 1 || normalized.includes("CONFIR") || normalized.includes("VALID")) {
    return "badge-success";
  }

  if (statusCode === 2 || normalized.includes("TENT")) {
    return "badge-info";
  }

  if (statusCode === 3 || normalized.includes("REFUS")) {
    return "badge-danger";
  }

  if (normalized.includes("ATTENTE") || normalized.includes("PENDING")) {
    return "badge-warning";
  }

  return "bg-muted/55 text-card-foreground/90 ring-1 ring-border";
}

function getStatusSummary(status?: string | null, statusCode?: number | null) {
  const normalized = normalizeStatus(status);

  if (statusCode === 1 || normalized.includes("CONFIR") || normalized.includes("VALID")) {
    return "La commande a été validée côté métier.";
  }

  if (statusCode === 2 || normalized.includes("TENT")) {
    return "Une tentative ou un point d’attention a été signalé sur le traitement.";
  }

  if (statusCode === 3 || normalized.includes("REFUS")) {
    return "La commande a été clôturée en refus.";
  }

  return "La commande est encore en attente de traitement.";
}

function getDeliveryLabel(deliveryType?: string | null) {
  const normalized = (deliveryType ?? "").trim().toUpperCase();

  if (normalized === "HOME") return "Livraison à domicile";
  if (normalized === "PICKUP") return "Retrait au dépôt";

  return safeText(deliveryType);
}

function getDeliveryBadgeClass(deliveryType?: string | null) {
  const normalized = (deliveryType ?? "").trim().toUpperCase();

  if (normalized === "HOME") return "bg-info/10 text-info ring-1 ring-info/20";
  if (normalized === "PICKUP") return "bg-primary/10 text-primary ring-1 ring-primary/20";

  return "bg-muted/55 text-card-foreground/90 ring-1 ring-border";
}

function getPaymentLabel(paymentMethod?: string | null) {
  const normalized = (paymentMethod ?? "").trim().toUpperCase();

  switch (normalized) {
    case "SP01_ESPECES":
      return "Paiement en magasin - Espèces";
    case "SP02_CHEQUE":
      return "Paiement en magasin - Chèque";
    case "SP03_TPE":
      return "Paiement en magasin - TPE";
    case "SP04_PASSCADEAU":
      return "Paiement en magasin - Pass cadeau";
    case "LV01_ESPECES":
      return "Paiement à la livraison - Espèces";
    case "LV02_TPE":
      return "Paiement à la livraison - TPE";
    case "ON01_CARTE":
      return "Paiement en ligne - Carte";
    case "ON02_VIREMENT":
      return "Paiement en ligne - Virement";
    case "ON03_VERSEMENTESP":
      return "Paiement en ligne - Versement espèce";
    default:
      return safeText(paymentMethod);
  }
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="max-w-[260px] text-right text-sm font-semibold text-card-foreground">{value}</span>
    </div>
  );
}

export function OrderDetailsPage() {
  const { piece } = useParams<{ piece: string }>();

  const { data, isLoading, isError, error } = useQuery<BonCommandeResponseDto>({
    queryKey: ["order", piece],
    queryFn: () => getOrderByPiece(piece as string),
    enabled: !!piece,
  });

  const timelineQuery = useQuery<OrderTimelineDto>({
    queryKey: ["order-timeline", piece],
    queryFn: () => getOrderTimeline(piece as string),
    enabled: !!piece,
    staleTime: 15_000,
  });

  if (isLoading) {
    return (
      <div className="w-full space-y-6 py-10">
        <Skeleton width={256} height={28} rounded="full" />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <Skeleton height={288} rounded="xl" />
            <Skeleton height={384} rounded="xl" />
          </div>
          <div className="space-y-6">
            <Skeleton height={320} rounded="xl" />
            <Skeleton height={288} rounded="xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    const status = (error as { response?: { status?: number }; message?: string } | undefined)?.response?.status;
    const message =
      status === 404
        ? "Commande introuvable ou accès non autorisé."
        : (error as { message?: string } | undefined)?.message || "Impossible de charger la commande.";

    return (
      <div className="w-full space-y-6 py-10">
        <PremiumHero kicker="Détail commande" title="Commande" gradientTitle />
        <EmptyView
          title="Commande inaccessible"
          description={message}
          iconPath="M12 9v4 M12 17h.01 M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
          action={
            <Link to="/orders">
              <Button type="button" className="h-11 rounded-2xl px-5">
                Retour à mes commandes
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const linesCount = data.lines?.length ?? 0;
  const isPickup = (data.deliveryType ?? "").trim().toUpperCase() === "PICKUP";
  const hasB2BDiscount = Number(data.b2bDiscountAmount ?? 0) > 0;

  const lat = data.latitude?.trim() ?? "";
  const lng = data.longitude?.trim() ?? "";
  const hasGps = lat !== "" && lng !== "";

  const openMaps = () => {
    if (!hasGps) return;
    window.open(`https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="w-full space-y-6 pb-10">
      <section className="app-surface px-6 py-6 md:px-7 md:py-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/orders" className="text-sm font-semibold text-primary hover:underline">
                ← Retour à mes commandes
              </Link>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                  data.status,
                  data.statusCode
                )}`}
              >
                {safeText(data.status)}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getDeliveryBadgeClass(
                  data.deliveryType
                )}`}
              >
                {getDeliveryLabel(data.deliveryType)}
              </span>
            </div>

            <div>
              <div className="app-kicker">Commande client</div>
              <h1 className="app-title">Commande {safeText(data.piece)}</h1>
              <p className="app-description max-w-3xl">{getStatusSummary(data.status, data.statusCode)}</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-border/70 bg-muted/25 px-5 py-4 text-left xl:min-w-[280px] xl:text-right">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Net à payer</div>
            <div className="mt-2 text-3xl font-black tracking-tight text-primary">{money(data.netAPayer)}</div>
            <div className="mt-1 text-sm text-muted-foreground">Commande du {formatDateTime(data.date)}</div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <OrderTimeline
            statusCode={data.statusCode}
            status={data.status}
            timelineStage={data.timelineStage}
            timeline={timelineQuery.data ?? null}
          />

          <section className="rounded-[30px] border border-border bg-card shadow-sm">
            <div className="flex flex-col gap-4 border-b border-border px-6 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Articles</div>
                <h2 className="mt-1 text-xl font-black tracking-tight text-card-foreground">Lignes de commande</h2>
                <div className="mt-1 text-sm text-muted-foreground">
                  Références, quantités et montants réellement enregistrés.
                </div>
              </div>

              <span className="inline-flex items-center rounded-full bg-muted/55 px-3 py-1 text-xs font-bold text-card-foreground/90 ring-1 ring-border">
                {linesCount} ligne{linesCount > 1 ? "s" : ""}
              </span>
            </div>

            <div className="overflow-x-auto px-6 py-4">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    <th className="py-3 pr-4">Référence</th>
                    <th className="py-3 pr-4">Désignation</th>
                    <th className="py-3 pr-4">Qté</th>
                    <th className="py-3 pr-4">PU</th>
                    <th className="py-3 pr-4">HT</th>
                    <th className="py-3 pr-0">TTC</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border/70">
                  {(data.lines ?? []).map((line, index) => (
                    <tr key={`${line.articleRef}-${index}`} className="hover:bg-muted/30">
                      <td className="py-4 pr-4">
                        <span className="inline-flex items-center rounded-xl border border-border bg-card px-2.5 py-1 font-mono text-xs font-bold text-card-foreground/90 shadow-sm">
                          {line.articleRef}
                        </span>
                      </td>
                      <td className="py-4 pr-4">
                        <div className="max-w-[360px] truncate font-semibold text-card-foreground">
                          {safeText(line.designation)}
                        </div>
                      </td>
                      <td className="py-4 pr-4 font-semibold text-card-foreground">{line.qty}</td>
                      <td className="py-4 pr-4 text-card-foreground/90">{money(line.unitPrice)}</td>
                      <td className="py-4 pr-4 text-card-foreground/90">{money(line.amountHT)}</td>
                      <td className="py-4 pr-0 font-bold text-card-foreground">{money(line.amountTTC)}</td>
                    </tr>
                  ))}

                  {data.lines.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                        Aucune ligne de commande disponible.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-[30px] border border-border bg-card shadow-sm">
            <div className="border-b border-border px-6 py-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Informations</div>
              <h2 className="mt-1 text-xl font-black tracking-tight text-card-foreground">Résumé de commande</h2>
            </div>

            <div className="space-y-4 px-6 py-6">
              <InfoRow label="Numéro" value={safeText(data.piece)} />
              <InfoRow label="Date" value={formatDateTime(data.date)} />
              <InfoRow label="Client" value={safeText(data.clientCode)} />
              <InfoRow label="Statut" value={safeText(data.status)} />
              <InfoRow label="Livraison" value={getDeliveryLabel(data.deliveryType)} />
              <InfoRow label="Paiement" value={getPaymentLabel(data.paymentMethod)} />
            </div>
          </section>

          <section className="rounded-[30px] border border-border bg-card shadow-sm">
            <div className="border-b border-border px-6 py-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Livraison</div>
              <h2 className="mt-1 text-xl font-black tracking-tight text-card-foreground">Réception</h2>
              <div className="mt-1 text-sm text-muted-foreground">Informations disponibles sur la réception de la commande.</div>
            </div>

            <div className="space-y-4 px-6 py-6">
              <div>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getDeliveryBadgeClass(data.deliveryType)}`}>
                  {getDeliveryLabel(data.deliveryType)}
                </span>
              </div>

              {isPickup ? (
                <div className="rounded-[24px] border border-primary/20 bg-primary/10 p-4 text-sm text-card-foreground">
                  <div>
                    Retrait prévu au dépôt : <b>#{data.depotNo || 0}</b>
                  </div>
                  <div className="mt-2">
                    Présentez le numéro de commande : <b>{safeText(data.piece)}</b>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <InfoRow label="Adresse" value={safeText(data.address)} />
                  <InfoRow label="Ville" value={safeText(data.city)} />
                  <InfoRow label="Code postal" value={safeText(data.postalCode)} />
                  <InfoRow label="Coordonnées GPS" value={hasGps ? `${lat}, ${lng}` : "-"} />

                  {hasGps ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full rounded-2xl border-border"
                      onClick={openMaps}
                    >
                      Ouvrir sur la carte
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[30px] border border-border bg-card shadow-sm">
            <div className="border-b border-border px-6 py-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Paiement</div>
              <h2 className="mt-1 text-xl font-black tracking-tight text-card-foreground">Récapitulatif financier</h2>
            </div>

            <div className="space-y-4 px-6 py-6">
              <InfoRow label="Mode de paiement" value={getPaymentLabel(data.paymentMethod)} />
              <InfoRow label="Total HT" value={money(data.totalHT)} />
              {hasB2BDiscount ? (
                <>
                  <InfoRow label="Sous-total avant remise" value={money(data.totalBeforeDiscount ?? data.totalTTC)} />
                  <InfoRow label={`Remise B2B ${Number(data.b2bDiscountRate ?? 0).toFixed(2)} %`} value={`-${money(data.b2bDiscountAmount ?? 0)}`} />
                </>
              ) : (
                <InfoRow label="Total TTC" value={money(data.totalTTC)} />
              )}
              <InfoRow label="Frais livraison" value={money(data.fraisLivraison)} />
              <InfoRow label="Timbre fiscal" value={money(data.timbreFiscal)} />

              <div className="h-px bg-border/70" />

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">Net à payer</span>
                <span className="text-xl font-black tracking-tight text-primary">{money(data.netAPayer)}</span>
              </div>
            </div>
          </section>

          <Link to="/orders" className="block">
            <Button type="button" variant="ghost" className="h-11 w-full rounded-2xl text-card-foreground/90 hover:bg-muted/55">
              Retour à la liste
            </Button>
          </Link>
        </aside>
      </div>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Button } from "../../../shared/components/Button";
import { Loader } from "../../../shared/components/Loader";
import { getOrderByPiece, getOrderTimeline } from "../api/ordersApi";
import { OrderTimeline } from "../components/OrderTimeline";
import type { BonCommandeResponseDto, OrderTimelineDto } from "../types/order";
import {
  EmptyView,
  PremiumHero,
} from "../../../shared/components/premium";

function formatTnd(v: number) {
  return `${Number(v ?? 0).toFixed(3)} TND`;
}

function safeText(v?: string | null) {
  return v && v.trim() ? v : "—";
}

function statusBadgeClass(status?: string | null) {
  const s = (status ?? "").toUpperCase();
  if (s === "CONFIRME" || s === "CONFIRMÉ" || s === "VALIDE" || s === "COMPLETED" || s === "DONE") {
    return "badge-success";
  }
  if (s === "EN_ATTENTE" || s === "PENDING") {
    return "badge-warning";
  }
  if (s === "REFUSE" || s === "REFUSÉ" || s === "REJECTED") {
    return "badge-danger";
  }
  if (s === "CANCELLED" || s === "ANNULE" || s === "ANNULÉ") {
    return "bg-red-50 text-red-600 ring-1 ring-red-100";
  }
  return "bg-muted/55 text-muted-foreground ring-1 ring-border";
}

export function ClientOrderDetailsPage() {
  const { piece } = useParams<{ piece: string }>();
  const normalizedPiece = piece ? piece.trim() : "";

  const q = useQuery<BonCommandeResponseDto>({
    queryKey: ["order", normalizedPiece],
    queryFn: () => getOrderByPiece(normalizedPiece),
    enabled: !!normalizedPiece,
  });

  const timelineQuery = useQuery<OrderTimelineDto>({
    queryKey: ["order-timeline", normalizedPiece],
    queryFn: () => getOrderTimeline(normalizedPiece),
    enabled: !!normalizedPiece,
    staleTime: 15_000,
  });

  if (!normalizedPiece) {
    return (
      <div className="w-full space-y-6 py-10">
        <PremiumHero kicker="Détail commande" title="Détail commande" gradientTitle />
        <EmptyView
          title="Identifiant manquant"
          description="L’URL ne contient pas de référence de commande."
          iconPath="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z M12 8v4 M12 16h.01"
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

  if (q.isLoading) return <Loader />;

  if (q.isError) {
    const status = (q.error as any)?.response?.status;
    const msg =
      status === 404
        ? "Commande introuvable (ou accès non autorisé)."
        : (q.error as any)?.message ?? "Impossible de charger la commande.";

    return (
      <div className="w-full space-y-6 py-10">
        <PremiumHero kicker="Détail commande" title="Détail commande" gradientTitle />
        <EmptyView
          title="Erreur de chargement"
          description={msg}
          iconPath="M12 9v4 M12 17h.01 M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
          action={
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to="/orders">
                <Button type="button" className="h-11 rounded-2xl px-5">
                  Retour à mes commandes
                </Button>
              </Link>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-2xl px-5"
                onClick={() => q.refetch()}
              >
                Réessayer
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  const data = q.data;
  if (!data) {
    return (
      <div className="w-full space-y-6 py-10">
        <PremiumHero kicker="Détail commande" title="Détail commande" gradientTitle />
        <EmptyView
          title="Aucune donnée disponible"
          description="La commande existe mais n’a pas pu être chargée."
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

  const isHome = (data.deliveryType ?? "").toUpperCase() === "HOME";
  const hasDeliveryBlock = !!(data.address || data.city || data.postalCode);

  return (
    <div className="w-full space-y-7">
      <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Link to="/orders" className="text-sm font-semibold text-primary hover:underline">
            ← Retour à mes commandes
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-card-foreground">Commande {safeText(data.piece)}</h1>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(
                data.status
              )}`}
            >
              {safeText(data.status)}
            </span>
          </div>

          <div className="text-sm text-muted-foreground">
            Date :{" "}
            <span className="font-semibold text-card-foreground">
              {data.date ? new Date(data.date).toLocaleString("fr-FR") : "—"}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1 text-xs">
            <span
              className={`rounded-full px-3 py-1 font-semibold ring-1 ${
                isHome ? "bg-blue-50 text-blue-700 ring-blue-100" : "bg-violet-50 text-violet-700 ring-violet-100"
              }`}
            >
              {isHome ? "🚚 Domicile" : "🏪 Dépôt"}
            </span>
            <span className="rounded-full bg-muted/55 px-3 py-1 font-semibold text-card-foreground/90 ring-1 ring-border">
              Dépôt: <b>{data.depotNo}</b>
            </span>
            <span className="rounded-full bg-muted/55 px-3 py-1 font-semibold text-card-foreground/90 ring-1 ring-border">
              {data.lines?.length ?? 0} ligne{(data.lines?.length ?? 0) > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card/70 p-5 shadow-sm sm:text-right">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Net à payer</div>
          <div className="mt-1 text-2xl font-black tracking-tight text-primary">{formatTnd(Number(data.netAPayer))}</div>
          <div className="mt-1 text-xs text-muted-foreground">Total TTC: {formatTnd(Number(data.totalTTC))}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <OrderTimeline
            statusCode={data.statusCode}
            status={data.status}
            timelineStage={data.timelineStage}
            timeline={timelineQuery.data ?? null}
          />

          <div className="rounded-3xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Articles</div>
                <h2 className="mt-1 text-lg font-extrabold text-card-foreground">Lignes de commande</h2>
              </div>
              <span className="rounded-full bg-muted/55 px-3 py-1 text-xs font-bold text-card-foreground/90 ring-1 ring-border">
                {data.lines?.length ?? 0} ligne{(data.lines?.length ?? 0) > 1 ? "s" : ""}
              </span>
            </div>

            <div className="overflow-x-auto px-6 py-4">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="py-3 pr-4">Référence</th>
                    <th className="py-3 pr-4">Désignation</th>
                    <th className="py-3 pr-4">Qté</th>
                    <th className="py-3 pr-4">PU</th>
                    <th className="py-3 pr-4">HT</th>
                    <th className="py-3 pr-0">TTC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data.lines ?? []).map((l, idx) => (
                    <tr key={`${l.articleRef}-${idx}`} className="hover:bg-muted/35">
                      <td className="py-4 pr-4">
                        <span className="inline-flex items-center rounded-xl border border-border bg-card px-2.5 py-1 font-mono text-xs font-bold text-card-foreground/90 shadow-sm">
                          {l.articleRef}
                        </span>
                      </td>
                      <td className="py-4 pr-4">
                        <div className="max-w-[360px] truncate font-semibold text-card-foreground">
                          {safeText(l.designation)}
                        </div>
                      </td>
                      <td className="py-4 pr-4 font-semibold text-card-foreground">{l.qty}</td>
                      <td className="py-4 pr-4 text-card-foreground/90">{formatTnd(Number(l.unitPrice))}</td>
                      <td className="py-4 pr-4 text-card-foreground/90">{formatTnd(Number(l.amountHT))}</td>
                      <td className="py-4 pr-0 font-bold text-card-foreground">{formatTnd(Number(l.amountTTC))}</td>
                    </tr>
                  ))}

                  {(data.lines?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                        Aucune ligne.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-6 py-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Totaux</div>
              <h2 className="mt-1 text-lg font-extrabold text-card-foreground">Récapitulatif</h2>
            </div>

            <div className="space-y-3 px-6 py-6 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Total HT</span>
                <span className="font-semibold text-card-foreground">{formatTnd(Number(data.totalHT))}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Total TTC</span>
                <span className="font-semibold text-card-foreground">{formatTnd(Number(data.totalTTC))}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Frais livraison</span>
                <span className="font-semibold text-card-foreground">{formatTnd(Number(data.fraisLivraison))}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Timbre fiscal</span>
                <span className="font-semibold text-card-foreground">{formatTnd(Number(data.timbreFiscal))}</span>
              </div>

              <div className="h-px bg-muted/70" />

              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Net à payer</span>
                <span className="text-lg font-black text-primary">{formatTnd(Number(data.netAPayer))}</span>
              </div>
            </div>
          </div>

          {hasDeliveryBlock && (
            <div className="rounded-3xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-6 py-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Livraison</div>
                <h2 className="mt-1 text-lg font-extrabold text-card-foreground">Adresse</h2>
              </div>

              <div className="space-y-3 px-6 py-6 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-muted-foreground">Adresse</span>
                  <span className="max-w-[260px] text-right font-medium text-card-foreground">{safeText(data.address)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Ville</span>
                  <span className="font-medium text-card-foreground">{safeText(data.city)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Code postal</span>
                  <span className="font-medium text-card-foreground">{safeText(data.postalCode)}</span>
                </div>
              </div>
            </div>
          )}

          <Link to="/orders">
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full rounded-xl border-border bg-card/70 shadow-sm hover:bg-card"
            >
              Retour à la liste
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

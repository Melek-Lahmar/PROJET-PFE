import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "../../../shared/components/Button";
import { Loader } from "../../../shared/components/Loader";
import { OrderTimeline } from "../../orders/components/OrderTimeline";
import { getVendeurOrderByPiece, getVendeurFacturePdf } from "../api/vendeurApi";
import { openPdfBlob } from "../api/manifesteApi";
import type { VendeurOrderResponseDto } from "../types/vendeur";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";
import { PremiumHero } from "../../../shared/components/premium/PremiumHero";
import { PremiumCard } from "../../../shared/components/premium/PremiumCard";
import { SectionHeader } from "../../../shared/components/premium/SectionHeader";
import { EmptyView } from "../../../shared/components/premium/EmptyView";

function money(v: number) {
  return `${Number(v ?? 0).toFixed(3)} TND`;
}

function safe(v?: string | null) {
  return v && v.trim() ? v : "—";
}

function badgeClass(status?: string | null) {
  const s = (status ?? "").toUpperCase();
  if (s.includes("ATTENTE")) return "badge-warning";
  if (s.includes("CONFIR")) return "badge-success";
  if (s.includes("REFUS")) return "badge-danger";
  if (s.includes("TENT")) return "badge-info";
  return "badge-neutral";
}

export function VendeurOrderDetailsPage() {
  const { piece } = useParams<{ piece: string }>();
  const { data, isLoading, isError, error } = useQuery<VendeurOrderResponseDto>({
    queryKey: ["vendeur-order", piece],
    queryFn: () => getVendeurOrderByPiece(piece as string),
    enabled: !!piece,
  });

  const factureMut = useMutation({
    mutationFn: () => getVendeurFacturePdf(piece as string),
    onSuccess: (blob) => openPdfBlob(blob, `facture-${piece}.pdf`),
  });

  if (isLoading) return <Loader label="Chargement du détail vendeur..." />;

  if (isError || !data) {
    return (
      <div className="w-full py-6">
        <EmptyView
          title="Détail commande introuvable"
          description={getApiErrorMessage(error)}
          action={
            <Link to="/vendeur/orders">
              <Button type="button" className="h-11 rounded-2xl px-5">
                ← Retour commandes vendeur
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="w-full space-y-7 pb-10">
      <div>
        <Link
          to="/vendeur/orders"
          className="text-sm font-semibold text-primary hover:underline"
        >
          ← Retour commandes vendeur
        </Link>
      </div>

      <PremiumHero
        kicker="Commande vendeur"
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono">{safe(data.piece)}</span>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(
                data.status
              )}`}
            >
              {safe(data.status)}
            </span>
          </span>
        }
        description={
          <span>
            Date :{" "}
            <span className="font-semibold">
              {data.date ? new Date(data.date).toLocaleString("fr-FR") : "—"}
            </span>
            {" · "}Client :{" "}
            <span className="font-semibold">
              {safe(data.customer?.displayName || data.clientCode)}
            </span>
            {" · "}Mode : <span className="font-semibold">{safe(data.modeRemise || data.deliveryType)}</span>
          </span>
        }
        trailing={
          <PremiumCard tone="primary" className="text-right">
            <p className="app-kicker">Totaux</p>
            <p className="mt-2 text-sm text-muted-foreground">Total TTC</p>
            <p className="text-3xl font-black tracking-tight text-card-foreground">
              {money(data.totalTTC)}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Net à payer :{" "}
              <span className="font-extrabold text-primary">{money(data.netAPayer)}</span>
            </p>
            <button
              onClick={() => factureMut.mutate()}
              disabled={factureMut.isPending}
              className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow transition hover:bg-primary/90 disabled:opacity-50"
            >
              {factureMut.isPending ? "Génération..." : "Imprimer Facture"}
            </button>
            {factureMut.isError && (
              <p className="mt-2 text-xs text-destructive">Erreur lors de la génération.</p>
            )}
          </PremiumCard>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <OrderTimeline statusCode={data.statusCode} status={data.status} />

          <PremiumCard noPadding>
            <SectionHeader
              kicker="Articles"
              title="Lignes de commande"
              className="px-6 py-5"
              trailing={
                <span className="rounded-full bg-muted/55 px-3 py-1 text-xs font-bold text-card-foreground/90 ring-1 ring-border">
                  {data.lines.length} ligne{data.lines.length > 1 ? "s" : ""}
                </span>
              }
            />

            <div className="overflow-x-auto border-t border-border/60 px-6 py-4">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="py-3 pr-4">Référence</th>
                    <th className="py-3 pr-4">Désignation</th>
                    <th className="py-3 pr-4 text-right">Qté</th>
                    <th className="py-3 pr-4 text-right">PU</th>
                    <th className="py-3 pr-0 text-right">TTC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {data.lines.map((line, idx) => (
                    <tr
                      key={`${line.articleRef}-${idx}`}
                      className="transition hover:bg-muted/30"
                    >
                      <td className="py-4 pr-4">
                        <span className="inline-flex items-center rounded-xl border border-border bg-card px-2.5 py-1 font-mono text-xs font-bold text-card-foreground/90 shadow-sm">
                          {line.articleRef}
                        </span>
                      </td>
                      <td className="py-4 pr-4 font-semibold text-card-foreground">
                        {safe(line.designation)}
                      </td>
                      <td className="py-4 pr-4 text-right font-semibold text-card-foreground">
                        {line.qty}
                      </td>
                      <td className="py-4 pr-4 text-right text-card-foreground/90">
                        {money(line.unitPrice)}
                      </td>
                      <td className="py-4 pr-0 text-right font-extrabold text-card-foreground">
                        {money(line.amountTTC)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PremiumCard>
        </div>

        <div className="space-y-6">
          <PremiumCard tone="soft" noPadding>
            <SectionHeader
              kicker="Client"
              title="Fiche commande"
              className="px-6 py-5"
            />
            <div className="space-y-3 border-t border-border/60 px-6 py-5 text-sm">
              <InfoRow label="Mode client" value={safe(data.customer?.customerMode)} />
              <InfoRow label="Nom / société" value={safe(data.customer?.displayName)} />
              <InfoRow label="Téléphone" value={safe(data.customer?.telephone)} />
              <InfoRow label="CIN" value={safe(data.customer?.cin)} />
              <InfoRow label="Matricule fiscal" value={safe(data.customer?.matriculeFiscal)} />
            </div>
          </PremiumCard>

          <PremiumCard tone="soft" noPadding>
            <SectionHeader
              kicker="Remise & dépôt"
              title="Réception vendeur"
              className="px-6 py-5"
            />
            <div className="space-y-3 border-t border-border/60 px-6 py-5 text-sm">
              <InfoRow label="Mode" value={safe(data.modeRemise || data.deliveryType)} />
              <InfoRow label="Vendeur" value={safe(data.vendeurDisplayName)} />
              <InfoRow
                label="Dépôt"
                value={data.depotIntitule || `Dépôt #${data.depotNo}`}
              />
              <InfoRow label="Code dépôt" value={safe(data.depotCode)} />
              <InfoRow
                label="Adresse"
                value={safe(data.depotAddress || data.address)}
              />
              <InfoRow label="Ville" value={safe(data.depotCity || data.city)} />
              <InfoRow
                label="Code postal"
                value={safe(data.depotPostalCode || data.postalCode)}
              />
              <InfoRow label="Paiement" value={safe(data.paymentMethod)} />
            </div>
          </PremiumCard>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[240px] text-right font-semibold text-card-foreground">
        {value}
      </span>
    </div>
  );
}

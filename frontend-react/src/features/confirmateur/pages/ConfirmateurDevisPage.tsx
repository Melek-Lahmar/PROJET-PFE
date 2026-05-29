import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { EmptyView } from "../../../shared/components/premium";
import { useToast } from "../../../shared/components/premium/Toast";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";
import { getConfirmateurDevis, transformConfirmateurDevisToBc, updateConfirmateurDevisStatus } from "../api/confirmateurApi";
import type { QuoteListItemDto } from "../../b2bQuotes/types/b2bQuotes";

type DateRangeFilter = "ALL" | "TODAY" | "THIS_WEEK" | "ONE_MONTH" | "SIX_MONTHS" | "ONE_YEAR";

const STATUS_FILTERS = ["ALL", "SOUMIS", "EN_ETUDE", "INFO_MANQUANTE", "REPONSE_CLIENT", "MODIFIE", "VALIDE", "ENVOYE_CLIENT", "ACCEPTE_CLIENT", "CONVERTI_BC", "REFUSE_CLIENT", "EXPIRE", "ANNULE"] as const;
const DATE_FILTERS: Array<{ label: string; value: DateRangeFilter }> = [
  { label: "Tout", value: "ALL" },
  { label: "Aujourd'hui", value: "TODAY" },
  { label: "Cette semaine", value: "THIS_WEEK" },
  { label: "1 mois", value: "ONE_MONTH" },
  { label: "6 mois", value: "SIX_MONTHS" },
  { label: "1 an", value: "ONE_YEAR" },
];

function safe(value?: string | null) {
  return value && value.trim() ? value.trim() : "-";
}

function money(value?: number | null) {
  return typeof value === "number" ? `${value.toFixed(3)} TND` : "-";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("fr-FR");
}

function clientLabel(quote: QuoteListItemDto) {
  return quote.companyName || quote.clientName || quote.clientPhone || "-";
}

function statusClass(status?: string | null) {
  const s = (status ?? "").toUpperCase();
  if (s === "ACCEPTE_CLIENT" || s === "CONVERTI_BC" || s === "VALIDE") return "badge-success";
  if (s === "SOUMIS" || s === "EN_ETUDE" || s === "ENVOYE_CLIENT" || s === "REPONSE_CLIENT") return "badge-info";
  if (s === "REFUSE_CLIENT" || s === "ANNULE" || s === "EXPIRE") return "badge-danger";
  return "badge-warning";
}

function statusLabel(status?: string | null) {
  const s = (status ?? "").toUpperCase();
  if (s === "BROUILLON") return "Brouillon";
  if (s === "SOUMIS") return "Soumis";
  if (s === "EN_ETUDE") return "En étude";
  if (s === "INFO_MANQUANTE") return "Info manquante";
  if (s === "REPONSE_CLIENT") return "Réponse client";
  if (s === "MODIFIE") return "Modifié";
  if (s === "VALIDE") return "Validé";
  if (s === "ENVOYE_CLIENT") return "Envoyé client";
  if (s === "ACCEPTE_CLIENT") return "Accepté";
  if (s === "CONVERTI_BC") return "Converti";
  if (s === "REFUSE_CLIENT") return "Refusé";
  if (s === "EXPIRE") return "Expiré";
  if (s === "ANNULE") return "Annulé";
  return s || "Inconnu";
}

function matchesDateRange(value: string | null | undefined, filter: DateRangeFilter) {
  if (filter === "ALL") return true;
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() + (startOfDay.getDay() === 0 ? -6 : 1 - startOfDay.getDay()));

  if (filter === "TODAY") return date >= startOfDay && date <= now;
  if (filter === "THIS_WEEK") return date >= startOfWeek && date <= now;

  const months = filter === "ONE_MONTH" ? 1 : filter === "SIX_MONTHS" ? 6 : 12;
  const from = new Date(now);
  from.setMonth(from.getMonth() - months);
  return date >= from && date <= now;
}

function MetricCard({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card px-4 py-4 shadow-sm">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-black text-card-foreground">{value}</div>
      <div className="mt-1 text-xs font-medium text-muted-foreground">{hint}</div>
    </div>
  );
}

export function ConfirmateurDevisPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("ALL");
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>("ALL");

  const quotesQuery = useQuery({
    queryKey: ["confirmateur", "devis"],
    queryFn: () => getConfirmateurDevis(),
  });

  const statusMutation = useMutation({
    mutationFn: ({ piece, nextStatus }: { piece: string; nextStatus: string }) =>
      updateConfirmateurDevisStatus(piece, nextStatus, "Traitement confirmateur"),
    onSuccess: async () => {
      toast.success("Devis mis à jour");
      await qc.invalidateQueries({ queryKey: ["confirmateur", "devis"] });
    },
    onError: (err) => toast.error("Action impossible", getApiErrorMessage(err)),
  });

  const convertMutation = useMutation({
    mutationFn: transformConfirmateurDevisToBc,
    onSuccess: async (res) => {
      toast.success("BC créé", res.piece);
      await qc.invalidateQueries({ queryKey: ["confirmateur", "devis"] });
      await qc.invalidateQueries({ queryKey: ["confirmateur", "commandes"] });
    },
    onError: (err) => toast.error("Conversion impossible", getApiErrorMessage(err)),
  });

  const quotes = useMemo(() => quotesQuery.data ?? [], [quotesQuery.data]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return quotes.filter((quote) => {
      if (status !== "ALL" && String(quote.quoteStatus).toUpperCase() !== status) return false;
      if (!matchesDateRange(quote.date, dateFilter)) return false;
      if (!q) return true;
      return (
        quote.piece.toLowerCase().includes(q) ||
        clientLabel(quote).toLowerCase().includes(q) ||
        safe(quote.companyName).toLowerCase().includes(q) ||
        safe(quote.clientCode).toLowerCase().includes(q) ||
        String(quote.quoteStatus).toLowerCase().includes(q)
      );
    });
  }, [dateFilter, quotes, search, status]);

  const metrics = useMemo(() => ({
    total: filtered.length,
    sent: filtered.filter((q) => q.quoteStatus === "SOUMIS").length,
    accepted: filtered.filter((q) => q.quoteStatus === "ACCEPTE_CLIENT").length,
    converted: filtered.filter((q) => q.quoteStatus === "CONVERTI_BC").length,
    amount: filtered.reduce((sum, q) => sum + Number(q.netAPayer ?? 0), 0),
  }), [filtered]);

  return (
    <div className="w-full space-y-5 pb-10">
      <section className="rounded-2xl border border-border/70 bg-card px-5 py-5 shadow-sm md:px-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-black text-primary">Confirmateur / Devis</div>
            <h1 className="mt-2 text-2xl font-black text-card-foreground md:text-3xl">Devis B2B</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Liste des devis clients B2B à contrôler, traiter et convertir si nécessaire.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => quotesQuery.refetch()} disabled={quotesQuery.isFetching}>
            {quotesQuery.isFetching ? "Actualisation..." : "Rafraîchir"}
          </Button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total devis" value={metrics.total} hint="Résultats affichés" />
        <MetricCard label="Soumis" value={metrics.sent} hint="En attente de prise en charge" />
        <MetricCard label="Acceptés" value={metrics.accepted} hint="Convertibles en BC" />
        <MetricCard label="Convertis" value={metrics.converted} hint="Déjà rattachés à un BC" />
        <MetricCard label="Montant net" value={money(metrics.amount)} hint="Net à payer cumulé" />
      </section>

      <section className="rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_auto] xl:items-center">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher par N° devis, client, société ou code tiers..." />
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((item) => (
              <Button key={item} type="button" variant={status === item ? "primary" : "outline"} size="sm" onClick={() => setStatus(item)}>
                {item === "ALL" ? "Tous" : statusLabel(item)}
              </Button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {DATE_FILTERS.map((item) => (
            <Button key={item.value} type="button" variant={dateFilter === item.value ? "primary" : "outline"} size="sm" onClick={() => setDateFilter(item.value)}>
              {item.label}
            </Button>
          ))}
        </div>
      </section>

      {quotesQuery.isLoading ? <div className="text-sm text-muted-foreground">Chargement des devis B2B...</div> : null}
      {quotesQuery.isError ? <div className="ds-alert ds-alert-danger">{getApiErrorMessage(quotesQuery.error)}</div> : null}

      {!quotesQuery.isLoading && !quotesQuery.isError ? (
        filtered.length === 0 ? (
          <EmptyView
            title={quotes.length === 0 ? "Aucun devis B2B" : "Aucun résultat"}
            description={quotes.length === 0 ? "Les devis B2B disponibles apparaîtront ici." : "Aucun devis ne correspond aux filtres actuels."}
            iconPath="M6 2h9l5 5v15H6z M14 2v6h6 M9 13h6 M9 17h8"
          />
        ) : (
          <section className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
            <table className="min-w-[1060px] w-full text-sm">
              <thead className="border-b border-border bg-muted/35 text-left text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Référence devis</th>
                  <th className="px-4 py-3">Client B2B</th>
                  <th className="px-4 py-3">Code tiers</th>
                  <th className="px-4 py-3">Date création</th>
                  <th className="px-4 py-3">Validité</th>
                  <th className="px-4 py-3 text-right">Montant TTC</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {filtered.map((quote) => {
                  const canConvert = quote.quoteStatus === "ACCEPTE_CLIENT";
                  const isBusy = statusMutation.isPending || convertMutation.isPending;
                  return (
                    <tr key={quote.piece} className="hover:bg-muted/25">
                      <td className="px-4 py-4 font-mono font-black text-card-foreground">{quote.piece}</td>
                      <td className="px-4 py-4">
                        <div className="font-bold text-card-foreground">{clientLabel(quote)}</div>
                        <div className="text-xs text-muted-foreground">{safe(quote.companyName)}</div>
                      </td>
                      <td className="px-4 py-4 font-mono text-xs font-bold">{safe(quote.clientCode)}</td>
                      <td className="px-4 py-4">{formatDate(quote.date)}</td>
                      <td className="px-4 py-4">{formatDate(quote.validUntil)}</td>
                      <td className="px-4 py-4 text-right font-black text-card-foreground">{money(quote.netAPayer)}</td>
                      <td className="px-4 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(quote.quoteStatus)}`}>{statusLabel(quote.quoteStatus)}</span></td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <Link to={`/confirmateur/devis/${encodeURIComponent(quote.piece)}`}>
                            <Button type="button" variant="outline" size="sm">Consulter</Button>
                          </Link>
                          {quote.quoteStatus === "SOUMIS" ? (
                            <>
                              <Button type="button" variant="primary" size="sm" disabled={isBusy} onClick={() => statusMutation.mutate({ piece: quote.piece, nextStatus: "EN_ETUDE" })}>Prendre</Button>
                              <Button type="button" variant="ghost" size="sm" disabled={isBusy} onClick={() => statusMutation.mutate({ piece: quote.piece, nextStatus: "INFO_MANQUANTE" })}>Info</Button>
                            </>
                          ) : null}
                          {canConvert ? (
                            <Button type="button" variant="primary" size="sm" disabled={isBusy} onClick={() => convertMutation.mutate(quote.piece)}>Vers BC</Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )
      ) : null}
    </div>
  );
}

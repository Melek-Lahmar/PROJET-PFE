import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { EmptyView, PremiumHero } from "../../../shared/components/premium";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";
import {
  getConfirmateurClientHistory,
  searchConfirmateurClients,
  type ClientSearchItem,
} from "../api/confirmateurApi";
import { getOrderTimeline } from "../../orders/api/ordersApi";
import { OrderTimeline } from "../../orders/components/OrderTimeline";

function money(value?: number | null) {
  return typeof value === "number" ? `${value.toFixed(3)} TND` : "-";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("fr-FR");
}

function clientLabel(c: ClientSearchItem) {
  return c.nomSociete?.trim() || c.nomComplet?.trim() || c.telephone?.trim() || c.codeClientSage?.trim() || "Client";
}

function statutClass(statut?: string | null) {
  const s = (statut ?? "").toUpperCase();
  if (s === "LIVRE") return "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300";
  if (s === "REFUSE" || s === "RETOUR") return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300";
  if (s === "TENTATIVE" || s === "REPORTE") return "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300";
  if (s === "EN_ATTENTE") return "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-300";
  return "bg-primary/10 text-primary";
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-black text-card-foreground">{value}</div>
    </div>
  );
}

export function ConfirmateurSuiviPage() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const searchQuery = useQuery({
    queryKey: ["confirmateur", "client-search", debounced],
    queryFn: () => searchConfirmateurClients(debounced),
    enabled: debounced.length >= 2,
  });

  const historyQuery = useQuery({
    queryKey: ["confirmateur", "client-history", selectedClientId],
    queryFn: () => getConfirmateurClientHistory(selectedClientId as string),
    enabled: Boolean(selectedClientId),
  });

  const timelineQuery = useQuery({
    queryKey: ["confirmateur", "order-timeline", selectedPiece],
    queryFn: () => getOrderTimeline(selectedPiece as string),
    enabled: Boolean(selectedPiece),
  });

  const clients = searchQuery.data ?? [];
  const history = historyQuery.data;
  const stats = history?.stats;

  const selectedClient = useMemo(
    () => clients.find((c) => c.utilisateurId === selectedClientId) ?? null,
    [clients, selectedClientId],
  );

  return (
    <div className="w-full space-y-5 pb-10">
      <PremiumHero
        kicker="Confirmateur / Suivi"
        title="Suivi client"
        gradientTitle
        description="Recherchez un client par téléphone, nom ou code, puis consultez toutes ses commandes et leur suivi détaillé."
      />

      {/* Recherche */}
      <section className="rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-sm">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un client par téléphone, nom, société ou code tiers..."
        />
        {debounced.length >= 2 ? (
          searchQuery.isLoading ? (
            <div className="mt-3 text-sm text-muted-foreground">Recherche...</div>
          ) : searchQuery.isError ? (
            <div className="mt-3 ds-alert ds-alert-danger">{getApiErrorMessage(searchQuery.error)}</div>
          ) : clients.length === 0 ? (
            <div className="mt-3 text-sm text-muted-foreground">Aucun client trouvé pour « {debounced} ».</div>
          ) : (
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {clients.map((c) => {
                const active = c.utilisateurId === selectedClientId;
                return (
                  <button
                    key={c.utilisateurId ?? clientLabel(c)}
                    type="button"
                    onClick={() => {
                      setSelectedClientId(c.utilisateurId);
                      setSelectedPiece(null);
                    }}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      active ? "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/15" : "border-border/70 bg-card hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate font-bold text-card-foreground">{clientLabel(c)}</div>
                      {c.typeClient ? (
                        <span className="shrink-0 rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-black text-muted-foreground">{c.typeClient}</span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {c.telephone || "—"} · <span className="font-mono">{c.codeClientSage || "—"}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )
        ) : (
          <div className="mt-3 text-xs text-muted-foreground">Saisissez au moins 2 caractères.</div>
        )}
      </section>

      {/* Historique client sélectionné */}
      {selectedClientId ? (
        historyQuery.isLoading ? (
          <div className="text-sm text-muted-foreground">Chargement de l'historique...</div>
        ) : historyQuery.isError ? (
          <div className="ds-alert ds-alert-danger">{getApiErrorMessage(historyQuery.error)}</div>
        ) : history ? (
          <section className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-black text-card-foreground">
                    {selectedClient ? clientLabel(selectedClient) : history.client.nom || "Client"}
                  </div>
                  <div className="text-sm text-muted-foreground">{history.client.tel || "—"}</div>
                </div>
                <div className="text-sm font-semibold text-muted-foreground">
                  {history.client.totalCommandes} commande{history.client.totalCommandes > 1 ? "s" : ""}
                </div>
              </div>

              {stats ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
                  <StatTile label="Total" value={stats.total} />
                  <StatTile label="Livrées" value={stats.livrees} />
                  <StatTile label="En cours" value={stats.enCours} />
                  <StatTile label="Reportées" value={stats.reportees} />
                  <StatTile label="Refus/Retours" value={stats.refus + stats.retours} />
                  <StatTile label="Taux livraison" value={`${stats.tauxLivraison}%`} />
                </div>
              ) : null}
            </div>

            {history.orders.length === 0 ? (
              <EmptyView
                title="Aucune commande"
                description="Ce client n'a pas encore de commande enregistrée."
                iconPath="M7 3h10l2 4v14H5V7z"
              />
            ) : (
              <section className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
                <table className="min-w-[760px] w-full text-sm">
                  <thead className="border-b border-border bg-muted/35 text-left text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Référence</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Produits</th>
                      <th className="px-4 py-3 text-right">Montant</th>
                      <th className="px-4 py-3">Statut</th>
                      <th className="px-4 py-3 text-right">Suivi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {history.orders.map((o) => (
                      <tr key={o.piece} className={`hover:bg-muted/25 ${selectedPiece === o.piece ? "bg-primary/[0.05]" : ""}`}>
                        <td className="px-4 py-3 font-mono font-black text-card-foreground">{o.piece}</td>
                        <td className="px-4 py-3">{formatDate(o.date)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{o.produits || "-"}</td>
                        <td className="px-4 py-3 text-right font-black text-card-foreground">{money(o.montant)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statutClass(o.statut)}`}>{o.statut}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            type="button"
                            variant={selectedPiece === o.piece ? "primary" : "outline"}
                            size="sm"
                            onClick={() => setSelectedPiece((prev) => (prev === o.piece ? null : o.piece))}
                          >
                            {selectedPiece === o.piece ? "Masquer" : "Suivi"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {/* Tracking détaillé de la commande sélectionnée (vue staff = détail par article) */}
            {selectedPiece ? (
              timelineQuery.isLoading ? (
                <div className="text-sm text-muted-foreground">Chargement du suivi de {selectedPiece}...</div>
              ) : timelineQuery.isError ? (
                <div className="ds-alert ds-alert-danger">{getApiErrorMessage(timelineQuery.error)}</div>
              ) : timelineQuery.data ? (
                <OrderTimeline
                  status={timelineQuery.data.currentStatus}
                  timeline={timelineQuery.data}
                />
              ) : null
            ) : null}
          </section>
        ) : null
      ) : null}
    </div>
  );
}

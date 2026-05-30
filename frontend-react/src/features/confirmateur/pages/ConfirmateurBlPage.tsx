import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { getConfirmateurBlList } from "../api/confirmateurApi";
import type { ConfirmateurOrder } from "../types/confirmateur";
import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { clientDisplayFromOrder, formatDateTime, getConfirmateurStatusMeta, money, safe } from "../utils/confirmateurUi";
import { AnimatedCounter } from "../../../shared/components/premium";

type DateRangeFilter = "ALL" | "TODAY" | "THIS_WEEK" | "ONE_MONTH" | "SIX_MONTHS" | "ONE_YEAR";

const STATUS_FILTERS: Array<{ label: string; value?: number }> = [
  { label: "Tous" },
  { label: "À confirmer", value: 0 },
  { label: "Expédié", value: 1 },
  { label: "Bloqué", value: 2 },
  { label: "Annulé", value: 3 },
];

const DATE_FILTERS: Array<{ label: string; value: DateRangeFilter }> = [
  { label: "Tout", value: "ALL" },
  { label: "Aujourd'hui", value: "TODAY" },
  { label: "Cette semaine", value: "THIS_WEEK" },
  { label: "1 mois", value: "ONE_MONTH" },
  { label: "6 mois", value: "SIX_MONTHS" },
  { label: "1 an", value: "ONE_YEAR" },
];

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

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint: string;
}) {
  return (
    <div className="hover-lift rounded-[24px] border border-border/70 bg-muted/25 px-4 py-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-2xl font-black tracking-tight text-card-foreground">
        {typeof value === "number" ? <AnimatedCounter value={value} /> : value}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

export function ConfirmateurBlPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<number | undefined>(undefined);
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>("ALL");

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["confirmateur", "bl"],
    queryFn: () => getConfirmateurBlList(),
  });

  const blList = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return blList.filter((order: ConfirmateurOrder) => {
      if (status !== undefined && order.dO_Valide !== status) return false;
      if (!matchesDateRange(order.dO_Date, dateFilter)) return false;
      if (!q) return true;
      const piece = (order.dO_Piece ?? "").toLowerCase();
      const tiers = (order.dO_Tiers ?? "").toLowerCase();
      const depot = order.dE_No ? `depot ${order.dE_No}` : "";
      const client = clientDisplayFromOrder(order).toLowerCase();
      const statusLabel = (order.statusLabel ?? "").toLowerCase();
      return piece.includes(q) || tiers.includes(q) || client.includes(q) || statusLabel.includes(q) || depot.includes(q);
    });
  }, [blList, search, status, dateFilter]);

  const metrics = useMemo(() => {
    const totalNet = filtered.reduce((sum, order) => sum + Number(order.dO_NetAPayer ?? 0), 0);
    const totalTtc = filtered.reduce((sum, order) => sum + Number(order.dO_TotalTTC ?? 0), 0);
    const todayCount = filtered.filter((order) => {
      if (!order.dO_Date) return false;
      const current = new Date();
      const date = new Date(order.dO_Date);
      return !Number.isNaN(date.getTime()) && current.toDateString() === date.toDateString();
    }).length;

    return { total: filtered.length, totalNet, totalTtc, todayCount };
  }, [filtered]);

  return (
    <div className="w-full space-y-6 pb-10">
      <section className="app-surface px-6 py-6 md:px-7 md:py-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <div className="app-kicker">Confirmateur</div>
            <h1 className="app-title">Bons de livraison (BL)</h1>
            <p className="app-description max-w-3xl">
              Liste des bons de livraison à contrôler et suivre.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link to="/confirmateur/commandes">
              <Button type="button" variant="outline" className="h-11 rounded-2xl px-5">
                Revenir aux BC
              </Button>
            </Link>
            <Button type="button" variant="outline" onClick={() => refetch()} className="h-11 rounded-2xl px-5">
              {isFetching ? "Actualisation..." : "Rafraîchir"}
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="BL visibles" value={metrics.total} hint="Résultats après recherche" />
        <SummaryCard label="Créés aujourd’hui" value={metrics.todayCount} hint="Volume journalier affiché" />
        <SummaryCard label="Total TTC" value={money(metrics.totalTtc)} hint="Somme des BL affichés" />
        <SummaryCard label="Net à payer" value={money(metrics.totalNet)} hint="Vision consolidée confirmateur" />
      </section>

      <section className="app-surface px-5 py-5 md:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="text-lg font-extrabold text-card-foreground">Liste des BL</div>
            <div className="mt-1 text-sm text-muted-foreground">Chaque BL reste consultable sans toucher au flux de création existant.</div>
          </div>

          <div className="flex w-full flex-col gap-3 xl:w-auto xl:min-w-[440px] xl:flex-row">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par N° BL, tiers, client ou statut..."
            />
            <div className="inline-flex items-center rounded-2xl border border-border/70 bg-muted/25 px-4 text-sm font-semibold text-muted-foreground">
              {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {STATUS_FILTERS.map((item) => (
            <Button
              key={item.label}
              type="button"
              variant={status === item.value ? "primary" : "outline"}
              size="sm"
              onClick={() => setStatus(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {DATE_FILTERS.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={dateFilter === item.value ? "primary" : "outline"}
              size="sm"
              onClick={() => setDateFilter(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </section>

      {isLoading ? <div className="text-sm text-muted-foreground">Chargement des bons de livraison...</div> : null}

      {isError ? (
        <div className="rounded-[24px] border border-danger/25 bg-danger/10 px-4 py-4 text-sm font-semibold text-danger">
          Erreur : {(error as Error)?.message ?? "Impossible de charger les BL."}
        </div>
      ) : null}

      {!isLoading && !isError ? (
        <section className="overflow-hidden rounded-[30px] border border-border bg-card shadow-sm">
          <div className="grid min-w-[1080px] grid-cols-12 gap-3 border-b border-border bg-muted/35 px-5 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            <div className="col-span-2">Référence BL</div>
            <div className="col-span-2">Référence BC</div>
            <div className="col-span-2">Client</div>
            <div className="col-span-1">Entrepôt</div>
            <div className="col-span-2">Date livraison</div>
            <div className="col-span-1 text-right">Montant TTC</div>
            <div className="col-span-1">Statut</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>

          <div className="overflow-x-auto">
            {filtered.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-muted-foreground">Aucun bon de livraison trouvé.</div>
            ) : (
              <div className="min-w-[1080px] divide-y divide-border/70">
                {filtered.map((order) => {
                  const piece = safe(order.dO_Piece);
                  const client = clientDisplayFromOrder(order);
                  const statusMeta = getConfirmateurStatusMeta(order.statusLabel, order.dO_Valide);

                  return (
                    <div key={`${order.dO_Piece ?? piece}`} className="grid grid-cols-12 gap-3 px-5 py-4 transition hover:bg-muted/25">
                      <div className="col-span-2 min-w-0">
                        <div className="flex items-start gap-3">
                          <span className="mt-1 h-12 w-1 rounded-full bg-primary/60" />
                          <div className="min-w-0 space-y-2">
                            <div className="truncate text-base font-black text-card-foreground">{piece}</div>
                            <div className="text-xs text-muted-foreground">BL dédié</div>
                          </div>
                        </div>
                      </div>

                      <div className="col-span-2 min-w-0">
                        <div className="truncate font-mono text-sm font-semibold text-card-foreground">-</div>
                        <div className="mt-1 text-xs text-muted-foreground">Lien BC non disponible</div>
                      </div>

                      <div className="col-span-2 min-w-0">
                        <div className="truncate font-semibold text-card-foreground">{client}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{safe(order.dO_Tiers)}</div>
                      </div>

                      <div className="col-span-1 min-w-0">
                        <div className="truncate font-semibold text-card-foreground">{order.dE_No ? `Dépôt ${order.dE_No}` : "-"}</div>
                      </div>

                      <div className="col-span-2">
                        <div className="font-semibold text-card-foreground">{formatDateTime(order.dO_Date)}</div>
                      </div>

                      <div className="col-span-1 text-right">
                        <div className="font-black text-card-foreground">{money(order.dO_TotalTTC)}</div>
                      </div>

                      <div className="col-span-1">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${statusMeta.badgeClass}`}>
                          {statusMeta.label}
                        </span>
                      </div>

                      <div className="col-span-1 flex items-center justify-end">
                        <Link to={`/confirmateur/bl/${encodeURIComponent(order.dO_Piece ?? "")}`}>
                          <Button type="button" variant="outline" size="sm" className="px-4">
                            Consulter
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

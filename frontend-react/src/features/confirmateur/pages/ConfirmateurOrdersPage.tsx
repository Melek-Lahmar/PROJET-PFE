import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { getConfirmateurOrders } from "../api/confirmateurApi";
import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import type { ConfirmateurOrder, OrderStatusValue } from "../types/confirmateur";
import { getConfirmateurStatusMeta, clientDisplayFromOrder, formatDateTime, money, safe } from "../utils/confirmateurUi";
import {
  AnimatedCounter,
  EmptyView,
  PremiumHero,
} from "../../../shared/components/premium";

const TABS: Array<{ label: string; value?: OrderStatusValue }> = [
  { label: "Toutes" },
  { label: "En attente", value: 0 },
  { label: "Tentatives", value: 2 },
  { label: "Refusées", value: 3 },
];

type DateRangeFilter = "ALL" | "TODAY" | "THIS_WEEK" | "ONE_MONTH" | "SIX_MONTHS" | "ONE_YEAR";

const DATE_FILTERS: Array<{ label: string; value: DateRangeFilter }> = [
  { label: "All", value: "ALL" },
  { label: "Today", value: "TODAY" },
  { label: "This week", value: "THIS_WEEK" },
  { label: "1 month", value: "ONE_MONTH" },
  { label: "6 months", value: "SIX_MONTHS" },
  { label: "1 year", value: "ONE_YEAR" },
];

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

function parseOrderDate(value?: string | null): Date | null {
  if (!value || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function startOfWeekMonday(date: Date) {
  const current = startOfDay(date);
  const day = current.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  current.setDate(current.getDate() + diff);
  return current;
}

function addMonths(date: Date, months: number) {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

function matchesDateRange(orderDateValue: string | null | undefined, filter: DateRangeFilter) {
  if (filter === "ALL") return true;

  const orderDate = parseOrderDate(orderDateValue);
  if (!orderDate) return false;

  const now = new Date();

  switch (filter) {
    case "TODAY": {
      const start = startOfDay(now);
      const end = endOfDay(now);
      return orderDate >= start && orderDate <= end;
    }

    case "THIS_WEEK": {
      const start = startOfWeekMonday(now);
      const end = endOfDay(now);
      return orderDate >= start && orderDate <= end;
    }

    case "ONE_MONTH": {
      const start = addMonths(now, -1);
      return orderDate >= start && orderDate <= now;
    }

    case "SIX_MONTHS": {
      const start = addMonths(now, -6);
      return orderDate >= start && orderDate <= now;
    }

    case "ONE_YEAR": {
      const start = addMonths(now, -12);
      return orderDate >= start && orderDate <= now;
    }

    default:
      return true;
  }
}

function getDateFilterDescription(filter: DateRangeFilter) {
  switch (filter) {
    case "TODAY":
      return "Commandes datées d’aujourd’hui";
    case "THIS_WEEK":
      return "Commandes de la semaine en cours";
    case "ONE_MONTH":
      return "Commandes des 30 derniers jours";
    case "SIX_MONTHS":
      return "Commandes des 6 derniers mois";
    case "ONE_YEAR":
      return "Commandes des 12 derniers mois";
    default:
      return "Toutes les commandes visibles";
  }
}

export function ConfirmateurOrdersPage() {
  const [tab, setTab] = useState<OrderStatusValue | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>("ALL");

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["confirmateur-orders", tab],
    queryFn: () => getConfirmateurOrders(tab),
  });

  const orders = data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesPeriod = matchesDateRange(order.dO_Date, dateFilter);
      if (!matchesPeriod) return false;

      if (!q) return true;

      const piece = (order.dO_Piece ?? "").toLowerCase();
      const tiers = (order.dO_Tiers ?? "").toLowerCase();
      const client = clientDisplayFromOrder(order).toLowerCase();
      const status = (order.statusLabel ?? "").toLowerCase();

      return (
        piece.includes(q) ||
        tiers.includes(q) ||
        client.includes(q) ||
        status.includes(q)
      );
    });
  }, [orders, search, dateFilter]);

  const metrics = useMemo(() => {
    let pending = 0;
    let attempted = 0;
    let refused = 0;
    let transformed = 0;

    for (const order of filtered) {
      const meta = getConfirmateurStatusMeta(order.statusLabel, order.dO_Valide);
      if (meta.workflowState === "pending") pending += 1;
      if (meta.workflowState === "attempted") attempted += 1;
      if (meta.workflowState === "refused") refused += 1;
      if (meta.workflowState === "transformed") transformed += 1;
    }

    return {
      total: filtered.length,
      pending,
      attempted,
      refused,
      transformed,
    };
  }, [filtered]);

  return (
    <div className="w-full space-y-6 pb-10">
      <PremiumHero
        kicker="Confirmateur"
        title="Pilotage des bons de commande"
        gradientTitle
        description="Vue métier confirmateur pour analyser les BC, qualifier leur statut, puis déclencher la transformation vers le BL sans casser le flux existant."
        actions={
          <>
            <Link to="/confirmateur/bl">
              <Button type="button" variant="outline" className="h-11 rounded-2xl px-5">
                Voir les BL
              </Button>
            </Link>
            <Button type="button" variant="outline" onClick={() => refetch()} className="h-11 rounded-2xl px-5">
              {isFetching ? "Actualisation..." : "Rafraîchir"}
            </Button>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Total BC" value={metrics.total} hint={getDateFilterDescription(dateFilter)} />
        <SummaryCard label="En attente" value={metrics.pending} hint="À qualifier par le confirmateur" />
        <SummaryCard label="Tentatives" value={metrics.attempted} hint="Points d’attention signalés" />
        <SummaryCard label="Refusées" value={metrics.refused} hint="Clôturées sans validation" />
        <SummaryCard label="Transformées" value={metrics.transformed} hint="Déjà converties en BL" />
      </section>

      <section className="app-surface px-5 py-5 md:px-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {TABS.map((item) => {
                const active = item.value === tab;
                return (
                  <Button
                    key={item.label}
                    type="button"
                    variant={active ? "primary" : "outline"}
                    onClick={() => setTab(item.value)}
                    className="rounded-2xl px-4"
                  >
                    {item.label}
                  </Button>
                );
              })}
            </div>

            <div className="flex w-full flex-col gap-3 xl:w-auto xl:min-w-[460px] xl:flex-row">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par N° BC, tiers, client ou statut..."
              />
              <div className="inline-flex items-center justify-center rounded-2xl border border-border/70 bg-muted/25 px-4 text-sm font-semibold text-muted-foreground">
                {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-border/70 bg-muted/20 px-4 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Filtre période</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Sélectionnez une période d’analyse confirmateur. Le filtre par défaut est <span className="font-semibold text-card-foreground">All</span>.
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {DATE_FILTERS.map((item) => {
                  const active = item.value === dateFilter;
                  return (
                    <Button
                      key={item.value}
                      type="button"
                      variant={active ? "primary" : "outline"}
                      onClick={() => setDateFilter(item.value)}
                      className="rounded-2xl px-4"
                    >
                      {item.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {isLoading ? <div className="text-sm text-muted-foreground">Chargement des bons de commande...</div> : null}

      {isError ? (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-semibold text-rose-700">
          Erreur : {(error as Error)?.message ?? "Impossible de charger les commandes confirmateur."}
        </div>
      ) : null}

      {!isLoading && !isError ? (
        <section className="overflow-hidden rounded-[30px] border border-border bg-card shadow-sm">
          <div className="grid min-w-[1100px] grid-cols-12 gap-3 border-b border-border bg-muted/35 px-5 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            <div className="col-span-3">Commande / statut</div>
            <div className="col-span-2">Client</div>
            <div className="col-span-2">Tiers</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-2">Montants</div>
            <div className="col-span-1 text-right">Action</div>
          </div>

          <div className="overflow-x-auto">
            {filtered.length === 0 ? (
              <div className="px-5 py-8">
                <EmptyView
                  title="Aucun bon de commande"
                  description="Aucun BC ne correspond aux filtres actuels. Modifiez la période, le statut ou la recherche."
                  iconPath="M21 21l-4.35-4.35 M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"
                />
              </div>
            ) : (
              <div className="min-w-[1100px] divide-y divide-border/70">
                {filtered.map((order: ConfirmateurOrder) => {
                  const piece = safe(order.dO_Piece);
                  const client = clientDisplayFromOrder(order);
                  const statusMeta = getConfirmateurStatusMeta(order.statusLabel, order.dO_Valide);

                  return (
                    <div key={`${order.dO_Piece ?? piece}`} className="grid grid-cols-12 gap-3 px-5 py-4 transition hover:bg-muted/25">
                      <div className="col-span-3 min-w-0">
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-1 h-12 w-1 rounded-full ${
                              statusMeta.workflowState === "refused"
                                ? "bg-rose-400"
                                : statusMeta.workflowState === "attempted"
                                  ? "bg-sky-400"
                                  : statusMeta.workflowState === "transformed"
                                    ? "bg-emerald-400"
                                    : "bg-amber-400"
                            }`}
                          />
                          <div className="min-w-0 space-y-2">
                            <div className="truncate text-base font-black text-card-foreground">{piece}</div>
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${statusMeta.badgeClass}`}>
                              {statusMeta.label}
                            </span>
                            <div className="text-xs text-muted-foreground">{statusMeta.description}</div>
                          </div>
                        </div>
                      </div>

                      <div className="col-span-2 min-w-0">
                        <div className="truncate font-semibold text-card-foreground">{client}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{order.clientType || "Type non précisé"}</div>
                      </div>

                      <div className="col-span-2 min-w-0">
                        <div className="truncate font-mono text-sm text-card-foreground">{safe(order.dO_Tiers)}</div>
                        <div className="mt-1 text-xs text-muted-foreground">Code tiers Sage</div>
                      </div>

                      <div className="col-span-2">
                        <div className="font-semibold text-card-foreground">{formatDateTime(order.dO_Date)}</div>
                        <div className="mt-1 text-xs text-muted-foreground">Dernière date métier visible</div>
                      </div>

                      <div className="col-span-2">
                        <div className="font-black text-card-foreground">{money(order.dO_TotalTTC)}</div>
                        <div className="mt-1 text-xs text-muted-foreground">Net : {money(order.dO_NetAPayer)}</div>
                      </div>

                      <div className="col-span-1 flex items-center justify-end">
                        <Link to={`/confirmateur/commandes/${encodeURIComponent(order.dO_Piece ?? "")}`}>
                          <Button type="button" variant="outline" size="sm" className="px-4">
                            Ouvrir
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
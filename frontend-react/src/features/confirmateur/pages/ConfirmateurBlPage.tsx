import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { getConfirmateurBlList } from "../api/confirmateurApi";
import type { ConfirmateurOrder } from "../types/confirmateur";
import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { clientDisplayFromOrder, formatDateTime, getConfirmateurStatusMeta, money, safe } from "../utils/confirmateurUi";
import { AnimatedCounter } from "../../../shared/components/premium";

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

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["confirmateur-bl"],
    queryFn: () => getConfirmateurBlList(),
  });

  const blList = data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return blList;

    return blList.filter((order: ConfirmateurOrder) => {
      const piece = (order.dO_Piece ?? "").toLowerCase();
      const tiers = (order.dO_Tiers ?? "").toLowerCase();
      const client = clientDisplayFromOrder(order).toLowerCase();
      const status = (order.statusLabel ?? "").toLowerCase();
      return piece.includes(q) || tiers.includes(q) || client.includes(q) || status.includes(q);
    });
  }, [blList, search]);

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
            <h1 className="app-title">Bons de livraison générés</h1>
            <p className="app-description max-w-3xl">
              Vue de suivi des BL issus de la confirmation des bons de commande, avec recherche rapide et lecture métier plus claire.
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
      </section>

      {isLoading ? <div className="text-sm text-muted-foreground">Chargement des bons de livraison...</div> : null}

      {isError ? (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-semibold text-rose-700">
          Erreur : {(error as Error)?.message ?? "Impossible de charger les BL."}
        </div>
      ) : null}

      {!isLoading && !isError ? (
        <section className="overflow-hidden rounded-[30px] border border-border bg-card shadow-sm">
          <div className="grid min-w-[1080px] grid-cols-12 gap-3 border-b border-border bg-muted/35 px-5 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            <div className="col-span-3">BL / statut</div>
            <div className="col-span-2">Client</div>
            <div className="col-span-2">Tiers</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-2">Montants</div>
            <div className="col-span-1 text-right">Action</div>
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
                      <div className="col-span-3 min-w-0">
                        <div className="flex items-start gap-3">
                          <span className="mt-1 h-12 w-1 rounded-full bg-primary/60" />
                          <div className="min-w-0 space-y-2">
                            <div className="truncate text-base font-black text-card-foreground">{piece}</div>
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${statusMeta.badgeClass}`}>
                              {statusMeta.label}
                            </span>
                            <div className="text-xs text-muted-foreground">BL issu du parcours de confirmation.</div>
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
                        <div className="mt-1 text-xs text-muted-foreground">Horodatage visible</div>
                      </div>

                      <div className="col-span-2">
                        <div className="font-black text-card-foreground">{money(order.dO_TotalTTC)}</div>
                        <div className="mt-1 text-xs text-muted-foreground">Net : {money(order.dO_NetAPayer)}</div>
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
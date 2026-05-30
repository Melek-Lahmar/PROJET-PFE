import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getBonLivraisons } from "../api/blApi";
import type { BonLivraison } from "../types/bl";
import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { PremiumHero } from "../../../shared/components/premium/PremiumHero";
import { PremiumCard } from "../../../shared/components/premium/PremiumCard";
import { EmptyView } from "../../../shared/components/premium/EmptyView";
import { StaggeredColumn } from "../../../shared/components/premium/AnimatedEntry";
import { Skeleton } from "../../../shared/components/premium/Skeleton";
import { AnimatedCounter } from "../../../shared/components/premium/AnimatedCounter";

function money(v?: number | null) {
  return typeof v === "number" ? `${v.toFixed(3)} TND` : "—";
}

function statusTone(status?: string | null) {
  const s = (status ?? "").toUpperCase();
  if (s.includes("LIVR")) return "bg-success/10 text-success ring-success/25";
  if (s.includes("ATTENTE")) return "bg-warning/10 text-warning ring-warning/25";
  if (s.includes("CONF")) return "bg-info/10 text-info ring-info/25";
  if (s.includes("REF")) return "bg-danger/10 text-danger ring-danger/25";
  return "bg-muted/55 text-card-foreground/90 ring-border";
}

function StatusBadge({ status }: { status?: string | null }) {
  const label = status && status.trim() ? status : "INCONNU";
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusTone(
        label
      )}`}
    >
      {label}
    </span>
  );
}

export function ConfirmateurBlListPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["bl-list"],
    queryFn: () => getBonLivraisons(),
  });

  const filtered = useMemo(() => {
    const list = (data ?? []).filter((x) => (x.piece ?? "").toUpperCase().startsWith("BL"));
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((bl) => {
      const piece = (bl.piece ?? "").toLowerCase();
      const client = (bl.clientCode ?? "").toLowerCase();
      return piece.includes(q) || client.includes(q);
    });
  }, [data, search]);

  return (
    <div className="w-full space-y-7 pb-10">
      <PremiumHero
        kicker="Confirmateur"
        title="Commandes passées · BL"
        description="Bons de livraison générés après confirmation, en attente de livraison effective."
        gradientTitle
        actions={
          <>
            <Link to="/confirmateur/commandes">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-2xl px-5 shadow-sm"
              >
                ← Retour BC
              </Button>
            </Link>
            <Button
              type="button"
              variant="outline"
              onClick={() => refetch()}
              className="h-11 rounded-2xl px-5 shadow-sm"
              isLoading={isFetching}
            >
              {isFetching ? "Actualisation…" : "Rafraîchir"}
            </Button>
          </>
        }
        trailing={
          <PremiumCard tone="primary" className="text-right">
            <p className="app-kicker">Volume</p>
            <p className="mt-2 text-5xl font-black tracking-tight text-card-foreground">
              <AnimatedCounter value={(data ?? []).length} />
            </p>
            <p className="mt-2 text-sm text-muted-foreground">BL au total</p>
          </PremiumCard>
        }
      />

      <PremiumCard noPadding>
        <div className="flex flex-col gap-3 border-b border-border/60 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="app-kicker">Rechercher</p>
            <h2 className="mt-1 text-lg font-extrabold text-card-foreground">
              {filtered.length} BL trouvé{filtered.length > 1 ? "s" : ""}
            </h2>
          </div>
          <div className="w-full lg:w-[420px]">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par N° BL ou client…"
              className="h-11 rounded-2xl border-border bg-card/70 shadow-sm focus:bg-card"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 px-6 py-6">
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
          </div>
        ) : isError ? (
          <div className="px-6 py-6">
            <EmptyView
              title="Erreur"
              description={
                (error as { message?: string })?.message ?? "Impossible de charger les BL."
              }
              action={
                <Button onClick={() => refetch()} className="h-10 rounded-2xl px-5">
                  Réessayer
                </Button>
              }
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-6">
            <EmptyView
              title="Aucun BL trouvé"
              description={
                search.trim()
                  ? `Aucun BL ne correspond à « ${search.trim()} ».`
                  : "Aucun bon de livraison enregistré pour le moment."
              }
            />
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-12 gap-3 bg-muted/35 px-6 py-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              <div className="col-span-3">N° BL</div>
              <div className="col-span-3">Client</div>
              <div className="col-span-3">Date</div>
              <div className="col-span-2">Net à payer</div>
              <div className="col-span-1 text-right">Action</div>
            </div>
            <StaggeredColumn className="divide-y divide-border/40">
              {filtered.map((bl: BonLivraison) => (
                <div
                  key={bl.piece}
                  className="grid grid-cols-12 items-center gap-3 px-6 py-4 transition hover:bg-muted/30"
                >
                  <div className="col-span-3 min-w-0">
                    <div className="truncate text-sm font-extrabold text-card-foreground">
                      {bl.piece}
                    </div>
                    <div className="mt-1">
                      <StatusBadge status={bl.status} />
                    </div>
                  </div>
                  <div className="col-span-3 min-w-0 truncate text-sm font-semibold text-card-foreground/90">
                    {bl.clientCode}
                  </div>
                  <div className="col-span-3 text-sm text-muted-foreground">
                    {bl.date ? new Date(bl.date).toLocaleString("fr-FR") : "—"}
                  </div>
                  <div className="col-span-2 text-sm font-extrabold text-card-foreground">
                    {money(bl.netAPayer)}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Link to={`/confirmateur/bl/${encodeURIComponent(bl.piece)}`}>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 rounded-2xl border-border px-4 shadow-sm hover:bg-card"
                      >
                        Consulter
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </StaggeredColumn>
          </div>
        )}
      </PremiumCard>
    </div>
  );
}

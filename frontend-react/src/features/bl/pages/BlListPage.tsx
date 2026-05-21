import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getBonLivraisons } from "../api/blApi";
import type { BonLivraison } from "../types/bl";
import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { BlStatusBadge } from "../components/BlStatusBadge";
import {
  EmptyView,
  PremiumHero,
  Skeleton,
} from "../../../shared/components/premium";

type Props = {
  title: string;
  subtitle: string;
  detailsBasePath: string; // "/confirmateur/bl" ou "/livreur/bl"
};

function money(v?: number | null) {
  return typeof v === "number" ? `${v.toFixed(3)} TND` : "-";
}

export function BlListPage({ title, subtitle, detailsBasePath }: Props) {
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["bl-list"],
    queryFn: () => getBonLivraisons(),
  });

  const filtered = useMemo(() => {
    const list = data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((bl) => {
      const piece = (bl.piece ?? "").toLowerCase();
      const client = (bl.clientCode ?? "").toLowerCase();
      return piece.includes(q) || client.includes(q);
    });
  }, [data, search]);

  return (
    <div className="w-full space-y-6 pb-10">
      <PremiumHero
        kicker="BL"
        title={title}gradientTitle
        description={subtitle}
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => refetch()}
            className="h-10 rounded-2xl border-border bg-white/15 px-4 text-white shadow-sm hover:bg-white/25"
          >
            {isFetching ? "Actualisation..." : "Rafraîchir"}
          </Button>
        }
      />

      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="space-y-4 px-7 py-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="lg:ml-auto lg:w-[420px]">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par N° BL ou client..."
                className="h-10 rounded-2xl border-border bg-card/70 shadow-sm focus:bg-card"
              />
            </div>
          </div>

          {isLoading && (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} height={52} rounded="lg" />
              ))}
            </div>
          )}

          {isError && (
            <div className="ds-alert ds-alert-danger">
              Erreur: {(error as any)?.message ?? "Impossible de charger les BL."}
            </div>
          )}

          {!isLoading && !isError && (
            <div className="overflow-hidden rounded-3xl border border-border bg-card">
              <div className="grid grid-cols-12 gap-3 bg-muted/35 px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                <div className="col-span-3">N° BL</div>
                <div className="col-span-3">Client</div>
                <div className="col-span-3">Date</div>
                <div className="col-span-2">Net à payer</div>
                <div className="col-span-1 text-right">Action</div>
              </div>

              {filtered.length === 0 ? (
                <div className="p-6">
                  <EmptyView
                    title="Aucun BL trouvé"
                    description={search ? "Aucun BL ne correspond à votre recherche." : "Il n'y a aucun BL disponible pour le moment."}
                    iconPath="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8"
                  />
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {filtered.map((bl: BonLivraison) => (
                    <div key={bl.piece} className="grid grid-cols-12 items-center gap-3 px-5 py-4 hover:bg-muted/35">
                      <div className="col-span-3 min-w-0">
                        <div className="truncate text-sm font-extrabold text-card-foreground">{bl.piece}</div>
                        <div className="mt-1">
                          <BlStatusBadge status={bl.status} />
                        </div>
                      </div>

                      <div className="col-span-3 min-w-0 truncate text-sm font-semibold text-card-foreground/90">
                        {bl.clientCode}
                      </div>

                      <div className="col-span-3 text-sm text-muted-foreground">
                        {bl.date ? new Date(bl.date).toLocaleString("fr-FR") : "-"}
                      </div>

                      <div className="col-span-2 text-sm font-extrabold text-card-foreground">{money(bl.netAPayer)}</div>

                      <div className="col-span-1 flex justify-end">
                        <Link to={`${detailsBasePath}/${encodeURIComponent(bl.piece)}`}>
                          <Button type="button" variant="outline" className="h-10 rounded-2xl border-border px-4 shadow-sm hover:bg-card">
                            Ouvrir
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
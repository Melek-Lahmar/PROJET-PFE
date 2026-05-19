import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getBonLivraisonByPiece } from "../api/blApi";
import { Button } from "../../../shared/components/Button";
import { PremiumHero } from "../../../shared/components/premium/PremiumHero";
import { PremiumCard } from "../../../shared/components/premium/PremiumCard";
import { SectionHeader } from "../../../shared/components/premium/SectionHeader";
import { EmptyView } from "../../../shared/components/premium/EmptyView";
import { Skeleton } from "../../../shared/components/premium/Skeleton";

function money(v?: number | null) {
  return typeof v === "number" ? `${v.toFixed(3)} TND` : "—";
}

export function ConfirmateurBlDetailsPage() {
  const { piece } = useParams<{ piece: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["bl", piece],
    queryFn: () => getBonLivraisonByPiece(piece as string),
    enabled: !!piece,
  });

  if (isLoading) {
    return (
      <div className="w-full space-y-6 py-6">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-80 rounded-3xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="w-full py-6">
        <EmptyView
          title="BL introuvable"
          description="Impossible de charger ce bon de livraison."
          action={
            <Link to="/confirmateur/commandes">
              <Button type="button" className="h-11 rounded-2xl px-5">
                ← Retour commandes
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
          to="/confirmateur/commandes"
          className="text-sm font-semibold text-primary hover:underline"
        >
          ← Retour commandes
        </Link>
      </div>

      <PremiumHero
        kicker="Bon de livraison"
        title={
          <span>
            <span className="font-mono">{data.piece}</span>
          </span>
        }
        description={
          data.sourceBcPiece ? (
            <span>
              Source BC :{" "}
              <span className="font-mono font-bold">{data.sourceBcPiece}</span>
            </span>
          ) : (
            "Détail du bon de livraison confirmateur."
          )
        }
        trailing={
          <PremiumCard tone="primary" className="text-right">
            <p className="app-kicker">Total</p>
            <p className="mt-2 text-3xl font-black tracking-tight text-card-foreground">
              {money(data.netAPayer)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">Net à payer</p>
          </PremiumCard>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PremiumCard tone="soft">
          <p className="app-kicker">Client</p>
          <p className="mt-2 text-2xl font-extrabold text-card-foreground">
            {data.clientCode}
          </p>
        </PremiumCard>
        <PremiumCard tone="soft">
          <p className="app-kicker">Net à payer</p>
          <p className="mt-2 text-2xl font-extrabold text-primary">
            {money(data.netAPayer)}
          </p>
        </PremiumCard>
      </div>

      <PremiumCard noPadding>
        <SectionHeader
          kicker="Lignes"
          title="Articles du bon"
          className="px-6 py-5"
        />
        <div className="overflow-hidden border-t border-border/60">
          <div className="grid grid-cols-12 gap-3 bg-muted/35 px-6 py-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            <div className="col-span-3">Article</div>
            <div className="col-span-6">Désignation</div>
            <div className="col-span-1 text-right">Qté</div>
            <div className="col-span-2 text-right">TTC</div>
          </div>
          {(data.lines ?? []).length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              Aucune ligne enregistrée.
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {(data.lines ?? []).map((l, idx) => (
                <div
                  key={`${l.articleRef}-${idx}`}
                  className="grid grid-cols-12 items-center gap-3 px-6 py-4 text-sm transition hover:bg-muted/30"
                >
                  <div className="col-span-3 font-mono font-bold text-card-foreground">
                    {l.articleRef}
                  </div>
                  <div className="col-span-6 truncate text-card-foreground/90">
                    {l.designation ?? "—"}
                  </div>
                  <div className="col-span-1 text-right font-bold text-card-foreground">
                    {l.qty}
                  </div>
                  <div className="col-span-2 text-right font-extrabold text-card-foreground">
                    {money(l.amountTTC)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PremiumCard>
    </div>
  );
}

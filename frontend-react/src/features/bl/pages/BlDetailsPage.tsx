import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getBonLivraisonByPiece } from "../api/blApi";
import { Button } from "../../../shared/components/Button";
import { BlStatusBadge } from "../components/BlStatusBadge";
import { PremiumHero } from "../../../shared/components/premium/PremiumHero";
import { PremiumCard } from "../../../shared/components/premium/PremiumCard";
import { SectionHeader } from "../../../shared/components/premium/SectionHeader";
import { Skeleton } from "../../../shared/components/premium/Skeleton";
import { EmptyView } from "../../../shared/components/premium/EmptyView";

type Props = {
  backHref: string;
  backLabel: string;
};

function money(v?: number | null) {
  return typeof v === "number" ? `${v.toFixed(3)} TND` : "—";
}

function safe(v?: string | null) {
  return v && v.trim() ? v : "—";
}

export function BlDetailsPage({ backHref, backLabel }: Props) {
  const { piece } = useParams<{ piece: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["bl", piece],
    queryFn: () => getBonLivraisonByPiece(piece as string),
    enabled: !!piece,
  });

  if (isLoading) {
    return (
      <div className="w-full space-y-6 py-6">
        <Skeleton className="h-14 w-1/2" />
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <Skeleton className="h-80 rounded-3xl" />
          <Skeleton className="h-80 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="w-full py-6">
        <EmptyView
          title="BL introuvable"
          description="Impossible de charger le détail de ce bon de livraison."
          action={
            <Link to={backHref}>
              <Button type="button" className="h-11 rounded-2xl px-5">
                ← {backLabel}
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
        <Link to={backHref} className="text-sm font-semibold text-primary hover:underline">
          ← {backLabel}
        </Link>
      </div>
      <PremiumHero
        kicker="Bon de livraison"
        title={
          <span className="flex flex-wrap items-center gap-3">
            BL <span className="font-mono">{safe(data.piece)}</span>
            <BlStatusBadge status={data.status} />
          </span>
        }
        description={
          <span>
            Client : <span className="font-semibold">{safe(data.clientCode)}</span>
            {data.sourceBcPiece ? (
              <>
                {" "}· Source BC :{" "}
                <span className="font-mono font-bold">{data.sourceBcPiece}</span>
              </>
            ) : null}
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
          </PremiumCard>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Articles */}
        <PremiumCard noPadding>
          <SectionHeader
            kicker="Lignes"
            title="Articles du bon"
            className="px-6 py-5"
          />

          {(data.lines ?? []).length === 0 ? (
            <div className="px-6 pb-6">
              <EmptyView title="Aucune ligne" description="Ce BL ne contient pas d'articles." />
            </div>
          ) : (
            <div className="overflow-hidden border-t border-border/60">
              <div className="grid grid-cols-12 gap-3 bg-muted/35 px-6 py-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                <div className="col-span-3">Article</div>
                <div className="col-span-5">Désignation</div>
                <div className="col-span-1 text-right">Qté</div>
                <div className="col-span-1 text-right">PU</div>
                <div className="col-span-2 text-right">TTC</div>
              </div>
              <div className="divide-y divide-border/40">
                {(data.lines ?? []).map((l, idx) => (
                  <div
                    key={`${l.articleRef}-${idx}`}
                    className="grid grid-cols-12 items-center gap-3 px-6 py-4 transition hover:bg-muted/30"
                  >
                    <div className="col-span-3">
                      <span className="inline-flex items-center rounded-xl border border-border bg-card px-2.5 py-1 font-mono text-xs font-bold text-card-foreground/90 shadow-sm">
                        {l.articleRef}
                      </span>
                    </div>
                    <div className="col-span-5 min-w-0 truncate text-sm font-semibold text-card-foreground">
                      {safe(l.designation)}
                    </div>
                    <div className="col-span-1 text-right text-sm font-bold text-card-foreground">
                      {l.qty}
                    </div>
                    <div className="col-span-1 text-right text-sm text-card-foreground/90">
                      {money(l.unitPrice)}
                    </div>
                    <div className="col-span-2 text-right text-sm font-extrabold text-card-foreground">
                      {money(l.amountTTC)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </PremiumCard>

        {/* Infos livraison */}
        <PremiumCard tone="soft" noPadding>
          <SectionHeader
            kicker="Infos"
            title="Livraison"
            className="px-6 py-5"
          />

          <div className="space-y-4 px-6 pb-6 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Date</span>
              <span className="font-semibold text-card-foreground">
                {data.date ? new Date(data.date).toLocaleString("fr-FR") : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Dépôt</span>
              <span className="font-semibold text-card-foreground">{data.depotNo}</span>
            </div>

            <div className="my-1 h-px bg-border/60" />

            <p className="app-kicker">Adresse</p>
            <div className="app-surface-soft p-4">
              <div className="font-semibold text-card-foreground">
                {safe(data.address)}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {safe(data.city)} {data.postalCode ? `· ${data.postalCode}` : ""}
              </div>
            </div>
          </div>
        </PremiumCard>
      </div>
    </div>
  );
}

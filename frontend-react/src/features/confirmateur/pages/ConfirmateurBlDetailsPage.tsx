import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { getConfirmateurBlByPiece } from "../api/confirmateurApi";
import { Button } from "../../../shared/components/Button";
import {
  clientDisplayFromClient,
  clientTypeLabel,
  formatDateTime,
  getConfirmateurStatusMeta,
  lineAmount,
  money,
  safe,
} from "../utils/confirmateurUi";

function SummaryCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-[24px] border border-border/70 bg-muted/25 px-4 py-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-xl font-black tracking-tight text-card-foreground">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

export function ConfirmateurBlDetailsPage() {
  const { piece } = useParams<{ piece: string }>();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["confirmateur", "bl", piece],
    queryFn: () => getConfirmateurBlByPiece(piece as string),
    enabled: !!piece,
  });

  if (isLoading) {
    return (
      <div className="w-full space-y-6 py-10">
        <div className="h-6 w-56 animate-pulse rounded-full bg-muted/70" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-[24px] border border-border bg-card shadow-sm" />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="h-96 animate-pulse rounded-[30px] border border-border bg-card shadow-sm" />
          <div className="h-96 animate-pulse rounded-[30px] border border-border bg-card shadow-sm" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="w-full py-10">
        <div className="rounded-[30px] border border-rose-200 bg-rose-50/60 p-6 shadow-sm">
          <div className="text-sm font-bold text-rose-700">BL introuvable</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {(error as Error)?.message ?? "Impossible de charger le détail du bon de livraison."}
          </div>
          <div className="mt-4">
            <Link to="/confirmateur/bl">
              <Button type="button" className="h-10 rounded-2xl px-5">
                Retour à la liste BL
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const statusMeta = getConfirmateurStatusMeta(data.statusLabel, data.dO_Valide);
  const client = data.client ?? null;

  return (
    <div className="w-full space-y-6 pb-10">
      <section className="app-surface px-6 py-6 md:px-7 md:py-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/confirmateur/bl" className="text-sm font-semibold text-primary hover:underline">
                ← Retour aux BL
              </Link>
              <Link to="/confirmateur/commandes" className="text-sm font-semibold text-primary hover:underline">
                Retour aux BC
              </Link>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.badgeClass}`}>
                {statusMeta.label}
              </span>
              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold badge-neutral">
                {clientTypeLabel(client)}
              </span>
            </div>

            <div>
              <div className="app-kicker">Confirmateur / Bon de livraison</div>
              <h1 className="app-title">BL {safe(data.dO_Piece)}</h1>
              <p className="app-description max-w-3xl">
                Bon de livraison généré après confirmation du BC. Cette vue reste volontairement en lecture métier claire et stable.
              </p>
            </div>
          </div>

          <div className="rounded-[28px] border border-border/70 bg-muted/25 px-5 py-4 text-left xl:min-w-[280px] xl:text-right">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Net à payer</div>
            <div className="mt-2 text-3xl font-black tracking-tight text-primary">{money(data.dO_NetAPayer)}</div>
            <div className="mt-1 text-sm text-muted-foreground">Total TTC : {money(data.dO_TotalTTC)}</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Statut" value={statusMeta.label} hint={statusMeta.description} />
        <SummaryCard label="Client" value={clientDisplayFromClient(client)} hint={`Type : ${clientTypeLabel(client)}`} />
        <SummaryCard label="Date" value={formatDateTime(data.dO_Date)} hint={`Tiers : ${safe(data.dO_Tiers)}`} />
        <SummaryCard label="Montant" value={money(data.dO_TotalTTC)} hint={`Net à payer : ${money(data.dO_NetAPayer)}`} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-[30px] border border-border bg-card shadow-sm">
            <div className="border-b border-border px-6 py-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Origine workflow</div>
              <h2 className="mt-1 text-xl font-black tracking-tight text-card-foreground">Lecture du parcours</h2>
              <div className="mt-1 text-sm text-muted-foreground">
                Ce BL a été produit à partir du parcours de confirmation du bon de commande correspondant.
              </div>
            </div>

            <div className="grid gap-4 px-6 py-6 md:grid-cols-3">
              <div className="rounded-[24px] border border-border/70 bg-muted/20 p-4">
                <div className="text-sm font-black text-card-foreground">1. BC analysé</div>
                <div className="mt-2 text-sm leading-6 text-muted-foreground">Le confirmateur a travaillé sur le bon de commande source.</div>
              </div>
              <div className="rounded-[24px] border border-border/70 bg-muted/20 p-4">
                <div className="text-sm font-black text-card-foreground">2. Confirmation validée</div>
                <div className="mt-2 text-sm leading-6 text-muted-foreground">Le flux BC → BL a été exécuté en conservant les données métier existantes.</div>
              </div>
              <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/70 p-4">
                <div className="text-sm font-black text-emerald-700">3. BL disponible</div>
                <div className="mt-2 text-sm leading-6 text-emerald-700">Le bon de livraison est maintenant consultable dans cette vue dédiée.</div>
              </div>
            </div>
          </section>

          <section className="rounded-[30px] border border-border bg-card shadow-sm">
            <div className="border-b border-border px-6 py-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lignes BL</div>
              <h2 className="mt-1 text-xl font-black tracking-tight text-card-foreground">Contenu du bon de livraison</h2>
              <div className="mt-1 text-sm text-muted-foreground">Rendu fidèle aux données déjà générées par le backend.</div>
            </div>

            <div className="overflow-x-auto px-6 py-4">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    <th className="py-3 pr-4">Réf</th>
                    <th className="py-3 pr-4">Désignation</th>
                    <th className="py-3 pr-4">Qté</th>
                    <th className="py-3 pr-4">PU</th>
                    <th className="py-3 pr-0">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {(data.lignes ?? []).map((line, index) => (
                    <tr key={`${line.ar_Ref ?? "x"}-${index}`} className="hover:bg-muted/30">
                      <td className="py-4 pr-4">
                        <span className="inline-flex items-center rounded-xl border border-border bg-card px-2.5 py-1 font-mono text-xs font-bold text-card-foreground/90 shadow-sm">
                          {safe(line.ar_Ref)}
                        </span>
                      </td>
                      <td className="py-4 pr-4">
                        <div className="max-w-[360px] truncate font-semibold text-card-foreground">{safe(line.dL_Design)}</div>
                      </td>
                      <td className="py-4 pr-4 font-semibold text-card-foreground">{Number(line.dL_Qte ?? 0)}</td>
                      <td className="py-4 pr-4 text-card-foreground/90">{money(line.dL_PrixUnitaire ?? 0)}</td>
                      <td className="py-4 pr-0 font-bold text-card-foreground">{money(lineAmount(line))}</td>
                    </tr>
                  ))}

                  {(data.lignes ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                        Aucune ligne de bon de livraison disponible.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-[30px] border border-border bg-card shadow-sm">
            <div className="border-b border-border px-6 py-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Client</div>
              <h2 className="mt-1 text-xl font-black tracking-tight text-card-foreground">Fiche client</h2>
            </div>

            <div className="space-y-4 px-6 py-6 text-sm">
              <div>
                <div className="text-lg font-extrabold text-card-foreground">{clientDisplayFromClient(client)}</div>
                <div className="mt-1 text-muted-foreground">Type : <span className="font-semibold text-card-foreground">{clientTypeLabel(client)}</span></div>
              </div>

              <div className="rounded-[22px] border border-border/70 bg-muted/20 p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">Téléphone</span><span className="font-semibold text-card-foreground">{safe(client?.telephone)}</span></div>
                  <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">UtilisateurId</span><span className="max-w-[180px] truncate font-semibold text-card-foreground">{safe(client?.utilisateurId)}</span></div>
                  <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">Code postal</span><span className="font-semibold text-card-foreground">{safe(client?.codePostal)}</span></div>
                  <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">Gouvernorat</span><span className="font-semibold text-card-foreground">{safe(client?.gouvernorat)}</span></div>
                  <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">Délégation</span><span className="font-semibold text-card-foreground">{safe(client?.delegation)}</span></div>
                </div>
              </div>

              <div className="rounded-[22px] border border-border/70 bg-card p-4">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Adresse</div>
                <div className="mt-3 text-sm leading-6 text-card-foreground">{safe(client?.adresse)}</div>
                <div className="mt-2 text-sm text-muted-foreground">{safe(client?.adresseComplementaire)}</div>
              </div>

              <Link to="/confirmateur/bl" className="block">
                <Button type="button" variant="ghost" className="h-11 w-full rounded-2xl text-card-foreground/90 hover:bg-muted/55">
                  Retour à la liste BL
                </Button>
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

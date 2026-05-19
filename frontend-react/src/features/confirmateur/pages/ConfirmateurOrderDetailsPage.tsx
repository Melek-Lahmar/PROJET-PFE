import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getConfirmateurOrderByPiece,
  transformBcToBl,
  updateConfirmateurOrderStatus,
} from "../api/confirmateurApi";
import type { OrderStatusValue } from "../types/confirmateur";
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

function SummaryCard({ label, value, hint, badgeClass }: { label: string; value: string; hint: string; badgeClass?: string }) {
  return (
    <div className="rounded-[24px] border border-border/70 bg-muted/25 px-4 py-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-center gap-2">
        <div className="text-xl font-black tracking-tight text-card-foreground">{value}</div>
        {badgeClass ? <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeClass}`}>Actif</span> : null}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

function workflowSteps(workflowState: ReturnType<typeof getConfirmateurStatusMeta>["workflowState"]) {
  return [
    {
      key: "received",
      label: "BC reçu",
      description: "La commande est disponible dans l’espace confirmateur.",
      state: "done" as const,
    },
    {
      key: "analysis",
      label: "Analyse",
      description: "Le confirmateur qualifie la commande et ses informations client.",
      state:
        workflowState === "pending"
          ? ("active" as const)
          : workflowState === "attempted" || workflowState === "refused" || workflowState === "transformed"
            ? ("done" as const)
            : ("pending" as const),
    },
    {
      key: "decision",
      label: "Décision",
      description: "La commande est orientée en tentative, refus, ou prête à être confirmée.",
      state:
        workflowState === "attempted"
          ? ("active" as const)
          : workflowState === "refused"
            ? ("failed" as const)
            : workflowState === "transformed"
              ? ("done" as const)
              : ("pending" as const),
    },
    {
      key: "bl",
      label: "BL créé",
      description: "La confirmation génère le bon de livraison à partir du BC.",
      state: workflowState === "transformed" ? ("done" as const) : ("pending" as const),
    },
  ];
}

function workflowNodeClass(state: "done" | "active" | "pending" | "failed") {
  switch (state) {
    case "done":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "active":
      return "border-primary/25 bg-primary text-white shadow-lg shadow-primary/20";
    case "failed":
      return "border-rose-200 bg-rose-500 text-white";
    default:
      return "border-border bg-card text-muted-foreground";
  }
}

export function ConfirmateurOrderDetailsPage() {
  const { piece } = useParams<{ piece: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["confirmateur-order", piece],
    queryFn: () => getConfirmateurOrderByPiece(piece as string),
    enabled: !!piece,
  });

  const statusMutation = useMutation({
    mutationFn: ({ status }: { status: OrderStatusValue }) => updateConfirmateurOrderStatus(piece as string, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["confirmateur-order", piece] });
      await queryClient.invalidateQueries({ queryKey: ["confirmateur-orders"] });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => transformBcToBl(piece as string),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: ["confirmateur-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["confirmateur-order", piece] });

      const blPiece = res?.blPiece ?? "";
      if (blPiece) navigate(`/confirmateur/bl/${encodeURIComponent(blPiece)}`);
      else navigate("/confirmateur/bl");
    },
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
          <div className="text-sm font-bold text-rose-700">BC introuvable</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {(error as Error)?.message ?? "Impossible de charger le détail confirmateur."}
          </div>
          <div className="mt-4">
            <Link to="/confirmateur/commandes">
              <Button type="button" className="h-10 rounded-2xl px-5">
                Retour à la liste
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const statusMeta = getConfirmateurStatusMeta(data.statusLabel, data.dO_Valide);
  const client = data.client ?? null;
  const currentStatus: OrderStatusValue = data.dO_Valide === 2 ? 2 : data.dO_Valide === 3 ? 3 : 0;
  const isTransformed = statusMeta.workflowState === "transformed";
  const steps = workflowSteps(statusMeta.workflowState);

  return (
    <div className="w-full space-y-6 pb-10">
      <section className="app-surface px-6 py-6 md:px-7 md:py-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/confirmateur/commandes" className="text-sm font-semibold text-primary hover:underline">
                ← Retour aux BC
              </Link>
              <Link to="/confirmateur/bl" className="text-sm font-semibold text-primary hover:underline">
                Voir les BL
              </Link>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.badgeClass}`}>
                {statusMeta.label}
              </span>
              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold badge-neutral">
                {clientTypeLabel(client)}
              </span>
            </div>

            <div>
              <div className="app-kicker">Confirmateur / Bon de commande</div>
              <h1 className="app-title">BC {safe(data.dO_Piece)}</h1>
              <p className="app-description max-w-3xl">{statusMeta.description}</p>
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
        <SummaryCard label="Statut" value={statusMeta.label} hint={statusMeta.description} badgeClass={statusMeta.badgeClass} />
        <SummaryCard label="Client" value={clientDisplayFromClient(client)} hint={`Type : ${clientTypeLabel(client)}`} />
        <SummaryCard label="Date" value={formatDateTime(data.dO_Date)} hint={`Tiers : ${safe(data.dO_Tiers)}`} />
        <SummaryCard label="Montant" value={money(data.dO_TotalTTC)} hint={`Net à payer : ${money(data.dO_NetAPayer)}`} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-[30px] border border-border bg-card shadow-sm">
            <div className="border-b border-border px-6 py-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parcours métier</div>
              <h2 className="mt-1 text-xl font-black tracking-tight text-card-foreground">Workflow BC → BL</h2>
              <div className="mt-1 text-sm text-muted-foreground">
                Lecture visuelle du parcours confirmateur sans modifier la logique existante.
              </div>
            </div>

            <div className="grid gap-4 px-6 py-6 md:grid-cols-2 xl:grid-cols-4">
              {steps.map((step, index) => (
                <div key={step.key} className="rounded-[24px] border border-border/70 bg-muted/20 p-4">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border font-black ${workflowNodeClass(step.state)}`}>
                      {step.state === "done" ? "✓" : step.state === "failed" ? "!" : index + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-black text-card-foreground">{step.label}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {step.state === "done"
                          ? "Validé"
                          : step.state === "active"
                            ? "Actif"
                            : step.state === "failed"
                              ? "Bloqué"
                              : "En attente"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-sm leading-6 text-muted-foreground">{step.description}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[30px] border border-border bg-card shadow-sm">
            <div className="border-b border-border px-6 py-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lignes BC</div>
              <h2 className="mt-1 text-xl font-black tracking-tight text-card-foreground">Articles de la commande</h2>
              <div className="mt-1 text-sm text-muted-foreground">Les quantités et montants sont repris depuis le bon de commande réel.</div>
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
                        Aucune ligne de bon de commande disponible.
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
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</div>
              <h2 className="mt-1 text-xl font-black tracking-tight text-card-foreground">Décision confirmateur</h2>
              <div className="mt-1 text-sm text-muted-foreground">
                Changer le statut métier ou confirmer la transformation vers le BL.
              </div>
            </div>

            <div className="space-y-4 px-6 py-6">
              <div className="grid gap-2">
                <Button
                  type="button"
                  variant={currentStatus === 0 ? "primary" : "outline"}
                  onClick={() => statusMutation.mutate({ status: 0 })}
                  disabled={statusMutation.isPending || isTransformed}
                  className="justify-start rounded-2xl px-4"
                >
                  En attente
                </Button>
                <Button
                  type="button"
                  variant={currentStatus === 2 ? "primary" : "outline"}
                  onClick={() => statusMutation.mutate({ status: 2 })}
                  disabled={statusMutation.isPending || isTransformed}
                  className="justify-start rounded-2xl px-4"
                >
                  Tentative
                </Button>
                <Button
                  type="button"
                  variant={currentStatus === 3 ? "destructive" : "outline"}
                  onClick={() => statusMutation.mutate({ status: 3 })}
                  disabled={statusMutation.isPending || isTransformed}
                  className="justify-start rounded-2xl px-4"
                >
                  Refuser
                </Button>
              </div>

              <Button
                type="button"
                variant="primary"
                isLoading={confirmMutation.isPending}
                onClick={() => confirmMutation.mutate()}
                disabled={isTransformed}
                className="h-12 w-full rounded-2xl px-5 text-base font-bold"
              >
                Confirmer et générer le BL
              </Button>

              <div className={`rounded-[20px] border px-4 py-3 text-sm ${isTransformed ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-border/70 bg-muted/20 text-muted-foreground"}`}>
                {isTransformed
                  ? "Ce BC est déjà transformé en BL. Les actions sont verrouillées dans cette vue pour éviter une double confirmation depuis l’interface."
                  : "La confirmation conserve le parcours existant et redirige vers le BL généré lorsque l’opération réussit."}
              </div>

              {statusMutation.isError ? (
                <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                  Erreur lors de la mise à jour du statut.
                </div>
              ) : null}

              {confirmMutation.isError ? (
                <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                  Erreur lors de la transformation BC → BL.
                </div>
              ) : null}
            </div>
          </section>

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

              <Link to="/confirmateur/commandes" className="block">
                <Button type="button" variant="ghost" className="h-11 w-full rounded-2xl text-card-foreground/90 hover:bg-muted/55">
                  Retour à la liste BC
                </Button>
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
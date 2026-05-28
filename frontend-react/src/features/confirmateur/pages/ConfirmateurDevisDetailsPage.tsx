import { Link, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "../../../shared/components/Button";
import { EmptyView } from "../../../shared/components/premium";
import { useToast } from "../../../shared/components/premium/Toast";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";
import {
  addConfirmateurDevisComment,
  cancelConfirmateurDevis,
  getConfirmateurDevisByPiece,
  sendConfirmateurDevisToClient,
  takeConfirmateurDevis,
  transformConfirmateurDevisToBc,
  updateConfirmateurDevisStatus,
} from "../api/confirmateurApi";

function safe(value?: string | null) {
  return value && value.trim() ? value.trim() : "-";
}

function money(value?: number | null) {
  return typeof value === "number" ? `${value.toFixed(3)} TND` : "-";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString("fr-FR");
}

function statusClass(status?: string | null) {
  const s = (status ?? "").toUpperCase();
  if (s === "ACCEPTE_CLIENT" || s === "CONVERTI_BC" || s === "VALIDE") return "badge-success";
  if (s === "SOUMIS" || s === "EN_ETUDE" || s === "ENVOYE_CLIENT" || s === "REPONSE_CLIENT") return "badge-info";
  if (s === "REFUSE_CLIENT" || s === "ANNULE" || s === "EXPIRE") return "badge-danger";
  return "badge-warning";
}

function statusLabel(status?: string | null) {
  const s = (status ?? "").toUpperCase();
  if (s === "BROUILLON") return "Brouillon";
  if (s === "SOUMIS") return "Soumis";
  if (s === "EN_ETUDE") return "En étude";
  if (s === "INFO_MANQUANTE") return "Info manquante";
  if (s === "REPONSE_CLIENT") return "Réponse client";
  if (s === "MODIFIE") return "Modifié";
  if (s === "VALIDE") return "Validé";
  if (s === "ENVOYE_CLIENT") return "Envoyé client";
  if (s === "ACCEPTE_CLIENT") return "Accepté client";
  if (s === "CONVERTI_BC") return "Converti en BC";
  if (s === "REFUSE_CLIENT") return "Refusé client";
  if (s === "EXPIRE") return "Expiré";
  if (s === "ANNULE") return "Annulé";
  return s || "Inconnu";
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-bold text-card-foreground">{value}</span>
    </div>
  );
}

export function ConfirmateurDevisDetailsPage() {
  const { piece } = useParams<{ piece: string }>();
  const toast = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const [internal, setInternal] = useState(false);

  const quoteQuery = useQuery({
    queryKey: ["confirmateur", "devis", piece],
    queryFn: () => getConfirmateurDevisByPiece(piece as string),
    enabled: !!piece,
  });

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["confirmateur", "devis", piece] });
    await qc.invalidateQueries({ queryKey: ["confirmateur", "devis"] });
  };

  const statusMutation = useMutation({
    mutationFn: (nextStatus: string) => updateConfirmateurDevisStatus(piece as string, nextStatus, comment.trim() || "Traitement depuis la fiche devis confirmateur"),
    onSuccess: async () => {
      toast.success("Devis mis à jour");
      await refresh();
    },
    onError: (err) => toast.error("Action impossible", getApiErrorMessage(err)),
  });

  const takeMutation = useMutation({
    mutationFn: () => takeConfirmateurDevis(piece as string),
    onSuccess: async () => { toast.success("Devis pris en charge"); await refresh(); },
    onError: (err) => toast.error("Action impossible", getApiErrorMessage(err)),
  });

  const commentMutation = useMutation({
    mutationFn: () => addConfirmateurDevisComment(piece as string, { message: comment.trim(), isPublic: !internal }),
    onSuccess: async () => {
      toast.success(internal ? "Commentaire interne ajouté" : "Commentaire public ajouté");
      setComment("");
      await refresh();
    },
    onError: (err) => toast.error("Commentaire impossible", getApiErrorMessage(err)),
  });

  const sendMutation = useMutation({
    mutationFn: () => sendConfirmateurDevisToClient(piece as string, comment.trim() || "Devis envoyé au client."),
    onSuccess: async () => { toast.success("Devis envoyé au client"); await refresh(); },
    onError: (err) => toast.error("Envoi impossible", getApiErrorMessage(err)),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelConfirmateurDevis(piece as string, comment.trim()),
    onSuccess: async () => { toast.success("Devis annulé"); await refresh(); },
    onError: (err) => toast.error("Annulation impossible", getApiErrorMessage(err)),
  });

  const convertMutation = useMutation({
    mutationFn: () => transformConfirmateurDevisToBc(piece as string),
    onSuccess: async (res) => {
      toast.success("BC créé", res.piece);
      await refresh();
      await qc.invalidateQueries({ queryKey: ["confirmateur", "commandes"] });
      navigate(`/confirmateur/commandes/${encodeURIComponent(res.piece)}`);
    },
    onError: (err) => toast.error("Conversion impossible", getApiErrorMessage(err)),
  });

  if (quoteQuery.isLoading) {
    return <div className="py-10 text-sm text-muted-foreground">Chargement du détail du devis...</div>;
  }

  if (quoteQuery.isError || !quoteQuery.data) {
    return (
      <EmptyView
        title="Devis inaccessible"
        description={getApiErrorMessage(quoteQuery.error) || "Le devis est introuvable ou non autorisé."}
        iconPath="M12 9v4 M12 17h.01 M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
      />
    );
  }

  const quote = quoteQuery.data;
  const status = String(quote.statusKey ?? quote.quoteStatus ?? "");
  const canConvert = status === "ACCEPTE_CLIENT";
  const canSend = status === "VALIDE" || status === "MODIFIE";
  const isFinal = ["CONVERTI_BC", "REFUSE_CLIENT", "EXPIRE", "ANNULE"].includes(status);
  const isBusy = statusMutation.isPending || convertMutation.isPending || takeMutation.isPending || commentMutation.isPending || sendMutation.isPending || cancelMutation.isPending;
  const tvaAmount = Math.max(0, Number(quote.netAPayer ?? 0) - Number(quote.totalBeforeDiscount ?? 0) + Number(quote.b2bDiscountAmount ?? 0));

  return (
    <div className="w-full space-y-5 pb-10">
      <section className="rounded-2xl border border-border/70 bg-card px-5 py-5 shadow-sm md:px-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/confirmateur/devis" className="text-sm font-bold text-primary hover:underline">Retour aux devis</Link>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(status)}`}>{statusLabel(status)}</span>
              <span className="rounded-full px-3 py-1 text-xs font-bold badge-neutral">B2B</span>
            </div>
            <h1 className="mt-3 text-2xl font-black text-card-foreground md:text-3xl">Devis {quote.piece}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Consultation complète du devis B2B, de ses lignes articles et des actions métier confirmateur.
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-muted/25 px-5 py-4 xl:min-w-[280px] xl:text-right">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Net à payer</div>
            <div className="mt-2 text-3xl font-black text-primary">{money(quote.netAPayer)}</div>
            <div className="mt-1 text-sm text-muted-foreground">Total TTC estimé</div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Client B2B</div>
          <div className="mt-2 text-lg font-black text-card-foreground">{safe(quote.companyName || quote.clientName)}</div>
          <div className="mt-1 text-xs text-muted-foreground">{safe(quote.clientPhone)}</div>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Code tiers</div>
          <div className="mt-2 font-mono text-lg font-black text-card-foreground">{safe(quote.clientCode)}</div>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Date</div>
          <div className="mt-2 text-lg font-black text-card-foreground">{formatDate(quote.date)}</div>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Validité</div>
          <div className="mt-2 text-lg font-black text-card-foreground">{formatDate(quote.validUntil)}</div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Articles</div>
            <h2 className="mt-1 text-xl font-black text-card-foreground">Lignes du devis</h2>
          </div>
          <div className="overflow-x-auto p-5">
            <table className="min-w-[860px] w-full text-sm">
              <thead className="text-left text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  <th className="py-3 pr-4">Réf</th>
                  <th className="py-3 pr-4">Désignation</th>
                  <th className="py-3 pr-4">Quantité</th>
                  <th className="py-3 pr-4">Prix unitaire</th>
                  <th className="py-3 pr-4">Remise</th>
                  <th className="py-3 pr-4">Montant HT</th>
                  <th className="py-3 pr-4">TVA</th>
                  <th className="py-3 text-right">Montant TTC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {quote.lines.map((line, index) => (
                  <tr key={`${line.articleRef}-${index}`} className="hover:bg-muted/25">
                    <td className="py-4 pr-4 font-mono font-black">{safe(line.articleRef)}</td>
                    <td className="py-4 pr-4 font-bold">{safe(line.designation)}</td>
                    <td className="py-4 pr-4">{line.qty}</td>
                    <td className="py-4 pr-4">{money(line.unitPrice)}</td>
                    <td className="py-4 pr-4">{Number(quote.b2bDiscountRate ?? 0).toFixed(2)}%</td>
                    <td className="py-4 pr-4">{money(line.amountHT)}</td>
                    <td className="py-4 pr-4">Non disponible</td>
                    <td className="py-4 text-right font-black">{money(line.amountTTC)}</td>
                  </tr>
                ))}
                {quote.lines.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-sm text-muted-foreground">Aucune ligne disponible.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Actions métier</div>
            <div className="mt-4 grid gap-2">
              <Button type="button" variant="outline" disabled={isBusy || isFinal || status === "EN_ETUDE"} onClick={() => takeMutation.mutate()}>Prendre en charge</Button>
              <Button type="button" variant="outline" disabled={isBusy || isFinal || !comment.trim()} onClick={() => statusMutation.mutate("INFO_MANQUANTE")}>Demander information</Button>
              <Button type="button" variant="primary" disabled={isBusy || isFinal} onClick={() => statusMutation.mutate("VALIDE")}>Valider le devis</Button>
              <Button type="button" variant="primary" disabled={isBusy || !canSend} onClick={() => sendMutation.mutate()}>Envoyer au client</Button>
              <Button type="button" variant="destructive" disabled={isBusy || isFinal || !comment.trim()} onClick={() => cancelMutation.mutate()}>Annuler</Button>
              <Button type="button" variant="primary" isLoading={convertMutation.isPending} disabled={!canConvert} onClick={() => convertMutation.mutate()}>Transformer en BC</Button>
            </div>
            {quote.quoteConvertedToPiece ? (
              <Link className="mt-4 block text-sm font-bold text-primary hover:underline" to={`/confirmateur/commandes/${encodeURIComponent(quote.quoteConvertedToPiece)}`}>
                BC créé : {quote.quoteConvertedToPiece}
              </Link>
            ) : null}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Commentaires</div>
            <div className="mt-4 space-y-3">
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                className="min-h-24 w-full rounded-2xl border border-border bg-[hsl(var(--input))] px-4 py-3 text-sm text-card-foreground outline-none focus:border-primary/45"
                placeholder="Commentaire public ou note interne..."
              />
              <label className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
                <input type="checkbox" checked={internal} onChange={(event) => setInternal(event.target.checked)} />
                Commentaire interne
              </label>
              <Button type="button" variant="outline" disabled={!comment.trim() || isBusy} onClick={() => commentMutation.mutate()}>
                Ajouter commentaire
              </Button>
              {(quote.events ?? []).filter((event) => event.message).map((event) => (
                <div key={event.id} className="rounded-xl border border-border/70 bg-muted/25 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-black text-card-foreground">{event.eventType}</div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${event.isPublic ? "badge-info" : "badge-warning"}`}>
                      {event.isPublic ? "Public" : "Interne"}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-card-foreground">{event.message}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{formatDate(event.createdAt)}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Résumé financier</div>
            <div className="mt-4 space-y-1">
              <InfoRow label="Sous-total" value={money(quote.totalBeforeDiscount)} />
              <InfoRow label={`Remise ${Number(quote.b2bDiscountRate ?? 0).toFixed(2)}%`} value={`-${money(quote.b2bDiscountAmount)}`} />
              <InfoRow label="TVA" value={tvaAmount > 0 ? money(tvaAmount) : "Non disponible"} />
              <div className="my-2 h-px bg-border" />
              <InfoRow label="Montant TTC" value={money(quote.netAPayer)} />
              <InfoRow label="Net à payer" value={money(quote.netAPayer)} />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Traçabilité</div>
            <div className="mt-4 space-y-3">
              {quote.timeline.map((step) => (
                <div key={`${step.label}-${step.date ?? ""}`} className="rounded-xl border border-border/70 bg-muted/25 p-3">
                  <div className="font-black text-card-foreground">{step.label}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(step.date)}</div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

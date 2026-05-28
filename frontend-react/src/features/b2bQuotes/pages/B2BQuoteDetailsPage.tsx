import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "../../../shared/components/Button";
import { EmptyView, PremiumHero } from "../../../shared/components/premium";
import { useToast } from "../../../shared/components/premium/Toast";
import { useAuthStore } from "../../auth/store/authStore";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";
import { acceptQuote, addQuoteComment, cancelQuote, convertQuoteToOrder, getQuote, refuseQuote } from "../api/b2bQuotesApi";
import type { QuoteDetailDto } from "../types/b2bQuotes";

function money(value: number) {
  return `${Number(value ?? 0).toFixed(3)} TND`;
}

function safe(value?: string | null) {
  return value && value.trim() ? value : "-";
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
  const labels: Record<string, string> = {
    BROUILLON: "Brouillon",
    SOUMIS: "Soumis",
    EN_ETUDE: "En étude",
    INFO_MANQUANTE: "Info manquante",
    REPONSE_CLIENT: "Réponse client",
    MODIFIE: "Modifié",
    VALIDE: "Validé",
    ENVOYE_CLIENT: "Envoyé au client",
    ACCEPTE_CLIENT: "Accepté",
    REFUSE_CLIENT: "Refusé",
    EXPIRE: "Expiré",
    CONVERTI_BC: "Converti en BC",
    ANNULE: "Annulé",
  };
  return labels[s] ?? s;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold text-card-foreground">{value}</span>
    </div>
  );
}

export function B2BQuoteDetailsPage() {
  const { piece } = useParams<{ piece: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const roles = useAuthStore((s) => s.roles ?? []);
  const isClient = roles.includes("CLIENT");
  const isAdmin = roles.includes("ADMIN");
  const isConfirmateur = roles.includes("CONFIRMATEUR");
  const [comment, setComment] = useState("");

  const quoteQuery = useQuery<QuoteDetailDto>({
    queryKey: ["b2b-quote", piece],
    queryFn: () => getQuote(piece as string),
    enabled: !!piece,
  });

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["b2b-quote", piece] });
    await qc.invalidateQueries({ queryKey: ["b2b-quotes"] });
    await qc.invalidateQueries({ queryKey: ["my-b2b-quotes"] });
  };

  const acceptMutation = useMutation({
    mutationFn: () => acceptQuote(piece as string),
    onSuccess: async (res) => { toast.success("Devis accepté", res.bcPiece || res.piece); await refresh(); },
    onError: (err) => toast.error("Action impossible", getApiErrorMessage(err)),
  });

  const refuseMutation = useMutation({
    mutationFn: () => refuseQuote(piece as string, comment.trim()),
    onSuccess: async () => { toast.success("Devis refusé"); await refresh(); },
    onError: (err) => toast.error("Action impossible", getApiErrorMessage(err)),
  });

  const commentMutation = useMutation({
    mutationFn: () => addQuoteComment(piece as string, { message: comment.trim(), isPublic: true }),
    onSuccess: async () => {
      toast.success("Commentaire ajouté");
      setComment("");
      await refresh();
    },
    onError: (err) => toast.error("Commentaire impossible", getApiErrorMessage(err)),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelQuote(piece as string, "Annulation depuis la fiche devis"),
    onSuccess: async () => { toast.success("Devis annulé"); await refresh(); },
    onError: (err) => toast.error("Action impossible", getApiErrorMessage(err)),
  });

  const convertMutation = useMutation({
    mutationFn: () => convertQuoteToOrder(piece as string),
    onSuccess: async (res) => {
      toast.success("Commande créée", res.piece);
      await refresh();
      if (isConfirmateur) navigate(`/confirmateur/commandes/${encodeURIComponent(res.piece)}`);
    },
    onError: (err) => toast.error("Conversion impossible", getApiErrorMessage(err)),
  });

  if (quoteQuery.isLoading) {
    return <div className="py-10 text-sm text-muted-foreground">Chargement du devis...</div>;
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
  const canClientDecide = isClient && status === "ENVOYE_CLIENT";
  const canCancel = isAdmin && !["CONVERTI_BC", "REFUSE_CLIENT", "EXPIRE", "ANNULE"].includes(status);
  const canConvert = (isAdmin || isConfirmateur) && status === "ACCEPTE_CLIENT";
  const bcPiece = quote.bcPiece ?? quote.quoteConvertedToPiece;

  return (
    <div className="w-full space-y-6 pb-10">
      <PremiumHero
        kicker="Devis B2B"
        title={`Devis ${quote.piece}`}
        description={`${safe(quote.companyName || quote.clientName)} · statut ${statusLabel(status)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {canClientDecide ? <Button type="button" variant="primary" onClick={() => acceptMutation.mutate()}>Accepter</Button> : null}
            {canClientDecide ? <Button type="button" variant="outline" disabled={!comment.trim()} onClick={() => refuseMutation.mutate()}>Refuser</Button> : null}
            {canCancel ? <Button type="button" variant="ghost" onClick={() => cancelMutation.mutate()}>Annuler</Button> : null}
            {canConvert ? <Button type="button" variant="primary" onClick={() => convertMutation.mutate()}>Convertir en BC</Button> : null}
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[24px] border border-border/70 bg-muted/25 p-4">
          <div className="app-kicker">Statut</div>
          <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-bold ${statusClass(status)}`}>{statusLabel(status)}</span>
        </div>
        <div className="rounded-[24px] border border-border/70 bg-muted/25 p-4">
          <div className="app-kicker">Validité</div>
          <div className="mt-2 text-lg font-black">{formatDate(quote.validUntil)}</div>
        </div>
        <div className="rounded-[24px] border border-border/70 bg-muted/25 p-4">
          <div className="app-kicker">Remise</div>
          <div className="mt-2 text-lg font-black">{Number(quote.b2bDiscountRate ?? 0).toFixed(2)}%</div>
        </div>
        <div className="rounded-[24px] border border-border/70 bg-muted/25 p-4">
          <div className="app-kicker">Net à payer</div>
          <div className="mt-2 text-lg font-black text-primary">{money(quote.netAPayer)}</div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-[30px] border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-5">
            <div className="app-kicker">Articles</div>
            <h2 className="mt-1 text-xl font-black">Lignes du devis</h2>
          </div>
          <div className="overflow-x-auto px-6 py-4">
            <table className="min-w-full text-sm">
              <thead className="text-left text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                <tr>
                  <th className="py-3 pr-4">Réf</th>
                  <th className="py-3 pr-4">Désignation</th>
                  <th className="py-3 pr-4">Qté</th>
                  <th className="py-3 pr-4">PU</th>
                  <th className="py-3 text-right">TTC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {quote.lines.map((line) => (
                  <tr key={line.articleRef}>
                    <td className="py-4 pr-4 font-mono font-bold">{line.articleRef}</td>
                    <td className="py-4 pr-4 font-semibold">{safe(line.designation)}</td>
                    <td className="py-4 pr-4">{line.qty}</td>
                    <td className="py-4 pr-4">{money(line.unitPrice)}</td>
                    <td className="py-4 text-right font-black">{money(line.amountTTC)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[30px] border border-border bg-card p-6 shadow-sm">
            <div className="app-kicker">Synthèse</div>
            <div className="mt-4 space-y-1">
              <InfoRow label="Client" value={safe(quote.companyName || quote.clientName)} />
              <InfoRow label="Téléphone" value={safe(quote.clientPhone)} />
              <InfoRow label="Sous-total" value={money(quote.totalBeforeDiscount)} />
              <InfoRow label={`Remise B2B ${Number(quote.b2bDiscountRate ?? 0).toFixed(2)}%`} value={`-${money(quote.b2bDiscountAmount)}`} />
              <InfoRow label="Source" value={safe(quote.discountSource)} />
              <div className="my-2 h-px bg-border/70" />
              <InfoRow label="Net à payer" value={money(quote.netAPayer)} />
            </div>
          </section>

          <section className="rounded-[30px] border border-border bg-card p-6 shadow-sm">
            <div className="app-kicker">Traçabilité</div>
            <div className="mt-4 space-y-3">
              {quote.timeline.map((step) => (
                <div key={`${step.label}-${step.date ?? ""}`} className="rounded-2xl border border-border/70 bg-muted/25 p-3">
                  <div className="font-bold">{step.label}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(step.date)}</div>
                </div>
              ))}
              {bcPiece ? (
                <Link className="block text-sm font-semibold text-primary hover:underline" to={`/orders/${encodeURIComponent(bcPiece)}`}>
                  Commande créée : {bcPiece}
                </Link>
              ) : null}
            </div>
          </section>

          <section className="rounded-[30px] border border-border bg-card p-6 shadow-sm">
            <div className="app-kicker">Commentaires</div>
            <div className="mt-4 space-y-3">
              {(quote.events ?? []).filter((event) => event.message).map((event) => (
                <div key={event.id} className="rounded-2xl border border-border/70 bg-muted/25 p-3">
                  <div className="text-xs font-bold uppercase text-muted-foreground">{event.authorRole ?? event.eventType}</div>
                  <div className="mt-1 text-sm text-card-foreground">{event.message}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{formatDate(event.createdAt)}</div>
                </div>
              ))}
              {isClient ? (
                <div className="space-y-2">
                  <textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    className="min-h-24 w-full rounded-2xl border border-border bg-[hsl(var(--input))] px-4 py-3 text-sm text-card-foreground outline-none focus:border-primary/45"
                    placeholder="Votre message pour l'équipe confirmateur..."
                  />
                  <Button type="button" variant="primary" disabled={!comment.trim()} isLoading={commentMutation.isPending} onClick={() => commentMutation.mutate()}>
                    Ajouter une réponse
                  </Button>
                </div>
              ) : null}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

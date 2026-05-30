import { useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "../../../shared/components/Button";
import { EmptyView } from "../../../shared/components/premium";
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
    <div className="flex justify-between gap-3 py-1.5 text-[13px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold text-card-foreground">{value}</span>
    </div>
  );
}

function MetricTile({ label, value, accent }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card px-4 py-3 shadow-sm">
      <div className="app-kicker">{label}</div>
      <div className={`mt-1 text-sm font-black ${accent ? "text-primary" : "text-card-foreground"}`}>{value}</div>
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
    <div className="w-full space-y-4 pb-6">
      <section className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm md:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="app-kicker">Devis B2B</div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-black leading-tight text-card-foreground md:text-3xl">Devis {quote.piece}</h1>
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusClass(status)}`}>{statusLabel(status)}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{safe(quote.companyName || quote.clientName)}</p>
          </div>
          <div className="flex flex-col gap-3 xl:items-end">
            <div className="text-left xl:text-right">
              <div className="app-kicker">Net à payer</div>
              <div className="mt-1 text-2xl font-black text-primary">{money(quote.netAPayer)}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {canClientDecide ? <Button type="button" variant="primary" onClick={() => acceptMutation.mutate()}>Accepter</Button> : null}
              {canClientDecide ? <Button type="button" variant="outline" disabled={!comment.trim()} onClick={() => refuseMutation.mutate()}>Refuser</Button> : null}
              {canCancel ? <Button type="button" variant="ghost" onClick={() => cancelMutation.mutate()}>Annuler</Button> : null}
              {canConvert ? <Button type="button" variant="primary" onClick={() => convertMutation.mutate()}>Convertir en BC</Button> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Statut" value={<span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${statusClass(status)}`}>{statusLabel(status)}</span>} />
        <MetricTile label="Validité" value={formatDate(quote.validUntil)} />
        <MetricTile label="Remise" value={`${Number(quote.b2bDiscountRate ?? 0).toFixed(2)}%`} />
        <MetricTile label="Net à payer" value={money(quote.netAPayer)} accent />
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <div className="app-kicker">Articles</div>
              <h2 className="mt-0.5 text-base font-black">Lignes du devis</h2>
            </div>
            <span className="rounded-full border border-border/70 bg-muted/25 px-2.5 py-1 text-xs font-bold text-muted-foreground">
              {quote.lines.length} ligne{quote.lines.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/20 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5">Réf</th>
                  <th className="px-4 py-2.5">Désignation</th>
                  <th className="px-4 py-2.5 text-right">Qté</th>
                  <th className="px-4 py-2.5 text-right">PU</th>
                  <th className="px-4 py-2.5 text-right">TTC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {quote.lines.map((line) => (
                  <tr key={line.articleRef} className="hover:bg-muted/15">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-bold">{line.articleRef}</td>
                    <td className="px-4 py-3 font-semibold text-card-foreground">{safe(line.designation)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">{line.qty}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">{money(line.unitPrice)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-black">{money(line.amountTTC)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="app-kicker">Synthèse</div>
            <div className="mt-3 space-y-0.5">
              <InfoRow label="Client" value={safe(quote.companyName || quote.clientName)} />
              <InfoRow label="Téléphone" value={safe(quote.clientPhone)} />
              <InfoRow label="Sous-total" value={money(quote.totalBeforeDiscount)} />
              <InfoRow label={`Remise B2B ${Number(quote.b2bDiscountRate ?? 0).toFixed(2)}%`} value={`-${money(quote.b2bDiscountAmount)}`} />
              <InfoRow label="Source" value={safe(quote.discountSource)} />
              <div className="my-2 h-px bg-border/70" />
              <InfoRow label="Net à payer" value={money(quote.netAPayer)} />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="app-kicker">Traçabilité</div>
            <div className="mt-3 space-y-2">
              {quote.timeline.map((step) => (
                <div key={`${step.label}-${step.date ?? ""}`} className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
                  <div className="text-sm font-bold">{step.label}</div>
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

          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="app-kicker">Commentaires</div>
            <div className="mt-3 space-y-2.5">
              {(quote.events ?? []).filter((event) => event.message).map((event) => (
                <div key={event.id} className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
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
                    className="min-h-20 w-full rounded-lg border border-border bg-[hsl(var(--input))] px-3 py-2 text-sm text-card-foreground outline-none focus:border-primary/45"
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

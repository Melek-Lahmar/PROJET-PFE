import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { Modal } from "../../../shared/components/Modal";
import { EmptyView, PremiumHero } from "../../../shared/components/premium";
import { useToast } from "../../../shared/components/premium/Toast";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";
import { listB2BClients, type B2BClient } from "../../admin/api/b2bApi";
import { useAuthStore } from "../../auth/store/authStore";
import { searchVendeurClients } from "../../vendeur/api/vendeurApi";
import { cancelQuote, convertQuoteToOrder, createQuote, listQuotes } from "../api/b2bQuotesApi";
import type { CreateQuoteRequestDto, QuoteListItemDto } from "../types/b2bQuotes";

const STATUSES = ["ALL", "DRAFT", "SENT", "ACCEPTED", "CONVERTED", "REFUSED", "EXPIRED", "CANCELLED"] as const;

function money(value: number) {
  return `${Number(value ?? 0).toFixed(3)} TND`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("fr-FR");
}

function statusClass(status?: string | null) {
  const s = (status ?? "").toUpperCase();
  if (s === "ACCEPTED" || s === "CONVERTED") return "badge-success";
  if (s === "SENT") return "badge-info";
  if (s === "REFUSED" || s === "CANCELLED" || s === "EXPIRED") return "badge-danger";
  return "badge-warning";
}

function clientLabel(quote: QuoteListItemDto) {
  return quote.companyName || quote.clientName || quote.clientPhone || "-";
}

type QuoteLineForm = { articleRef: string; qty: string };

function CreateQuoteModal({
  clients,
  onClose,
}: {
  clients: B2BClient[];
  onClose: () => void;
}) {
  const toast = useToast();
  const qc = useQueryClient();
  const [clientUserId, setClientUserId] = useState(clients.find((c) => c.userId)?.userId ?? "");
  const [validUntil, setValidUntil] = useState("");
  const [clientNote, setClientNote] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [sendImmediately, setSendImmediately] = useState(true);
  const [lines, setLines] = useState<QuoteLineForm[]>([{ articleRef: "", qty: "1" }]);

  const selectedClient = clients.find((c) => c.userId === clientUserId);
  const simulatedSubtotal = 1000;
  const simulatedRate = Number(selectedClient?.discountPercent ?? selectedClient?.legacyRemise ?? 0);
  const simulatedDiscount = simulatedRate > 0 ? Number((simulatedSubtotal * simulatedRate / 100).toFixed(3)) : 0;

  const mutation = useMutation({
    mutationFn: (payload: CreateQuoteRequestDto) => createQuote(payload),
    onSuccess: async (quote) => {
      toast.success("Devis créé", quote.piece);
      await qc.invalidateQueries({ queryKey: ["b2b-quotes"] });
      onClose();
    },
    onError: (err) => toast.error("Création impossible", getApiErrorMessage(err)),
  });

  const submit = () => {
    if (!clientUserId) {
      toast.error("Sélectionnez un client B2B.");
      return;
    }

    const payloadLines = lines
      .map((line) => ({ articleRef: line.articleRef.trim(), qty: Number(line.qty) }))
      .filter((line) => line.articleRef && Number.isFinite(line.qty) && line.qty > 0);

    if (payloadLines.length === 0) {
      toast.error("Ajoutez au moins une ligne article valide.");
      return;
    }

    mutation.mutate({
      clientUserId,
      validUntil: validUntil || null,
      clientNote: clientNote.trim() || null,
      internalNote: internalNote.trim() || null,
      sendImmediately,
      lines: payloadLines,
    });
  };

  return (
    <Modal open title="Créer un devis B2B" onClose={onClose}>
      <div className="space-y-5">
        <div className="grid gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Client professionnel</label>
          <select
            className="h-11 rounded-2xl border border-border bg-[hsl(var(--input))] px-4 text-sm"
            value={clientUserId}
            onChange={(e) => setClientUserId(e.target.value)}
          >
            {clients.filter((c) => c.userId).map((client) => (
              <option key={client.userId!} value={client.userId!}>
                {client.nomSociete || client.nomComplet || client.telephone} · remise {Number(client.discountPercent ?? client.legacyRemise ?? 0).toFixed(2)}%
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Validité</label>
            <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>
          <label className="flex items-center gap-3 rounded-2xl border border-border bg-muted/25 px-4 py-3 text-sm font-semibold">
            <input type="checkbox" checked={sendImmediately} onChange={(e) => setSendImmediately(e.target.checked)} className="h-4 w-4 accent-primary" />
            Envoyer immédiatement au client
          </label>
        </div>

        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lignes article</div>
          {lines.map((line, index) => (
            <div key={index} className="grid gap-2 md:grid-cols-[1fr_120px_44px]">
              <Input
                value={line.articleRef}
                onChange={(e) => setLines((prev) => prev.map((x, i) => i === index ? { ...x, articleRef: e.target.value } : x))}
                placeholder="AR_Ref"
              />
              <Input
                type="number"
                min={1}
                value={line.qty}
                onChange={(e) => setLines((prev) => prev.map((x, i) => i === index ? { ...x, qty: e.target.value } : x))}
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}>
                ×
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => setLines((prev) => [...prev, { articleRef: "", qty: "1" }])}>
            Ajouter une ligne
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Input value={clientNote} onChange={(e) => setClientNote(e.target.value)} placeholder="Note client" />
          <Input value={internalNote} onChange={(e) => setInternalNote(e.target.value)} placeholder="Note interne" />
        </div>

        <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm">
          <div className="font-bold">Simulation sur panier 1000 TND</div>
          <div className="mt-2 grid gap-1 text-muted-foreground">
            <div className="flex justify-between"><span>Remise B2B {simulatedRate.toFixed(2)}%</span><span>-{money(simulatedDiscount)}</span></div>
            <div className="flex justify-between font-bold text-card-foreground"><span>Net estimé</span><span>{money(simulatedSubtotal - simulatedDiscount)}</span></div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
          <Button type="button" variant="primary" isLoading={mutation.isPending} onClick={submit}>Créer le devis</Button>
        </div>
      </div>
    </Modal>
  );
}

export function B2BQuotesAdminPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const roles = useAuthStore((s) => s.roles ?? []);
  const isAdmin = roles.includes("ADMIN");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("ALL");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const quotesQuery = useQuery({
    queryKey: ["b2b-quotes", status],
    queryFn: () => listQuotes({ status: status === "ALL" ? null : status }),
  });

  const clientsQuery = useQuery({
    queryKey: [isAdmin ? "admin-b2b-clients" : "vendeur-b2b-clients"],
    queryFn: async () => {
      if (isAdmin) return listB2BClients();
      const clients = await searchVendeurClients("");
      return clients
        .filter((client) => String(client.typeClient ?? "").toUpperCase() === "B2B")
        .map((client): B2BClient => ({
          userId: client.userId,
          nomComplet: client.nomComplet ?? client.displayName ?? null,
          nomSociete: client.nomSociete ?? null,
          telephone: client.telephone ?? null,
          discountPercent: null,
          legacyRemise: null,
          gouvernorat: client.gouvernorat ?? null,
          totalRevenue: 0,
          ordersCount: 0,
          averageOrderAmount: 0,
          lastOrderDate: null,
          suggestedDiscountPercent: 0,
          discountLevelLabel: "Standard",
        }));
    },
  });

  const convertMutation = useMutation({
    mutationFn: convertQuoteToOrder,
    onSuccess: async (res) => {
      toast.success("Devis converti en commande", res.piece);
      await qc.invalidateQueries({ queryKey: ["b2b-quotes"] });
    },
    onError: (err) => toast.error("Conversion impossible", getApiErrorMessage(err)),
  });

  const cancelMutation = useMutation({
    mutationFn: (piece: string) => cancelQuote(piece, "Annulation depuis l'administration"),
    onSuccess: async () => {
      toast.success("Devis annulé");
      await qc.invalidateQueries({ queryKey: ["b2b-quotes"] });
    },
    onError: (err) => toast.error("Annulation impossible", getApiErrorMessage(err)),
  });

  const quotes = useMemo(() => quotesQuery.data ?? [], [quotesQuery.data]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return quotes;
    return quotes.filter((quote) =>
      quote.piece.toLowerCase().includes(q) ||
      clientLabel(quote).toLowerCase().includes(q) ||
      String(quote.quoteStatus).toLowerCase().includes(q)
    );
  }, [quotes, search]);

  const metrics = useMemo(() => ({
    draft: quotes.filter((q) => q.quoteStatus === "DRAFT").length,
    sent: quotes.filter((q) => q.quoteStatus === "SENT").length,
    accepted: quotes.filter((q) => q.quoteStatus === "ACCEPTED").length,
    converted: quotes.filter((q) => q.quoteStatus === "CONVERTED").length,
    acceptedAmount: quotes.filter((q) => q.quoteStatus === "ACCEPTED").reduce((sum, q) => sum + Number(q.netAPayer ?? 0), 0),
  }), [quotes]);

  return (
    <div className="w-full space-y-6 pb-10">
      <PremiumHero
        kicker="B2B"
        title="Devis B2B"
        description="Créez, envoyez et suivez les propositions commerciales destinées aux clients professionnels."
        actions={<Button type="button" variant="primary" onClick={() => setCreateOpen(true)}>Créer devis</Button>}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Brouillons", metrics.draft],
          ["Envoyés", metrics.sent],
          ["Acceptés", metrics.accepted],
          ["Convertis", metrics.converted],
          ["Montant accepté", money(metrics.acceptedAmount)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[24px] border border-border/70 bg-muted/25 px-4 py-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
            <div className="mt-2 text-2xl font-black text-card-foreground">{value}</div>
          </div>
        ))}
      </section>

      <section className="app-surface px-5 py-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher pièce, client, statut..." className="lg:max-w-sm" />
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <Button key={s} type="button" variant={status === s ? "primary" : "outline"} size="sm" onClick={() => setStatus(s)}>
                {s === "ALL" ? "Tous" : s}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {quotesQuery.isLoading ? (
        <div className="text-sm text-muted-foreground">Chargement des devis...</div>
      ) : quotesQuery.isError ? (
        <div className="rounded-2xl border border-danger/20 bg-danger/5 p-4 text-sm text-rose-700">{getApiErrorMessage(quotesQuery.error)}</div>
      ) : filtered.length === 0 ? (
        <EmptyView
          title="Aucun devis B2B"
          description="Créez une première proposition commerciale pour un client professionnel."
          iconPath="M6 2h9l5 5v15H6z M14 2v6h6 M9 13h6 M9 17h8"
        />
      ) : (
        <div className="overflow-x-auto rounded-[28px] border border-border bg-card shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr className="text-left text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                <th className="px-4 py-3">Pièce</th>
                <th className="px-4 py-3">Client / Société</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Validité</th>
                <th className="px-4 py-3 text-right">Remise</th>
                <th className="px-4 py-3 text-right">Net</th>
                <th className="px-4 py-3">Créé par</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {filtered.map((quote) => (
                <tr key={quote.piece} className="hover:bg-muted/25">
                  <td className="px-4 py-3 font-mono font-black">{quote.piece}</td>
                  <td className="px-4 py-3 font-semibold">{clientLabel(quote)}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(quote.quoteStatus)}`}>{quote.quoteStatus}</span></td>
                  <td className="px-4 py-3">{formatDate(quote.validUntil)}</td>
                  <td className="px-4 py-3 text-right">{Number(quote.b2bDiscountRate ?? 0).toFixed(2)}%</td>
                  <td className="px-4 py-3 text-right font-black text-primary">{money(quote.netAPayer)}</td>
                  <td className="px-4 py-3">{quote.createdBy ?? "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => navigate(`/admin/b2b/quotes/${encodeURIComponent(quote.piece)}`)}>Voir</Button>
                      {quote.quoteStatus === "ACCEPTED" ? (
                        <Button type="button" variant="primary" size="sm" onClick={() => convertMutation.mutate(quote.piece)}>Convertir</Button>
                      ) : null}
                      {quote.quoteStatus === "DRAFT" || quote.quoteStatus === "SENT" ? (
                        <Button type="button" variant="ghost" size="sm" onClick={() => cancelMutation.mutate(quote.piece)}>Annuler</Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {createOpen ? <CreateQuoteModal clients={clientsQuery.data ?? []} onClose={() => setCreateOpen(false)} /> : null}

      {isAdmin ? (
        <Link to="/admin/clients/b2b" className="inline-flex text-sm font-semibold text-primary hover:underline">
          Retour gestion commerciale B2B
        </Link>
      ) : null}
    </div>
  );
}

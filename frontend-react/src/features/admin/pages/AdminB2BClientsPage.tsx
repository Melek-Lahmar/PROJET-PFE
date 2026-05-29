import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  listB2BClients,
  listClientDiscountHistory,
  setClientDiscount,
  type B2BClient,
} from "../api/b2bApi";
import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { Modal } from "../../../shared/components/Modal";
import { useToast } from "../../../shared/components/premium/Toast";
import { PremiumHero, EmptyView } from "../../../shared/components/premium";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";

function money(v: number) {
  return `${Number(v ?? 0).toFixed(3)} TND`;
}

function formatPct(v: number | null | undefined) {
  if (v === null || v === undefined) return "-";
  return `${Number(v).toFixed(2)} %`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("fr-FR");
}

function displayName(client: B2BClient) {
  return client.nomSociete || client.nomComplet || client.telephone || "-";
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-[24px] border border-border/70 bg-muted/25 px-4 py-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-black text-card-foreground">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

export function AdminB2BClientsPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const { data: clients = [], isPending, isError, error } = useQuery({
    queryKey: ["admin-b2b-clients"],
    queryFn: listB2BClients,
  });

  const [editing, setEditing] = useState<B2BClient | null>(null);
  const [historyFor, setHistoryFor] = useState<B2BClient | null>(null);
  const [value, setValue] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  const metrics = useMemo(() => {
    const revenue = clients.reduce((sum, client) => sum + Number(client.totalRevenue ?? 0), 0);
    const withDiscount = clients.filter((c) => Number(c.discountPercent ?? c.legacyRemise ?? 0) > 0);
    const withoutDiscount = clients.length - withDiscount.length;
    const avgDiscount = withDiscount.length
      ? withDiscount.reduce((sum, c) => sum + Number(c.discountPercent ?? c.legacyRemise ?? 0), 0) / withDiscount.length
      : 0;
    const top = [...clients].sort((a, b) => Number(b.totalRevenue ?? 0) - Number(a.totalRevenue ?? 0))[0];
    return { revenue, withoutDiscount, avgDiscount, top };
  }, [clients]);

  const updateMut = useMutation({
    mutationFn: async ({ id, val, reason }: { id: string; val: number | null; reason: string }) =>
      setClientDiscount(id, val, reason),
    onSuccess: async () => {
      toast.success("Remise mise à jour");
      await qc.invalidateQueries({ queryKey: ["admin-b2b-clients"] });
      if (editing?.userId) await qc.invalidateQueries({ queryKey: ["admin-b2b-history", editing.userId] });
      setEditing(null);
    },
    onError: (err) => toast.error("Mise à jour impossible", getApiErrorMessage(err)),
  });

  const historyQuery = useQuery({
    queryKey: ["admin-b2b-history", historyFor?.userId],
    queryFn: () => listClientDiscountHistory(String(historyFor!.userId)),
    enabled: !!historyFor?.userId,
  });

  const openEdit = (client: B2BClient, suggested = false) => {
    setEditing(client);
    setValue(String(suggested ? client.suggestedDiscountPercent : (client.discountPercent ?? "")));
    setReason(suggested ? `Application remise suggérée ${client.discountLevelLabel}` : "");
  };

  const submitDiscount = () => {
    if (!editing?.userId) return;
    const val = value.trim() === "" ? null : Number(value);
    if (val !== null && (!Number.isFinite(val) || val < 0 || val > 100)) {
      toast.error("Valeur invalide", "Doit être entre 0 et 100.");
      return;
    }
    if (!reason.trim()) {
      toast.error("Motif obligatoire", "Expliquez la décision commerciale.");
      return;
    }
    updateMut.mutate({ id: String(editing.userId), val, reason: reason.trim() });
  };

  return (
    <div className="w-full space-y-6 pb-10">
      <PremiumHero
        kicker="Admin"
        title="Gestion commerciale B2B"
        description="Pilotez les remises personnalisées selon le chiffre d'affaires, l'historique d'achat et la relation commerciale des clients professionnels."
        actions={
          <Link to="/admin/b2b/quotes">
            <Button type="button" variant="primary">Devis B2B</Button>
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Clients B2B" value={String(clients.length)} hint="Comptes professionnels" />
        <KpiCard label="CA B2B" value={money(metrics.revenue)} hint="Basé BL, fallback BC si aucun BL" />
        <KpiCard label="Remise moyenne" value={formatPct(metrics.avgDiscount)} hint="Clients avec remise" />
        <KpiCard label="Sans remise" value={String(metrics.withoutDiscount)} hint="À qualifier commercialement" />
        <KpiCard label="Top client" value={displayName(metrics.top ?? ({} as B2BClient))} hint={money(metrics.top?.totalRevenue ?? 0)} />
      </section>

      {isPending ? (
        <div className="text-sm text-muted-foreground">Chargement...</div>
      ) : isError ? (
        <div className="rounded-2xl border border-danger/20 bg-danger/5 p-4 text-sm text-rose-700">{getApiErrorMessage(error)}</div>
      ) : clients.length === 0 ? (
        <EmptyView
          title="Aucun client B2B"
          description="Marquez un client comme B2B depuis sa fiche pour qu'il apparaisse ici."
          iconPath="M8 12h8 M5 21V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14"
        />
      ) : (
        <div className="overflow-x-auto rounded-[28px] border border-border bg-card shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr className="text-left text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                <th className="px-4 py-3">Société</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Téléphone</th>
                <th className="px-4 py-3">Gouvernorat</th>
                <th className="px-4 py-3 text-right">Chiffre d'affaires</th>
                <th className="px-4 py-3 text-right">Commandes</th>
                <th className="px-4 py-3 text-right">Panier moyen</th>
                <th className="px-4 py-3">Dernière commande</th>
                <th className="px-4 py-3 text-right">Remise actuelle</th>
                <th className="px-4 py-3 text-right">Remise suggérée</th>
                <th className="px-4 py-3">Niveau</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {clients.map((c) => (
                <tr key={c.userId ?? displayName(c)} className="hover:bg-muted/25">
                  <td className="px-4 py-3 font-black">{c.nomSociete ?? "-"}</td>
                  <td className="px-4 py-3">{c.nomComplet ?? "-"}</td>
                  <td className="px-4 py-3">{c.telephone ?? "-"}</td>
                  <td className="px-4 py-3">{c.gouvernorat ?? "-"}</td>
                  <td className="px-4 py-3 text-right">{money(c.totalRevenue)}</td>
                  <td className="px-4 py-3 text-right">{c.ordersCount}</td>
                  <td className="px-4 py-3 text-right">{money(c.averageOrderAmount)}</td>
                  <td className="px-4 py-3">{formatDate(c.lastOrderDate)}</td>
                  <td className="px-4 py-3 text-right font-bold">{formatPct(c.discountPercent ?? c.legacyRemise)}</td>
                  <td className="px-4 py-3 text-right text-primary font-black">{formatPct(c.suggestedDiscountPercent)}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-muted px-3 py-1 text-xs font-bold">{c.discountLevelLabel}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => openEdit(c)}>Modifier</Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(c, true)}>Suggérée</Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setHistoryFor(c)}>Historique</Button>
                      <Link to="/admin/b2b/quotes"><Button type="button" variant="ghost" size="sm">Créer devis</Button></Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing ? (
        <Modal open title={`Modifier remise - ${displayName(editing)}`} onClose={() => setEditing(null)}>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-muted/25 p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ancienne remise</div>
                <div className="mt-2 text-2xl font-black">{formatPct(editing.discountPercent ?? editing.legacyRemise)}</div>
              </div>
              <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Remise suggérée</div>
                <div className="mt-2 text-2xl font-black text-primary">{formatPct(editing.suggestedDiscountPercent)}</div>
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nouvelle remise (%)</label>
              <Input type="number" min={0} max={100} step={0.01} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Vide = supprimer la remise personnalisée" />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Motif obligatoire</label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: CA annuel, accord commercial, fidélisation..." />
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200">
              {(() => {
                const rate = value.trim() === "" ? 0 : Number(value);
                const discount = Number.isFinite(rate) ? Number((1000 * rate / 100).toFixed(3)) : 0;
                return (
                  <div className="space-y-1">
                    <div className="font-bold">Simulation panier 1000 TND</div>
                    <div className="flex justify-between"><span>Montant remise</span><span>-{money(discount)}</span></div>
                    <div className="flex justify-between font-black"><span>Net après remise</span><span>{money(1000 - discount)}</span></div>
                  </div>
                );
              })()}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Annuler</Button>
              <Button type="button" variant="primary" isLoading={updateMut.isPending} onClick={submitDiscount}>Enregistrer</Button>
            </div>
          </div>
        </Modal>
      ) : null}

      {historyFor ? (
        <Modal open title={`Historique remise - ${displayName(historyFor)}`} onClose={() => setHistoryFor(null)}>
          {historyQuery.isPending ? (
            <div className="text-sm text-muted-foreground">Chargement...</div>
          ) : (historyQuery.data ?? []).length === 0 ? (
            <div className="text-sm text-muted-foreground">Aucun changement enregistré.</div>
          ) : (
            <div className="space-y-2">
              {(historyQuery.data ?? []).map((h) => (
                <div key={h.id} className="rounded-2xl border border-border p-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-bold">{formatPct(h.oldValue)}{" -> "}{formatPct(h.newValue)}</span>
                    <span className="text-xs text-muted-foreground">{new Date(h.changedAt).toLocaleString("fr-FR")}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">Admin : {h.changedByAdminId}</div>
                  {h.reason ? <div className="mt-1 text-xs italic text-muted-foreground">"{h.reason}"</div> : null}
                </div>
              ))}
            </div>
          )}
        </Modal>
      ) : null}
    </div>
  );
}

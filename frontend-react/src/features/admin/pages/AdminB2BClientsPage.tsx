import { useState } from "react";
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

function formatPct(v: number | null) {
  if (v === null || v === undefined) return "—";
  return `${Number(v).toFixed(2)} %`;
}

export function AdminB2BClientsPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const { data: clients = [], isPending } = useQuery({
    queryKey: ["admin-b2b-clients"],
    queryFn: listB2BClients,
  });

  const [editing, setEditing] = useState<B2BClient | null>(null);
  const [historyFor, setHistoryFor] = useState<B2BClient | null>(null);
  const [value, setValue] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  const updateMut = useMutation({
    mutationFn: async ({ id, val, reason }: { id: string; val: number | null; reason: string }) =>
      setClientDiscount(id, val, reason),
    onSuccess: () => {
      toast.success("Remise mise à jour");
      qc.invalidateQueries({ queryKey: ["admin-b2b-clients"] });
      setEditing(null);
    },
    onError: () => toast.error("Mise à jour impossible"),
  });

  const historyQuery = useQuery({
    queryKey: ["admin-b2b-history", historyFor?.userId],
    queryFn: () => listClientDiscountHistory(String(historyFor!.userId)),
    enabled: !!historyFor?.userId,
  });

  return (
    <div className="w-full space-y-6 pb-10">
      <PremiumHero
        kicker="Admin"
        title="Clients B2B & remises"
        description="Gérez les remises personnalisées appliquées automatiquement aux commandes des clients professionnels."
      />

      {isPending ? (
        <div className="text-sm text-muted-foreground">Chargement...</div>
      ) : clients.length === 0 ? (
        <EmptyView
          title="Aucun client B2B"
          description="Marquez un client comme B2B depuis sa fiche pour qu'il apparaisse ici."
          iconPath="M8 12h8 M5 21V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14"
        />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="border-b border-border bg-card/70">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Société</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Téléphone</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Gouvernorat</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Remise</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.userId ?? c.nomComplet ?? Math.random()} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3 font-semibold text-card-foreground">{c.nomSociete ?? "—"}</td>
                  <td className="px-4 py-3">{c.nomComplet ?? "—"}</td>
                  <td className="px-4 py-3">{c.telephone ?? "—"}</td>
                  <td className="px-4 py-3">{c.gouvernorat ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-bold">{formatPct(c.discountPercent ?? c.legacyRemise ?? null)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => {
                        setEditing(c);
                        setValue(c.discountPercent != null ? String(c.discountPercent) : "");
                        setReason("");
                      }}>
                        Modifier
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setHistoryFor(c)}>
                        Historique
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal open={true} onClose={() => setEditing(null)} title={`Remise — ${editing.nomSociete ?? editing.nomComplet ?? ""}`}>
          <div className="space-y-3">
            <div className="grid gap-1">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Remise (%)</label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="ex: 12.5"
              />
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Motif</label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="ex: négociation 2026" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>Annuler</Button>
              <Button
                variant="primary"
                disabled={updateMut.isPending}
                onClick={() => {
                  if (!editing.userId) return;
                  const val = value.trim() === "" ? null : Number(value);
                  if (val !== null && (!Number.isFinite(val) || val < 0 || val > 100)) {
                    toast.error("Valeur invalide", "Doit être entre 0 et 100");
                    return;
                  }
                  updateMut.mutate({ id: String(editing.userId), val, reason });
                }}
              >
                {updateMut.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {historyFor && (
        <Modal open={true} onClose={() => setHistoryFor(null)} title={`Historique remise — ${historyFor.nomSociete ?? historyFor.nomComplet ?? ""}`}>
          {historyQuery.isPending ? (
            <div className="text-sm text-muted-foreground">Chargement...</div>
          ) : (historyQuery.data ?? []).length === 0 ? (
            <div className="text-sm text-muted-foreground">Aucun changement enregistré.</div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {(historyQuery.data ?? []).map((h) => (
                <div key={h.id} className="rounded-xl border border-border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">
                      {formatPct(h.oldValue)} → {formatPct(h.newValue)}
                    </span>
                    <span className="text-xs text-muted-foreground">{new Date(h.changedAt).toLocaleString("fr-FR")}</span>
                  </div>
                  {h.reason && <div className="mt-1 text-xs italic text-muted-foreground">"{h.reason}"</div>}
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

import { useCallback, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { axiosClient } from "../../../core/http/axiosClient";
import { endpoints } from "../../../core/http/endpoints";
import { Button } from "../../../shared/components/Button";
import { PremiumHero } from "../../../shared/components/premium";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  pending: number;
  inProgress: number;
  receivedToday: number;
  blocked24h: number;
}

interface Transfert {
  id: string;
  doPiece: string;
  arRef: string;
  quantite?: number;
  status: string;
  sourceDepotNo: number;
  destinationDepotNo: number;
  transitLivreurUserId?: string | null;
  version: number;
  affectedAt?: string | null;
  pickedUpAt?: string | null;
  deliveredAt?: string | null;
  algoReasoning?: string | null;
}

interface Livreur {
  id: string;
  fullName: string;
  email?: string | null;
  telephone?: string | null;
  isTransit: boolean;
  depotRattacheNo?: number | null;
  depotRattacheName?: string | null;
  gouvernorat?: string | null;
  delegation?: string | null;
}

interface Depot {
  dE_No: number;
  dE_Intitule: string;
  dE_Code: string;
}

interface Issue {
  id: string;
  severity: string;
  alertType: string;
  message: string;
  createdAt: string;
  acknowledgedAt?: string | null;
}

// ─── Badge helper ─────────────────────────────────────────────────────────────

function badgeClass(status: string) {
  const s = status.toUpperCase();
  if (s.includes("RECU") || s.includes("TERMINE")) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  if (s.includes("TRANSIT") && !s.includes("ATTENTE")) return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
  if (s.includes("AFFECTATION")) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${badgeClass(status)}`}>
      {status}
    </span>
  );
}

// ─── Modal détails / édition manuelle d'une mission ──────────────────────────

const STATUS_OPTIONS = [
  "EN_ATTENTE_AFFECTATION",
  "AFFECTE",
  "EN_TRANSIT",
  "RECU",
  "TERMINE",
  "ANNULE",
];

function InfoLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-0.5 truncate text-sm font-medium text-card-foreground">{value}</div>
    </div>
  );
}

function TransfertDetailsModal({
  transfert,
  livreurs,
  depots,
  onClose,
}: {
  transfert: Transfert;
  livreurs: Livreur[];
  depots: Depot[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [editStatus, setEditStatus] = useState(transfert.status);
  const [editLivreurId, setEditLivreurId] = useState(transfert.transitLivreurUserId ?? "");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const depotLabel = (no: number) => {
    const d = depots.find((x) => x.dE_No === no);
    return d ? `${d.dE_Intitule} (${d.dE_Code})` : `Dépôt #${no}`;
  };

  const livreurLabel = (id?: string | null) => {
    if (!id) return "Non affecté";
    const l = livreurs.find((lv) => lv.id === id);
    return l ? `${l.fullName}${l.telephone ? ` — ${l.telephone}` : ""}` : id;
  };

  const invalidateAll = async () => {
    await qc.invalidateQueries({ queryKey: ["supervisor-missions"] });
    await qc.invalidateQueries({ queryKey: ["supervisor-transferts"] });
    await qc.invalidateQueries({ queryKey: ["supervisor-livreurs"] });
    await qc.invalidateQueries({ queryKey: ["supervisor-stats"] });
  };

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      axiosClient.post(endpoints.supervisorTransitMissionChangeStatus(transfert.id), { status }),
    onSuccess: async () => {
      setSuccessMsg("Statut mis à jour.");
      await invalidateAll();
    },
  });

  const assignMutation = useMutation({
    mutationFn: (livreurId: string) =>
      axiosClient.post(endpoints.supervisorTransitMissionAssign(transfert.id), { livreurId }),
    onSuccess: async () => {
      setSuccessMsg("Livreur réaffecté.");
      await invalidateAll();
    },
  });

  const statusChanged = editStatus !== transfert.status;
  const livreurChanged = editLivreurId !== (transfert.transitLivreurUserId ?? "");
  const anyError = statusMutation.error || assignMutation.error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-card-foreground">Détails de la mission</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Pièce <span className="font-semibold text-card-foreground">{transfert.doPiece}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-card-foreground"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 rounded-xl border border-border/60 bg-muted/15 p-4 sm:grid-cols-2">
          <InfoLine label="Pièce" value={transfert.doPiece} />
          <InfoLine label="Référence article" value={transfert.arRef} />
          <InfoLine label="Quantité" value={Number(transfert.quantite ?? 0).toLocaleString("fr-FR")} />
          <InfoLine label="Version" value={String(transfert.version)} />
          <InfoLine label="Dépôt source" value={depotLabel(transfert.sourceDepotNo)} />
          <InfoLine label="Dépôt destination" value={depotLabel(transfert.destinationDepotNo)} />
          <InfoLine label="Statut actuel" value={<StatusBadge status={transfert.status} />} />
          <InfoLine
            label="Livreur affecté"
            value={
              <span className={transfert.transitLivreurUserId ? "" : "italic text-amber-600"}>
                {livreurLabel(transfert.transitLivreurUserId)}
              </span>
            }
          />
        </div>

        <div className="mt-5 space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <h4 className="text-sm font-bold text-card-foreground">✏️ Modifier manuellement</h4>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-card-foreground">Statut</label>
            <div className="flex flex-wrap gap-2">
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="h-10 flex-1 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
              >
                {!STATUS_OPTIONS.includes(editStatus) && (
                  <option value={editStatus}>{editStatus}</option>
                )}
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <Button
                type="button"
                variant="primary"
                size="sm"
                isLoading={statusMutation.isPending}
                disabled={!statusChanged || statusMutation.isPending}
                onClick={() => statusMutation.mutate(editStatus)}
              >
                Enregistrer statut
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-card-foreground">Livreur</label>
            <div className="flex flex-wrap gap-2">
              <select
                value={editLivreurId}
                onChange={(e) => setEditLivreurId(e.target.value)}
                className="h-10 flex-1 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
              >
                <option value="">— Non affecté —</option>
                {livreurs.filter((lv) => lv.isTransit).map((lv) => (
                  <option key={lv.id} value={lv.id}>
                    {lv.fullName}
                    {lv.telephone ? ` — ${lv.telephone}` : ""}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="primary"
                size="sm"
                isLoading={assignMutation.isPending}
                disabled={!livreurChanged || !editLivreurId || assignMutation.isPending}
                onClick={() => assignMutation.mutate(editLivreurId)}
              >
                Réaffecter
              </Button>
            </div>
          </div>

          {successMsg && !anyError && (
            <div className="rounded-xl border border-success/25 bg-success/10 px-4 py-2.5 text-sm font-medium text-success">
              ✓ {successMsg}
            </div>
          )}

          {anyError && (
            <div className="rounded-xl border border-[hsl(var(--danger)/0.25)] bg-[hsl(var(--danger)/0.08)] px-4 py-2.5 text-sm text-[hsl(var(--danger))]">
              {getApiErrorMessage(anyError)}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Onglet "Vue globale" ──────────────────────────────────────────────────────

function GlobalTab({
  items,
  onRetry,
  retryingPiece,
  onOpenDetails,
}: {
  items: Transfert[];
  onRetry: (piece: string) => void;
  retryingPiece: string | null;
  onOpenDetails: (t: Transfert) => void;
}) {
  return (
    <section className="space-y-2">
      {items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-10 text-center text-sm text-muted-foreground">
          Aucune mission transit active.
        </div>
      ) : (
        items.map((t) => (
          <div
            key={t.id}
            className="rounded-xl border border-border/70 bg-muted/15 p-4 transition hover:bg-muted/30"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-card-foreground">{t.doPiece}</span>
                  <StatusBadge status={t.status} />
                </div>
                <div className="mt-1.5 text-sm text-muted-foreground">
                  {t.arRef} · dépôt{" "}
                  <span className="font-semibold text-card-foreground">{t.sourceDepotNo}</span>
                  {" → "}
                  <span className="font-semibold text-card-foreground">{t.destinationDepotNo}</span>
                  {" · "}qté {Number(t.quantite ?? 0).toLocaleString("fr-FR")}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Livreur :{" "}
                  <span className={t.transitLivreurUserId ? "font-semibold text-card-foreground" : "italic text-amber-600"}>
                    {t.transitLivreurUserId ?? "non affecté"}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenDetails(t)}
                >
                  Détails
                </Button>
                {!t.transitLivreurUserId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    isLoading={retryingPiece === t.doPiece}
                    onClick={() => onRetry(t.doPiece)}
                  >
                    Relancer affectation
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </section>
  );
}

// ─── Onglet "Livreurs de transit" ─────────────────────────────────────────────

interface ReassignModalState {
  transfertId: string;
  doPiece: string;
}

function LivreursTab({ depots }: { depots: Depot[] }) {
  const qc = useQueryClient();

  const livreursQuery = useQuery({
    queryKey: ["supervisor-livreurs"],
    queryFn: () =>
      axiosClient
        .get<Livreur[]>(endpoints.supervisorLivreurs)
        .then((r) => r.data),
    staleTime: 30_000,
  });

  const transfertsQuery = useQuery({
    queryKey: ["supervisor-transferts"],
    queryFn: () =>
      axiosClient
        .get<Transfert[]>(endpoints.supervisorTransferts)
        .then((r) => r.data),
    staleTime: 30_000,
  });

  const [reassigning, setReassigning] = useState<ReassignModalState | null>(null);
  const [selectedLivreurId, setSelectedLivreurId] = useState("");

  const reassignMutation = useMutation({
    mutationFn: ({ transfertId, livreurId }: { transfertId: string; livreurId: string }) =>
      axiosClient.post(endpoints.supervisorReassignTransfert(transfertId), { livreurId }),
    onSuccess: async () => {
      setReassigning(null);
      setSelectedLivreurId("");
      await qc.invalidateQueries({ queryKey: ["supervisor-transferts"] });
      await qc.invalidateQueries({ queryKey: ["supervisor-livreurs"] });
    },
  });

  // Garde uniquement les livreurs de transit pour cet onglet
  const livreurs = (livreursQuery.data ?? []).filter((lv) => lv.isTransit);
  const transferts = transfertsQuery.data ?? [];

  // Missions actives par livreur (statuts en cours uniquement)
  const ACTIVE_STATUSES = ["EN_ATTENTE_TRANSIT", "EN_ATTENTE_AFFECTATION_TRANSIT", "EN_TRANSIT", "EN_COURS_TRANSIT", "TRANSIT_REQUIS"];
  const missionsByLivreur = useMemo(() => {
    const map = new Map<string, Transfert[]>();
    for (const t of transferts) {
      if (!t.transitLivreurUserId) continue;
      if (!ACTIVE_STATUSES.includes(t.status.toUpperCase())) continue;
      const list = map.get(t.transitLivreurUserId) ?? [];
      list.push(t);
      map.set(t.transitLivreurUserId, list);
    }
    return map;
  }, [transferts]);

  const depotLabel = useCallback(
    (no?: number | null) => {
      if (!no) return "—";
      const d = depots.find((x) => x.dE_No === no);
      return d ? `${d.dE_Intitule} (${d.dE_Code})` : `#${no}`;
    },
    [depots]
  );

  if (livreursQuery.isLoading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Chargement des livreurs…</div>;
  }

  if (livreursQuery.isError) {
    return (
      <div className="rounded-2xl border border-[hsl(var(--danger)/0.25)] bg-[hsl(var(--danger)/0.08)] px-4 py-4 text-sm text-[hsl(var(--danger))]">
        {getApiErrorMessage(livreursQuery.error)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {livreurs.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-10 text-center text-sm text-muted-foreground">
          Aucun livreur de transit enregistré.
        </div>
      ) : (
        livreurs.map((lv) => {
          const missions = missionsByLivreur.get(lv.id) ?? [];
          const isAvailable = missions.length === 0;
          const initial = (lv.fullName?.trim() || lv.email || "?").slice(0, 1).toUpperCase();
          return (
            <div
              key={lv.id}
              className="rounded-2xl border border-border bg-card shadow-sm"
            >
              {/* En-tête livreur */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {initial}
                  </div>
                  <div>
                    <div className="font-bold text-card-foreground">
                      {lv.fullName?.trim() || lv.email || "Livreur sans nom"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {lv.depotRattacheName ?? depotLabel(lv.depotRattacheNo)}
                      {lv.gouvernorat && <> · {lv.gouvernorat}</>}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {lv.telephone && (
                    <a
                      href={`tel:${lv.telephone}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs font-semibold text-card-foreground transition hover:bg-muted"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      {lv.telephone}
                    </a>
                  )}
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                      isAvailable ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                    }`}
                  >
                    {isAvailable ? "Disponible" : "En mission"}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {missions.length} mission{missions.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* Missions du livreur */}
              {missions.length > 0 && (
                <div className="divide-y divide-border/40 px-5 py-3">
                  {missions.map((t) => (
                    <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="text-sm">
                        <span className="font-semibold text-card-foreground">{t.doPiece}</span>
                        <span className="ml-2 text-muted-foreground">
                          {t.sourceDepotNo}→{t.destinationDepotNo}
                        </span>
                        <span className="ml-2">
                          <StatusBadge status={t.status} />
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setReassigning({ transfertId: t.id, doPiece: t.doPiece });
                          setSelectedLivreurId("");
                        }}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Réaffecter
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Modal de réaffectation */}
      {reassigning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-card-foreground">
              Réaffecter la mission
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Mission <span className="font-semibold">{reassigning.doPiece}</span>
            </p>

            <div className="mt-5 space-y-3">
              <label className="text-sm font-semibold text-card-foreground">
                Nouveau livreur
              </label>
              <select
                value={selectedLivreurId}
                onChange={(e) => setSelectedLivreurId(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
              >
                <option value="">Sélectionner un livreur…</option>
                {livreurs.map((lv) => {
                  const count = missionsByLivreur.get(lv.id)?.length ?? 0;
                  return (
                    <option key={lv.id} value={lv.id}>
                      {lv.fullName?.trim() || lv.email}
                      {lv.telephone ? ` — ${lv.telephone}` : ""}
                      {" "}
                      ({count === 0 ? "disponible" : `${count} mission${count > 1 ? "s" : ""}`})
                    </option>
                  );
                })}
              </select>

              {reassignMutation.isError && (
                <div className="rounded-xl border border-[hsl(var(--danger)/0.25)] bg-[hsl(var(--danger)/0.08)] px-4 py-3 text-sm text-[hsl(var(--danger))]">
                  {getApiErrorMessage(reassignMutation.error)}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setReassigning(null);
                  setSelectedLivreurId("");
                  reassignMutation.reset();
                }}
              >
                Annuler
              </Button>
              <Button
                type="button"
                variant="primary"
                isLoading={reassignMutation.isPending}
                disabled={!selectedLivreurId || reassignMutation.isPending}
                onClick={() =>
                  reassignMutation.mutate({
                    transfertId: reassigning.transfertId,
                    livreurId: selectedLivreurId,
                  })
                }
              >
                Confirmer la réaffectation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Onglet "Problèmes" ───────────────────────────────────────────────────────

function severityBadgeClass(severity: string) {
  const s = severity.toUpperCase();
  if (s === "HIGH" || s === "URGENT" || s === "CRITICAL") return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  if (s === "WARNING" || s === "MEDIUM") return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
}

function ProblemesTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"open" | "all">("open");

  const issuesQuery = useQuery({
    queryKey: ["supervisor-issues", filter],
    queryFn: () =>
      axiosClient
        .get<Issue[]>(endpoints.supervisorIssues, {
          params: { includeRead: filter === "all" },
        })
        .then((r) => r.data),
    staleTime: 30_000,
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) =>
      axiosClient.post(endpoints.supervisorIssueResolve(id)),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["supervisor-issues"] });
      await qc.invalidateQueries({ queryKey: ["supervisor-stats"] });
    },
  });

  const issues = issuesQuery.data ?? [];
  const openCount = issues.filter((i) => !i.acknowledgedAt).length;

  if (issuesQuery.isLoading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Chargement des problèmes…</div>;
  }

  if (issuesQuery.isError) {
    return (
      <div className="rounded-2xl border border-[hsl(var(--danger)/0.25)] bg-[hsl(var(--danger)/0.08)] px-4 py-4 text-sm text-[hsl(var(--danger))]">
        {getApiErrorMessage(issuesQuery.error)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-muted-foreground">Afficher :</span>
        <button
          type="button"
          onClick={() => setFilter("open")}
          className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
            filter === "open"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "border border-border bg-card text-card-foreground hover:bg-muted"
          }`}
        >
          Ouverts ({openCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
            filter === "all"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "border border-border bg-card text-card-foreground hover:bg-muted"
          }`}
        >
          Tous ({issues.length})
        </button>
      </div>

      {resolveMutation.isError && (
        <div className="rounded-xl border border-[hsl(var(--danger)/0.25)] bg-[hsl(var(--danger)/0.08)] px-4 py-3 text-sm text-[hsl(var(--danger))]">
          {getApiErrorMessage(resolveMutation.error)}
        </div>
      )}

      {/* Liste */}
      {issues.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-10 text-center text-sm text-muted-foreground">
          Aucun problème {filter === "open" ? "ouvert" : ""} signalé.
        </div>
      ) : (
        <div className="space-y-2">
          {issues.map((issue) => (
            <div
              key={issue.id}
              className={`rounded-xl border bg-muted/15 p-4 transition ${
                issue.acknowledgedAt ? "border-border/40 opacity-60" : "border-border/70"
              }`}
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${severityBadgeClass(issue.severity)}`}>
                      {issue.severity}
                    </span>
                    <span className="font-bold text-card-foreground">{issue.alertType}</span>
                  </div>
                  <p className="mt-2 text-sm text-card-foreground/90">{issue.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(issue.createdAt).toLocaleString("fr-FR")}
                  </p>
                </div>

                {!issue.acknowledgedAt ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    isLoading={resolveMutation.isPending && resolveMutation.variables === issue.id}
                    onClick={() => resolveMutation.mutate(issue.id)}
                    className="shrink-0"
                  >
                    Résoudre
                  </Button>
                ) : (
                  <span className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-[11px] font-bold text-green-800 dark:bg-green-900/30 dark:text-green-300">
                    Résolu
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Onglet "Dépôts" ─────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  EN_ATTENTE_TRANSIT:              "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  EN_ATTENTE_AFFECTATION_TRANSIT:  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  EN_TRANSIT:                      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  EN_COURS_TRANSIT:                "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  RECU_AU_DEPOT:                   "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  RECU_DEPOT_DESTINE:              "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  TRANSIT_TERMINE:                 "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  TRANSIT_PARTIELLEMENT_RECU:      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  ANNULE:                          "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  TRANSIT_REQUIS:                  "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

function statusColor(s: string) {
  return STATUS_COLOR[s.toUpperCase()] ?? "bg-muted text-muted-foreground";
}

function formatDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function DepotsTab({
  depots,
  livreurs,
  onOpenDetails,
}: {
  depots: Depot[];
  livreurs: Livreur[];
  onOpenDetails: (t: Transfert) => void;
}) {
  const transfertsQuery = useQuery({
    queryKey: ["supervisor-transferts-all"],
    queryFn: () =>
      axiosClient.get<Transfert[]>(endpoints.supervisorTransferts).then((r) => r.data),
    staleTime: 30_000,
  });

  const transferts = transfertsQuery.data ?? [];

  const [selectedDepot, setSelectedDepot] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const depotLabel = (no: number) => {
    const d = depots.find((x) => x.dE_No === no);
    return d ? `${d.dE_Intitule} (${d.dE_Code})` : `Dépôt #${no}`;
  };

  const livreurName = (id?: string | null) => {
    if (!id) return null;
    const l = livreurs.find((lv) => lv.id === id);
    return l ? (l.fullName?.trim() || l.email || id) : id;
  };

  const livreurPhone = (id?: string | null) => {
    if (!id) return null;
    return livreurs.find((lv) => lv.id === id)?.telephone ?? null;
  };

  // Tous les dépôts sources présents dans les transferts
  const sourceDepotNos = useMemo(
    () => Array.from(new Set(transferts.map((t) => t.sourceDepotNo))).sort((a, b) => a - b),
    [transferts]
  );

  // Tous les statuts présents
  const allStatuses = useMemo(
    () => Array.from(new Set(transferts.map((t) => t.status))).sort(),
    [transferts]
  );

  // Missions filtrées
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return transferts.filter((t) => {
      const matchDepot = selectedDepot === null || t.sourceDepotNo === selectedDepot;
      const matchStatus = statusFilter === "ALL" || t.status === statusFilter;
      const lv = t.transitLivreurUserId ? livreurs.find((l) => l.id === t.transitLivreurUserId) : null;
      const lvName = lv ? (lv.fullName?.trim() || lv.email || t.transitLivreurUserId || "") : (t.transitLivreurUserId ?? "");
      const matchSearch = !q || t.doPiece.toLowerCase().includes(q) || t.arRef.toLowerCase().includes(q) || lvName.toLowerCase().includes(q);
      return matchDepot && matchStatus && matchSearch;
    });
  }, [transferts, selectedDepot, statusFilter, search, livreurs]);

  // Grouper par dépôt source
  const grouped = useMemo(() => {
    const map = new Map<number, Transfert[]>();
    for (const t of filtered) {
      const list = map.get(t.sourceDepotNo) ?? [];
      list.push(t);
      map.set(t.sourceDepotNo, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [filtered]);

  if (transfertsQuery.isLoading) {
    return <div className="py-10 text-center text-sm text-muted-foreground">Chargement des missions…</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        {/* Recherche */}
        <div className="relative flex-1 min-w-[180px]">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher pièce, article, livreur…"
            className="h-9 w-full rounded-xl border border-border bg-card pl-8 pr-3 text-xs outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
          />
        </div>

        {/* Filtre dépôt */}
        <select
          value={selectedDepot ?? ""}
          onChange={(e) => setSelectedDepot(e.target.value ? Number(e.target.value) : null)}
          className="h-9 rounded-xl border border-border bg-card px-3 text-xs font-semibold outline-none focus:border-primary/40"
        >
          <option value="">Tous les dépôts sources</option>
          {sourceDepotNos.map((no) => (
            <option key={no} value={no}>{depotLabel(no)}</option>
          ))}
        </select>

        {/* Filtre statut */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-xl border border-border bg-card px-3 text-xs font-semibold outline-none focus:border-primary/40"
        >
          <option value="ALL">Tous les statuts</option>
          {allStatuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {(selectedDepot !== null || statusFilter !== "ALL" || search) && (
          <button
            type="button"
            onClick={() => { setSelectedDepot(null); setStatusFilter("ALL"); setSearch(""); }}
            className="h-9 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-muted-foreground transition hover:bg-muted"
          >
            Réinitialiser
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} mission{filtered.length !== 1 ? "s" : ""} · {grouped.length} dépôt{grouped.length !== 1 ? "s" : ""} source{grouped.length !== 1 ? "s" : ""}
      </p>

      {grouped.length === 0 && (
        <div className="rounded-2xl border border-border bg-card py-10 text-center text-sm text-muted-foreground">
          Aucune mission transit.
        </div>
      )}

      {/* Un bloc par dépôt source */}
      {grouped.map(([depotNo, missions]) => (
        <div key={depotNo} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {/* En-tête dépôt */}
          <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-muted/20 px-5 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
                <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <div>
                <span className="font-bold text-card-foreground">{depotLabel(depotNo)}</span>
                <span className="ml-2 text-xs text-muted-foreground">(source)</span>
              </div>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              {missions.length} mission{missions.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Table des missions */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-muted/10">
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Commande</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Article</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Qté</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Vers dépôt</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Livreur</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Statut</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Créé</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Livré</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {missions.map((t) => {
                  const name = livreurName(t.transitLivreurUserId);
                  const phone = livreurPhone(t.transitLivreurUserId);
                  const blocked24h = t.affectedAt
                    ? new Date(t.affectedAt).getTime() < Date.now() - 24 * 60 * 60 * 1000 &&
                      (t.status === "EN_ATTENTE_TRANSIT" || t.status === "EN_ATTENTE_AFFECTATION_TRANSIT")
                    : false;

                  return (
                    <tr key={t.id} className={`transition hover:bg-muted/20 ${blocked24h ? "bg-danger/5" : ""}`}>
                      <td className="px-4 py-3">
                        <span className="font-bold text-card-foreground">{t.doPiece}</span>
                        {blocked24h && (
                          <span className="ml-1.5 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/30 dark:text-red-300">+24h</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{t.arRef}</td>
                      <td className="px-4 py-3 font-semibold text-card-foreground">
                        {Number(t.quantite ?? 0).toLocaleString("fr-FR")}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-card-foreground">{depotLabel(t.destinationDepotNo)}</span>
                      </td>
                      <td className="px-4 py-3">
                        {name ? (
                          <div>
                            <div className="font-semibold text-card-foreground">{name}</div>
                            {phone && (
                              <a href={`tel:${phone}`} className="text-[11px] text-primary hover:underline">
                                {phone}
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="italic text-warning text-xs">Non affecté</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${statusColor(t.status)}`}>
                          {t.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(t.affectedAt as unknown as string)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(t.deliveredAt as unknown as string)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => onOpenDetails(t)}
                          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-card-foreground transition hover:bg-muted"
                        >
                          Modifier
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

type Tab = "global" | "depots" | "livreurs" | "problemes";

export function SupervisorDashboardPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("global");
  const [retryingPiece, setRetryingPiece] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [detailsTransfert, setDetailsTransfert] = useState<Transfert | null>(null);

  const statsQuery = useQuery({
    queryKey: ["supervisor-stats"],
    queryFn: () =>
      axiosClient.get<Stats>(endpoints.supervisorDashboardStats).then((r) => r.data),
    staleTime: 30_000,
  });

  const missionsQuery = useQuery({
    queryKey: ["supervisor-missions"],
    queryFn: () =>
      axiosClient.get<Transfert[]>(endpoints.supervisorTransitMissions).then((r) => r.data),
    staleTime: 30_000,
  });

  const depotsQuery = useQuery({
    queryKey: ["depots", "supervisor"],
    queryFn: () =>
      axiosClient
        .get<Depot[]>("/api/depots")
        .then((r) => r.data)
        .catch(() => [] as Depot[]),
    staleTime: 5 * 60_000,
  });

  const livreursQuery = useQuery({
    queryKey: ["supervisor-livreurs"],
    queryFn: () =>
      axiosClient.get<Livreur[]>(endpoints.supervisorLivreurs).then((r) => r.data),
    staleTime: 30_000,
  });

  const stats = statsQuery.data;
  const items = missionsQuery.data ?? [];
  const depots = depotsQuery.data ?? [];
  const livreurs = livreursQuery.data ?? [];

  // Garder le detailsTransfert synchronisé après mutation (status/livreur ont changé)
  const currentDetails = useMemo(
    () => (detailsTransfert ? items.find((t) => t.id === detailsTransfert.id) ?? detailsTransfert : null),
    [detailsTransfert, items]
  );

  const handleRefresh = async () => {
    setGlobalError(null);
    try {
      await qc.invalidateQueries({ queryKey: ["supervisor"] });
    } catch (err) {
      setGlobalError((err as { message?: string })?.message ?? "Actualisation impossible.");
    }
  };

  const handleRetry = async (piece: string) => {
    setRetryingPiece(piece);
    setGlobalError(null);
    try {
      await axiosClient.post(endpoints.supervisorRetryAssignment(piece));
      await qc.invalidateQueries({ queryKey: ["supervisor-missions"] });
    } catch (err) {
      setGlobalError(getApiErrorMessage(err));
    } finally {
      setRetryingPiece(null);
    }
  };

  const issuesCountQuery = useQuery({
    queryKey: ["supervisor-issues", "open"],
    queryFn: () =>
      axiosClient
        .get<Issue[]>(endpoints.supervisorIssues, { params: { includeRead: false } })
        .then((r) => r.data),
    staleTime: 30_000,
  });
  const openIssuesCount = (issuesCountQuery.data ?? []).filter((i) => !i.acknowledgedAt).length;

  const TABS: { key: Tab; label: string; hint: string; count?: number }[] = [
    { key: "global",    label: "Vue globale",         hint: "Toutes les missions actives", count: items.length },
    { key: "depots",    label: "Dépôts & missions",   hint: "Détail par dépôt source" },
    { key: "livreurs",  label: "Livreurs de transit", hint: "Qui livre quoi" },
    { key: "problemes", label: "Problèmes",           hint: "Incidents à résoudre", count: openIssuesCount },
  ];

  const statCards = [
    { label: "En attente", value: stats?.pending ?? "—", color: "text-warning" },
    { label: "En transit", value: stats?.inProgress ?? "—", color: "text-info" },
    { label: "Reçus aujourd'hui", value: stats?.receivedToday ?? "—", color: "text-success" },
    { label: "Bloqués >24h", value: stats?.blocked24h ?? "—", color: "text-danger" },
  ] as const;

  return (
    <div className="space-y-6 pb-10">
      <PremiumHero
        kicker="Superviseur"
        title="Dashboard transit"
        description="Suivi des missions, filtrage par dépôt et gestion des livreurs de transit."
        actions={
          <Button type="button" variant="outline" onClick={() => void handleRefresh()}>
            Actualiser
          </Button>
        }
      />

      {globalError && (
        <div className="rounded-2xl border border-[hsl(var(--danger)/0.25)] bg-[hsl(var(--danger)/0.08)] px-4 py-4 text-sm text-[hsl(var(--danger))]">
          {globalError}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={`mt-2 text-3xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        {/* Tab bar */}
        <div className="flex flex-wrap items-center gap-1 border-b border-border px-5 pt-4">
          {TABS.map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`relative mb-[-1px] inline-flex items-center gap-1.5 rounded-t-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === key
                  ? "border border-b-card border-border bg-card text-primary"
                  : "text-muted-foreground hover:text-card-foreground"
              }`}
            >
              {label}
              {count !== undefined && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Hint de l'onglet actif */}
        <div className="border-b border-border/40 bg-muted/15 px-5 py-2 text-xs text-muted-foreground">
          {TABS.find((t) => t.key === activeTab)?.hint}
        </div>

        {/* Tab content */}
        <div className="p-5">
          {missionsQuery.isLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Chargement des missions…
            </div>
          ) : (
            <>
              {activeTab === "global" && (
                <GlobalTab
                  items={items}
                  onRetry={(p) => void handleRetry(p)}
                  retryingPiece={retryingPiece}
                  onOpenDetails={setDetailsTransfert}
                />
              )}
              {activeTab === "depots" && (
                <DepotsTab
                  depots={depots}
                  livreurs={livreurs}
                  onOpenDetails={setDetailsTransfert}
                />
              )}
              {activeTab === "livreurs" && <LivreursTab depots={depots} />}
              {activeTab === "problemes" && <ProblemesTab />}
            </>
          )}
        </div>
      </div>

      {/* Modal détails / édition manuelle */}
      {currentDetails && (
        <TransfertDetailsModal
          transfert={currentDetails}
          livreurs={livreurs}
          depots={depots}
          onClose={() => setDetailsTransfert(null)}
        />
      )}
    </div>
  );
}

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
}

interface Livreur {
  userId: string;
  nomComplet: string;
  telephone?: string | null;
  email?: string | null;
  depotNo?: number | null;
  missionsEnCours: number;
  disponible: boolean;
}

interface Depot {
  dE_No: number;
  dE_Intitule: string;
  dE_Code: string;
}

// ─── Badge helper ─────────────────────────────────────────────────────────────

function badgeClass(status: string) {
  const s = status.toUpperCase();
  if (s.includes("RECU") || s.includes("TERMINE")) return "bg-green-100 text-green-800";
  if (s.includes("TRANSIT") && !s.includes("ATTENTE")) return "bg-blue-100 text-blue-800";
  if (s.includes("AFFECTATION")) return "bg-red-100 text-red-800";
  return "bg-amber-100 text-amber-800";
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${badgeClass(status)}`}>
      {status}
    </span>
  );
}

// ─── Onglet "Vue globale" ──────────────────────────────────────────────────────

function GlobalTab({
  items,
  onRetry,
  retryingPiece,
}: {
  items: Transfert[];
  onRetry: (piece: string) => void;
  retryingPiece: string | null;
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

              {!t.transitLivreurUserId && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  isLoading={retryingPiece === t.doPiece}
                  onClick={() => onRetry(t.doPiece)}
                  className="shrink-0"
                >
                  Relancer affectation
                </Button>
              )}
            </div>
          </div>
        ))
      )}
    </section>
  );
}

// ─── Onglet "Par dépôt" ───────────────────────────────────────────────────────

function ByDepotTab({
  items,
  depots,
  onRetry,
  retryingPiece,
}: {
  items: Transfert[];
  depots: Depot[];
  onRetry: (piece: string) => void;
  retryingPiece: string | null;
}) {
  const [selectedDepot, setSelectedDepot] = useState<number | null>(null);

  const allDepotNos = useMemo(
    () => Array.from(new Set(items.flatMap((t) => [t.sourceDepotNo, t.destinationDepotNo]))),
    [items]
  );

  const depotOptions = useMemo(() => {
    return allDepotNos.map((no) => {
      const meta = depots.find((d) => d.dE_No === no);
      return { no, label: meta ? `${meta.dE_Intitule} (${meta.dE_Code})` : `Dépôt #${no}` };
    });
  }, [allDepotNos, depots]);

  const filtered = useMemo(() => {
    if (selectedDepot === null) return items;
    return items.filter(
      (t) => t.sourceDepotNo === selectedDepot || t.destinationDepotNo === selectedDepot
    );
  }, [items, selectedDepot]);

  return (
    <div className="space-y-4">
      {/* Filtre dépôt */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-muted-foreground">Filtrer par dépôt :</span>
        <button
          type="button"
          onClick={() => setSelectedDepot(null)}
          className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
            selectedDepot === null
              ? "bg-primary text-primary-foreground shadow-sm"
              : "border border-border bg-card text-card-foreground hover:bg-muted"
          }`}
        >
          Tous ({items.length})
        </button>
        {depotOptions.map(({ no, label }) => {
          const count = items.filter(
            (t) => t.sourceDepotNo === no || t.destinationDepotNo === no
          ).length;
          return (
            <button
              key={no}
              type="button"
              onClick={() => setSelectedDepot(no)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                selectedDepot === no
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-border bg-card text-card-foreground hover:bg-muted"
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Liste filtrée */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-8 text-center text-sm text-muted-foreground">
          Aucun colis pour ce dépôt.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-border/70 bg-muted/15 p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-card-foreground">{t.doPiece}</span>
                    <StatusBadge status={t.status} />
                  </div>
                  <div className="mt-1.5 text-sm text-muted-foreground">
                    {t.arRef} · {t.sourceDepotNo}→{t.destinationDepotNo} · qté{" "}
                    {Number(t.quantite ?? 0).toLocaleString("fr-FR")}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Livreur :{" "}
                    <span className={t.transitLivreurUserId ? "font-semibold text-card-foreground" : "italic text-amber-600"}>
                      {t.transitLivreurUserId ?? "non affecté"}
                    </span>
                  </div>
                </div>
                {!t.transitLivreurUserId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    isLoading={retryingPiece === t.doPiece}
                    onClick={() => onRetry(t.doPiece)}
                    className="shrink-0"
                  >
                    Relancer
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
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

  const livreurs = livreursQuery.data ?? [];
  const transferts = transfertsQuery.data ?? [];

  // Missions en cours par livreur
  const missionsByLivreur = useMemo(() => {
    const map = new Map<string, Transfert[]>();
    for (const t of transferts) {
      if (!t.transitLivreurUserId) continue;
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
          const missions = missionsByLivreur.get(lv.userId) ?? [];
          return (
            <div
              key={lv.userId}
              className="rounded-2xl border border-border bg-card shadow-sm"
            >
              {/* En-tête livreur */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {(lv.nomComplet ?? "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-card-foreground">{lv.nomComplet}</div>
                    <div className="text-xs text-muted-foreground">{depotLabel(lv.depotNo)}</div>
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
                      lv.disponible
                        ? "bg-green-100 text-green-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {lv.disponible ? "Disponible" : "En mission"}
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
                {livreurs.map((lv) => (
                  <option key={lv.userId} value={lv.userId}>
                    {lv.nomComplet}
                    {lv.telephone ? ` — ${lv.telephone}` : ""}
                    {" "}
                    ({lv.disponible ? "disponible" : `${missionsByLivreur.get(lv.userId)?.length ?? 0} missions`})
                  </option>
                ))}
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

// ─── Composant principal ──────────────────────────────────────────────────────

type Tab = "global" | "par-depot" | "livreurs";

export function SupervisorDashboardPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("global");
  const [retryingPiece, setRetryingPiece] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

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

  const stats = statsQuery.data;
  const items = missionsQuery.data ?? [];
  const depots = depotsQuery.data ?? [];

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

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: "global", label: "Vue globale", count: items.length },
    { key: "par-depot", label: "Par dépôt" },
    { key: "livreurs", label: "Livreurs de transit" },
  ];

  const statCards = [
    { label: "En attente", value: stats?.pending ?? "—", color: "text-amber-600" },
    { label: "En transit", value: stats?.inProgress ?? "—", color: "text-blue-600" },
    { label: "Reçus aujourd'hui", value: stats?.receivedToday ?? "—", color: "text-green-600" },
    { label: "Bloqués >24h", value: stats?.blocked24h ?? "—", color: "text-red-600" },
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
        <div className="flex items-center gap-1 border-b border-border px-5 pt-4">
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
                />
              )}
              {activeTab === "par-depot" && (
                <ByDepotTab
                  items={items}
                  depots={depots}
                  onRetry={(p) => void handleRetry(p)}
                  retryingPiece={retryingPiece}
                />
              )}
              {activeTab === "livreurs" && <LivreursTab depots={depots} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

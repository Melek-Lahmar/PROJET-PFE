// frontend-react/src/features/supervisor/pages/SupervisorZonesPage.tsx
// Correction : livreur-transit → dépôt filtré par gouvernorat choisi (1 dépôt = 1 gouvernorat)

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosClient } from "../../../core/http/axiosClient";
import { endpoints } from "../../../core/http/endpoints";
import { Button } from "../../../shared/components/Button";
import { getDepots } from "../../catalog/api/depotsApi";
import type { DepotDto } from "../../catalog/api/depotsApi";
import { getGouvernorats, getDelegations } from "../../geo/api/geoApi";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";

// ─── Types ────────────────────────────────────────────────────────────────────

type LivreurZone = { gouvernorat: string; delegation: string };

type Livreur = {
  id: string;
  email: string;
  fullName: string;
  telephone: string;
  gouvernorat: string;
  gouvernoratId: number;
  delegation: string;
  isTransit: boolean;
  depotRattacheNo: number | null;
  depotRattacheName: string | null;
  zones: LivreurZone[];
};

type LivreurForm = {
  email: string;
  password: string;
  fullName: string;
  telephone: string;
  gouvernoratId: number | "";
  delegation: string;
  isTransit: boolean;
  depotRattacheNo: number | "";
  zones: LivreurZone[];
};

// ─── Constantes ───────────────────────────────────────────────────────────────

const DEFAULT_GOV_ID = 22; // Tunis

const emptyForm: LivreurForm = {
  email: "",
  password: "12345678",
  fullName: "",
  telephone: "+216",
  gouvernoratId: DEFAULT_GOV_ID,
  delegation: "",
  isTransit: false,
  depotRattacheNo: "",
  zones: [],
};

// ─── Helpers UI ───────────────────────────────────────────────────────────────

const SELECT_CLASS =
  "h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10";

const INPUT_CLASS =
  "h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10";

function normalizeText(s?: string | null) {
  return (s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getLivreurTypeBadge(l: Livreur) {
  if (l.isTransit)
    return <span className="rounded-full bg-info/10 px-3 py-0.5 text-xs font-black text-info">🚛 Transit</span>;
  return <span className="rounded-full bg-success/10 px-3 py-0.5 text-xs font-black text-success">🛵 Classique</span>;
}

// ─── API calls ────────────────────────────────────────────────────────────────

async function fetchLivreurs(): Promise<Livreur[]> {
  const { data } = await axiosClient.get<Livreur[]>("/api/supervisor/livreurs");
  return data;
}

async function fetchDepotZones(): Promise<{ depotNo: number; gouvernorat: string }[]> {
  const { data } = await axiosClient.get<{ depotNo: number; gouvernorat: string; delegation: string }[]>(
    "/api/admin/depot-zones"
  );
  return data;
}

async function createLivreur(payload: object) {
  const { data } = await axiosClient.post("/api/supervisor/livreurs", payload);
  return data;
}

async function updateLivreur(id: string, payload: object) {
  const { data } = await axiosClient.put(`/api/supervisor/livreurs/${id}`, payload);
  return data;
}

async function deleteLivreur(id: string) {
  await axiosClient.delete(`/api/supervisor/livreurs/${id}`);
}

// ─── Types problèmes ──────────────────────────────────────────────────────────

interface Issue {
  id: string;
  severity: string;
  alertType: string;
  message: string;
  createdAt: string;
  acknowledgedAt?: string | null;
}

// ─── Panel gestion des problèmes ──────────────────────────────────────────────

function severityClass(s: string) {
  const u = s.toUpperCase();
  if (u === "HIGH" || u === "URGENT" || u === "CRITICAL") return "bg-red-100 text-red-800";
  if (u === "WARNING" || u === "MEDIUM") return "bg-amber-100 text-amber-800";
  return "bg-blue-100 text-blue-800";
}

function ProblemesPanel({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"open" | "all">("open");

  const issuesQuery = useQuery({
    queryKey: ["supervisor-issues", filter],
    queryFn: () =>
      axiosClient
        .get<Issue[]>(endpoints.supervisorIssues, { params: { includeRead: filter === "all" } })
        .then((r) => r.data),
    staleTime: 30_000,
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => axiosClient.post(endpoints.supervisorIssueResolve(id)),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["supervisor-issues"] });
      await qc.invalidateQueries({ queryKey: ["supervisor-stats"] });
    },
  });

  const issues = issuesQuery.data ?? [];
  const openCount = issues.filter((i) => !i.acknowledgedAt).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-card-foreground">Problèmes opérationnels</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {openCount} problème{openCount !== 1 ? "s" : ""} ouvert{openCount !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Filtres */}
        <div className="flex items-center gap-2 border-b border-border/60 px-6 py-3">
          {(["open", "all"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                filter === f
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-border bg-card text-card-foreground hover:bg-muted"
              }`}
            >
              {f === "open" ? `Ouverts (${openCount})` : `Tous (${issues.length})`}
            </button>
          ))}
        </div>

        {/* Corps scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {issuesQuery.isLoading && (
            <div className="py-8 text-center text-sm text-muted-foreground">Chargement…</div>
          )}

          {issuesQuery.isError && (
            <div className="rounded-xl border border-[hsl(var(--danger)/0.25)] bg-[hsl(var(--danger)/0.08)] px-4 py-3 text-sm text-[hsl(var(--danger))]">
              {getApiErrorMessage(issuesQuery.error)}
            </div>
          )}

          {resolveMutation.isError && (
            <div className="rounded-xl border border-[hsl(var(--danger)/0.25)] bg-[hsl(var(--danger)/0.08)] px-4 py-3 text-sm text-[hsl(var(--danger))]">
              {getApiErrorMessage(resolveMutation.error)}
            </div>
          )}

          {!issuesQuery.isLoading && issues.length === 0 && (
            <div className="rounded-2xl border border-border bg-muted/20 py-10 text-center text-sm text-muted-foreground">
              ✅ Aucun problème {filter === "open" ? "ouvert" : ""} signalé.
            </div>
          )}

          {issues.map((issue) => (
            <div
              key={issue.id}
              className={`rounded-xl border p-4 transition ${
                issue.acknowledgedAt ? "border-border/40 bg-muted/10 opacity-60" : "border-border/70 bg-muted/15"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${severityClass(issue.severity)}`}>
                      {issue.severity}
                    </span>
                    <span className="font-semibold text-card-foreground">{issue.alertType}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-card-foreground/90">{issue.message}</p>
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
                  <span className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-[11px] font-bold text-green-800">
                    Résolu
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border px-6 py-3 flex justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>Fermer</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function SupervisorZonesPage() {
  const qc = useQueryClient();

  // ── Données ──────────────────────────────────────────────────────────────
  const livreursQuery = useQuery({ queryKey: ["supervisor-livreurs"], queryFn: fetchLivreurs });
  const depotsQuery   = useQuery({ queryKey: ["depots"], queryFn: () => getDepots(false) });
  const govQuery      = useQuery({ queryKey: ["gouvernorats"], queryFn: getGouvernorats });
  const depotZonesQuery = useQuery({ queryKey: ["depot-zones-index"], queryFn: fetchDepotZones });

  const livreurs   = livreursQuery.data ?? [];
  const depots     = depotsQuery.data ?? [];
  const gouvernorats = govQuery.data ?? [];
  const depotZones = depotZonesQuery.data ?? [];

  // ── Filtres liste ─────────────────────────────────────────────────────────
  const [search, setSearch]             = useState("");
  const [typeFilter, setTypeFilter]     = useState<"ALL" | "CLASSIQUE" | "TRANSIT">("ALL");
  const [filterGovId, setFilterGovId]   = useState<number | "">("");
  const [filterDeleg, setFilterDeleg]   = useState("");
  const [filterDepotNo, setFilterDepotNo] = useState<number | "">("");

  // ── Panel problèmes ──────────────────────────────────────────────────────
  const [problemesOpen, setProblemesOpen] = useState(false);

  const openIssuesQuery = useQuery({
    queryKey: ["supervisor-issues", "open"],
    queryFn: () =>
      axiosClient
        .get<Issue[]>(endpoints.supervisorIssues, { params: { includeRead: false } })
        .then((r) => r.data.filter((i) => !i.acknowledgedAt)),
    staleTime: 30_000,
  });
  const openIssuesCount = openIssuesQuery.data?.length ?? 0;

  // ── Modal ─────────────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen]       = useState(false);
  const [modalMode, setModalMode]       = useState<"create" | "edit">("create");
  const [selectedLivreur, setSelectedLivreur] = useState<Livreur | null>(null);
  const [form, setForm]                 = useState<LivreurForm>(emptyForm);
  const [error, setError]               = useState<string | null>(null);

  // ── Zone panel (livreur classique) ────────────────────────────────────────
  const [zoneGovId, setZoneGovId]       = useState<number>(DEFAULT_GOV_ID);
  const [zoneDeleg, setZoneDeleg]       = useState("");

  const zoneDelegQuery = useQuery({
    queryKey: ["delegations", zoneGovId],
    queryFn: () => getDelegations(zoneGovId),
    staleTime: 5 * 60_000,
  });

  const formDelegQuery = useQuery({
    queryKey: ["delegations", form.gouvernoratId],
    queryFn: () => getDelegations(form.gouvernoratId as number),
    enabled: typeof form.gouvernoratId === "number",
    staleTime: 5 * 60_000,
  });

  // ── Dépôts filtrés par gouvernorat du livreur-transit ────────────────────
  // Règle : 1 dépôt = 1 gouvernorat
  // Quand le superviseur choisit gouvernorat X → afficher seulement les dépôts
  // qui ont des zones dans gouvernorat X
  const govName = useMemo(() => {
    if (form.gouvernoratId === "") return "";
    return gouvernorats.find((g) => g.id === form.gouvernoratId)?.name ?? "";
  }, [form.gouvernoratId, gouvernorats]);

  const depotsForGouvernorat = useMemo<DepotDto[]>(() => {
    if (!govName) return depots;
    // Trouver les depotNo qui couvrent ce gouvernorat
    const depotNos = new Set(
      depotZones
        .filter((z) =>
          normalizeText(z.gouvernorat) === normalizeText(govName)
        )
        .map((z) => z.depotNo)
    );
    if (depotNos.size === 0) return depots; // fallback : montrer tous si pas de zone configurée
    return depots.filter((d) => depotNos.has(d.dE_No));
  }, [govName, depots, depotZones]);

  const depotLabel = (depotNo?: number | null) => {
    if (!depotNo) return "Non affecté";
    const d = depots.find((x) => x.dE_No === depotNo);
    return d ? `${d.dE_Intitule ?? `Dépôt ${depotNo}`}${d.dE_Ville ? ` — ${d.dE_Ville}` : ""}` : `Dépôt ${depotNo}`;
  };

  // ── Filtrage liste ────────────────────────────────────────────────────────
  const filterGovName = useMemo(
    () => gouvernorats.find((g) => g.id === filterGovId)?.name ?? "",
    [filterGovId, gouvernorats]
  );

  const filteredLivreurs = useMemo(() => {
    const q    = normalizeText(search);
    const gov  = normalizeText(filterGovName);
    const deleg = normalizeText(filterDeleg);

    return livreurs.filter((l) => {
      const zones = l.zones ?? [];

      const matchSearch =
        !q ||
        normalizeText(l.fullName).includes(q) ||
        normalizeText(l.email).includes(q) ||
        normalizeText(l.telephone).includes(q);

      const matchType =
        typeFilter === "ALL" ||
        (typeFilter === "CLASSIQUE" && !l.isTransit) ||
        (typeFilter === "TRANSIT" && l.isTransit);

      const matchGov =
        !gov ||
        normalizeText(l.gouvernorat).includes(gov) ||
        zones.some((z) => normalizeText(z.gouvernorat).includes(gov));

      const matchDeleg =
        !deleg ||
        normalizeText(l.delegation).includes(deleg) ||
        zones.some((z) => normalizeText(z.delegation).includes(deleg));

      const matchDepot =
        filterDepotNo === "" ||
        (l.isTransit && Number(l.depotRattacheNo) === Number(filterDepotNo));

      return matchSearch && matchType && matchGov && matchDeleg && matchDepot;
    });
  }, [livreurs, search, filterGovName, filterDeleg, typeFilter, filterDepotNo]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: object) => createLivreur(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["supervisor-livreurs"] }); closeModal(); },
    onError: (e) => setError(getApiErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: object }) => updateLivreur(id, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["supervisor-livreurs"] }); closeModal(); },
    onError: (e) => setError(getApiErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLivreur(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["supervisor-livreurs"] }),
  });

  // ── Modal helpers ─────────────────────────────────────────────────────────
  function openCreate() {
    setSelectedLivreur(null);
    setForm(emptyForm);
    setZoneGovId(DEFAULT_GOV_ID);
    setZoneDeleg("");
    setError(null);
    setModalMode("create");
    setModalOpen(true);
  }

  function openEdit(l: Livreur) {
    setSelectedLivreur(l);
    setForm({
      email: l.email ?? "",
      password: "12345678",
      fullName: l.fullName ?? "",
      telephone: l.telephone ?? "+216",
      gouvernoratId: l.gouvernoratId ?? DEFAULT_GOV_ID,
      delegation: l.delegation ?? "",
      isTransit: l.isTransit,
      depotRattacheNo: l.depotRattacheNo ?? "",
      zones: l.zones ?? [],
    });
    setZoneGovId(l.gouvernoratId ?? DEFAULT_GOV_ID);
    setZoneDeleg("");
    setError(null);
    setModalMode("edit");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSelectedLivreur(null);
    setError(null);
  }

  function addZone() {
    if (!zoneGovId || !zoneDeleg) return;
    const govNameForZone = gouvernorats.find((g) => g.id === zoneGovId)?.name ?? String(zoneGovId);
    const already = form.zones.some(
      (z) => normalizeText(z.gouvernorat) === normalizeText(govNameForZone) &&
             normalizeText(z.delegation)  === normalizeText(zoneDeleg)
    );
    if (already) return;
    setForm((prev) => ({ ...prev, zones: [...prev.zones, { gouvernorat: govNameForZone, delegation: zoneDeleg }] }));
    setZoneDeleg("");
  }

  function removeZone(i: number) {
    setForm((prev) => ({ ...prev, zones: prev.zones.filter((_, idx) => idx !== i) }));
  }

  function buildPayload() {
    return {
      email: form.email,
      password: form.password,
      fullName: form.fullName,
      telephone: form.telephone,
      // Gouvernorat/délégation principaux : seulement pour livreur-transit
      // (sert à filtrer son dépôt rattaché). Pour livreur-classique, ce sont
      // les zones de la liste verte qui définissent sa couverture.
      gouvernorat: form.isTransit ? (form.gouvernoratId === "" ? null : form.gouvernoratId) : null,
      delegation: form.isTransit ? form.delegation : null,
      isTransit: form.isTransit,
      depotRattacheNo: form.isTransit && form.depotRattacheNo !== "" ? Number(form.depotRattacheNo) : null,
      zones: form.isTransit ? [] : form.zones,
    };
  }

  function handleSubmit() {
    setError(null);
    const payload = buildPayload();
    if (modalMode === "create") {
      createMutation.mutate(payload);
    } else if (selectedLivreur) {
      updateMutation.mutate({ id: selectedLivreur.id, payload });
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ─── Rendu ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full space-y-6 pb-10">

      {/* En-tête */}
      <section className="app-surface px-6 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Superviseur</div>
            <h1 className="mt-1 text-2xl font-extrabold text-card-foreground">Gestion des livreurs</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {livreurs.filter((l) => l.isTransit).length} livreur(s) transit ·{" "}
              {livreurs.filter((l) => !l.isTransit).length} livreur(s) classique(s)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/supervisor/dashboard"
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-4 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary/15"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="9" rx="1"/>
                <rect x="14" y="3" width="7" height="5" rx="1"/>
                <rect x="14" y="12" width="7" height="9" rx="1"/>
                <rect x="3" y="16" width="7" height="5" rx="1"/>
              </svg>
              Tableau de bord transit
            </Link>
            <button
              type="button"
              onClick={() => setProblemesOpen(true)}
              className="relative inline-flex h-11 items-center gap-2 rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-card-foreground shadow-sm transition hover:bg-muted"
            >
              <svg className="h-4 w-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              </svg>
              Problèmes
              {openIssuesCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white">
                  {openIssuesCount > 9 ? "9+" : openIssuesCount}
                </span>
              )}
            </button>
            <Button type="button" variant="primary" className="h-11 rounded-2xl px-5" onClick={openCreate}>
              + Ajouter un livreur
            </Button>
          </div>
        </div>
      </section>

      {/* Filtres */}
      <section className="app-surface px-6 py-5 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input className={INPUT_CLASS} placeholder="🔍 Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} />

          <select className={SELECT_CLASS} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}>
            <option value="ALL">Tous les types</option>
            <option value="CLASSIQUE">Livreurs classiques</option>
            <option value="TRANSIT">Livreurs transit</option>
          </select>

          <select className={SELECT_CLASS} value={filterGovId} onChange={(e) => setFilterGovId(e.target.value ? Number(e.target.value) : "")}>
            <option value="">Tous les gouvernorats</option>
            {gouvernorats.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>

          <select className={SELECT_CLASS} value={filterDepotNo} onChange={(e) => setFilterDepotNo(e.target.value ? Number(e.target.value) : "")}>
            <option value="">Tous les dépôts</option>
            {depots.map((d) => (
              <option key={d.dE_No} value={d.dE_No}>
                {d.dE_Intitule ?? `Dépôt ${d.dE_No}`}{d.dE_Ville ? ` — ${d.dE_Ville}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end">
          <Button type="button" variant="ghost" size="sm" className="rounded-xl" onClick={() => {
            setSearch(""); setTypeFilter("ALL"); setFilterGovId(""); setFilterDeleg(""); setFilterDepotNo("");
          }}>
            Réinitialiser
          </Button>
        </div>
      </section>

      {/* Liste */}
      <section className="app-surface px-6 py-5">
        <p className="mb-4 text-sm text-muted-foreground">
          {filteredLivreurs.length} / {livreurs.length} livreur(s)
        </p>

        {livreursQuery.isLoading && <div className="py-10 text-center text-sm text-muted-foreground">Chargement…</div>}

        <div className="grid gap-3">
          {filteredLivreurs.map((l) => (
            <article key={l.id} className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-extrabold text-card-foreground">{l.fullName}</span>
                  {getLivreurTypeBadge(l)}
                </div>
                <div className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-3">
                  <span><b className="text-foreground">Email : </b>{l.email}</span>
                  <span><b className="text-foreground">Tél : </b>{l.telephone || "—"}</span>
                  <span><b className="text-foreground">Zone : </b>{l.gouvernorat || "—"} / {l.delegation || "—"}</span>
                </div>

                {l.isTransit ? (
                  <div className="rounded-xl bg-info/10 px-3 py-2 text-sm text-info">
                    <b>Dépôt rattaché : </b>{depotLabel(l.depotRattacheNo)}
                    <span className="ml-2 text-xs text-info/60">(déplace articles entre dépôts)</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {l.zones?.map((z, i) => (
                      <span key={i} className="rounded-full border border-success/25 bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                        {z.gouvernorat} · {z.delegation}
                      </span>
                    ))}
                    {!l.zones?.length && <span className="text-xs text-muted-foreground">Aucune zone affectée</span>}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 gap-2">
                <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => openEdit(l)}>Modifier</Button>
                <Button type="button" variant="ghost" size="sm" className="rounded-xl text-danger hover:bg-danger/10"
                  onClick={() => { if (confirm(`Supprimer ${l.fullName} ?`)) deleteMutation.mutate(l.id); }}
                  disabled={deleteMutation.isPending}>
                  Supprimer
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Panel problèmes */}
      {problemesOpen && <ProblemesPanel onClose={() => setProblemesOpen(false)} />}

      {/* ── MODAL ──────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-card shadow-2xl">
            <header className="flex items-start justify-between border-b border-border px-6 py-5">
              <div>
                <div className="text-xs font-bold uppercase text-muted-foreground">
                  {modalMode === "create" ? "Nouveau livreur" : "Modifier livreur"}
                </div>
                <h2 className="text-xl font-extrabold text-card-foreground">
                  {modalMode === "create" ? "Ajouter un livreur" : selectedLivreur?.fullName}
                </h2>
              </div>
              <button onClick={closeModal} className="text-muted-foreground hover:text-card-foreground text-xl">×</button>
            </header>

            <div className="space-y-5 p-6">

              {/* Identité */}
              <div className="grid gap-4 sm:grid-cols-2">
                {modalMode === "create" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Email *</label>
                    <input className={INPUT_CLASS} value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="livreur@example.com" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Nom complet *</label>
                  <input className={INPUT_CLASS} value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} placeholder="Prénom Nom" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Téléphone</label>
                  <input className={INPUT_CLASS} value={form.telephone} onChange={(e) => setForm((p) => ({ ...p, telephone: e.target.value }))} />
                </div>
                {modalMode === "create" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Mot de passe</label>
                    <input className={INPUT_CLASS} type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
                  </div>
                )}
              </div>

              {/* Type */}
              <div className="grid gap-3 sm:grid-cols-2">
                {(["CLASSIQUE", "TRANSIT"] as const).map((t) => {
                  const isTransit = t === "TRANSIT";
                  const selected  = form.isTransit === isTransit;
                  return (
                    <button key={t} type="button"
                      onClick={() => setForm((p) => ({ ...p, isTransit: isTransit, depotRattacheNo: "" }))}
                      className={["flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all",
                        selected ? "border-primary bg-primary/5 ring-2 ring-primary/15" : "border-border hover:border-primary/30"].join(" ")}>
                      <span className="text-xl">{isTransit ? "🚛" : "🛵"}</span>
                      <div>
                        <div className="font-bold text-card-foreground">{isTransit ? "Livreur-transit" : "Livreur classique"}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {isTransit ? "Déplace articles entre dépôts" : "Livre directement au client"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Zone principale — utile uniquement pour livreur-transit
                  (sert à filtrer le dépôt rattaché). Pour livreur-classique,
                  les zones de couverture sont gérées dans la section verte. */}
              {form.isTransit && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Gouvernorat *</label>
                    <select className={SELECT_CLASS} value={form.gouvernoratId}
                      onChange={(e) => setForm((p) => ({
                        ...p,
                        gouvernoratId: Number(e.target.value),
                        delegation: "",
                        depotRattacheNo: "" // reset dépôt quand gouvernorat change
                      }))}>
                      {gouvernorats.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Délégation *</label>
                    <select className={SELECT_CLASS} value={form.delegation} onChange={(e) => setForm((p) => ({ ...p, delegation: e.target.value }))}>
                      <option value="">— Choisir —</option>
                      {(formDelegQuery.data ?? []).map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* ── Section transit : dépôt filtré par gouvernorat ─────────── */}
              {form.isTransit && (
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 space-y-3">
                  <div>
                    <h3 className="font-extrabold text-indigo-800">Affectation dépôt transit</h3>
                    <p className="mt-1 text-xs text-indigo-600">
                      Seuls les dépôts couvrant le gouvernorat <b>{govName || "sélectionné"}</b> sont affichés.
                      Règle : 1 dépôt = 1 gouvernorat.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wide text-indigo-700">Dépôt rattaché *</label>
                    {depotsForGouvernorat.length === 0 ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                        ⚠️ Aucun dépôt configuré pour le gouvernorat <b>{govName}</b>.
                        Configurez une zone dans l'admin avant d'affecter ce livreur-transit.
                      </div>
                    ) : (
                      <select className={SELECT_CLASS} value={form.depotRattacheNo}
                        onChange={(e) => setForm((p) => ({ ...p, depotRattacheNo: e.target.value ? Number(e.target.value) : "" }))}>
                        <option value="">— Choisir un dépôt —</option>
                        {depotsForGouvernorat.map((d) => (
                          <option key={d.dE_No} value={d.dE_No}>
                            {d.dE_Intitule ?? `Dépôt ${d.dE_No}`}
                            {d.dE_Ville ? ` — ${d.dE_Ville}` : ""}
                            {d.dE_Principal === 1 ? " ★" : ""}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {form.depotRattacheNo !== "" && (
                    <div className="rounded-xl border border-info/25 bg-info/10 px-3 py-2 text-sm text-info">
                      ✅ Ce livreur-transit sera rattaché à <b>{depotLabel(Number(form.depotRattacheNo))}</b>.
                      Il interviendra entre ce dépôt et les dépôts de destination.
                    </div>
                  )}
                </div>
              )}

              {/* ── Section classique : zones exactes ──────────────────────── */}
              {!form.isTransit && (
                <div className="rounded-2xl border border-success/25 bg-success/8 p-4 space-y-3">
                  <div>
                    <h3 className="font-extrabold text-success">Zones de livraison</h3>
                    <p className="mt-1 text-xs text-success/70">
                      Ce livreur ne verra que les BL dont le gouvernorat + délégation correspondent exactement à ses zones.
                    </p>
                  </div>

                  {/* Ajouter une zone */}
                  <div className="grid gap-2 sm:grid-cols-3">
                    <select className={SELECT_CLASS} value={zoneGovId} onChange={(e) => { setZoneGovId(Number(e.target.value)); setZoneDeleg(""); }}>
                      {gouvernorats.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                    <select className={SELECT_CLASS} value={zoneDeleg} onChange={(e) => setZoneDeleg(e.target.value)}>
                      <option value="">— Délégation —</option>
                      {(zoneDelegQuery.data ?? []).map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <Button type="button" variant="outline" size="sm" className="rounded-xl h-11" onClick={addZone} disabled={!zoneGovId || !zoneDeleg}>
                      + Ajouter zone
                    </Button>
                  </div>

                  {/* Liste zones */}
                  <div className="flex flex-wrap gap-2">
                    {form.zones.map((z, i) => (
                      <span key={i} className="flex items-center gap-1.5 rounded-full border border-success/30 bg-card px-3 py-1 text-xs font-semibold text-success">
                        {z.gouvernorat} · {z.delegation}
                        <button type="button" onClick={() => removeZone(i)} className="text-danger/60 hover:text-danger">×</button>
                      </span>
                    ))}
                    {form.zones.length === 0 && (
                      <p className="text-xs text-muted-foreground">Aucune zone ajoutée. La zone principale sera utilisée par défaut.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Erreur */}
              {error && (
                <div className="rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" className="rounded-2xl" onClick={closeModal}>Annuler</Button>
                <Button type="button" variant="primary" className="h-11 rounded-2xl px-6" onClick={handleSubmit} disabled={isSaving}>
                  {isSaving ? "Enregistrement…" : modalMode === "create" ? "Créer le livreur" : "Enregistrer"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

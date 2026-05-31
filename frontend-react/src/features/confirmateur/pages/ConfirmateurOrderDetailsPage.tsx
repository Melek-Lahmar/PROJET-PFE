import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getConfirmateurOrderByPiece,
  getConfirmateurSupervisors,
  getZoneCoverage,
  transformBcToBl,
  updateConfirmateurLocation,
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
import { AddressMapModal } from "../../auth/components/AddressMapModal";
import { reverseGeocodeNominatim } from "../../geo/api/nominatimApi";
import {
  getDelegations,
  getGouvernorats,
} from "../../geo/api/geoApi";
import type { GouvernoratItem } from "../../geo/types/geo";
import {
  buildAddressFromReverse,
  extractPostalCode,
  resolveGouvernoratIdFromReverse,
  resolveDelegationFromReverse,
  TUNISIA_GOUVERNORATS,
} from "../../geo/utils/tunisiaLocationSync";

// ── Fiche client (lecture seule) ─────────────────────────────────────────────

function ClientCard({
  label,
  value,
  sub,
  phone,
}: {
  label: string;
  value: string;
  sub?: string;
  phone?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {phone && value !== "-" ? (
        <a
          href={`tel:${value}`}
          className="text-base font-bold text-primary hover:underline"
        >
          {value}
        </a>
      ) : (
        <span className="text-base font-bold text-card-foreground">{value}</span>
      )}
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

// ── Zone coverage badge ───────────────────────────────────────────────────────

function CoverageBanner({
  piece,
  onNoLivreur,
}: {
  piece: string;
  onNoLivreur: (noLivreur: boolean) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["zone-coverage", piece],
    queryFn: () => getZoneCoverage(piece),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (data !== undefined) onNoLivreur(!data.hasCoverage);
  }, [data, onNoLivreur]);

  if (isLoading || !data) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
        Vérification de la couverture livreurs…
      </div>
    );
  }

  if (!data.gouvernorat && !data.delegation) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
        Zone non définie — veuillez renseigner le gouvernorat et la délégation.
      </div>
    );
  }

  if (!data.hasCoverage) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
        <div className="text-sm font-bold text-red-800">
          Aucun livreur pour {data.gouvernorat} / {data.delegation}
        </div>
        <div className="mt-0.5 text-xs text-red-700">
          Aucun livreur ne couvre cette zone. Contactez un superviseur avant de confirmer.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2.5">
      <div className="text-sm font-bold text-green-800">
        {data.livreurCount} livreur{data.livreurCount > 1 ? "s" : ""} couvrent cette zone
      </div>
      <div className="mt-0.5 text-xs text-green-700">
        {data.gouvernorat} / {data.delegation} — le livreur le moins chargé sera affecté automatiquement.
      </div>
      {data.livreurs.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {data.livreurs.map((l) => (
            <span
              key={l.userId}
              className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-semibold text-green-800"
            >
              {l.nomComplet ?? "—"}
              <span className="opacity-60">({l.activeOrders} active{l.activeOrders !== 1 ? "s" : ""})</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Supervisors list ──────────────────────────────────────────────────────────

function SuperviseursList() {
  const { data, isLoading } = useQuery({
    queryKey: ["confirmateur-supervisors"],
    queryFn: getConfirmateurSupervisors,
    staleTime: 5 * 60_000,
  });

  if (isLoading) return null;
  if (!data || data.length === 0) return null;

  return (
    <section className="rounded-[24px] border border-amber-200 bg-amber-50 p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xl">📞</span>
        <div>
          <div className="text-sm font-bold text-amber-900">Besoin d'aide ?</div>
          <div className="text-xs text-amber-700">Contactez un superviseur si la zone n'est pas couverte.</div>
        </div>
      </div>
      <div className="space-y-2">
        {data.map((s) => (
          <div
            key={s.userId}
            className="flex items-center justify-between gap-3 rounded-xl bg-white/60 px-3 py-2.5"
          >
            <span className="text-sm font-semibold text-amber-900">
              {s.nomComplet ?? s.email ?? "Superviseur"}
            </span>
            {s.telephone ? (
              <a
                href={`tel:${s.telephone}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-amber-700"
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                {s.telephone}
              </a>
            ) : (
              <span className="text-xs text-amber-700">{s.email ?? "—"}</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Location edit section ─────────────────────────────────────────────────────

function LocationEditSection({
  piece,
  initialGouvernorat,
  initialDelegation,
  initialLat,
  initialLng,
  onSaved,
}: {
  piece: string;
  initialGouvernorat: string | null;
  initialDelegation: string | null;
  initialLat: number | null;
  initialLng: number | null;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [gouvernorat, setGouvernorat] = useState(initialGouvernorat ?? "");
  const [delegation, setDelegation] = useState(initialDelegation ?? "");
  const [latitude, setLatitude] = useState<number | null>(initialLat);
  const [longitude, setLongitude] = useState<number | null>(initialLng);
  const [mapOpen, setMapOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [gpsMsg, setGpsMsg] = useState("");

  const govQuery = useQuery<GouvernoratItem[]>({
    queryKey: ["geo-gouvernorats"],
    queryFn: getGouvernorats,
    staleTime: 10 * 60_000,
  });
  const govId = useMemo(() => {
    return govQuery.data?.find((g) => g.name === gouvernorat)?.id ?? 0;
  }, [govQuery.data, gouvernorat]);

  const delQuery = useQuery<string[]>({
    queryKey: ["geo-delegations", govId],
    queryFn: () => getDelegations(govId),
    enabled: govId > 0,
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      updateConfirmateurLocation(piece, {
        gouvernorat: gouvernorat || null,
        delegation: delegation || null,
        latitude,
        longitude,
      }),
    onSuccess: () => {
      setEditing(false);
      onSaved();
    },
  });

  const handleGPS = useCallback(async () => {
    setLocating(true);
    setGpsMsg("");
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      );
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setLatitude(lat);
      setLongitude(lng);

      const result = await reverseGeocodeNominatim(lat, lng);
      const govIdResolved = resolveGouvernoratIdFromReverse(result);
      if (govIdResolved !== null) {
        setGouvernorat(TUNISIA_GOUVERNORATS[govIdResolved] ?? gouvernorat);
        const pool = await getDelegations(govIdResolved).catch(() => []);
        const delegResolved = resolveDelegationFromReverse(result, pool);
        if (delegResolved) setDelegation(delegResolved);
      }
      const addrBuilt = buildAddressFromReverse(result);
      const cpBuilt = extractPostalCode(result);
      setGpsMsg(
        addrBuilt
          ? `Position détectée : ${addrBuilt}${cpBuilt ? ` — ${cpBuilt}` : ""}`
          : "Position enregistrée"
      );
    } catch {
      setGpsMsg("Impossible d'accéder à votre position GPS.");
    } finally {
      setLocating(false);
    }
  }, [gouvernorat]);

  if (!editing) {
    const govDisplay = initialGouvernorat || "—";
    const delDisplay = initialDelegation || "—";
    const gpsDisplay =
      initialLat !== null && initialLng !== null
        ? `${initialLat.toFixed(5)}, ${initialLng.toFixed(5)}`
        : null;

    return (
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Gouvernorat</div>
            <div className="mt-1 text-sm font-bold text-card-foreground">{govDisplay}</div>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Délégation</div>
            <div className="mt-1 text-sm font-bold text-card-foreground">{delDisplay}</div>
          </div>
        </div>
        {gpsDisplay && (
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/15 px-3 py-2 text-xs text-muted-foreground">
            <span className="text-base">📍</span>
            <span className="font-mono font-semibold text-card-foreground">{gpsDisplay}</span>
          </div>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
        >
          ✏️ Modifier la zone de livraison
        </button>
      </div>
    );
  }

  const fieldClass =
    "w-full rounded-xl border border-border/70 bg-background px-3 py-2.5 text-sm text-card-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20";

  return (
    <div className="space-y-4 rounded-[22px] border border-primary/20 bg-primary/[0.03] p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Gouvernorat</label>
          <select
            value={gouvernorat}
            onChange={(e) => {
              setGouvernorat(e.target.value);
              setDelegation("");
              setLatitude(null);
              setLongitude(null);
              setGpsMsg("");
            }}
            className={fieldClass}
          >
            <option value="">Sélectionner</option>
            {(govQuery.data ?? []).map((g) => (
              <option key={g.id} value={g.name}>{g.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Délégation</label>
          <select
            value={delegation}
            onChange={(e) => {
              setDelegation(e.target.value);
              setLatitude(null);
              setLongitude(null);
              setGpsMsg("");
            }}
            disabled={!govId}
            className={fieldClass}
          >
            <option value="">Sélectionner</option>
            {delegation && !(delQuery.data ?? []).includes(delegation) && (
              <option value={delegation}>{delegation}</option>
            )}
            {(delQuery.data ?? []).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleGPS()}
          disabled={locating}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-card-foreground transition hover:bg-muted disabled:opacity-50"
        >
          {locating ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </svg>
          )}
          {locating ? "Localisation…" : "Ma position GPS"}
        </button>

        <button
          type="button"
          onClick={() => setMapOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-card-foreground transition hover:bg-muted"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
            <circle cx="12" cy="9" r="2.5" />
          </svg>
          Épingler sur la carte
        </button>
      </div>

      {(latitude !== null || gpsMsg) && (
        <div className={`rounded-xl px-3 py-2 text-xs font-medium ${
          gpsMsg.startsWith("Impossible")
            ? "border border-red-200 bg-red-50 text-red-700"
            : "border border-green-200 bg-green-50 text-green-700"
        }`}>
          {latitude !== null && longitude !== null && (
            <span className="font-mono">📍 {latitude.toFixed(5)}, {longitude.toFixed(5)} — </span>
          )}
          {gpsMsg}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || (!gouvernorat && !delegation)}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          {saveMutation.isPending ? (
            <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> Enregistrement…</>
          ) : "✓ Enregistrer la zone"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setGouvernorat(initialGouvernorat ?? "");
            setDelegation(initialDelegation ?? "");
            setLatitude(initialLat);
            setLongitude(initialLng);
            setGpsMsg("");
          }}
          className="inline-flex h-9 items-center rounded-xl border border-border bg-card px-4 text-sm font-semibold text-card-foreground transition hover:bg-muted"
        >
          Annuler
        </button>
      </div>

      {saveMutation.isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          Erreur lors de l'enregistrement. Vérifiez les champs et réessayez.
        </div>
      )}

      <AddressMapModal
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        gouvernorat={govId}
        delegation={delegation}
        latitude={latitude}
        longitude={longitude}
        onChange={async (lat, lng) => {
          setLatitude(lat);
          setLongitude(lng);
          setMapOpen(false);
          setGpsMsg("Analyse de la position…");
          try {
            const result = await reverseGeocodeNominatim(lat, lng);
            const govIdResolved = resolveGouvernoratIdFromReverse(result);
            if (govIdResolved !== null) {
              setGouvernorat(TUNISIA_GOUVERNORATS[govIdResolved] ?? gouvernorat);
              const pool = await getDelegations(govIdResolved).catch(() => []);
              const delegResolved = resolveDelegationFromReverse(result, pool);
              if (delegResolved) setDelegation(delegResolved);
            }
            const cp = extractPostalCode(result);
            setGpsMsg(cp ? `Code postal : ${cp}` : "Position enregistrée");
          } catch {
            setGpsMsg("Position enregistrée — vérifiez la zone.");
          }
        }}
      />
    </div>
  );
}

// ── Workflow steps ────────────────────────────────────────────────────────────

function workflowSteps(workflowState: ReturnType<typeof getConfirmateurStatusMeta>["workflowState"]) {
  return [
    { key: "received", label: "BC reçu", state: "done" as const },
    {
      key: "analysis",
      label: "Analyse",
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
      state:
        workflowState === "attempted"
          ? ("active" as const)
          : workflowState === "refused"
            ? ("failed" as const)
            : workflowState === "transformed"
              ? ("done" as const)
              : ("pending" as const),
    },
    { key: "bl", label: "BL créé", state: workflowState === "transformed" ? ("done" as const) : ("pending" as const) },
  ];
}

function stepClass(state: "done" | "active" | "pending" | "failed") {
  switch (state) {
    case "done": return "border-green-200 bg-green-500 text-white";
    case "active": return "border-primary/25 bg-primary text-white shadow-lg shadow-primary/20";
    case "failed": return "border-rose-200 bg-rose-500 text-white";
    default: return "border-border bg-muted text-muted-foreground";
  }
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ConfirmateurOrderDetailsPage() {
  const { piece } = useParams<{ piece: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [noLivreur, setNoLivreur] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["confirmateur-order", piece],
    queryFn: () => getConfirmateurOrderByPiece(piece as string),
    enabled: !!piece,
  });

  const statusMutation = useMutation({
    mutationFn: ({ status }: { status: OrderStatusValue }) =>
      updateConfirmateurOrderStatus(piece as string, status),
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

  const handleNoLivreur = useCallback((v: boolean) => setNoLivreur(v), []);

  const invalidateCoverage = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["zone-coverage", piece] });
    void queryClient.invalidateQueries({ queryKey: ["confirmateur-order", piece] });
  }, [queryClient, piece]);

  if (isLoading) {
    return (
      <div className="w-full space-y-6 py-10">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-[24px] border border-border bg-card" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="w-full py-10">
        <div className="ds-alert ds-alert-danger rounded-[30px] p-6">
          <div className="text-sm font-bold">BC introuvable</div>
          <div className="mt-1 text-sm opacity-80">
            {(error as Error)?.message ?? "Impossible de charger le détail confirmateur."}
          </div>
          <div className="mt-4">
            <Link to="/confirmateur/commandes">
              <Button type="button" className="h-10 rounded-2xl px-5">Retour</Button>
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

  // Zone source : passager (guest order) > client profile
  const zoneGouvernorat = data.dO_PassagerGouvernorat ?? client?.gouvernorat ?? null;
  const zoneDelegation = data.dO_PassagerDelegation ?? client?.delegation ?? null;
  const zoneLat = data.dO_LatitudeLivraison ? parseFloat(data.dO_LatitudeLivraison) : null;
  const zoneLng = data.dO_LongitudeLivraison ? parseFloat(data.dO_LongitudeLivraison) : null;

  const modeLivraison = data.dO_ModeLivraison === "HOME" ? "Livraison à domicile" : data.dO_ModeLivraison === "PICKUP" ? "Retrait dépôt" : null;
  const phone = data.dO_TelephoneLivraison ?? client?.telephone ?? null;
  const adresse = data.dO_AdresseLivraison ?? client?.adresse ?? null;

  return (
    <div className="w-full space-y-6 pb-10">

      {/* ── En-tête ── */}
      <section className="app-surface px-6 py-5 md:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Link to="/confirmateur/commandes" className="text-sm font-semibold text-primary hover:underline">
                ← BC
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.badgeClass}`}>
                {statusMeta.label}
              </span>
              <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-xs font-semibold text-muted-foreground">
                {clientTypeLabel(client)}
              </span>
              {modeLivraison && (
                <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {modeLivraison}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black tracking-tight text-card-foreground">
              BC {safe(data.dO_Piece)}
            </h1>
            <p className="text-sm text-muted-foreground">{formatDateTime(data.dO_Date)}</p>
          </div>
          <div className="rounded-[22px] border border-border/60 bg-muted/20 px-5 py-3 text-right">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Net à payer</div>
            <div className="mt-1 text-3xl font-black text-primary">{money(data.dO_NetAPayer)}</div>
            <div className="text-xs text-muted-foreground">TTC : {money(data.dO_TotalTTC)}</div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">

          {/* ── Client info ── */}
          <section className="rounded-[28px] border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Client</div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <ClientCard
                label="Nom"
                value={clientDisplayFromClient(client)}
                sub={clientTypeLabel(client)}
              />
              {phone && (
                <ClientCard label="Téléphone" value={safe(phone)} phone />
              )}
              {(zoneGouvernorat || zoneDelegation) && (
                <ClientCard
                  label="Zone"
                  value={[zoneGouvernorat, zoneDelegation].filter(Boolean).join(" / ")}
                />
              )}
              {adresse && (
                <ClientCard
                  label="Adresse"
                  value={safe(adresse)}
                  sub={[data.dO_VilleLivraison, data.dO_CodePostalLivraison].filter(Boolean).join(" ")}
                />
              )}
              {client?.codePostal && !data.dO_CodePostalLivraison && (
                <ClientCard label="Code postal" value={safe(client.codePostal)} />
              )}
            </div>
          </section>

          {/* ── Zone de livraison (éditable) ── */}
          {!isTransformed && (
            <section className="rounded-[28px] border border-border bg-card p-6 shadow-sm">
              <div className="mb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">Zone de livraison</div>
              <p className="mb-4 text-sm text-muted-foreground">
                Modifiez le gouvernorat, la délégation et la position GPS si nécessaire avant de confirmer.
              </p>
              <div className="space-y-4">
                <LocationEditSection
                  piece={piece as string}
                  initialGouvernorat={zoneGouvernorat}
                  initialDelegation={zoneDelegation}
                  initialLat={zoneLat}
                  initialLng={zoneLng}
                  onSaved={invalidateCoverage}
                />
                <CoverageBanner piece={piece as string} onNoLivreur={handleNoLivreur} />
              </div>
            </section>
          )}

          {/* ── Articles ── */}
          <section className="rounded-[28px] border border-border bg-card shadow-sm">
            <div className="border-b border-border px-6 py-4">
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Lignes BC</div>
              <h2 className="mt-1 text-lg font-black text-card-foreground">Articles</h2>
            </div>
            <div className="overflow-x-auto px-6 py-4">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    <th className="py-2.5 pr-4">Réf</th>
                    <th className="py-2.5 pr-4">Désignation</th>
                    <th className="py-2.5 pr-4">Qté</th>
                    <th className="py-2.5 pr-4">PU</th>
                    <th className="py-2.5">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {(data.lignes ?? []).map((line, i) => (
                    <tr key={`${line.ar_Ref ?? "x"}-${i}`} className="hover:bg-muted/20">
                      <td className="py-3.5 pr-4">
                        <span className="inline-flex items-center rounded-xl border border-border bg-card px-2.5 py-1 font-mono text-xs font-bold shadow-sm">
                          {safe(line.ar_Ref)}
                        </span>
                      </td>
                      <td className="max-w-[300px] truncate py-3.5 pr-4 font-semibold text-card-foreground">
                        {safe(line.dL_Design)}
                      </td>
                      <td className="py-3.5 pr-4 font-semibold">{Number(line.dL_Qte ?? 0)}</td>
                      <td className="py-3.5 pr-4 text-muted-foreground">{money(line.dL_PrixUnitaire ?? 0)}</td>
                      <td className="py-3.5 font-bold">{money(lineAmount(line))}</td>
                    </tr>
                  ))}
                  {(data.lignes ?? []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                        Aucune ligne disponible.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Workflow ── */}
          <section className="rounded-[28px] border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Workflow BC → BL</div>
            <div className="flex items-center gap-2">
              {steps.map((step, idx) => (
                <div key={step.key} className="flex flex-1 items-center gap-2">
                  <div className="flex flex-col items-center gap-1.5 text-center">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border text-sm font-black ${stepClass(step.state)}`}>
                      {step.state === "done" ? "✓" : step.state === "failed" ? "✕" : idx + 1}
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground">{step.label}</span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className={`h-0.5 flex-1 rounded-full ${step.state === "done" ? "bg-green-400" : "bg-border"}`} />
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── Aside : Actions + Superviseurs ── */}
        <aside className="space-y-5">

          {/* Actions */}
          <section className="rounded-[28px] border border-border bg-card p-6 shadow-sm">
            <div className="mb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">Décision</div>
            <h2 className="mb-4 text-lg font-black text-card-foreground">Actions confirmateur</h2>

            <div className="space-y-4">
              <div className="grid gap-2">
                {([
                  { status: 0 as OrderStatusValue, label: "En attente", variant: "outline" as const },
                  { status: 2 as OrderStatusValue, label: "Tentative", variant: "outline" as const },
                  { status: 3 as OrderStatusValue, label: "Refuser", variant: "destructive" as const },
                ] as const).map(({ status, label, variant }) => (
                  <Button
                    key={status}
                    type="button"
                    variant={currentStatus === status && status !== 3 ? "primary" : variant}
                    onClick={() => statusMutation.mutate({ status })}
                    disabled={statusMutation.isPending || isTransformed}
                    className="justify-start rounded-2xl px-4"
                  >
                    {label}
                  </Button>
                ))}
              </div>

              <div className="border-t border-border/50 pt-4">
                {noLivreur && !isTransformed && (
                  <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-800">
                    Confirmation bloquée — aucun livreur ne couvre cette zone. Modifiez la zone ou contactez un superviseur.
                  </div>
                )}
                <Button
                  type="button"
                  variant="primary"
                  isLoading={confirmMutation.isPending}
                  onClick={() => confirmMutation.mutate()}
                  disabled={isTransformed || noLivreur}
                  className="h-12 w-full rounded-2xl text-base font-bold"
                >
                  {isTransformed ? "BC déjà transformé" : "Confirmer et générer le BL"}
                </Button>
              </div>

              {isTransformed && (
                <div className="rounded-[18px] border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
                  Ce BC est déjà transformé en BL. Actions verrouillées.
                </div>
              )}

              {statusMutation.isError && (
                <div className="ds-alert ds-alert-danger text-xs">Erreur de mise à jour du statut.</div>
              )}
              {confirmMutation.isError && (
                <div className="ds-alert ds-alert-danger text-xs">
                  Erreur lors de la transformation BC → BL.
                </div>
              )}
            </div>
          </section>

          {/* Superviseurs */}
          <SuperviseursList />

          <Link to="/confirmateur/commandes" className="block">
            <Button type="button" variant="ghost" className="h-10 w-full rounded-2xl text-sm">
              ← Retour à la liste BC
            </Button>
          </Link>
        </aside>
      </div>
    </div>
  );
}

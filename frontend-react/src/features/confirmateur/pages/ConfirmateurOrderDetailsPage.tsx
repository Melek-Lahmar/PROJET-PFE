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
import type { OrderStatusValue, ZoneCoverageDto } from "../types/confirmateur";
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
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";

// ─── Helpers UI ──────────────────────────────────────────────────────────────

const paymentLabel = (mode?: string | null) => {
  const m = (mode ?? "").trim().toUpperCase();
  if (m === "COD") return "Paiement à la livraison";
  if (m === "VIRTUAL") return "Paiement virtuel sécurisé";
  if (m === "CASH") return "Espèces";
  return mode || "—";
};

const deliveryLabel = (mode?: string | null) => {
  const m = (mode ?? "").trim().toUpperCase();
  if (m === "HOME") return "🚚 Livraison à domicile";
  if (m === "PICKUP") return "🏪 Retrait dépôt";
  return mode || "—";
};

// ─── Premium Info Tile ───────────────────────────────────────────────────────

function InfoTile({
  icon,
  label,
  value,
  sub,
  href,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  href?: string;
  accent?: "primary" | "danger" | "success" | "neutral";
}) {
  const accentBg =
    accent === "primary" ? "bg-primary/5 border-primary/15" :
    accent === "danger" ? "bg-red-50 border-red-200" :
    accent === "success" ? "bg-green-50 border-green-200" :
    "bg-card border-border/60";

  return (
    <div className={`group rounded-2xl border ${accentBg} p-4 transition-all hover:shadow-md`}>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/40 text-base">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
          {href ? (
            <a href={href} className="block truncate text-sm font-bold text-primary hover:underline">{value}</a>
          ) : (
            <div className="truncate text-sm font-bold text-card-foreground">{value}</div>
          )}
          {sub && <div className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

// ─── Coverage Banner (premium) ───────────────────────────────────────────────

function CoverageBanner({
  coverage,
  isLoading,
}: {
  coverage: ZoneCoverageDto | undefined;
  isLoading: boolean;
}) {
  if (isLoading || !coverage) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/60 px-4 py-3">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
        <span className="text-sm text-muted-foreground">Vérification de la couverture livreurs…</span>
      </div>
    );
  }

  if (!coverage.gouvernorat || !coverage.delegation) {
    return (
      <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-xl">
            ⚠️
          </div>
          <div className="flex-1">
            <div className="text-sm font-black text-amber-900">Zone de livraison non définie</div>
            <div className="mt-1 text-xs font-medium text-amber-800">
              Impossible de confirmer ce BC. Renseignez d'abord le gouvernorat et la délégation dans la section « Zone de livraison ».
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!coverage.hasCoverage) {
    return (
      <div className="rounded-2xl border-2 border-red-300 bg-gradient-to-br from-red-50 to-rose-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-200 text-xl">
            🚫
          </div>
          <div className="flex-1">
            <div className="text-sm font-black text-red-900">
              Aucun livreur ne couvre {coverage.gouvernorat} / {coverage.delegation}
            </div>
            <div className="mt-1 text-xs font-medium text-red-800">
              Impossible de confirmer. Modifiez la zone ci-dessus ou contactez un superviseur (voir liste à droite).
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-200 text-xl">
          ✅
        </div>
        <div className="flex-1">
          <div className="text-sm font-black text-green-900">
            {coverage.livreurCount} livreur{coverage.livreurCount > 1 ? "s" : ""} disponible{coverage.livreurCount > 1 ? "s" : ""} sur {coverage.gouvernorat} / {coverage.delegation}
          </div>
          <div className="mt-1 text-xs font-medium text-green-800">
            Le livreur le moins chargé sera affecté automatiquement à la confirmation.
          </div>
          {coverage.livreurs.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {coverage.livreurs.map((l) => (
                <span
                  key={l.userId}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-0.5 text-[11px] font-semibold text-green-900 ring-1 ring-green-300"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  {l.nomComplet ?? "—"}
                  <span className="text-green-700/70">({l.activeOrders})</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Supervisors (premium) ───────────────────────────────────────────────────

function SuperviseursList({ highlight }: { highlight: boolean }) {
  const { data, isLoading } = useQuery({
    queryKey: ["confirmateur-supervisors"],
    queryFn: getConfirmateurSupervisors,
    staleTime: 5 * 60_000,
  });

  if (isLoading || !data || data.length === 0) return null;

  return (
    <section
      className={`rounded-[24px] border-2 p-5 transition-all ${
        highlight
          ? "border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg shadow-amber-200/40"
          : "border-border/60 bg-card"
      }`}
    >
      <div className="mb-4 flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${highlight ? "bg-amber-200" : "bg-muted/40"} text-lg`}>
          📞
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-sm font-black ${highlight ? "text-amber-900" : "text-card-foreground"}`}>
            Superviseurs à contacter
          </div>
          <div className={`text-xs ${highlight ? "text-amber-700" : "text-muted-foreground"}`}>
            {highlight ? "Appelez-les pour débloquer la zone" : "En cas de problème, contactez-les"}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {data.map((s) => (
          <div
            key={s.userId}
            className="flex items-center justify-between gap-3 rounded-xl bg-white/80 px-3 py-2.5 ring-1 ring-border/40"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-card-foreground">
                {s.nomComplet ?? s.email ?? "Superviseur"}
              </div>
              {s.email && <div className="truncate text-[11px] text-muted-foreground">{s.email}</div>}
            </div>
            {s.telephone ? (
              <a
                href={`tel:${s.telephone}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-amber-600 hover:shadow-md"
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                {s.telephone}
              </a>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Location edit section ───────────────────────────────────────────────────

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
  const [editing, setEditing] = useState(!initialGouvernorat || !initialDelegation);
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
  const govId = useMemo(() => govQuery.data?.find((g) => g.name === gouvernorat)?.id ?? 0, [govQuery.data, gouvernorat]);

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

  const resolveAddressFromCoords = useCallback(async (lat: number, lng: number) => {
    setGpsMsg("Analyse de la position…");
    try {
      const result = await reverseGeocodeNominatim(lat, lng);
      const govIdResolved = resolveGouvernoratIdFromReverse(result);
      if (govIdResolved !== null) {
        setGouvernorat(TUNISIA_GOUVERNORATS[govIdResolved] ?? "");
        const pool = await getDelegations(govIdResolved).catch(() => []);
        const delegResolved = resolveDelegationFromReverse(result, pool);
        if (delegResolved) setDelegation(delegResolved);
      }
      const addr = buildAddressFromReverse(result);
      const cp = extractPostalCode(result);
      setGpsMsg(addr ? `📍 ${addr}${cp ? ` — ${cp}` : ""}` : "Position enregistrée");
    } catch {
      setGpsMsg("Position enregistrée — vérifiez la zone.");
    }
  }, []);

  const handleGPS = useCallback(async () => {
    setLocating(true);
    setGpsMsg("");
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      );
      setLatitude(pos.coords.latitude);
      setLongitude(pos.coords.longitude);
      await resolveAddressFromCoords(pos.coords.latitude, pos.coords.longitude);
    } catch {
      setGpsMsg("❌ Impossible d'accéder à votre position GPS.");
    } finally {
      setLocating(false);
    }
  }, [resolveAddressFromCoords]);

  if (!editing) {
    const gpsDisplay =
      initialLat !== null && initialLng !== null
        ? `${initialLat.toFixed(5)}, ${initialLng.toFixed(5)}`
        : null;

    return (
      <div className="space-y-3">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <InfoTile icon="🏛️" label="Gouvernorat" value={initialGouvernorat || "—"} />
          <InfoTile icon="📍" label="Délégation" value={initialDelegation || "—"} />
        </div>
        {gpsDisplay && (
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/15 px-3 py-2 text-xs text-muted-foreground">
            <span className="text-base">🛰️</span>
            <span className="font-mono font-semibold text-card-foreground">{gpsDisplay}</span>
          </div>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
        >
          ✏️ Modifier la zone
        </button>
      </div>
    );
  }

  const fieldClass =
    "w-full rounded-xl border border-border/70 bg-background px-3 py-2.5 text-sm text-card-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20";

  return (
    <div className="space-y-4 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/[0.025] p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Gouvernorat *</label>
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
            <option value="">— Sélectionner —</option>
            {(govQuery.data ?? []).map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Délégation *</label>
          <select
            value={delegation}
            onChange={(e) => setDelegation(e.target.value)}
            disabled={!govId}
            className={fieldClass}
          >
            <option value="">— Sélectionner —</option>
            {delegation && !(delQuery.data ?? []).includes(delegation) && (
              <option value={delegation}>{delegation}</option>
            )}
            {(delQuery.data ?? []).map((d) => <option key={d} value={d}>{d}</option>)}
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
          ) : "🛰️"}
          {locating ? "Localisation…" : "Ma position GPS"}
        </button>
        <button
          type="button"
          onClick={() => setMapOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-card-foreground transition hover:bg-muted"
        >
          🗺️ Épingler sur la carte
        </button>
      </div>

      {(latitude !== null || gpsMsg) && (
        <div className={`rounded-xl px-3 py-2 text-xs font-medium ${
          gpsMsg.startsWith("❌")
            ? "border border-red-200 bg-red-50 text-red-700"
            : "border border-green-200 bg-green-50 text-green-700"
        }`}>
          {latitude !== null && longitude !== null && (
            <span className="font-mono">🛰️ {latitude.toFixed(5)}, {longitude.toFixed(5)} — </span>
          )}
          {gpsMsg}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !gouvernorat || !delegation}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
        >
          {saveMutation.isPending ? (
            <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> Enregistrement…</>
          ) : "✓ Enregistrer la zone"}
        </button>
        {initialGouvernorat && initialDelegation && (
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setGouvernorat(initialGouvernorat);
              setDelegation(initialDelegation);
              setLatitude(initialLat);
              setLongitude(initialLng);
              setGpsMsg("");
            }}
            className="inline-flex h-10 items-center rounded-xl border border-border bg-card px-4 text-sm font-semibold text-card-foreground transition hover:bg-muted"
          >
            Annuler
          </button>
        )}
      </div>

      {saveMutation.isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {getApiErrorMessage(saveMutation.error)}
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
          await resolveAddressFromCoords(lat, lng);
        }}
      />
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export function ConfirmateurOrderDetailsPage() {
  const { piece } = useParams<{ piece: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["confirmateur-order", piece],
    queryFn: () => getConfirmateurOrderByPiece(piece as string),
    enabled: !!piece,
  });

  const coverageQuery = useQuery({
    queryKey: ["zone-coverage", piece],
    queryFn: () => getZoneCoverage(piece as string),
    enabled: !!piece,
    staleTime: 30_000,
  });

  const statusMutation = useMutation({
    mutationFn: ({ status }: { status: OrderStatusValue }) => updateConfirmateurOrderStatus(piece as string, status),
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

  const invalidateCoverage = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["zone-coverage", piece] });
    void queryClient.invalidateQueries({ queryKey: ["confirmateur-order", piece] });
  }, [queryClient, piece]);

  // Auto-invalidate coverage when order data updates (e.g., after location save)
  useEffect(() => {
    if (data?.dO_PassagerGouvernorat || data?.dO_PassagerDelegation) {
      void queryClient.invalidateQueries({ queryKey: ["zone-coverage", piece] });
    }
  }, [data?.dO_PassagerGouvernorat, data?.dO_PassagerDelegation, queryClient, piece]);

  if (isLoading) {
    return (
      <div className="w-full space-y-6 py-10">
        <div className="h-32 animate-pulse rounded-[28px] bg-gradient-to-r from-muted/50 to-muted/30" />
        <div className="grid gap-4 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-48 animate-pulse rounded-[24px] bg-muted/30" />)}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="w-full py-10">
        <div className="rounded-[28px] border-2 border-red-200 bg-red-50 p-6">
          <div className="text-sm font-black text-red-800">BC introuvable</div>
          <div className="mt-1 text-sm text-red-700">
            {(error as Error)?.message ?? "Impossible de charger le détail confirmateur."}
          </div>
          <Link to="/confirmateur/commandes" className="mt-4 inline-block">
            <Button type="button" className="h-10 rounded-2xl px-5">← Retour</Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusMeta = getConfirmateurStatusMeta(data.statusLabel, data.dO_Valide);
  const client = data.client ?? null;
  const currentStatus: OrderStatusValue = data.dO_Valide === 2 ? 2 : data.dO_Valide === 3 ? 3 : 0;
  const isTransformed = statusMeta.workflowState === "transformed";

  // Données zone (priorité passager > client)
  const zoneGouvernorat = data.dO_PassagerGouvernorat ?? client?.gouvernorat ?? null;
  const zoneDelegation = data.dO_PassagerDelegation ?? client?.delegation ?? null;
  const zoneLat = data.dO_LatitudeLivraison ? parseFloat(data.dO_LatitudeLivraison) : null;
  const zoneLng = data.dO_LongitudeLivraison ? parseFloat(data.dO_LongitudeLivraison) : null;

  const coverage = coverageQuery.data;
  const blockConfirm = !isTransformed && (!coverage?.hasCoverage);
  const noLivreur = coverage !== undefined && coverage.gouvernorat && coverage.delegation && !coverage.hasCoverage;
  const noZone = coverage !== undefined && (!coverage.gouvernorat || !coverage.delegation);

  const phone = data.dO_TelephoneLivraison ?? client?.telephone ?? null;
  const adresse = data.dO_AdresseLivraison ?? client?.adresse ?? null;
  const ville = data.dO_VilleLivraison ?? null;
  const cp = data.dO_CodePostalLivraison ?? client?.codePostal ?? null;
  const adresseComp = client?.adresseComplementaire ?? null;

  const totalArticles = (data.lignes ?? []).reduce((acc, l) => acc + Number(l.dL_Qte ?? 0), 0);
  const totalLignes = (data.lignes ?? []).length;

  return (
    <div className="w-full space-y-6 pb-12">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-8 py-7 text-white shadow-2xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.18),transparent_55%)]" />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="space-y-3">
            <Link to="/confirmateur/commandes" className="inline-flex items-center gap-1 text-xs font-bold text-white/70 hover:text-white">
              ← Retour aux BC
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider ${statusMeta.badgeClass}`}>
                {statusMeta.label}
              </span>
              <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold backdrop-blur-sm">
                {clientTypeLabel(client)}
              </span>
              {data.dO_ModeLivraison && (
                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold backdrop-blur-sm">
                  {deliveryLabel(data.dO_ModeLivraison)}
                </span>
              )}
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-white/50">Bon de commande</div>
              <h1 className="mt-1 font-mono text-3xl font-black tracking-tight">{safe(data.dO_Piece)}</h1>
              <div className="mt-1 text-xs text-white/60">📅 {formatDateTime(data.dO_Date)}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/5 px-6 py-4 backdrop-blur-sm">
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/50">Net à payer</div>
            <div className="mt-1 text-4xl font-black text-white">{money(data.dO_NetAPayer)}</div>
            <div className="mt-1 text-xs text-white/60">TTC : {money(data.dO_TotalTTC)}</div>
          </div>
        </div>
      </section>

      {/* ── Grille principale ── */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">

        {/* ── Colonne gauche ── */}
        <div className="space-y-6">

          {/* Client */}
          <section className="rounded-[28px] border border-border bg-card p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-lg">👤</div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Identité</div>
                <h2 className="text-lg font-black text-card-foreground">{clientDisplayFromClient(client)}</h2>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {phone && <InfoTile icon="📞" label="Téléphone" value={safe(phone)} href={`tel:${phone}`} accent="primary" />}
              {client?.cin && <InfoTile icon="🪪" label="CIN" value={safe(client.cin)} />}
              {client?.utilisateurId && <InfoTile icon="🔑" label="Compte" value="Client enregistré" sub="Utilisateur connecté" />}
              {!client?.utilisateurId && <InfoTile icon="👻" label="Compte" value="Invité" sub="Sans compte client" />}
              {client?.nomSociete && <InfoTile icon="🏢" label="Société" value={safe(client.nomSociete)} sub={client.matriculeFiscal ? `MF: ${client.matriculeFiscal}` : undefined} />}
              {data.dO_Tiers && <InfoTile icon="🆔" label="Code tiers Sage" value={safe(data.dO_Tiers)} />}
            </div>
          </section>

          {/* Adresse de livraison */}
          {(adresse || ville || cp) && (
            <section className="rounded-[28px] border border-border bg-card p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-lg">📮</div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Adresse de livraison</div>
                  <h2 className="text-lg font-black text-card-foreground">Coordonnées physiques</h2>
                </div>
              </div>
              <div className="space-y-3">
                {adresse && (
                  <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Adresse complète</div>
                    <div className="mt-1 text-base font-bold text-card-foreground">{safe(adresse)}</div>
                    {adresseComp && <div className="mt-1 text-sm text-muted-foreground">📋 {safe(adresseComp)}</div>}
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  {ville && <InfoTile icon="🏙️" label="Ville" value={safe(ville)} />}
                  {cp && <InfoTile icon="📬" label="Code postal" value={safe(cp)} />}
                </div>
              </div>
            </section>
          )}

          {/* Zone de livraison + Coverage */}
          {!isTransformed && (
            <section className="rounded-[28px] border border-border bg-card p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-lg">🗺️</div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Zone & livreur</div>
                  <h2 className="text-lg font-black text-card-foreground">Configuration de livraison</h2>
                </div>
              </div>
              <div className="space-y-4">
                <LocationEditSection
                  piece={piece as string}
                  initialGouvernorat={zoneGouvernorat}
                  initialDelegation={zoneDelegation}
                  initialLat={zoneLat}
                  initialLng={zoneLng}
                  onSaved={invalidateCoverage}
                />
                <CoverageBanner coverage={coverage} isLoading={coverageQuery.isLoading} />
              </div>
            </section>
          )}

          {/* Articles */}
          <section className="rounded-[28px] border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-lg">📦</div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Articles</div>
                  <h2 className="text-lg font-black text-card-foreground">
                    {totalLignes} ligne{totalLignes > 1 ? "s" : ""} • {totalArticles} article{totalArticles > 1 ? "s" : ""}
                  </h2>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/20">
                  <tr className="text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <th className="px-6 py-3">Réf</th>
                    <th className="py-3 pr-4">Désignation</th>
                    <th className="py-3 pr-4 text-right">Qté</th>
                    <th className="py-3 pr-4 text-right">PU</th>
                    <th className="px-6 py-3 text-right">Montant TTC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {(data.lignes ?? []).map((line, i) => (
                    <tr key={`${line.ar_Ref ?? "x"}-${i}`} className="transition hover:bg-muted/15">
                      <td className="px-6 py-3.5">
                        <span className="inline-flex items-center rounded-lg border border-border bg-card px-2 py-1 font-mono text-xs font-bold">
                          {safe(line.ar_Ref)}
                        </span>
                      </td>
                      <td className="max-w-[280px] truncate py-3.5 pr-4 font-semibold text-card-foreground">
                        {safe(line.dL_Design)}
                      </td>
                      <td className="py-3.5 pr-4 text-right font-bold text-card-foreground">{Number(line.dL_Qte ?? 0)}</td>
                      <td className="py-3.5 pr-4 text-right text-muted-foreground">{money(line.dL_PrixUnitaire ?? 0)}</td>
                      <td className="px-6 py-3.5 text-right font-black text-primary">{money(lineAmount(line))}</td>
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

        </div>

        {/* ── Aside : récap + actions + superviseurs ── */}
        <aside className="space-y-5">

          {/* Récap financier */}
          <section className="rounded-[28px] border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-lg">💰</div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Récapitulatif</div>
                <h2 className="text-base font-black text-card-foreground">Montants</h2>
              </div>
            </div>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total HT</span>
                <span className="font-bold text-card-foreground">{money(data.dO_TotalHT)}</span>
              </div>
              {data.dO_FraisLivraison !== null && data.dO_FraisLivraison !== undefined && data.dO_FraisLivraison !== 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frais de livraison</span>
                  <span className="font-bold text-card-foreground">{money(data.dO_FraisLivraison)}</span>
                </div>
              )}
              {data.dO_TimbreFiscal !== null && data.dO_TimbreFiscal !== undefined && data.dO_TimbreFiscal !== 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Timbre fiscal</span>
                  <span className="font-bold text-card-foreground">{money(data.dO_TimbreFiscal)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border/60 pt-2.5">
                <span className="text-sm font-bold text-card-foreground">Total TTC</span>
                <span className="font-black text-card-foreground">{money(data.dO_TotalTTC)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-primary/10 px-3 py-2.5">
                <span className="text-sm font-black text-primary">Net à payer</span>
                <span className="text-xl font-black text-primary">{money(data.dO_NetAPayer)}</span>
              </div>
              {data.dO_ModePaiement && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-border/60 bg-muted/15 px-3 py-2 text-xs">
                  <span>💳</span>
                  <span className="font-semibold text-card-foreground">{paymentLabel(data.dO_ModePaiement)}</span>
                </div>
              )}
            </div>
          </section>

          {/* Actions */}
          <section className="rounded-[28px] border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-lg">⚡</div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Décision</div>
                <h2 className="text-base font-black text-card-foreground">Actions confirmateur</h2>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-2">
                {([
                  { status: 0 as OrderStatusValue, label: "⏸️ En attente", variant: "outline" as const },
                  { status: 2 as OrderStatusValue, label: "🔄 Tentative", variant: "outline" as const },
                  { status: 3 as OrderStatusValue, label: "❌ Refuser", variant: "destructive" as const },
                ] as const).map(({ status, label, variant }) => (
                  <Button
                    key={status}
                    type="button"
                    variant={currentStatus === status && status !== 3 ? "primary" : variant}
                    onClick={() => statusMutation.mutate({ status })}
                    disabled={statusMutation.isPending || isTransformed}
                    className="justify-start rounded-xl px-4"
                  >
                    {label}
                  </Button>
                ))}
              </div>

              <div className="border-t border-border/40 pt-4">
                {noZone && !isTransformed && (
                  <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-900">
                    ⚠️ Zone non renseignée. Définissez le gouvernorat + délégation avant de confirmer.
                  </div>
                )}
                {noLivreur && !isTransformed && (
                  <div className="mb-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-900">
                    🚫 Aucun livreur ne couvre cette zone. Modifiez la zone ou appelez un superviseur.
                  </div>
                )}
                <Button
                  type="button"
                  variant="primary"
                  isLoading={confirmMutation.isPending}
                  onClick={() => confirmMutation.mutate()}
                  disabled={isTransformed || blockConfirm}
                  className="h-12 w-full rounded-xl text-base font-black shadow-md"
                >
                  {isTransformed ? "✓ BC déjà transformé" : "✓ Confirmer et générer le BL"}
                </Button>
              </div>

              {isTransformed && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
                  ✅ Ce BC est déjà transformé en BL. Actions verrouillées.
                </div>
              )}

              {statusMutation.isError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {getApiErrorMessage(statusMutation.error)}
                </div>
              )}
              {confirmMutation.isError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800">
                  <div className="font-bold">Confirmation impossible</div>
                  <div className="mt-0.5">{getApiErrorMessage(confirmMutation.error)}</div>
                </div>
              )}
            </div>
          </section>

          {/* Superviseurs */}
          <SuperviseursList highlight={!!(noLivreur || noZone) && !isTransformed} />
        </aside>
      </div>
    </div>
  );
}

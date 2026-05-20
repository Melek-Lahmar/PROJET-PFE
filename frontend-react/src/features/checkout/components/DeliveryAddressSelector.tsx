// src/features/checkout/components/DeliveryAddressSelector.tsx
//
// Mode "saved"  → adresses enregistrées (cartes cliquables)
// Mode "temp"   → gouvernorat SELECT + délégation SELECT + GPS + carte + sync

import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";

import { useAddresses } from "../../addresses/hooks/useAddresses";
import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { AddressMapModal } from "../../auth/components/AddressMapModal";
import { getDelegations } from "../../geo/api/geoApi";
import { reverseGeocodeNominatim } from "../../geo/api/nominatimApi";
import {
  TUNISIA_GOUVERNORATS,
  roundCoordinate,
  resolveGouvernoratIdFromReverse,
  resolveDelegationFromReverse,
  buildAddressFromReverse,
  extractPostalCode,
} from "../../geo/utils/tunisiaLocationSync";
import { getCenterForTunisia } from "../../geo/data/tunisiaCenters";
import type { ClientAddress } from "../../addresses/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  // valeurs contrôlées par CheckoutPage
  address: string;
  city: string;        // ← contiendra le nom de délégation
  postalCode: string;
  latitude: number | null;
  longitude: number | null;

  setAddress: (v: string) => void;
  setCity: (v: string) => void;
  setPostalCode: (v: string) => void;
  setLatitude: (v: number | null) => void;
  setLongitude: (v: number | null) => void;

  onTouched: (f: "address" | "city" | "postalCode" | "latitude" | "longitude") => void;
};

type SyncStatus = "idle" | "loading" | "ok" | "mismatch" | "error";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SELECT_CLASS =
  "h-11 w-full rounded-2xl border border-border bg-[hsl(var(--input))] px-4 text-sm text-card-foreground outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10 disabled:opacity-50";

function RadioDot({ checked }: { checked: boolean }) {
  return (
    <span className={["mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors", checked ? "border-primary" : "border-muted-foreground/40"].join(" ")}>
      {checked && <span className="h-2 w-2 rounded-full bg-primary" />}
    </span>
  );
}

function buildSavedLabel(a: ClientAddress) {
  return [a.adresse, a.ville, a.codePostal].filter(Boolean).join(" · ");
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function DeliveryAddressSelector({ address, city, postalCode, latitude, longitude, setAddress, setCity, setPostalCode, setLatitude, setLongitude, onTouched }: Props) {
  const { data: savedAddresses = [], isPending: addrPending } = useAddresses();

  const [mode, setMode] = useState<"saved" | "temp">("saved");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Adresse temporaire — état local
  const [gouvernoratId, setGouvernoratId] = useState<number>(22); // Tunis par défaut
  const [delegation, setDelegation] = useState<string>("");
  const [adresseText, setAdresseText] = useState<string>("");
  const [codePostalLocal, setCodePostalLocal] = useState<string>("");

  // GPS / carte
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);

  // Sync GPS ↔ sélection
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncMessage, setSyncMessage] = useState<string>("");
  const syncRef = useRef(0);

  const delegQuery = useQuery({
    queryKey: ["delegations-temp", gouvernoratId],
    queryFn: () => getDelegations(gouvernoratId),
    staleTime: 5 * 60_000,
  });
  const delegations = delegQuery.data ?? [];

  // Reset délégation si le gouvernorat change
  useEffect(() => {
    setDelegation("");
  }, [gouvernoratId]);

  // Synchronise city → parent quand délégation change
  useEffect(() => {
    if (mode !== "temp") return;
    onTouched("city");
    setCity(delegation || TUNISIA_GOUVERNORATS[gouvernoratId] || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delegation, gouvernoratId, mode]);

  // Pré-sélection adresse par défaut
  useEffect(() => {
    if (addrPending || savedAddresses.length === 0) { setMode("temp"); return; }
    setMode("saved");
    const def = savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];
    if (def && !selectedId) applyAddress(def);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addrPending, savedAddresses.length]);

  function applyAddress(a: ClientAddress) {
    setSelectedId(a.id);
    setAddress(a.adresse);
    setCity(a.ville ?? "");
    setPostalCode(a.codePostal ?? "");
    setLatitude(a.latitude ?? null);
    setLongitude(a.longitude ?? null);
  }

  function handleModeChange(next: "saved" | "temp") {
    setMode(next);
    setSyncStatus("idle");
    setSyncMessage("");
    setGpsError(null);
    if (next === "saved" && savedAddresses.length > 0) {
      const a = savedAddresses.find((x) => x.id === selectedId) ?? savedAddresses.find((x) => x.isDefault) ?? savedAddresses[0];
      if (a) applyAddress(a);
    } else if (next === "temp") {
      setSelectedId(null);
      setAdresseText("");
      setCodePostalLocal("");
      setLatitude(null);
      setLongitude(null);
      setAddress("");
      setCity(TUNISIA_GOUVERNORATS[gouvernoratId] || "");
      setPostalCode("");
    }
  }

  // ── Reverse geocode + sync ─────────────────────────────────────────────────
  const reverseMutation = useMutation({
    mutationFn: async ({ lat, lng }: { lat: number; lng: number }) => {
      const id = ++syncRef.current;
      const result = await reverseGeocodeNominatim(lat, lng);
      return { id, lat, lng, result };
    },
    onMutate: () => {
      setSyncStatus("loading");
      setSyncMessage("Analyse de la position…");
    },
    onSuccess: async ({ id, lat, lng, result }) => {
      if (id !== syncRef.current) return;

      setLatitude(roundCoordinate(lat));
      setLongitude(roundCoordinate(lng));
      onTouched("latitude");
      onTouched("longitude");

      // Essai de remplissage automatique de l'adresse
      const addr = buildAddressFromReverse(result);
      const cp = extractPostalCode(result);
      if (addr) { setAdresseText(addr); setAddress(addr); onTouched("address"); }
      if (cp) { setCodePostalLocal(cp); setPostalCode(cp); onTouched("postalCode"); }

      // Résolution gouvernorat + délégation depuis le reverse
      const resolvedGovId = resolveGouvernoratIdFromReverse(result);

      let delegPool = delegations;
      if (resolvedGovId !== null && resolvedGovId !== gouvernoratId) {
        try { delegPool = await getDelegations(resolvedGovId); } catch { /* ignore */ }
      }
      const resolvedDeleg = resolveDelegationFromReverse(result, delegPool);

      // Contrôle de cohérence avec ce que l'utilisateur a sélectionné
      const govMatch = resolvedGovId === null || resolvedGovId === gouvernoratId;
      const delegMatch = !resolvedDeleg || !delegation || resolveDelegationFromReverse(result, [delegation]) !== null;

      const govName = TUNISIA_GOUVERNORATS[gouvernoratId] ?? "";
      const resolvedGovName = resolvedGovId !== null ? (TUNISIA_GOUVERNORATS[resolvedGovId] ?? "") : "";

      if (govMatch && delegMatch) {
        setSyncStatus("ok");
        setSyncMessage(`✅ Position synchronisée avec ${govName}${delegation ? ` · ${delegation}` : ""}`);
      } else {
        setSyncStatus("mismatch");
        const parts: string[] = [];
        if (!govMatch) parts.push(`gouvernorat détecté : ${resolvedGovName || "?"}`);
        if (!delegMatch && resolvedDeleg) parts.push(`délégation détectée : ${resolvedDeleg}`);
        setSyncMessage(`⚠️ La position GPS ne correspond pas à votre sélection (${parts.join(", ")}). Vérifiez ou ajustez.`);
      }
    },
    onError: () => {
      setSyncStatus("error");
      setSyncMessage("Impossible d'analyser la position. Vérifiez manuellement.");
    },
  });

  // ── GPS ────────────────────────────────────────────────────────────────────
  function handleGps() {
    setGpsError(null);
    if (!navigator.geolocation) { setGpsError("Géolocalisation non supportée."); return; }
    const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    if (!window.isSecureContext && !isLocal) { setGpsError("HTTPS requis pour la géolocalisation."); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        reverseMutation.mutate({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === err.PERMISSION_DENIED) setGpsError("Permission refusée. Autorisez la localisation dans le navigateur.");
        else if (err.code === err.POSITION_UNAVAILABLE) setGpsError("Position indisponible.");
        else setGpsError("Impossible de récupérer la position.");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  // ── Map pick ───────────────────────────────────────────────────────────────
  function handleMapChange(lat: number, lng: number) {
    reverseMutation.mutate({ lat, lng });
  }

  const hasGps = typeof latitude === "number" && typeof longitude === "number";
  const gouvernoratCenter = getCenterForTunisia(gouvernoratId);

  // ─── Rendu ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 pt-2">

      {/* Titre */}
      <h3 className="flex items-center gap-2 font-bold text-card-foreground">
        <span className="inline-block h-5 w-1 rounded-full bg-gradient-to-b from-primary to-indigo-500" />
        Adresse de livraison
      </h3>

      {/* Toggle mode */}
      <div className="grid gap-3 sm:grid-cols-2">
        {(["saved", "temp"] as const).map((m) => {
          const isSaved = m === "saved";
          const disabled = isSaved && savedAddresses.length === 0 && !addrPending;
          return (
            <button key={m} type="button" disabled={disabled} onClick={() => handleModeChange(m)}
              className={["flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all duration-200",
                mode === m ? "border-primary bg-primary/5 ring-2 ring-primary/15 shadow-sm" : "border-border/60 bg-[hsl(var(--input))] hover:border-primary/30",
                disabled ? "cursor-not-allowed opacity-40" : ""].join(" ")}>
              <RadioDot checked={mode === m} />
              <div>
                <div className="text-sm font-bold text-card-foreground">
                  {isSaved ? "Mes adresses enregistrées" : "Adresse temporaire"}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {isSaved
                    ? addrPending ? "Chargement…" : savedAddresses.length === 0 ? "Aucune adresse sauvegardée" : `${savedAddresses.length} adresse${savedAddresses.length > 1 ? "s" : ""}`
                    : "Pour cette commande uniquement"}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Mode adresses enregistrées ─────────────────────────────────────── */}
      {mode === "saved" && (
        <div className="space-y-2">
          {addrPending ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : savedAddresses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
              Aucune adresse enregistrée.{" "}
              <Link to="/profile/addresses" className="font-semibold text-primary hover:underline underline-offset-2">Ajouter une adresse</Link>
            </div>
          ) : (
            <div className="grid gap-2">
              {savedAddresses.map((a) => {
                const sel = a.id === selectedId;
                return (
                  <button key={a.id} type="button" onClick={() => applyAddress(a)}
                    className={["flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all",
                      sel ? "border-primary/60 bg-primary/5 ring-2 ring-primary/15 shadow-sm" : "border-border bg-card hover:border-primary/30 hover:bg-accent/30"].join(" ")}>
                    <RadioDot checked={sel} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-card-foreground">{a.label}</span>
                        {a.isDefault && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">Par défaut</span>}
                        {a.latitude && a.longitude && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">📍 GPS</span>}
                      </div>
                      <p className="mt-1 text-sm text-card-foreground">{buildSavedLabel(a)}</p>
                      {(a.delegation || a.gouvernorat) && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{[a.delegation, a.gouvernorat].filter(Boolean).join(" · ")}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {savedAddresses.length > 0 && (
            <div className="text-right pt-1">
              <Link to="/profile/addresses" className="text-xs font-semibold text-primary hover:underline underline-offset-2">Gérer mes adresses →</Link>
            </div>
          )}
        </div>
      )}

      {/* ── Mode adresse temporaire ────────────────────────────────────────── */}
      {mode === "temp" && (
        <div className="space-y-5 rounded-2xl border border-border/70 bg-[hsl(var(--input)/0.35)] p-5">

          {/* Gouvernorat */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-card-foreground">
              Gouvernorat <span className="text-rose-500">*</span>
            </label>
            <select className={SELECT_CLASS} value={gouvernoratId}
              onChange={(e) => { setGouvernoratId(Number(e.target.value)); setSyncStatus("idle"); setSyncMessage(""); }}>
              {TUNISIA_GOUVERNORATS.map((name, idx) => (
                <option key={idx} value={idx}>{name}</option>
              ))}
            </select>
          </div>

          {/* Délégation */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-card-foreground">
              Délégation <span className="text-rose-500">*</span>
            </label>
            {delegQuery.isLoading ? (
              <div className="flex h-11 items-center rounded-2xl border border-border bg-[hsl(var(--input))] px-4 text-sm text-muted-foreground">Chargement…</div>
            ) : (
              <select className={SELECT_CLASS} value={delegation}
                onChange={(e) => { setDelegation(e.target.value); setSyncStatus("idle"); setSyncMessage(""); }}>
                <option value="">— Choisir une délégation —</option>
                {delegations.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            )}
          </div>

          {/* Adresse texte */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-card-foreground">
              Adresse <span className="text-rose-500">*</span>
            </label>
            <Input value={adresseText}
              onChange={(e) => { setAdresseText(e.target.value); setAddress(e.target.value); onTouched("address"); }}
              placeholder="Ex: 12 Rue Habib Bourguiba, Résidence A" />
          </div>

          {/* Code postal */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-card-foreground">Code postal</label>
            <Input value={codePostalLocal}
              onChange={(e) => { setCodePostalLocal(e.target.value); setPostalCode(e.target.value); onTouched("postalCode"); }}
              placeholder="Ex: 1000" />
          </div>

          {/* ── GPS + Carte ─────────────────────────────────────────────────── */}
          <div className="space-y-3 border-t border-border/60 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-card-foreground">Localisation GPS</p>
                <p className="text-xs text-muted-foreground">Optionnelle · améliore la précision de livraison</p>
              </div>

              {hasGps && (
                <div className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  <span>📍</span>
                  <span>{latitude!.toFixed(4)}, {longitude!.toFixed(4)}</span>
                  <button type="button" title="Effacer les coordonnées"
                    onClick={() => { setLatitude(null); setLongitude(null); setSyncStatus("idle"); setSyncMessage(""); onTouched("latitude"); onTouched("longitude"); }}
                    className="ml-1 text-emerald-400 transition-colors hover:text-rose-500">✕</button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={handleGps} disabled={gpsLoading || reverseMutation.isPending}>
                {gpsLoading ? (<><span className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" />Localisation…</>) : "📍 Ma position GPS"}
              </Button>
              <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => setMapOpen(true)}>
                🗺 Choisir sur la carte
              </Button>
            </div>

            {/* Message de sync */}
            {syncStatus !== "idle" && syncMessage && (
              <div className={["rounded-xl border px-3 py-2 text-xs font-medium",
                syncStatus === "loading" ? "border-border/60 bg-muted/40 text-muted-foreground" :
                syncStatus === "ok" ? "border-emerald-200 bg-emerald-50/80 text-emerald-700" :
                syncStatus === "mismatch" ? "border-amber-200 bg-amber-50/80 text-amber-700" :
                "border-rose-200 bg-rose-50/70 text-rose-700"].join(" ")}>
                {syncStatus === "loading" && <span className="mr-1.5 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" />}
                {syncMessage}
              </div>
            )}

            {gpsError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-2 text-xs text-rose-700">{gpsError}</div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Cette adresse ne sera pas sauvegardée dans votre profil.{" "}
            <Link to="/profile/addresses" className="font-semibold text-primary hover:underline underline-offset-2">Enregistrer une adresse permanente</Link>
          </p>
        </div>
      )}

      {/* Modal carte */}
      <AddressMapModal
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        gouvernorat={gouvernoratId}
        delegation={delegation}
        latitude={latitude}
        longitude={longitude}
        onChange={(lat, lng) => { handleMapChange(lat, lng); setMapOpen(false); }}
      />
    </div>
  );
}

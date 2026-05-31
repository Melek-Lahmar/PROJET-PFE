// src/features/checkout/components/DeliveryAddressSelector.tsx
//
// Mode "saved"  → adresses enregistrées (cartes cliquables)
// Mode "temp"   → gouvernorat SELECT + délégation SELECT + GPS + carte + sync
//
// CORRECTIONS :
//  - reverseMutation.onSuccess : applique maintenant gov+delegation depuis GPS
//    (avant : comparait seulement et affichait un warning sans rien changer)
//  - onChange gouvernorat : efface lat/lng si GPS présent (coords devenues invalides)
//  - onChange délégation  : idem

import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";

import { useAddresses } from "../../addresses/hooks/useAddresses";
import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { AddressMapModal } from "../../auth/components/AddressMapModal";
import { getDelegations, getDepotCoverage } from "../../geo/api/geoApi";
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
  address: string;
  city: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
  setAddress: (v: string) => void;
  setCity: (v: string) => void;
  setPostalCode: (v: string) => void;
  setLatitude: (v: number | null) => void;
  setLongitude: (v: number | null) => void;
  onTouched: (f: "address" | "city" | "postalCode" | "latitude" | "longitude") => void;
  onCoverageBlocked?: (blocked: boolean) => void;
  onValidityChange?: (valid: boolean) => void;
};

type SyncStatus = "idle" | "loading" | "ok" | "mismatch" | "error";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SELECT_CLASS =
  "h-11 w-full rounded-2xl border border-border bg-[hsl(var(--input))] px-4 text-sm text-card-foreground outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10 disabled:opacity-50";

function RadioDot({ checked }: { checked: boolean }) {
  return (
    <span
      className={[
        "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
        checked ? "border-primary" : "border-muted-foreground/40",
      ].join(" ")}
    >
      {checked && <span className="h-2 w-2 rounded-full bg-primary" />}
    </span>
  );
}

function buildSavedLabel(a: ClientAddress) {
  return [a.adresse, a.ville, a.codePostal].filter(Boolean).join(" · ");
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function DeliveryAddressSelector({
  address: _address,
  city: _city,
  postalCode: _postalCode,
  latitude,
  longitude,
  setAddress,
  setCity,
  setPostalCode,
  setLatitude,
  setLongitude,
  onTouched,
  onCoverageBlocked,
  onValidityChange,
}: Props) {
  const { data: savedAddresses = [], isPending: addrPending } = useAddresses();

  const [mode, setMode] = useState<"saved" | "temp">("saved");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Adresse temporaire — état local
  const [gouvernoratId, setGouvernoratId] = useState<number>(0);
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
    enabled: gouvernoratId > 0,
    staleTime: 5 * 60_000,
  });
  const delegations = delegQuery.data ?? [];

  // For saved mode: resolve gouvernorat ID from the selected address gouvernorat string
  const selectedAddress = useMemo(
    () => savedAddresses.find((a) => a.id === selectedId),
    [savedAddresses, selectedId]
  );
  const savedGouvernoratId = useMemo(() => {
    if (!selectedAddress?.gouvernorat) return null;
    const name = selectedAddress.gouvernorat.toLowerCase();
    const idx = TUNISIA_GOUVERNORATS.findIndex((n) => n.toLowerCase() === name);
    return idx >= 0 ? idx : null;
  }, [selectedAddress]);

  const coverageGouvernoratId = mode === "temp" ? gouvernoratId : savedGouvernoratId;

  const coverageQuery = useQuery({
    queryKey: ["depot-coverage", coverageGouvernoratId],
    queryFn: () => getDepotCoverage(coverageGouvernoratId!),
    enabled: coverageGouvernoratId !== null && coverageGouvernoratId >= 0,
    staleTime: 5 * 60_000,
  });
  const coverage = coverageQuery.data;
  const noCoverage = coverage && !coverage.hasCoverage;

  useEffect(() => {
    onCoverageBlocked?.(!!noCoverage);
  }, [noCoverage, onCoverageBlocked]);

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
    if (addrPending || savedAddresses.length === 0) {
      setMode("temp");
      return;
    }
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

  // ── FIX : Efface le GPS quand l'user change la zone manuellement ──────────
  // Les coordonnées ne correspondent plus à la nouvelle sélection.
  function clearGpsIfPresent() {
    if (latitude !== null || longitude !== null) {
      setLatitude(null);
      setLongitude(null);
      onTouched("latitude");
      onTouched("longitude");
    }
  }

  function handleModeChange(next: "saved" | "temp") {
    setMode(next);
    setSyncStatus("idle");
    setSyncMessage("");
    setGpsError(null);
    if (next === "saved" && savedAddresses.length > 0) {
      const a =
        savedAddresses.find((x) => x.id === selectedId) ??
        savedAddresses.find((x) => x.isDefault) ??
        savedAddresses[0];
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

      // Coordonnées GPS → parent
      setLatitude(roundCoordinate(lat));
      setLongitude(roundCoordinate(lng));
      onTouched("latitude");
      onTouched("longitude");

      // Remplissage automatique de l'adresse texte
      const addr = buildAddressFromReverse(result);
      const cp = extractPostalCode(result);
      if (addr) { setAdresseText(addr); setAddress(addr); onTouched("address"); }
      if (cp) { setCodePostalLocal(cp); setPostalCode(cp); onTouched("postalCode"); }

      // Résolution gouvernorat + délégation depuis le reverse geocode
      const resolvedGovId = resolveGouvernoratIdFromReverse(result);

      let delegPool = delegations;
      if (resolvedGovId !== null && resolvedGovId !== gouvernoratId) {
        try { delegPool = await getDelegations(resolvedGovId); } catch { /* ignore */ }
      }
      const resolvedDeleg = resolveDelegationFromReverse(result, delegPool);

      // ── FIX PRINCIPAL ────────────────────────────────────────────────────
      // AVANT : comparait seulement et affichait ⚠️ sans rien écrire dans les states
      // APRÈS : applique toujours le résultat GPS (identique à AddressForm.tsx)
      if (resolvedGovId !== null) {
        setGouvernoratId(resolvedGovId);
      }
      if (resolvedDeleg) {
        setDelegation(resolvedDeleg);
      } else if (resolvedGovId !== null && resolvedGovId !== gouvernoratId) {
        // Gouvernorat changé par GPS mais délégation non détectée → reset
        setDelegation("");
      }

      const appliedGovName = TUNISIA_GOUVERNORATS[resolvedGovId ?? gouvernoratId] ?? "";
      setSyncStatus("ok");
      setSyncMessage(
        `✅ GPS appliqué · ${appliedGovName}${
          resolvedDeleg ? ` · ${resolvedDeleg}` : " · sélectionnez une délégation"
        }`,
      );
    },
    onError: () => {
      setSyncStatus("error");
      setSyncMessage("Impossible d'analyser la position. Vérifiez manuellement.");
    },
  });

  // ── GPS ────────────────────────────────────────────────────────────────────
  function handleGps() {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError("Géolocalisation non supportée.");
      return;
    }
    const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    if (!window.isSecureContext && !isLocal) {
      setGpsError("HTTPS requis pour la géolocalisation.");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        reverseMutation.mutate({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === err.PERMISSION_DENIED)
          setGpsError("Permission refusée. Autorisez la localisation dans le navigateur.");
        else if (err.code === err.POSITION_UNAVAILABLE)
          setGpsError("Position indisponible.");
        else
          setGpsError("Impossible de récupérer la position.");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  // ── Map pick ───────────────────────────────────────────────────────────────
  function handleMapChange(lat: number, lng: number) {
    reverseMutation.mutate({ lat, lng });
  }

  const hasGps = typeof latitude === "number" && typeof longitude === "number";
  void getCenterForTunisia(gouvernoratId);

  // ── Validité globale : tous les champs obligatoires remplis ─────────────────
  const isValid = useMemo(() => {
    if (noCoverage) return false;
    if (mode === "saved") {
      return Boolean(selectedAddress?.adresse?.trim());
    }
    return (
      delegation.trim().length > 0 &&
      adresseText.trim().length > 0
    );
  }, [mode, selectedAddress, delegation, adresseText, noCoverage]);

  useEffect(() => {
    onValidityChange?.(isValid);
  }, [isValid, onValidityChange]);

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
            <button
              key={m}
              type="button"
              disabled={disabled}
              onClick={() => handleModeChange(m)}
              className={[
                "flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all duration-200",
                mode === m
                  ? "border-primary bg-primary/5 ring-2 ring-primary/15 shadow-sm"
                  : "border-border/60 bg-[hsl(var(--input))] hover:border-primary/30",
                disabled ? "cursor-not-allowed opacity-40" : "",
              ].join(" ")}
            >
              <RadioDot checked={mode === m} />
              <div>
                <div className="text-sm font-bold text-card-foreground">
                  {isSaved ? "Mes adresses enregistrées" : "Adresse temporaire"}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {isSaved
                    ? addrPending
                      ? "Chargement…"
                      : savedAddresses.length === 0
                        ? "Aucune adresse sauvegardée"
                        : `${savedAddresses.length} adresse${savedAddresses.length > 1 ? "s" : ""}`
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
            <div className="flex h-11 items-center rounded-2xl border border-border bg-[hsl(var(--input))] px-4 text-sm text-muted-foreground">
              Chargement…
            </div>
          ) : savedAddresses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Aucune adresse enregistrée.{" "}
              <Link
                to="/profile/addresses"
                className="font-semibold text-primary hover:underline underline-offset-2"
              >
                Ajouter une adresse
              </Link>
            </div>
          ) : (
            <div className="grid gap-2">
              {savedAddresses.map((a) => {
                const sel = a.id === selectedId;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => applyAddress(a)}
                    className={[
                      "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all",
                      sel
                        ? "border-primary/60 bg-primary/5 ring-2 ring-primary/15 shadow-sm"
                        : "border-border bg-card hover:border-primary/30 hover:bg-accent/30",
                    ].join(" ")}
                  >
                    <RadioDot checked={sel} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-card-foreground">{a.label}</span>
                        {a.isDefault && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                            Par défaut
                          </span>
                        )}
                        {a.latitude && a.longitude && (
                          <span className="rounded-full border border-success/20 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                            📍 GPS
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-card-foreground">{buildSavedLabel(a)}</p>
                      {(a.delegation || a.gouvernorat) && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {[a.delegation, a.gouvernorat].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {savedAddresses.length > 0 && (
            <div className="text-right pt-1">
              <Link
                to="/profile/addresses"
                className="text-xs font-semibold text-primary hover:underline underline-offset-2"
              >
                Gérer mes adresses →
              </Link>
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
              Gouvernorat <span className="text-danger">*</span>
            </label>
            <select
              className={SELECT_CLASS}
              value={gouvernoratId}
              onChange={(e) => {
                setGouvernoratId(Number(e.target.value));
                setSyncStatus("idle");
                setSyncMessage("");
                // Reset complet : gouvernorat changé → adresse/CP/délégation/GPS invalides
                setDelegation("");
                setAdresseText("");
                setAddress("");
                setCodePostalLocal("");
                setPostalCode("");
                onTouched("address");
                onTouched("postalCode");
                clearGpsIfPresent();
              }}
            >
              {TUNISIA_GOUVERNORATS.map((name, idx) => (
                <option key={idx} value={idx}>{name}</option>
              ))}
            </select>
          </div>

          {/* Délégation */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-card-foreground">
              Délégation <span className="text-danger">*</span>
            </label>
            {delegQuery.isLoading ? (
              <div className="flex h-11 items-center rounded-2xl border border-border bg-[hsl(var(--input))] px-4 text-sm text-muted-foreground">
                Chargement…
              </div>
            ) : (
              <select
                className={SELECT_CLASS}
                value={delegation}
                onChange={(e) => {
                  setDelegation(e.target.value);
                  setSyncStatus("idle");
                  setSyncMessage("");
                  // FIX : délégation changée manuellement → coordonnées GPS invalides
                  clearGpsIfPresent();
                }}
              >
                <option value="">— Choisir une délégation —</option>
                {delegations.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            )}
          </div>

          {/* Adresse texte */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-card-foreground">
              Adresse <span className="text-danger">*</span>
            </label>
            <Input
              value={adresseText}
              onChange={(e) => { setAdresseText(e.target.value); setAddress(e.target.value); onTouched("address"); }}
              placeholder="Ex: 12 Rue Habib Bourguiba, Résidence A"
            />
          </div>

          {/* Code postal */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-card-foreground">Code postal</label>
            <Input
              value={codePostalLocal}
              onChange={(e) => { setCodePostalLocal(e.target.value); setPostalCode(e.target.value); onTouched("postalCode"); }}
              placeholder="Ex: 1000"
            />
          </div>

          {/* ── GPS + Carte ─────────────────────────────────────────────────── */}
          <div className="space-y-3 border-t border-border/60 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-card-foreground">Localisation GPS</p>
                <p className="text-xs text-muted-foreground">
                  Optionnelle · améliore la précision de livraison
                </p>
              </div>

              {hasGps && (
                <div className="flex items-center gap-1.5 rounded-xl border border-success/20 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success">
                  <span>📍</span>
                  <span>{latitude!.toFixed(4)}, {longitude!.toFixed(4)}</span>
                  <button
                    type="button"
                    title="Effacer les coordonnées"
                    onClick={() => {
                      setLatitude(null);
                      setLongitude(null);
                      setSyncStatus("idle");
                      setSyncMessage("");
                      onTouched("latitude");
                      onTouched("longitude");
                    }}
                    className="ml-1 text-success/70 transition-colors hover:text-danger"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={handleGps}
                disabled={gpsLoading || reverseMutation.isPending}
              >
                {gpsLoading ? (
                  <>
                    <span className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" />
                    Localisation…
                  </>
                ) : (
                  "📍 Ma position GPS"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => setMapOpen(true)}
              >
                🗺 Choisir sur la carte
              </Button>
            </div>

            {/* Message de sync */}
            {syncStatus !== "idle" && syncMessage && (
              <div
                className={[
                  "rounded-xl border px-3 py-2 text-xs font-medium",
                  syncStatus === "loading"
                    ? "border-border/60 bg-muted/40 text-muted-foreground"
                    : syncStatus === "ok"
                      ? "border-success/25 bg-success/10 text-success"
                      : syncStatus === "mismatch"
                        ? "border-amber-200 bg-amber-50/80 text-amber-700"
                        : "border-danger/25 bg-danger/10 text-danger",
                ].join(" ")}
              >
                {syncStatus === "loading" && (
                  <span className="mr-1.5 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" />
                )}
                {syncMessage}
              </div>
            )}

            {gpsError && (
              <div className="rounded-xl border border-danger/25 bg-danger/10 px-3 py-2 text-xs text-danger">
                {gpsError}
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Cette adresse ne sera pas sauvegardée dans votre profil.{" "}
            <Link
              to="/profile/addresses"
              className="font-semibold text-primary hover:underline underline-offset-2"
            >
              Enregistrer une adresse permanente
            </Link>
          </p>
        </div>
      )}

      {/* Bannière pas de couverture dépôt */}
      {noCoverage && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm">
          <span className="mt-0.5 text-xl">⚠️</span>
          <div>
            <div className="font-bold text-amber-800">
              Service non disponible dans {coverage.gouvernorat}
            </div>
            <div className="mt-0.5 text-amber-700">
              Nous n&apos;avons pas encore de dépôt dans votre gouvernorat ({coverage.gouvernorat}).
              Nous travaillons à étendre notre couverture prochainement.
              Veuillez choisir un autre gouvernorat ou passer en retrait dépôt.
            </div>
          </div>
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

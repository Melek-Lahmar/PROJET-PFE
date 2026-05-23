// src/features/addresses/components/AddressForm.tsx
//
// CORRECTION :
//  - onChange gouvernorat : efface lat/lng si GPS présent (coords devenues invalides)
//  - onChange délégation  : idem
//  - applyReverseGeocode était déjà correct (applique gov+deleg depuis GPS)

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { useToast } from "../../../shared/components/premium/Toast";
import { AddressMapField, type AddressMapChangeReason } from "../../auth/components/AddressMapField";
import { getDelegations } from "../../geo/api/geoApi";
import { reverseGeocodeNominatim } from "../../geo/api/nominatimApi";
import {
  TUNISIA_GOUVERNORATS,
  buildAddressFromReverse,
  extractPostalCode,
  resolveDelegationFromReverse,
  resolveGouvernoratIdFromReverse,
  roundCoordinate,
} from "../../geo/utils/tunisiaLocationSync";
import type { ClientAddress, ClientAddressUpsert } from "../types";

type Props = {
  initial?: Partial<ClientAddress>;
  submitLabel?: string;
  onCancel?: () => void;
  onSubmit: (payload: ClientAddressUpsert) => void;
  loading?: boolean;
};

const LABEL_PRESETS = ["Maison", "Bureau", "Famille", "Autre"];

function gouvernoratIdFromName(name?: string | null): number | null {
  if (!name) return null;
  const norm = name.replace(/\s/g, "").toLowerCase();
  const idx = TUNISIA_GOUVERNORATS.findIndex(
    (g) => g.toLowerCase() === norm || g.toLowerCase().replace(/\s/g, "") === norm,
  );
  return idx >= 0 ? idx : null;
}

function gouvernoratNameFromId(id: number | null): string {
  if (id === null || id < 0 || id >= TUNISIA_GOUVERNORATS.length) return "";
  return TUNISIA_GOUVERNORATS[id];
}

export function AddressForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Enregistrer",
  loading = false,
}: Props) {
  const toast = useToast();

  // États
  const [label, setLabel] = useState(initial?.label ?? "Maison");
  const [gouvernoratId, setGouvernoratId] = useState<number | null>(
    gouvernoratIdFromName(initial?.gouvernorat),
  );
  const [delegation, setDelegation] = useState<string>(initial?.delegation ?? "");
  const [adresse, setAdresse] = useState(initial?.adresse ?? "");
  const [ville, setVille] = useState(initial?.ville ?? "");
  const [codePostal, setCodePostal] = useState(initial?.codePostal ?? "");
  const [latitude, setLatitude] = useState<number | null>(initial?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(initial?.longitude ?? null);
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);

  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [reverseBusy, setReverseBusy] = useState(false);
  const lastReverseKey = useRef("");

  // Délégations dynamiques selon gouvernorat
  const delegationsQuery = useQuery({
    queryKey: ["delegations", gouvernoratId],
    queryFn: () => getDelegations(gouvernoratId as number),
    enabled: gouvernoratId !== null,
    staleTime: 10 * 60_000,
  });

  // Si la délégation actuelle n'est plus dans la liste après changement de gouvernorat → reset
  useEffect(() => {
    if (!delegation) return;
    const list = delegationsQuery.data ?? [];
    if (list.length > 0 && !list.includes(delegation)) {
      setDelegation("");
    }
  }, [delegationsQuery.data, delegation]);

  // Bouton "Me localiser" — Geolocation API + reverse Nominatim
  const handleLocateMe = async () => {
    setLocError(null);

    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    if (!window.isSecureContext && !isLocalhost) {
      setLocError("La géolocalisation nécessite HTTPS ou localhost.");
      return;
    }
    if (!navigator.geolocation) {
      setLocError("Ce navigateur ne supporte pas la géolocalisation.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = roundCoordinate(pos.coords.latitude);
          const lng = roundCoordinate(pos.coords.longitude);
          setLatitude(lat);
          setLongitude(lng);
          await applyReverseGeocode(lat, lng);
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED)
          setLocError("Permission refusée. Autorisez la localisation dans le navigateur.");
        else if (err.code === err.POSITION_UNAVAILABLE)
          setLocError("Position indisponible. Activez le GPS ou réseau.");
        else if (err.code === err.TIMEOUT)
          setLocError("La localisation a expiré. Réessayez.");
        else
          setLocError("Échec de la localisation.");
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  };

  // Reverse geocoding — applique gov+délégation depuis les coordonnées (déjà correct)
  const applyReverseGeocode = async (lat: number, lng: number) => {
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    if (lastReverseKey.current === key) return;
    lastReverseKey.current = key;
    try {
      setReverseBusy(true);
      const reverse = await reverseGeocodeNominatim(lat, lng);

      // Applique le gouvernorat résolu (correct)
      const govId = resolveGouvernoratIdFromReverse(reverse);
      if (govId !== null) setGouvernoratId(govId);

      // Applique la délégation résolue (correct)
      const delegList =
        govId !== null ? await getDelegations(govId).catch(() => []) : [];
      const delegResolved = resolveDelegationFromReverse(reverse, delegList);
      if (delegResolved) setDelegation(delegResolved);

      const addr = buildAddressFromReverse(reverse);
      if (addr) setAdresse(addr);
      const cp = extractPostalCode(reverse);
      if (cp) setCodePostal(cp);

      const cityVal =
        reverse.address?.city ??
        reverse.address?.town ??
        reverse.address?.village ??
        reverse.address?.municipality;
      if (cityVal) setVille(cityVal);

      toast.info("Adresse localisée", "Vérifiez les champs avant d'enregistrer.");
    } catch {
      toast.warning("Géocodage indisponible", "Renseignez les champs manuellement.");
    } finally {
      setReverseBusy(false);
    }
  };

  const handleMapChange = async (lat: number, lng: number, _reason: AddressMapChangeReason) => {
    setLatitude(lat);
    setLongitude(lng);
    await applyReverseGeocode(lat, lng);
  };

  const govLabel = useMemo(() => gouvernoratNameFromId(gouvernoratId), [gouvernoratId]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!adresse.trim()) { toast.error("Adresse requise"); return; }
    if (!govLabel) { toast.error("Gouvernorat requis"); return; }
    if (!ville.trim()) { toast.error("Ville requise"); return; }

    onSubmit({
      label: label.trim() || "Adresse",
      adresse: adresse.trim(),
      gouvernorat: govLabel,
      delegation: delegation?.trim() || undefined,
      ville: ville.trim(),
      codePostal: codePostal?.trim() || undefined,
      latitude,
      longitude,
      isDefault,
    });
  };

  const formIncomplete = !adresse.trim() || !govLabel || !ville.trim();

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Section 1 — Identité de l'adresse */}
      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <header className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Identité
          </h3>
          <span className="text-[11px] text-muted-foreground">3 adresses max par compte</span>
        </header>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold text-muted-foreground">Libellé</label>
            <div className="flex gap-2">
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Maison, Bureau..."
                className="flex-1"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {LABEL_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setLabel(p)}
                  className={[
                    "rounded-full px-2.5 py-1 text-[11px] font-bold transition",
                    label === p
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-card text-muted-foreground hover:border-primary/30",
                  ].join(" ")}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <label className="flex h-full items-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            <span className="text-sm font-semibold">Définir comme adresse par défaut</span>
          </label>
        </div>
      </section>

      {/* Section 2 — Géolocalisation rapide */}
      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <header className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Géolocalisation rapide
          </h3>
          {(reverseBusy || delegationsQuery.isFetching) && (
            <span className="text-[11px] text-primary">Synchronisation...</span>
          )}
        </header>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="primary"
            onClick={handleLocateMe}
            disabled={locating}
            className="gap-2"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3 M12 19v3 M2 12h3 M19 12h3" />
            </svg>
            {locating ? "Localisation en cours..." : "Me localiser maintenant"}
          </Button>
          {latitude !== null && longitude !== null && (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-100">
              📍 GPS détecté
            </span>
          )}
        </div>

        {locError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {locError}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-border">
          <AddressMapField
            gouvernoratId={gouvernoratId}
            delegation={delegation}
            latitude={latitude}
            longitude={longitude}
            onChange={(lat, lng, reason) => void handleMapChange(lat, lng, reason)}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Cliquez/glissez le marqueur sur la carte pour ajuster manuellement.
          L'adresse texte se met à jour automatiquement.
        </p>
      </section>

      {/* Section 3 — Adresse détaillée */}
      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <header className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Adresse détaillée
          </h3>
          <span className="text-[11px] text-muted-foreground">Champs requis : *</span>
        </header>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-bold text-muted-foreground">
              Adresse complète *
            </label>
            <textarea
              value={adresse}
              onChange={(e) => setAdresse(e.target.value)}
              rows={3}
              required
              placeholder="Rue, immeuble, étage, repère..."
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Gouvernorat */}
          <div>
            <label className="mb-1 block text-xs font-bold text-muted-foreground">
              Gouvernorat *
            </label>
            <select
              value={gouvernoratId !== null ? String(gouvernoratId) : ""}
              onChange={(e) => {
                const v = e.target.value;
                setGouvernoratId(v === "" ? null : Number(v));
                // FIX : gouvernorat changé manuellement → coordonnées GPS invalides
                if (latitude !== null || longitude !== null) {
                  setLatitude(null);
                  setLongitude(null);
                }
              }}
              className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
              required
            >
              <option value="">— Sélectionner —</option>
              {TUNISIA_GOUVERNORATS.map((g, idx) => (
                <option key={g} value={idx}>{g}</option>
              ))}
            </select>
          </div>

          {/* Délégation */}
          <div>
            <label className="mb-1 block text-xs font-bold text-muted-foreground">
              Délégation
            </label>
            <select
              value={delegation}
              onChange={(e) => {
                setDelegation(e.target.value);
                // FIX : délégation changée manuellement → coordonnées GPS invalides
                if (latitude !== null || longitude !== null) {
                  setLatitude(null);
                  setLongitude(null);
                }
              }}
              disabled={gouvernoratId === null || delegationsQuery.isPending}
              className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
            >
              <option value="">
                {gouvernoratId === null
                  ? "Sélectionnez un gouvernorat"
                  : delegationsQuery.isPending
                    ? "Chargement..."
                    : "— Sélectionner —"}
              </option>
              {(delegationsQuery.data ?? []).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Ville */}
          <div>
            <label className="mb-1 block text-xs font-bold text-muted-foreground">Ville *</label>
            <Input
              value={ville}
              onChange={(e) => setVille(e.target.value)}
              required
              placeholder="ex: La Marsa"
            />
          </div>

          {/* Code postal */}
          <div>
            <label className="mb-1 block text-xs font-bold text-muted-foreground">
              Code postal
            </label>
            <Input
              value={codePostal ?? ""}
              onChange={(e) => setCodePostal(e.target.value)}
              maxLength={10}
              placeholder="ex: 2070"
            />
          </div>

          {/* Coordonnées GPS (readonly, affichage informatif) */}
          {latitude !== null && longitude !== null && (
            <>
              <div>
                <label className="mb-1 block text-xs font-bold text-muted-foreground">
                  Latitude
                </label>
                <Input value={latitude.toFixed(6)} readOnly className="bg-muted/30" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-muted-foreground">
                  Longitude
                </label>
                <Input value={longitude.toFixed(6)} readOnly className="bg-muted/30" />
              </div>
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-muted/30 p-3">
        <div className="text-xs text-muted-foreground">
          {formIncomplete
            ? "Complétez les champs requis pour activer le bouton."
            : "Formulaire prêt."}
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Annuler
            </Button>
          )}
          <Button type="submit" disabled={loading || formIncomplete} variant="primary">
            {loading ? "Enregistrement..." : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}

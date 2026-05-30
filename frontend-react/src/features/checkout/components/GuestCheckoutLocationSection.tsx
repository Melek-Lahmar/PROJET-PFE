import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import type { AddressMapChangeReason } from "../../auth/components/AddressMapField";
import { MapboxSearchMap } from "../../map/components/MapboxSearchMap";
import { reverseGeocodeNominatim } from "../../geo/api/nominatimApi";
import { getDepotCoverage } from "../../geo/api/geoApi";
import {
  resolveGouvernoratIdFromReverse,
  resolveDelegationFromReverse,
  TUNISIA_GOUVERNORATS,
  buildAddressFromReverse,
  extractPostalCode,
} from "../../geo/utils/tunisiaLocationSync";
import { getDelegations } from "../../geo/api/geoApi";

interface GuestCheckoutLocationSectionProps {
  gouvernorat: number;
  setGouvernorat: (value: number) => void;
  delegation: string;
  setDelegation: (value: string) => void;
  address: string;
  setAddress: (value: string) => void;
  postalCode: string;
  setPostalCode: (value: string) => void;
  latitude: number | null;
  setLatitude: (value: number | null) => void;
  longitude: number | null;
  setLongitude: (value: number | null) => void;
  gouvernorats: Array<{ id: number; name: string }>;
  delegations: string[];
  delegationsLoading?: boolean;
  // erreurs de validation passees par le parent
  errors?: { gouvernorat?: string; delegation?: string; address?: string };
}

const roundCoordinate = (coord: number) => Math.round(coord * 1000000) / 1000000;

export function GuestCheckoutLocationSection({
  gouvernorat,
  setGouvernorat,
  delegation,
  setDelegation,
  address,
  setAddress,
  postalCode,
  setPostalCode,
  latitude,
  setLatitude,
  longitude,
  setLongitude,
  gouvernorats,
  delegations,
  delegationsLoading: _delegationsLoading,
  errors,
}: GuestCheckoutLocationSectionProps) {
  const [mapSyncMsg, setMapSyncMsg] = useState<string>("");
  const [mapSource, setMapSource] = useState<AddressMapChangeReason | null>(null);

  // Verification couverture depot pour ce gouvernorat
  const coverageQuery = useQuery({
    queryKey: ["depot-coverage", gouvernorat],
    queryFn: () => getDepotCoverage(gouvernorat),
    enabled: gouvernorat > 0,
    staleTime: 5 * 60_000,
  });
  const coverage = coverageQuery.data;
  const noCoverage = coverage && !coverage.hasCoverage;

  async function handleMapPick(lat: number, lng: number) {
    const latR = roundCoordinate(lat);
    const lngR = roundCoordinate(lng);
    setLatitude(latR);
    setLongitude(lngR);
    setMapSyncMsg("Analyse de la position...");

    try {
      const result = await reverseGeocodeNominatim(latR, lngR);

      const govId = resolveGouvernoratIdFromReverse(result);
      if (govId !== null) {
        setGouvernorat(govId);
      }

      let delegPool: string[];
      if (govId !== null && govId !== gouvernorat) {
        delegPool = await getDelegations(govId).catch(() => delegations);
      } else {
        delegPool = delegations;
      }

      const delegResolved = resolveDelegationFromReverse(result, delegPool);
      if (delegResolved) setDelegation(delegResolved);

      const addr = buildAddressFromReverse(result);
      if (addr) setAddress(addr);

      const cp = extractPostalCode(result);
      if (cp) setPostalCode(cp);

      const govLabel = govId !== null ? (TUNISIA_GOUVERNORATS[govId] ?? "") : "";
      setMapSyncMsg(govLabel ? `Position detectee : ${govLabel}` : "Position enregistree");
    } catch {
      setMapSyncMsg("Position enregistree — verifiez le gouvernorat.");
    }
  }

  const handleMapboxPick = useCallback((lat: number, lng: number) => {
    setMapSource("map_click");
    void handleMapPick(lat, lng);
  }, []);

  // Règle d'interdépendance :
  // Gouvernorat manuel → reset délégation + position GPS (cohérence obligatoire)
  const handleGouvernoratChange = (value: string) => {
    setGouvernorat(value ? Number(value) : 0);
    setDelegation("");
    setLatitude(null);
    setLongitude(null);
    setMapSource(null);
    setMapSyncMsg("");
  };

  // Délégation manuelle → reset position GPS uniquement (gouvernorat conservé)
  const handleDelegationChange = (value: string) => {
    setDelegation(value);
    // Si la position avait été fixée par carte/GPS, on la réinitialise :
    // l'utilisateur a recentré sa zone manuellement → forcer une nouvelle épingle
    if (mapSource !== null) {
      setLatitude(null);
      setLongitude(null);
      setMapSource(null);
      setMapSyncMsg("Zone modifiée manuellement — épinglez à nouveau votre position.");
    }
  };

  const handleClearLocation = () => {
    setLatitude(null);
    setLongitude(null);
    setMapSource(null);
    setMapSyncMsg("");
  };

  const gouvernoratName = useMemo(
    () => gouvernorats.find((g) => g.id === gouvernorat)?.name ?? "",
    [gouvernorat, gouvernorats]
  );

  const fieldClass = (hasError?: string) =>
    `w-full px-3 py-2.5 rounded-xl border ${
      hasError ? "border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-200" : "border-border/70 bg-background focus:border-primary/50 focus:ring-primary/20"
    } text-foreground transition focus:ring-2 outline-none`;

  return (
    <div className="space-y-5">

      {/* Gouvernorat + Delegation */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-card-foreground">
            Gouvernorat <span className="text-red-500">*</span>
          </label>
          <select
            value={gouvernorat || ""}
            onChange={(e) => handleGouvernoratChange(e.target.value)}
            className={fieldClass(errors?.gouvernorat)}
          >
            <option value="">Selectionnez un gouvernorat</option>
            {gouvernorats.map((gov) => (
              <option key={gov.id} value={gov.id}>{gov.name}</option>
            ))}
          </select>
          {errors?.gouvernorat && (
            <p className="text-xs font-medium text-red-500">{errors.gouvernorat}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-card-foreground">
            Delegation <span className="text-red-500">*</span>
          </label>
          <select
            value={delegation}
            onChange={(e) => handleDelegationChange(e.target.value)}
            disabled={delegations.length === 0}
            className={fieldClass(errors?.delegation)}
          >
            <option value="">Selectionnez une delegation</option>
            {delegations.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          {errors?.delegation && (
            <p className="text-xs font-medium text-red-500">{errors.delegation}</p>
          )}
        </div>
      </div>

      {/* Banniere : pas de couverture depot */}
      {noCoverage && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm">
          <span className="mt-0.5 text-xl">⚠️</span>
          <div>
            <div className="font-bold text-amber-800">
              Service non disponible dans {coverage.gouvernorat}
            </div>
            <div className="mt-0.5 text-amber-700">
              Nous n'avons pas encore de depot dans votre gouvernorat ({coverage.gouvernorat}).
              Nous travaillons a etendre notre couverture prochainement.
              Vous pouvez choisir un autre gouvernorat ou passer en retrait depot.
            </div>
          </div>
        </div>
      )}

      {/* Adresse */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-card-foreground">
          Adresse <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Ex: 12 Rue de la Republique, Appartement 3..."
          className={fieldClass(errors?.address)}
        />
        {errors?.address && (
          <p className="text-xs font-medium text-red-500">{errors.address}</p>
        )}
      </div>

      <div>
        <label className="text-sm font-semibold text-card-foreground">Code postal</label>
        <input
          type="text"
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          placeholder="Ex: 1000"
          className="mt-1.5 w-full rounded-xl border border-border/70 bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Carte Mapbox avec recherche intégrée */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-card-foreground">
            Position GPS / Carte
          </label>
          {latitude !== null && longitude !== null && (
            <button
              type="button"
              onClick={handleClearLocation}
              className="text-xs font-semibold text-red-500 transition hover:text-red-700"
            >
              Effacer la position
            </button>
          )}
        </div>

        {/* Message sync */}
        {mapSyncMsg && (
          <div className={`rounded-xl border px-3 py-2 text-xs font-medium ${
            mapSyncMsg.startsWith("Position detectee")
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-border/40 bg-muted/40 text-muted-foreground"
          }`}>
            {mapSource === "gps" ? "📍 GPS — " : mapSource ? "🗺 Carte — " : ""}
            {mapSyncMsg}
          </div>
        )}

        <MapboxSearchMap
          latitude={latitude}
          longitude={longitude}
          onPick={handleMapboxPick}
          height="320px"
          placeholder="Rechercher une adresse, délégation, ville…"
        />

        {latitude !== null && longitude !== null && gouvernoratName && (
          <p className="text-xs font-semibold text-green-600">
            Gouvernorat détecté : {gouvernoratName}
          </p>
        )}
      </div>
    </div>
  );
}

export default GuestCheckoutLocationSection;

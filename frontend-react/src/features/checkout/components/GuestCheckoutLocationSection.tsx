import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker } from "react-leaflet";

import {
  createMapPin,
  type AddressMapChangeReason,
} from "../../auth/components/AddressMapField";
import { AddressMapModal } from "../../auth/components/AddressMapModal";
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

const DEFAULT_TUNISIA_LAT = 35.8989;
const DEFAULT_TUNISIA_LNG = 9.537;
const DEFAULT_ZOOM = 6;

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
  const [mapOpen, setMapOpen] = useState(false);
  const [mapSyncMsg, setMapSyncMsg] = useState<string>("");
  const [mapSource, setMapSource] = useState<AddressMapChangeReason | null>(null);
  const [locatingGps, setLocatingGps] = useState(false);

  const resolvedLatitude = latitude ?? DEFAULT_TUNISIA_LAT;
  const resolvedLongitude = longitude ?? DEFAULT_TUNISIA_LNG;

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

  const handleUseCurrentLocation = useCallback(async () => {
    setLocatingGps(true);
    setMapSyncMsg("");
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      );
      await handleMapPick(pos.coords.latitude, pos.coords.longitude);
      setMapSource("gps");
    } catch {
      setMapSyncMsg("Impossible d'acceder a votre position GPS.");
    } finally {
      setLocatingGps(false);
    }
  }, []);

  const handleGouvernoratChange = (value: string) => {
    setGouvernorat(value ? Number(value) : 0);
    setDelegation("");
    setLatitude(null);
    setLongitude(null);
    setMapSource(null);
    setMapSyncMsg("");
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
            onChange={(e) => setDelegation(e.target.value)}
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

      {/* Carte interactive */}
      <div className="overflow-hidden rounded-2xl border border-border/70 shadow-sm">
        {/* Header carte */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-muted/30 px-4 py-3">
          <span className="text-sm font-semibold text-card-foreground">
            Position GPS / Carte
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={locatingGps}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-card-foreground transition hover:bg-muted disabled:opacity-50"
            >
              {locatingGps ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                </svg>
              )}
              {locatingGps ? "Localisation..." : "Ma position GPS"}
            </button>

            <button
              type="button"
              onClick={() => setMapOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-card-foreground transition hover:bg-muted"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                <circle cx="12" cy="9" r="2.5"/>
              </svg>
              Epingler sur la carte
            </button>
          </div>
        </div>

        {/* Message sync */}
        {mapSyncMsg && (
          <div className={`border-b border-border/40 px-4 py-2 text-xs font-medium ${
            mapSyncMsg.startsWith("Position detectee") ? "bg-green-50 text-green-700" : "bg-muted/40 text-muted-foreground"
          }`}>
            {mapSource === "gps" ? "📍 GPS — " : mapSource ? "🗺 Carte — " : ""}
            {mapSyncMsg}
          </div>
        )}

        {/* Mini-carte preview */}
        <div className="h-64 bg-slate-50">
          <MapContainer
            center={[resolvedLatitude, resolvedLongitude]}
            zoom={latitude !== null ? 14 : DEFAULT_ZOOM}
            style={{ height: "100%", width: "100%" }}
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            {latitude !== null && longitude !== null && (
              <Marker
                position={[latitude, longitude]}
                draggable
                icon={createMapPin(mapSource || "map_drag")}
                eventHandlers={{
                  dragend: (e) => {
                    const ll = (e.target as { getLatLng: () => { lat: number; lng: number } }).getLatLng();
                    setMapSource("map_drag");
                    void handleMapPick(ll.lat, ll.lng);
                  },
                }}
              />
            )}
          </MapContainer>
        </div>

        {/* Footer carte — coordonnees + effacer */}
        {latitude !== null && longitude !== null && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
            <span>
              Lat <span className="font-semibold text-card-foreground">{latitude.toFixed(5)}</span>
              {" "}&bull;{" "}
              Lng <span className="font-semibold text-card-foreground">{longitude.toFixed(5)}</span>
              {gouvernoratName && (
                <span className="ml-3 font-semibold text-green-600">{gouvernoratName}</span>
              )}
            </span>
            <button
              type="button"
              onClick={handleClearLocation}
              className="font-semibold text-red-500 hover:text-red-700 transition"
            >
              Effacer
            </button>
          </div>
        )}
      </div>

      {/* Modal carte plein ecran */}
      <AddressMapModal
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        gouvernorat={gouvernorat}
        delegation={delegation}
        latitude={latitude}
        longitude={longitude}
        onChange={(lat, lng) => {
          setMapSource("map_click");
          void handleMapPick(lat, lng);
          setMapOpen(false);
        }}
      />
    </div>
  );
}

export default GuestCheckoutLocationSection;

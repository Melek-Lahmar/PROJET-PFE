import { useState, useCallback, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";

import type { GouvernoratItem } from "../../geo/types/geo";
import { AddressMapModal } from "../../auth/components/AddressMapModal";
import { reverseGeocodeNominatim } from "../../geo/api/nominatimApi";
import {
  resolveGouvernoratIdFromReverse,
  resolveDelegationFromReverse,
  getGovernoratCandidates,
  buildAddressFromReverse,
  extractPostalCode,
} from "../../geo/utils/tunisiaLocationSync";
import { getDelegations, getGouvernorats } from "../../geo/api/geoApi";
import { TUNISIA_GOUVERNORATS } from "../../geo/constants/tunisiaGouvernorats";

// ============================================================
// IMPORTS - Map & Geo Components
// ============================================================
export type AddressMapChangeReason = "gps" | "map_click" | "map_drag" | "map_move";

export function createMapPin(reason: AddressMapChangeReason) {
  const color = reason === "gps" ? "#2563eb" : reason === "map_click" ? "#7c3aed" : "#ef4444";
  return L.divIcon({
    className: "custom-map-pin",
    html: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${color}"/><circle cx="12" cy="9" r="2.5" fill="#fff"/></svg>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
  });
}

// ============================================================
// Types & Constants
// ============================================================
interface GuestCheckoutLocationSectionProps {
  gouvernorat: number | null;
  setGouvernorat: (value: number | null) => void;
  delegation: string | null;
  setDelegation: (value: string | null) => void;
  address: string;
  setAddress: (value: string) => void;
  postalCode: string;
  setPostalCode: (value: string) => void;
  latitude: number | null;
  setLatitude: (value: number | null) => void;
  longitude: number | null;
  setLongitude: (value: number | null) => void;
  gouvernorats: GouvernoratItem[];
  delegations: string[];
}

const roundCoordinate = (coord: number): number => {
  return Math.round(coord * 1000000) / 1000000;
};

const DEFAULT_TUNISIA_LAT = 35.8989;
const DEFAULT_TUNISIA_LNG = 9.537;
const DEFAULT_ZOOM = 6;

// ============================================================
// GuestCheckoutLocationSection Component
// ============================================================
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
}: GuestCheckoutLocationSectionProps) {
  // ────────────────────────────────────────────────────────
  // État - Map & Geolocation
  // ────────────────────────────────────────────────────────
  const [mapOpen, setMapOpen] = useState(false);
  const [mapSyncMsg, setMapSyncMsg] = useState<string>("");
  const [mapSource, setMapSource] = useState<AddressMapChangeReason | null>(null);
  const [locatingGps, setLocatingGps] = useState(false);

  // Safe values with type narrowing
  const resolvedLatitude = latitude ?? DEFAULT_TUNISIA_LAT;
  const resolvedLongitude = longitude ?? DEFAULT_TUNISIA_LNG;

  // ────────────────────────────────────────────────────────
  // Queries - Récupérer gouvernorats depuis API
  // ────────────────────────────────────────────────────────
  const govQuery = useQuery({
    queryKey: ["gouvernorats"],
    queryFn: getGouvernorats,
  });

  // ────────────────────────────────────────────────────────
  // Mutations
  // ────────────────────────────────────────────────────────
  const reverseMutation = useMutation({
    mutationFn: async () => {
      if (latitude === null || longitude === null) return null;
      return reverseGeocodeNominatim(latitude, longitude);
    },
  });

  // ────────────────────────────────────────────────────────
  // Functions - GPS Geolocation
  // ────────────────────────────────────────────────────────
  const handleUseCurrentLocation = useCallback(async () => {
    setLocatingGps(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
        });
      });

      const { latitude: lat, longitude: lng } = position.coords;
      await handleMapPick(lat, lng);
      setMapSource("gps");
    } catch (error) {
      setMapSyncMsg("Impossible d'accéder à votre position GPS.");
      console.error("Geolocation error:", error);
    } finally {
      setLocatingGps(false);
    }
  }, []);

  // ────────────────────────────────────────────────────────
  // Functions - Map Pick Handler
  // ────────────────────────────────────────────────────────
  async function handleMapPick(lat: number, lng: number) {
    const latRounded = roundCoordinate(lat);
    const lngRounded = roundCoordinate(lng);
    setLatitude(latRounded);
    setLongitude(lngRounded);
    setMapSource("map_click");
    setMapSyncMsg("Analyse de la position…");

    try {
      const result = await reverseGeocodeNominatim(latRounded, lngRounded);

      // ✅ CORRECTION: Récupérer les gouvernorats depuis la query ou le prop
      const govs = govQuery.data ?? gouvernorats ?? [];
      
      // ✅ Passer les gouvernorats correctement à la fonction
      const govId = govs && govs.length > 0
        ? resolveGouvernoratIdFromReverse(result, govs)
        : null;

      if (govId !== null) {
        setGouvernorat(govId);
      }

      let delegPool = delegations;
      if (govId !== null && govId !== gouvernorat) {
        delegPool = await getDelegations(govId).catch(() => delegations);
      }

      const delegResolved = resolveDelegationFromReverse(result, delegPool);
      if (delegResolved) {
        setDelegation(delegResolved);
      }

      const addr = buildAddressFromReverse(result);
      if (addr) setAddress(addr);

      const cp = extractPostalCode(result);
      if (cp) setPostalCode(cp);

      // Utiliser la constante pour afficher le nom
      const govName = govId !== null ? TUNISIA_GOUVERNORATS[govId] ?? "" : "";

      setMapSyncMsg(
        `✅ Position épinglée · ${govName}`
      );
    } catch (error) {
      setMapSyncMsg("Position enregistrée. Vérifiez le gouvernorat.");
      console.error("Reverse geocode error:", error);
    }
  }

  // ────────────────────────────────────────────────────────
  // Functions - Form Handling
  // ────────────────────────────────────────────────────────
  const handleGouvernoratChange = (value: string | null) => {
    const nextGouvernorat = value === null ? null : Number(value);
    setGouvernorat(nextGouvernorat);
    if (nextGouvernorat === null) {
      setDelegation(null);
    }
  };

  const handleClearLocation = () => {
    setLatitude(null);
    setLongitude(null);
    setMapSource(null);
    setMapSyncMsg("");
  };

  // ────────────────────────────────────────────────────────
  // Computed Values
  // ────────────────────────────────────────────────────────
  const gouvernoratName = useMemo(() => {
    return gouvernorat !== null
      ? gouvernorats.find((g) => g.id === gouvernorat)?.name ?? ""
      : "";
  }, [gouvernorat, gouvernorats]);

  const delegationName = useMemo(() => {
    return delegation ?? "";
  }, [delegation]);

  // ────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* Sélection Gouvernorat & Délégation */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-card-foreground mb-2">
            Gouvernorat
          </label>
          <select
            value={gouvernorat === null ? "" : gouvernorat}
            onChange={(e) => handleGouvernoratChange(e.target.value || null)}
            disabled={govQuery.isPending}
            className="w-full px-3 py-2.5 rounded-lg border border-border/70 bg-background text-foreground focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">
              {govQuery.isPending ? "Chargement..." : "Sélectionner un gouvernorat"}
            </option>
            {govQuery.data?.map((gov) => (
              <option key={gov.id} value={gov.id}>
                {gov.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-card-foreground mb-2">
            Délégation
          </label>
          <select
            value={delegation || ""}
            onChange={(e) => setDelegation(e.target.value || null)}
            disabled={gouvernorat === null}
            className="w-full px-3 py-2.5 rounded-lg border border-border/70 bg-background text-foreground focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Sélectionner une délégation</option>
            {delegations.map((deleg) => (
              <option key={deleg} value={deleg}>
                {deleg}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* Champs Adresse et Code Postal */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div>
        <label className="block text-sm font-semibold text-card-foreground mb-2">
          Adresse
        </label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="123 Rue de la Paix"
          className="w-full px-3 py-2.5 rounded-lg border border-border/70 bg-background text-foreground placeholder-muted-foreground focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-card-foreground mb-2">
            Code postal
          </label>
          <input
            type="text"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="1000"
            className="w-full px-3 py-2.5 rounded-lg border border-border/70 bg-background text-foreground placeholder-muted-foreground focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
          />
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* Carte Interactive - Contrôles GPS & Épinglage */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="overflow-hidden rounded-[28px] border border-border/70 shadow-sm">
        <div className="space-y-3 border-b border-border/70 bg-muted/30 px-4 py-4">
          {/* Titre + boutons */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-semibold text-card-foreground">
              Carte interactive · Sélectionner une position
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Bouton GPS */}
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={locatingGps || reverseMutation.isPending}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-border/70 bg-background hover:bg-muted text-foreground transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {locatingGps || reverseMutation.isPending ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    <span className="text-xs font-medium">Localisation…</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                    </svg>
                    <span className="text-xs font-medium">Ma position GPS</span>
                  </>
                )}
              </button>

              {/* Bouton Épingler sur la carte */}
              <button
                type="button"
                onClick={() => setMapOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-border/70 bg-background hover:bg-muted text-foreground transition"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7z" />
                  <line x1="9" y1="4" x2="9" y2="17" />
                  <line x1="15" y1="7" x2="15" y2="20" />
                </svg>
                <span className="text-xs font-medium">Épingler sur la carte</span>
              </button>
            </div>
          </div>

          {/* Badge source + message sync */}
          {(mapSource || mapSyncMsg) && (
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              {mapSource && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-bold ${
                    mapSource === "gps"
                      ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-900/50 dark:text-blue-400"
                      : "bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-900/20 dark:border-violet-900/50 dark:text-violet-400"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {mapSource === "gps"
                    ? "GPS"
                    : mapSource === "map_click"
                    ? "Carte"
                    : "Déplacé"}
                </span>
              )}
              {mapSyncMsg && (
                <span
                  className={
                    mapSyncMsg.startsWith("✅")
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-slate-500 dark:text-slate-400"
                  }
                >
                  {mapSyncMsg}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Carte Leaflet */}
        <div className="h-96 bg-slate-50 dark:bg-slate-900">
          <MapContainer
            center={[resolvedLatitude, resolvedLongitude]}
            zoom={DEFAULT_ZOOM}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />

            {latitude !== null && longitude !== null && (
              <Marker
                position={[latitude, longitude]}
                draggable
                icon={createMapPin(mapSource || "map_drag")}
                eventHandlers={{
                  dragend: (e) => {
                    const m = e.target;
                    const ll = m.getLatLng();
                    setMapSource("map_drag");
                    void handleMapPick(ll.lat, ll.lng);
                  },
                }}
              />
            )}
          </MapContainer>
        </div>

        {/* Résumé de la position */}
        {latitude !== null && longitude !== null && (
          <div className="border-t border-border/70 bg-muted/10 px-4 py-3 text-xs text-muted-foreground">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <strong>Position:</strong> {latitude.toFixed(4)}, {longitude.toFixed(4)}
              </div>
              {gouvernoratName && (
                <div>
                  <strong>Gouvernorat:</strong> {gouvernoratName}
                </div>
              )}
              {delegationName && (
                <div>
                  <strong>Délégation:</strong> {delegationName}
                </div>
              )}
              <button
                type="button"
                onClick={handleClearLocation}
                className="ml-auto text-rose-500 hover:text-rose-700 transition font-medium text-xs"
              >
                ✕ Effacer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* MODAL DE CARTE PLEIN ÉCRAN */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AddressMapModal
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        gouvernorat={gouvernorat}
        delegation={delegation}
        latitude={latitude}
        longitude={longitude}
        onChange={(lat, lng) => {
          void handleMapPick(lat, lng);
          setMapOpen(false);
        }}
      />
    </div>
  );
}

export default GuestCheckoutLocationSection;

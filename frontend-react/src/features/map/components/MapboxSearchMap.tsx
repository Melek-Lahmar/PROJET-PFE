/**
 * MapboxSearchMap — Composant carte réutilisable
 *
 * Utilise Leaflet (déjà installé) avec les tuiles Mapbox Streets.
 * Search bar → Mapbox Geocoding API (REST, pas de dépendance GL JS).
 * GPS button → navigator.geolocation.
 * Click sur la carte → retourne les coordonnées via onPick.
 *
 * Props:
 *   token?      — Mapbox access token (fallback: VITE_MAPBOX_TOKEN)
 *   latitude?   — Latitude initiale
 *   longitude?  — Longitude initiale
 *   zoom?       — Zoom initial (défaut: 13 si coordonnées, 6 sinon)
 *   onPick      — Callback (lat, lng) à chaque sélection (GPS, clic, suggestion)
 *   height?     — Hauteur CSS du conteneur carte (défaut: "360px")
 *   placeholder? — Placeholder de la barre de recherche
 *   disabled?   — Désactive toute interaction
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";

import { useMapboxGeocode, type MapboxFeature } from "../hooks/useMapboxGeocode";
import { roundCoordinate } from "../../geo/utils/tunisiaLocationSync";

// ── Tunisie centre par défaut ──────────────────────────────────────────────────
const DEFAULT_LAT = 35.8989;
const DEFAULT_LNG = 9.537;
const DEFAULT_ZOOM_FULL = 6;
const DEFAULT_ZOOM_PICKED = 14;

// ── Icône pin violet (cohérent avec AddressMapField existant) ──────────────────
function createPin(color = "#7c3aed") {
  return L.divIcon({
    html: `<svg width="28" height="40" viewBox="0 0 28 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 26 14 26S28 23.333 28 14C28 6.268 21.732 0 14 0z" fill="${color}"/>
      <circle cx="14" cy="14" r="6" fill="white"/>
    </svg>`,
    className: "",
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -40],
  });
}

const PIN_NORMAL = createPin("#7c3aed");
const PIN_GPS = createPin("#3b82f6");

// ── Sous-composants Leaflet internes ───────────────────────────────────────────
function RecenterView({
  lat,
  lng,
  zoom,
}: {
  lat: number;
  lng: number;
  zoom: number;
}) {
  const map = useMap();
  const prev = useRef({ lat, lng, zoom });

  useEffect(() => {
    const p = prev.current;
    if (p.lat !== lat || p.lng !== lng || p.zoom !== zoom) {
      map.setView([lat, lng], zoom, { animate: true });
      prev.current = { lat, lng, zoom };
    }
  }, [lat, lng, zoom, map]);

  return null;
}

function ClickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// ── Props ──────────────────────────────────────────────────────────────────────
export interface MapboxSearchMapProps {
  token?: string;
  latitude?: number | null;
  longitude?: number | null;
  zoom?: number;
  onPick: (lat: number, lng: number) => void;
  height?: string;
  placeholder?: string;
  disabled?: boolean;
}

// ── Composant principal ────────────────────────────────────────────────────────
export function MapboxSearchMap({
  token,
  latitude,
  longitude,
  zoom,
  onPick,
  height = "360px",
  placeholder = "Rechercher une adresse ou délégation…",
  disabled = false,
}: MapboxSearchMapProps) {
  const mapboxToken =
    token ??
    ((import.meta.env.VITE_MAPBOX_TOKEN as string | undefined) ?? "");

  // Tiles Mapbox Streets (Raster — compatible Leaflet)
  const tileUrl = mapboxToken
    ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const tileAttrib = mapboxToken
    ? '© <a href="https://www.mapbox.com/">Mapbox</a> © <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
    : "© OpenStreetMap contributors";

  // ── State ──────────────────────────────────────────────────────────────────
  const hasInitialPos =
    typeof latitude === "number" && typeof longitude === "number";

  const [pos, setPos] = useState<{ lat: number; lng: number }>({
    lat: hasInitialPos ? latitude! : DEFAULT_LAT,
    lng: hasInitialPos ? longitude! : DEFAULT_LNG,
  });
  const [currentZoom, setCurrentZoom] = useState(
    zoom ?? (hasInitialPos ? DEFAULT_ZOOM_PICKED : DEFAULT_ZOOM_FULL)
  );
  const [pinVisible, setPinVisible] = useState(hasInitialPos);
  const [isGps, setIsGps] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // ── Search ─────────────────────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const { search, results, loading: searchLoading, error: searchError, clear } =
    useMapboxGeocode({ token: mapboxToken });

  // Sync latitude/longitude externes
  useEffect(() => {
    if (typeof latitude === "number" && typeof longitude === "number") {
      setPos({ lat: latitude, lng: longitude });
      setCurrentZoom(zoom ?? DEFAULT_ZOOM_PICKED);
      setPinVisible(true);
    }
  }, [latitude, longitude, zoom]);

  // Ferme les suggestions si clic en dehors
  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const pick = useCallback(
    (lat: number, lng: number, gps = false) => {
      const rLat = roundCoordinate(lat);
      const rLng = roundCoordinate(lng);
      setPos({ lat: rLat, lng: rLng });
      setCurrentZoom(DEFAULT_ZOOM_PICKED);
      setPinVisible(true);
      setIsGps(gps);
      onPick(rLat, rLng);
    },
    [onPick]
  );

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (disabled) return;
      pick(lat, lng, false);
      setIsGps(false);
    },
    [disabled, pick]
  );

  const handleSuggestionSelect = useCallback(
    (feature: MapboxFeature) => {
      const [lng, lat] = feature.center;
      pick(lat, lng, false);
      setQuery(feature.place_name);
      setShowSuggestions(false);
      clear();
    },
    [pick, clear]
  );

  const handleGps = useCallback(() => {
    if (disabled) return;
    setGpsError(null);
    setGpsLoading(true);

    if (!navigator.geolocation) {
      setGpsError("Géolocalisation non supportée par ce navigateur.");
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        pick(pos.coords.latitude, pos.coords.longitude, true);
        setGpsLoading(false);
      },
      (err) => {
        const msgs: Record<number, string> = {
          1: "Permission refusée. Autorisez la localisation dans le navigateur.",
          2: "Position indisponible. Activez le GPS ou le réseau.",
          3: "Délai dépassé. Réessayez.",
        };
        setGpsError(msgs[err.code] ?? "Impossible de récupérer votre position.");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }, [disabled, pick]);

  const handleSearchChange = (value: string) => {
    setQuery(value);
    search(value);
    setShowSuggestions(true);
    if (!value.trim()) {
      clear();
      setShowSuggestions(false);
    }
  };

  const icon = useMemo(() => (isGps ? PIN_GPS : PIN_NORMAL), [isGps]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3">
      {/* ── Barre de recherche ──────────────────────────────────────────────── */}
      <div className="relative" ref={searchContainerRef}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => results.length > 0 && setShowSuggestions(true)}
              placeholder={placeholder}
              disabled={disabled}
              className="h-11 w-full rounded-xl border border-border bg-card pl-9 pr-4 text-sm text-card-foreground shadow-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
            />
            {searchLoading && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
              </span>
            )}
          </div>

          {/* Bouton GPS */}
          <button
            type="button"
            onClick={handleGps}
            disabled={disabled || gpsLoading}
            title="Ma position GPS"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-card-foreground shadow-sm transition hover:bg-muted disabled:opacity-50"
          >
            {gpsLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              </svg>
            )}
          </button>
        </div>

        {/* Suggestions Mapbox */}
        {showSuggestions && results.length > 0 && (
          <ul className="absolute z-[2000] mt-1 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg">
            {results.map((feature) => (
              <li key={feature.id}>
                <button
                  type="button"
                  onMouseDown={() => handleSuggestionSelect(feature)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left text-sm transition hover:bg-muted"
                >
                  <svg
                    className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                    <circle cx="12" cy="9" r="2.5" />
                  </svg>
                  <span className="text-card-foreground">{feature.place_name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Erreurs */}
      {(gpsError || searchError) && (
        <div className="rounded-xl border border-[hsl(var(--danger)/0.25)] bg-[hsl(var(--danger)/0.08)] px-4 py-3 text-sm text-[hsl(var(--danger))]">
          {gpsError ?? searchError}
        </div>
      )}

      {/* ── Carte Leaflet + tuiles Mapbox ──────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-2xl border border-border shadow-sm"
        style={{ height }}
      >
        {/* Hint flottant */}
        {!disabled && (
          <div className="pointer-events-none absolute left-1/2 top-3 z-[1000] -translate-x-1/2 rounded-full border border-border/60 bg-card/95 px-3 py-1 text-[11px] font-semibold text-card-foreground shadow-sm backdrop-blur-sm">
            {pinVisible ? "Glissez le pin pour ajuster" : "Cliquez sur la carte pour épingler"}
          </div>
        )}

        <MapContainer
          center={[pos.lat, pos.lng]}
          zoom={currentZoom}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={!disabled}
          dragging={!disabled}
          zoomControl
        >
          <RecenterView lat={pos.lat} lng={pos.lng} zoom={currentZoom} />
          {!disabled && <ClickHandler onPick={handleMapClick} />}

          <TileLayer url={tileUrl} attribution={tileAttrib} tileSize={512} zoomOffset={-1} />

          {pinVisible && (
            <Marker
              position={[pos.lat, pos.lng]}
              icon={icon}
              draggable={!disabled}
              eventHandlers={{
                dragend(e) {
                  const ll = (
                    e.target as { getLatLng: () => { lat: number; lng: number } }
                  ).getLatLng();
                  pick(ll.lat, ll.lng, false);
                },
              }}
            />
          )}
        </MapContainer>
      </div>

      {/* Coordonnées affichées */}
      {pinVisible && (
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
          <span className="font-semibold text-card-foreground">
            {pos.lat.toFixed(6)}
          </span>
          {" , "}
          <span className="font-semibold text-card-foreground">
            {pos.lng.toFixed(6)}
          </span>
          {isGps && (
            <span className="ml-2 font-semibold text-blue-600">✓ GPS</span>
          )}
        </div>
      )}
    </div>
  );
}

export default MapboxSearchMap;

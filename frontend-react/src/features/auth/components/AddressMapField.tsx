import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";

import { Button } from "../../../shared/components/Button";
import { getCenterForTunisia } from "../../geo/data/tunisiaCenters";
import { fetchCenterByGovDelegation } from "../../geo/api/nominatimGeo";
import { getGouvernoratLabelById, roundCoordinate } from "../../geo/utils/tunisiaLocationSync";

export type AddressMapChangeReason = "gps" | "map_drag" | "map_click";

export function createMapPin(source: AddressMapChangeReason | null): L.DivIcon {
  const color = source === "gps" ? "#3b82f6" : "#7c3aed";
  return L.divIcon({
    html: `<svg width="28" height="40" viewBox="0 0 28 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 26 14 26S28 23.333 28 14C28 6.268 21.732 0 14 0z" fill="${color}"/><circle cx="14" cy="14" r="6" fill="white"/></svg>`,
    className: "",
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -40],
  });
}

type Props = {
  gouvernoratId: number | null;
  delegation: string | null;
  latitude: number | null;
  longitude: number | null;
  viewZoom?: number;
  onChange: (lat: number, lng: number, reason: AddressMapChangeReason) => void;
};

function Recenter({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], zoom, { animate: true });
  }, [lat, lng, zoom, map]);
  return null;
}

function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

export function AddressMapField({
  gouvernoratId,
  delegation,
  latitude,
  longitude,
  viewZoom,
  onChange,
}: Props) {
  const fallback = useMemo(() => getCenterForTunisia(gouvernoratId), [gouvernoratId]);

  const [pos, setPos] = useState<{ lat: number; lng: number }>({
    lat: typeof latitude === "number" ? latitude : fallback.lat,
    lng: typeof longitude === "number" ? longitude : fallback.lng,
  });
  const [zoom, setZoom] = useState<number>(
    viewZoom ?? (typeof latitude === "number" && typeof longitude === "number" ? 16 : fallback.zoom)
  );
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [resolvingView, setResolvingView] = useState(false);
  const [source, setSource] = useState<AddressMapChangeReason | null>(
    typeof latitude === "number" ? "gps" : null
  );
  // position en attente de confirmation (drag ou clic carte)
  const [pending, setPending] = useState<{ lat: number; lng: number; reason: AddressMapChangeReason } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolveView() {
      if (typeof latitude === "number" && typeof longitude === "number") {
        if (cancelled) return;
        setPos({ lat: latitude, lng: longitude });
        setZoom(viewZoom ?? 16);
        return;
      }

      const delegationValue = delegation?.trim() ?? "";
      const govLabel = getGouvernoratLabelById(gouvernoratId);

      if (govLabel && delegationValue) {
        try {
          setResolvingView(true);
          const centered = await fetchCenterByGovDelegation(govLabel, delegationValue);
          if (cancelled) return;
          setPos({ lat: centered.lat, lng: centered.lng });
          setZoom(14);
          return;
        } catch {
          if (cancelled) return;
          setPos({ lat: fallback.lat, lng: fallback.lng });
          setZoom(fallback.zoom);
          return;
        } finally {
          if (!cancelled) setResolvingView(false);
        }
      }

      if (cancelled) return;
      setPos({ lat: fallback.lat, lng: fallback.lng });
      setZoom(fallback.zoom);
      setResolvingView(false);
    }

    void resolveView();
    return () => { cancelled = true; };
  }, [delegation, fallback.lat, fallback.lng, fallback.zoom, gouvernoratId, latitude, longitude, viewZoom]);

  // GPS : confirme immediatement (position certaine)
  const handleLocate = () => {
    setGeoError(null);
    setLocating(true);

    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (!window.isSecureContext && !isLocalhost) {
      setLocating(false);
      setGeoError("La geolocalisation necessite HTTPS ou localhost.");
      return;
    }
    if (!navigator.geolocation) {
      setLocating(false);
      setGeoError("Ce navigateur ne supporte pas la geolocalisation.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = roundCoordinate(position.coords.latitude);
        const lng = roundCoordinate(position.coords.longitude);
        setPos({ lat, lng });
        setZoom(16);
        setSource("gps");
        setPending(null);
        onChange(lat, lng, "gps");
        setLocating(false);
        setGeoError(null);
      },
      (error) => {
        setLocating(false);
        if (error.code === error.PERMISSION_DENIED)
          setGeoError("Permission refusee. Autorisez la localisation dans le navigateur.");
        else if (error.code === error.POSITION_UNAVAILABLE)
          setGeoError("Position indisponible. Activez le GPS ou le reseau.");
        else if (error.code === error.TIMEOUT)
          setGeoError("La localisation a expire. Reessayez.");
        else
          setGeoError("Impossible de recuperer votre position.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Clic ou drag : met en attente de confirmation
  const handleMapInteraction = (lat: number, lng: number, reason: AddressMapChangeReason) => {
    const nextLat = roundCoordinate(lat);
    const nextLng = roundCoordinate(lng);
    setPos({ lat: nextLat, lng: nextLng });
    setZoom(16);
    setSource(reason);
    setPending({ lat: nextLat, lng: nextLng, reason });
  };

  // Confirme la position en attente
  const handleConfirmPending = () => {
    if (!pending) return;
    onChange(pending.lat, pending.lng, pending.reason);
    setPending(null);
  };

  const icon = useMemo(() => createMapPin(source), [source]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" type="button" onClick={handleLocate} disabled={locating || resolvingView}>
          {locating ? "Localisation..." : "📍 Utiliser ma position"}
        </Button>
        <div className="text-xs text-muted-foreground">
          {resolvingView ? "Recentrage carte..." : "Cliquez sur la carte ou deplacez le pin, puis confirmez."}
        </div>
      </div>

      {geoError && (
        <div className="rounded-xl border border-[hsl(var(--danger)/0.25)] bg-[hsl(var(--danger)/0.12)] p-3 text-sm text-[hsl(var(--danger))]">
          {geoError}
        </div>
      )}

      {/* Carte avec bouton flottant */}
      <div className="relative overflow-hidden rounded-2xl border border-input">

        {/* Bouton flottant "Choisir cet emplacement" */}
        {pending && (
          <div className="absolute bottom-4 left-1/2 z-[1000] -translate-x-1/2">
            <button
              type="button"
              onClick={handleConfirmPending}
              className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                <circle cx="12" cy="9" r="2.5"/>
              </svg>
              Choisir cet emplacement
            </button>
          </div>
        )}

        {/* Hint flottant en haut */}
        {!pending && (
          <div className="pointer-events-none absolute top-3 left-1/2 z-[1000] -translate-x-1/2 rounded-full border border-border/60 bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm backdrop-blur-sm">
            {source ? "Glissez le pin pour ajuster" : "Cliquez sur la carte pour epingler"}
          </div>
        )}

        <MapContainer
          center={[pos.lat, pos.lng]}
          zoom={zoom}
          style={{ height: 360, width: "100%" }}
          scrollWheelZoom
        >
          <Recenter lat={pos.lat} lng={pos.lng} zoom={zoom} />
          <MapClickHandler
            onPick={(lat, lng) => handleMapInteraction(lat, lng, "map_click")}
          />
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker
            position={[pos.lat, pos.lng]}
            draggable
            icon={icon}
            eventHandlers={{
              dragend: (event) => {
                const marker = event.target as { getLatLng: () => { lat: number; lng: number } };
                const ll = marker.getLatLng();
                handleMapInteraction(ll.lat, ll.lng, "map_drag");
              },
            }}
          />
        </MapContainer>
      </div>

      <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        {pending ? (
          <span className="font-semibold text-amber-600">
            Position selectionnee — cliquez "Choisir cet emplacement" pour confirmer
          </span>
        ) : (
          <>
            Position :{" "}
            <span className="font-semibold text-card-foreground">{pos.lat.toFixed(6)}</span>
            {" , "}
            <span className="font-semibold text-card-foreground">{pos.lng.toFixed(6)}</span>
            {source && <span className="ml-2 font-medium text-green-600">✓ Confirme</span>}
          </>
        )}
      </div>
    </div>
  );
}

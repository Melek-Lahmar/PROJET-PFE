import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

import { Button } from "../../../shared/components/Button";
import { getCenterForTunisia } from "../../geo/data/tunisiaCenters";
import { fetchCenterByGovDelegation } from "../../geo/api/nominatimGeo";
import { getGouvernoratLabelById, roundCoordinate } from "../../geo/utils/tunisiaLocationSync";

export type AddressMapChangeReason = "gps" | "map_drag" | "map_click";

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
  const [zoom, setZoom] = useState<number>(viewZoom ?? (typeof latitude === "number" && typeof longitude === "number" ? 16 : fallback.zoom));
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [resolvingView, setResolvingView] = useState(false);

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

    return () => {
      cancelled = true;
    };
  }, [delegation, fallback.lat, fallback.lng, fallback.zoom, gouvernoratId, latitude, longitude, viewZoom]);

  const handleLocate = () => {
    setGeoError(null);
    setLocating(true);

    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

    if (!window.isSecureContext && !isLocalhost) {
      setLocating(false);
      setGeoError("La géolocalisation nécessite HTTPS ou localhost.");
      return;
    }

    if (!navigator.geolocation) {
      setLocating(false);
      setGeoError("Ce navigateur ne supporte pas la géolocalisation.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = roundCoordinate(position.coords.latitude);
        const lng = roundCoordinate(position.coords.longitude);
        setPos({ lat, lng });
        setZoom(16);
        onChange(lat, lng, "gps");
        setLocating(false);
        setGeoError(null);
      },
      (error) => {
        setLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGeoError("Permission refusée. Autorisez la localisation dans le navigateur.");
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setGeoError("Position indisponible. Activez le GPS ou le réseau.");
        } else if (error.code === error.TIMEOUT) {
          setGeoError("La localisation a expiré. Réessayez.");
        } else {
          setGeoError("Impossible de récupérer votre position.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" type="button" onClick={handleLocate} disabled={locating || resolvingView}>
          {locating ? "Localisation..." : "📍 Utiliser ma position"}
        </Button>

        <div className="text-xs text-muted-foreground">
          {resolvingView ? "Recentrage carte..." : "Cliquez sur la carte ou déplacez le pin pour synchroniser la position."}
        </div>
      </div>

      {geoError ? (
        <div className="rounded-xl border border-[hsl(var(--danger)/0.25)] bg-[hsl(var(--danger)/0.12)] p-3 text-sm text-[hsl(var(--danger))]">
          {geoError}
        </div>
      ) : null}

      <div className="rounded-2xl overflow-hidden border border-input">
        <MapContainer center={[pos.lat, pos.lng]} zoom={zoom} style={{ height: 360, width: "100%" }} scrollWheelZoom>
          <Recenter lat={pos.lat} lng={pos.lng} zoom={zoom} />
          <MapClickHandler
            onPick={(lat, lng) => {
              const nextLat = roundCoordinate(lat);
              const nextLng = roundCoordinate(lng);
              setPos({ lat: nextLat, lng: nextLng });
              setZoom(16);
              onChange(nextLat, nextLng, "map_click");
            }}
          />
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker
            position={[pos.lat, pos.lng]}
            draggable
            eventHandlers={{
              dragend: (event) => {
                const marker = event.target as { getLatLng: () => { lat: number; lng: number } };
                const ll = marker.getLatLng();
                const nextLat = roundCoordinate(ll.lat);
                const nextLng = roundCoordinate(ll.lng);
                setPos({ lat: nextLat, lng: nextLng });
                setZoom(16);
                onChange(nextLat, nextLng, "map_drag");
              },
            }}
          />
        </MapContainer>
      </div>

      <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        Position actuelle : <span className="font-semibold text-card-foreground">{pos.lat.toFixed(6)}</span> ,{" "}
        <span className="font-semibold text-card-foreground">{pos.lng.toFixed(6)}</span>
      </div>
    </div>
  );
}
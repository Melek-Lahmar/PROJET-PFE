import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import type { LatLngExpression } from "leaflet";

import { Modal } from "../../../shared/components/Modal";
import { Button } from "../../../shared/components/Button";
import { getCenterForTunisia } from "../../geo/data/tunisiaCenters";


type Props = {
  open: boolean;
  onClose: () => void;

  gouvernorat: number | null;
  delegation: string | null;

  latitude: number | null;
  longitude: number | null;

  onChange: (lat: number, lng: number) => void;
};

function Recenter({ center, zoom }: { center: LatLngExpression; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
}

export function AddressMapModal({
  open,
  onClose,
  gouvernorat,
  delegation,
  latitude,
  longitude,
  onChange,
}: Props) {
  const initial = useMemo(() => {
    if (typeof latitude === "number" && typeof longitude === "number") {
      return { lat: latitude, lng: longitude, zoom: 16 };
    }
    return getCenterForTunisia(gouvernorat);
  }, [gouvernorat, delegation, latitude, longitude]);

  const [pos, setPos] = useState<{ lat: number; lng: number }>({
    lat: initial.lat,
    lng: initial.lng,
  });

  const [zoom, setZoom] = useState<number>(initial.zoom);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPos({ lat: initial.lat, lng: initial.lng });
    setZoom(initial.zoom);
    setGeoError(null);
  }, [open, initial.lat, initial.lng, initial.zoom]);

  const canBePrecise = Boolean(
    typeof gouvernorat === "number" && delegation && delegation.trim()
  );

  const center: LatLngExpression = [pos.lat, pos.lng];

  const handleUseMyLocation = () => {
    setGeoError(null);

    if (!navigator.geolocation) {
      setGeoError("La géolocalisation n’est pas supportée par ce navigateur.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (p) => {
        const lat = p.coords.latitude;
        const lng = p.coords.longitude;
        setPos({ lat, lng });
        setZoom(16);
        onChange(lat, lng);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError("Permission refusée. Active la localisation dans ton navigateur.");
        } else {
          setGeoError("Impossible de récupérer la localisation.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Modifier adresse sur la carte"
      footer={
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            {pos.lat.toFixed(6)} , {pos.lng.toFixed(6)}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} type="button">
              Fermer
            </Button>
          </div>
        </div>
      }
    >
      {!canBePrecise && (
        <div className="mb-3 rounded-xl border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
          Pour un positionnement plus précis, choisis d’abord <b>Gouvernorat</b> et <b>Délégation</b>.
          (La carte est centrée sur la Tunisie par défaut.)
        </div>
      )}

      {geoError && (
        <div className="mb-3 rounded-xl border border-[hsl(var(--danger)/0.25)] bg-[hsl(var(--danger)/0.12)] p-3 text-sm text-[hsl(var(--danger))]">
          {geoError}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mb-3">
        <Button variant="secondary" onClick={handleUseMyLocation} type="button">
          📍 Utiliser ma localisation
        </Button>

        <div className="text-xs text-muted-foreground">
          Déplace le pin pour ajuster
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden border border-border">
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: 420, width: "100%" }}
          scrollWheelZoom
        >
          <Recenter center={center} zoom={zoom} />
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <Marker
            position={center}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const m = e.target;
                const ll = m.getLatLng();
                const lat = ll.lat;
                const lng = ll.lng;
                setPos({ lat, lng });
                onChange(lat, lng);
              },
            }}
          />
        </MapContainer>
      </div>
    </Modal>
  );
}

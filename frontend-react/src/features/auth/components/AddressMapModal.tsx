// src/features/auth/components/AddressMapModal.tsx
//
// AMELIORATIONS :
//  - Pin SVG personnalisé partagé avec AddressMapField (createMapPin)
//  - Badge source (GPS / Carte / Drag) avec même logique
//  - Même feedback sync que le bouton GPS du parent
//  - Hint flottant sur la carte "Cliquez ou glissez"
//  - Affichage coordonnées clair + bouton effacer

import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { LatLngExpression } from "leaflet";

import { Modal } from "../../../shared/components/Modal";
import { Button } from "../../../shared/components/Button";
import { getCenterForTunisia } from "../../geo/data/tunisiaCenters";
import { createMapPin, type AddressMapChangeReason } from "./AddressMapField";
import { roundCoordinate } from "../../geo/utils/tunisiaLocationSync";

// ── Badge source (même que AddressMapField) ────────────────────────────────────
function SourceBadge({ source }: { source: AddressMapChangeReason | null }) {
  if (!source) return null;
  const cfg = {
    gps:       { label: "GPS",    bg: "bg-blue-50   border-blue-200   text-blue-700"   },
    map_click: { label: "Carte",  bg: "bg-violet-50  border-violet-200  text-violet-700" },
    map_drag:  { label: "Déplacé",bg: "bg-violet-50  border-violet-200  text-violet-700" },
  }[source];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${cfg.bg}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {cfg.label}
    </span>
  );
}

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

function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng); } });
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
    if (typeof latitude === "number" && typeof longitude === "number")
      return { lat: latitude, lng: longitude, zoom: 16 };
    return getCenterForTunisia(gouvernorat);
  }, [gouvernorat, delegation, latitude, longitude]);

  const [pos, setPos] = useState({ lat: initial.lat, lng: initial.lng });
  const [zoom, setZoom] = useState(initial.zoom);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [source, setSource] = useState<AddressMapChangeReason | null>(
    typeof latitude === "number" ? "gps" : null
  );

  // Reset à chaque ouverture
  useEffect(() => {
    if (!open) return;
    setPos({ lat: initial.lat, lng: initial.lng });
    setZoom(initial.zoom);
    setGeoError(null);
    setSource(typeof latitude === "number" ? "gps" : null);
  }, [open, initial.lat, initial.lng, initial.zoom, latitude]);

  const icon = useMemo(() => createMapPin(source), [source]);
  const center: LatLngExpression = [pos.lat, pos.lng];

  const canBePrecise = Boolean(typeof gouvernorat === "number" && delegation?.trim());

  // Bouton GPS dans la modal
  const handleUseMyLocation = () => {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("La géolocalisation n'est pas supportée par ce navigateur.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false);
        const lat = roundCoordinate(p.coords.latitude);
        const lng = roundCoordinate(p.coords.longitude);
        setPos({ lat, lng });
        setZoom(16);
        setSource("gps");
        onChange(lat, lng);
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED)
          setGeoError("Permission refusée. Autorisez la localisation dans le navigateur.");
        else
          setGeoError("Impossible de récupérer la localisation.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handlePick = (lat: number, lng: number, reason: AddressMapChangeReason) => {
    const nextLat = roundCoordinate(lat);
    const nextLng = roundCoordinate(lng);
    setPos({ lat: nextLat, lng: nextLng });
    setZoom(16);
    setSource(reason);
    onChange(nextLat, nextLng);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Épingler sur la carte"
      footer={
        <div className="flex items-center justify-between gap-3">
          {/* Coordonnées + badge */}
          <div className="flex items-center gap-2 text-xs">
            <SourceBadge source={source} />
            {source ? (
              <span className="text-muted-foreground">
                <span className="font-semibold text-card-foreground">{pos.lat.toFixed(5)}</span>
                {" , "}
                <span className="font-semibold text-card-foreground">{pos.lng.toFixed(5)}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">Aucune position choisie</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} type="button">Annuler</Button>
            <Button
              variant="primary"
              type="button"
              disabled={!source}
              onClick={onClose}
            >
              Confirmer
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Info précision */}
        {!canBePrecise && (
          <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
            Pour un positionnement plus précis, choisissez d'abord le <b>Gouvernorat</b> et la <b>Délégation</b>.
          </div>
        )}

        {/* Erreur GPS */}
        {geoError && (
          <div className="rounded-xl border border-[hsl(var(--danger)/0.25)] bg-[hsl(var(--danger)/0.12)] px-3 py-2 text-sm text-[hsl(var(--danger))]">
            {geoError}
          </div>
        )}

        {/* Barre boutons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleUseMyLocation}
            type="button"
            disabled={locating}
            className="gap-2"
          >
            {locating ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Localisation…
              </>
            ) : (
              <>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                </svg>
                Utiliser ma position GPS
              </>
            )}
          </Button>

          <div className="flex items-center gap-2 ml-auto">
            <SourceBadge source={source} />
            <span className="text-xs text-muted-foreground">
              {source ? "Position épinglée" : "Cliquez ou glissez le pin"}
            </span>
          </div>
        </div>

        {/* Carte */}
        <div className="relative overflow-hidden rounded-2xl border border-border shadow-sm">
          {/* Hint flottant */}
          <div className="pointer-events-none absolute bottom-3 left-1/2 z-[1000] -translate-x-1/2 rounded-full border border-border/60 bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm backdrop-blur-sm dark:bg-slate-900/90 dark:text-slate-300">
            {source ? "Glissez le pin pour ajuster" : "Cliquez sur la carte pour épingler"}
          </div>

          <MapContainer
            center={center}
            zoom={zoom}
            style={{ height: 420, width: "100%" }}
            scrollWheelZoom
          >
            <Recenter center={center} zoom={zoom} />
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler
              onPick={(lat, lng) => handlePick(lat, lng, "map_click")}
            />
            <Marker
              position={center}
              draggable
              icon={icon}
              eventHandlers={{
                dragend: (e) => {
                  const m = e.target as { getLatLng: () => { lat: number; lng: number } };
                  const ll = m.getLatLng();
                  handlePick(ll.lat, ll.lng, "map_drag");
                },
              }}
            />
          </MapContainer>
        </div>
      </div>
    </Modal>
  );
}

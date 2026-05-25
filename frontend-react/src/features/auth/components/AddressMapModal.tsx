// src/features/auth/components/AddressMapModal.tsx
//
// UX AMELIOREE :
//  - Toutes les interactions (clic, drag, GPS) mettent a jour l'etat interne uniquement
//  - onChange n'est appele QUE quand l'utilisateur confirme ("Choisir cet emplacement")
//  - Bouton flottant prominent "Choisir cet emplacement" sur la carte
//  - Annuler ferme sans appeler onChange

import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { LatLngExpression } from "leaflet";

import { Modal } from "../../../shared/components/Modal";
import { Button } from "../../../shared/components/Button";
import { getCenterForTunisia } from "../../geo/data/tunisiaCenters";
import { createMapPin, type AddressMapChangeReason } from "./AddressMapField";
import { roundCoordinate } from "../../geo/utils/tunisiaLocationSync";

function SourceBadge({ source }: { source: AddressMapChangeReason | null }) {
  if (!source) return null;
  const cfg = {
    gps:       { label: "GPS",     bg: "bg-blue-50   border-blue-200   text-blue-700"   },
    map_click: { label: "Carte",   bg: "bg-violet-50  border-violet-200  text-violet-700" },
    map_drag:  { label: "Deplace", bg: "bg-violet-50  border-violet-200  text-violet-700" },
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
  // true si l'utilisateur a place le pin mais pas encore confirme
  const [pendingConfirm, setPendingConfirm] = useState(false);

  // Reset a chaque ouverture
  useEffect(() => {
    if (!open) return;
    setPos({ lat: initial.lat, lng: initial.lng });
    setZoom(initial.zoom);
    setGeoError(null);
    setSource(typeof latitude === "number" ? "gps" : null);
    setPendingConfirm(false);
  }, [open, initial.lat, initial.lng, initial.zoom, latitude]);

  const icon = useMemo(() => createMapPin(source), [source]);
  const center: LatLngExpression = [pos.lat, pos.lng];

  const canBePrecise = Boolean(typeof gouvernorat === "number" && delegation?.trim());

  // Met a jour la position interne sans appeler onChange
  const handlePick = (lat: number, lng: number, reason: AddressMapChangeReason) => {
    const nextLat = roundCoordinate(lat);
    const nextLng = roundCoordinate(lng);
    setPos({ lat: nextLat, lng: nextLng });
    setZoom(16);
    setSource(reason);
    setPendingConfirm(true);
  };

  // GPS : met a jour la position interne sans appeler onChange
  const handleUseMyLocation = () => {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("La geolocalisation n'est pas supportee par ce navigateur.");
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
        setPendingConfirm(true);
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED)
          setGeoError("Permission refusee. Autorisez la localisation dans le navigateur.");
        else
          setGeoError("Impossible de recuperer la localisation.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Appelle onChange UNIQUEMENT ici et ferme
  const handleConfirm = () => {
    if (source) {
      onChange(pos.lat, pos.lng);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Epingler sur la carte"
      footer={
        <div className="flex items-center justify-between gap-3">
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
              onClick={handleConfirm}
            >
              Confirmer
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {!canBePrecise && (
          <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
            Pour un positionnement plus precis, choisissez d'abord le <b>Gouvernorat</b> et la <b>Delegation</b>.
          </div>
        )}

        {geoError && (
          <div className="rounded-xl border border-[hsl(var(--danger)/0.25)] bg-[hsl(var(--danger)/0.12)] px-3 py-2 text-sm text-[hsl(var(--danger))]">
            {geoError}
          </div>
        )}

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
                Localisation...
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

          <span className="ml-auto text-xs text-muted-foreground">
            Cliquez ou glissez le pin pour placer
          </span>
        </div>

        {/* Carte avec bouton flottant "Choisir cet emplacement" */}
        <div className="relative overflow-hidden rounded-2xl border border-border shadow-sm">

          {/* Bouton flottant qui apparait apres placement du pin */}
          {pendingConfirm && (
            <div className="absolute bottom-4 left-1/2 z-[1000] -translate-x-1/2">
              <button
                type="button"
                onClick={handleConfirm}
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

          {/* Hint flottant en haut quand pas encore place */}
          {!pendingConfirm && (
            <div className="pointer-events-none absolute top-3 left-1/2 z-[1000] -translate-x-1/2 rounded-full border border-border/60 bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm backdrop-blur-sm">
              {source ? "Glissez le pin pour ajuster" : "Cliquez sur la carte pour epingler"}
            </div>
          )}

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

        {/* Affichage coordonnees sous la carte */}
        {source && (
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-xs">
            <div className="flex items-center gap-2">
              <SourceBadge source={source} />
              <span className="text-muted-foreground">
                Lat <span className="font-semibold text-card-foreground">{pos.lat.toFixed(6)}</span>
                {" "}&bull;{" "}
                Lng <span className="font-semibold text-card-foreground">{pos.lng.toFixed(6)}</span>
              </span>
            </div>
            {pendingConfirm && (
              <span className="text-[10px] font-bold text-amber-600">
                Cliquez "Choisir cet emplacement" pour confirmer
              </span>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

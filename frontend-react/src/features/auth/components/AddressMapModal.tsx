// src/features/auth/components/AddressMapModal.tsx
// Layout dedie plein-ecran — ne depend plus du composant Modal generique
// pour eviter le max-h-[66vh] qui coupe la carte.

import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { LatLngExpression } from "leaflet";

import { getCenterForTunisia } from "../../geo/data/tunisiaCenters";
import { type AddressMapChangeReason } from "./AddressMapField";
import { createMapPin } from "./mapPinIcon";
import { roundCoordinate } from "../../geo/utils/tunisiaLocationSync";

function SourceBadge({ source }: { source: AddressMapChangeReason | null }) {
  if (!source) return null;
  const cfg = {
    gps:       { label: "GPS",      bg: "bg-blue-50  border-blue-200  text-blue-700"   },
    map_click: { label: "Carte",    bg: "bg-violet-50 border-violet-200 text-violet-700" },
    map_drag:  { label: "Deplace",  bg: "bg-violet-50 border-violet-200 text-violet-700" },
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
  useEffect(() => { map.setView(center, zoom, { animate: true }); }, [center, zoom, map]);
  return null;
}

function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

export function AddressMapModal({ open, onClose, gouvernorat, delegation, latitude, longitude, onChange }: Props) {
  const initial = useMemo(() => {
    if (typeof latitude === "number" && typeof longitude === "number")
      return { lat: latitude, lng: longitude, zoom: 16 };
    return getCenterForTunisia(gouvernorat);
  }, [gouvernorat, delegation, latitude, longitude]);

  const [pos, setPos]                     = useState({ lat: initial.lat, lng: initial.lng });
  const [zoom, setZoom]                   = useState(initial.zoom);
  const [geoError, setGeoError]           = useState<string | null>(null);
  const [locating, setLocating]           = useState(false);
  const [source, setSource]               = useState<AddressMapChangeReason | null>(
    typeof latitude === "number" ? "gps" : null
  );
  const [pendingConfirm, setPendingConfirm] = useState(false);

  // Bloquer le scroll de la page quand la modal est ouverte
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Fermer avec Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Reset a chaque ouverture
  useEffect(() => {
    if (!open) return;
    setPos({ lat: initial.lat, lng: initial.lng });
    setZoom(initial.zoom);
    setGeoError(null);
    setSource(typeof latitude === "number" ? "gps" : null);
    setPendingConfirm(false);
  }, [open, initial.lat, initial.lng, initial.zoom, latitude]);

  const icon   = useMemo(() => createMapPin(source), [source]);
  const center: LatLngExpression = [pos.lat, pos.lng];

  const handlePick = (lat: number, lng: number, reason: AddressMapChangeReason) => {
    const nextLat = roundCoordinate(lat);
    const nextLng = roundCoordinate(lng);
    setPos({ lat: nextLat, lng: nextLng });
    setZoom(16);
    setSource(reason);
    setPendingConfirm(true);
  };

  const handleGPS = () => {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("Geolocalisation non supportee par ce navigateur.");
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
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Permission refusee. Autorisez la localisation dans le navigateur."
            : "Impossible de recuperer la localisation."
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleConfirm = () => {
    if (source) onChange(pos.lat, pos.lng);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel — flex column, occupe 95% de l'ecran */}
      <div className="relative flex w-full max-w-3xl flex-col overflow-hidden rounded-[24px] border border-border/70 bg-card shadow-[0_48px_130px_-40px_rgba(2,6,23,0.9)]"
           style={{ height: "min(92vh, 780px)" }}>

        {/* ── Header ── */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-3">
            {/* Icone carte */}
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                <circle cx="12" cy="9" r="2.5"/>
              </svg>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Localisation</div>
              <h2 className="text-base font-bold text-card-foreground">Epingler sur la carte</h2>
            </div>
          </div>

          {/* Bouton GPS + Fermer */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGPS}
              disabled={locating}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-muted/50 px-3 text-xs font-semibold text-card-foreground transition hover:bg-accent disabled:opacity-50"
            >
              {locating ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                </svg>
              )}
              {locating ? "Localisation..." : "Ma position"}
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-muted/50 text-muted-foreground transition hover:bg-accent hover:text-card-foreground"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6 6 18"/><path d="M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── Alertes (GPS error / hint precision) ── */}
        {(geoError || !source) && (
          <div className="shrink-0 px-4 pt-3">
            {geoError && (
              <div className="rounded-xl border border-[hsl(var(--danger)/0.3)] bg-[hsl(var(--danger)/0.08)] px-3 py-2 text-xs text-[hsl(var(--danger))]">
                {geoError}
              </div>
            )}
            {!source && !geoError && (
              <div className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                Cliquez sur la carte ou glissez le pin pour placer votre position.
              </div>
            )}
          </div>
        )}

        {/* ── Carte — flex-1 pour remplir l'espace restant ── */}
        <div className="relative min-h-0 flex-1">

          {/* Bouton flottant "Choisir cet emplacement" */}
          {pendingConfirm && (
            <div className="absolute bottom-5 left-1/2 z-[1000] -translate-x-1/2">
              <button
                type="button"
                onClick={handleConfirm}
                className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.6)] active:translate-y-0"
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
          {!pendingConfirm && (
            <div className="pointer-events-none absolute top-3 left-1/2 z-[1000] -translate-x-1/2 whitespace-nowrap rounded-full border border-border/60 bg-card/92 px-3 py-1.5 text-[11px] font-semibold text-card-foreground shadow-sm backdrop-blur-sm">
              {source ? "Glissez le pin ou cliquez pour ajuster" : "Cliquez sur la carte pour placer l'epingle"}
            </div>
          )}

          <MapContainer
            center={center}
            zoom={zoom}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom
          >
            <Recenter center={center} zoom={zoom} />
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onPick={(lat, lng) => handlePick(lat, lng, "map_click")} />
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

        {/* ── Footer ── */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border/60 bg-muted/20 px-5 py-3">
          {/* Coordonnees */}
          <div className="flex min-w-0 items-center gap-2 text-xs">
            <SourceBadge source={source} />
            {source ? (
              <span className="truncate text-muted-foreground">
                <span className="font-semibold text-card-foreground">{pos.lat.toFixed(5)}</span>
                {", "}
                <span className="font-semibold text-card-foreground">{pos.lng.toFixed(5)}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">Aucune position selectionnee</span>
            )}
          </div>

          {/* Actions */}
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-card-foreground transition hover:bg-muted"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!source}
              className="h-9 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Confirmer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

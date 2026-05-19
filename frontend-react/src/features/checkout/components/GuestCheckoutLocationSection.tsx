import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";

import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import type { GouvernoratItem } from "../../geo/types/geo";
import { getDelegations } from "../../geo/api/geoApi";
import { fetchCenterByGovDelegation } from "../../geo/api/nominatimGeo";
import {
  reverseGeocodeNominatim,
  type NominatimReverseResponse,
} from "../../geo/api/nominatimApi";
import { getCenterForTunisia } from "../../geo/data/tunisiaCenters";

type Props = {
  gouvernorat: number;
  setGouvernorat: (next: number) => void;
  delegation: string;
  setDelegation: (next: string) => void;

  gouvernorats: GouvernoratItem[];
  delegations: string[];
  delegationsLoading: boolean;

  address: string;
  setAddress: (next: string) => void;

  postalCode: string;
  setPostalCode: (next: string) => void;

  latitude: number | null;
  setLatitude: (next: number | null) => void;

  longitude: number | null;
  setLongitude: (next: number | null) => void;
};

function normalizeText(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .toLowerCase()
    .replace(
      /\b(el|al|la|le|delegation|delegationde|delegation du|delegation de|delegationd|délégation|gouvernorat|gouvernement|commune|ville)\b/g,
      " "
    )
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function textMatches(a?: string | null, b?: string | null) {
  const left = normalizeText(a);
  const right = normalizeText(b);

  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right)) return true;
  if (right.includes(left)) return true;

  return false;
}

function roundCoordinate(value: number) {
  return Number(value.toFixed(6));
}

function buildAddressFromReverse(result: NominatimReverseResponse) {
  const address = result.address ?? {};

  const firstLine = [
    address.house_number?.trim(),
    address.road?.trim(),
    address.neighbourhood?.trim(),
    address.suburb?.trim(),
    address.city_district?.trim(),
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (firstLine) return firstLine;

  return (result.display_name ?? "").split(",").slice(0, 3).join(", ").trim();
}

function extractPostalCode(result: NominatimReverseResponse) {
  return result.address?.postcode?.trim() ?? "";
}

function getGovernoratCandidates(result: NominatimReverseResponse) {
  return [
    result.address?.state,
    result.address?.state_district,
    result.address?.county,
    result.address?.municipality,
    result.address?.city,
    result.address?.town,
    result.address?.village,
    result.display_name,
  ].filter(Boolean) as string[];
}

function getDelegationCandidates(result: NominatimReverseResponse) {
  return [
    result.address?.city,
    result.address?.town,
    result.address?.village,
    result.address?.hamlet,
    result.address?.municipality,
    result.address?.suburb,
    result.address?.city_district,
    result.address?.neighbourhood,
    result.address?.county,
    result.display_name,
  ].filter(Boolean) as string[];
}

function resolveGouvernoratIdFromReverse(
  result: NominatimReverseResponse,
  gouvernorats: GouvernoratItem[]
) {
  const candidates = getGovernoratCandidates(result);

  for (const candidate of candidates) {
    const found = gouvernorats.find((g) => textMatches(g.name, candidate));
    if (found) return found.id;
  }

  return null;
}

function resolveDelegationFromReverse(
  result: NominatimReverseResponse,
  delegationPool: string[]
) {
  const candidates = getDelegationCandidates(result);

  for (const candidate of candidates) {
    const found = delegationPool.find((item) => textMatches(item, candidate));
    if (found) return found;
  }

  return null;
}

function MapViewportSync({
  latitude,
  longitude,
  zoom,
}: {
  latitude: number | null;
  longitude: number | null;
  zoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (typeof latitude !== "number" || typeof longitude !== "number") return;

    map.setView([latitude, longitude], zoom, {
      animate: true,
    });

    window.setTimeout(() => {
      map.invalidateSize();
    }, 0);
  }, [map, latitude, longitude, zoom]);

  return null;
}

function MapPicker({
  latitude,
  longitude,
  onPick,
}: {
  latitude: number | null;
  longitude: number | null;
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return null;
  }

  return (
    <CircleMarker
      center={[latitude, longitude]}
      radius={10}
      pathOptions={{
        color: "#2563eb",
        fillColor: "#3b82f6",
        fillOpacity: 0.85,
        weight: 3,
      }}
    >
      <Popup>
        <div className="text-sm font-medium">
          Position sélectionnée
          <br />
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </div>
      </Popup>
    </CircleMarker>
  );
}

export function GuestCheckoutLocationSection({
  gouvernorat,
  setGouvernorat,
  delegation,
  setDelegation,
  gouvernorats,
  delegations,
  delegationsLoading,
  address,
  setAddress,
  postalCode,
  setPostalCode,
  latitude,
  setLatitude,
  longitude,
  setLongitude,
}: Props) {
  const [mapZoom, setMapZoom] = useState<number>(12);
  const [syncMessage, setSyncMessage] = useState<string>(
    "Choisissez un gouvernorat, puis une délégation, ou cliquez sur la carte pour synchroniser automatiquement la localisation."
  );

  const gouvernoratName = useMemo(() => {
    return gouvernorats.find((g) => g.id === gouvernorat)?.name ?? "";
  }, [gouvernorats, gouvernorat]);

  const fallbackCenter = useMemo(() => {
    const center = getCenterForTunisia(gouvernorat);
    return {
      lat: center.lat,
      lng: center.lng,
      zoom: center.zoom,
    };
  }, [gouvernorat]);

  const resolvedLatitude =
    typeof latitude === "number" ? latitude : fallbackCenter.lat;
  const resolvedLongitude =
    typeof longitude === "number" ? longitude : fallbackCenter.lng;

  const mapCenter: LatLngExpression = [resolvedLatitude, resolvedLongitude];

  function applyMapPosition(lat: number, lng: number, zoom: number) {
    setLatitude(roundCoordinate(lat));
    setLongitude(roundCoordinate(lng));
    setMapZoom(zoom);
  }

  function handleGovernoratChange(nextGovernoratId: number) {
    const nextGovernoratCenter = getCenterForTunisia(nextGovernoratId);
    const nextGovernoratName =
      gouvernorats.find((g) => g.id === nextGovernoratId)?.name ?? "ce gouvernorat";

    setGouvernorat(nextGovernoratId);
    setDelegation("");
    applyMapPosition(
      nextGovernoratCenter.lat,
      nextGovernoratCenter.lng,
      nextGovernoratCenter.zoom
    );

    setSyncMessage(
      `Carte recentrée sur ${nextGovernoratName}. Sélectionnez maintenant une délégation pour un positionnement plus précis.`
    );
  }

  function handleDelegationChange(nextDelegation: string) {
    setDelegation(nextDelegation);

    if (!nextDelegation.trim()) {
      setSyncMessage(
        "Délégation réinitialisée. La carte reste centrée sur le gouvernorat sélectionné."
      );
      return;
    }

    setSyncMessage(
      `Recherche du centre exact de ${nextDelegation}${
        gouvernoratName ? `, ${gouvernoratName}` : ""
      }...`
    );
  }

  const centerMutation = useMutation({
    mutationFn: async (payload: {
      gouvernoratName: string;
      delegation: string;
    }) => {
      return fetchCenterByGovDelegation(
        payload.gouvernoratName,
        payload.delegation
      );
    },
    onSuccess: (result, variables) => {
      applyMapPosition(result.lat, result.lng, result.bbox ? 13 : 14);

      setSyncMessage(
        result.displayName
          ? `Carte synchronisée sur : ${result.displayName}`
          : `Carte synchronisée sur ${variables.delegation}${
              variables.gouvernoratName ? `, ${variables.gouvernoratName}` : ""
            }.`
      );
    },
    onError: () => {
      setSyncMessage(
        "Impossible de centrer exactement la carte sur cette délégation pour le moment."
      );
    },
  });

  useEffect(() => {
    if (!gouvernoratName || !delegation.trim()) return;

    centerMutation.mutate({
      gouvernoratName,
      delegation,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gouvernoratName, delegation]);

  const reverseMutation = useMutation({
    mutationFn: async (payload: { lat: number; lng: number }) => {
      return reverseGeocodeNominatim(payload.lat, payload.lng);
    },
    onSuccess: async (result, variables) => {
      applyMapPosition(variables.lat, variables.lng, 15);

      const nextAddress = buildAddressFromReverse(result);
      if (nextAddress) {
        setAddress(nextAddress);
      }

      const nextPostalCode = extractPostalCode(result);
      if (nextPostalCode) {
        setPostalCode(nextPostalCode);
      }

      const matchedGovernoratId = resolveGouvernoratIdFromReverse(
        result,
        gouvernorats
      );

      let delegationPool = delegations;
      let matchedDelegation: string | null = null;

      if (matchedGovernoratId !== null) {
        if (matchedGovernoratId !== gouvernorat) {
          setGouvernorat(matchedGovernoratId);
        }

        try {
          delegationPool =
            matchedGovernoratId === gouvernorat
              ? delegations
              : await getDelegations(matchedGovernoratId);
        } catch {
          delegationPool = delegations;
        }

        matchedDelegation = resolveDelegationFromReverse(result, delegationPool);

        if (matchedDelegation) {
          setDelegation(matchedDelegation);
        } else {
          setDelegation("");
        }
      }

      const updatedAddress = Boolean(nextAddress);
      const updatedPostalCode = Boolean(nextPostalCode);
      const updatedGovernorat = matchedGovernoratId !== null;
      const updatedDelegation = Boolean(matchedDelegation);

      if (updatedGovernorat && updatedDelegation) {
        setSyncMessage(
          "Localisation détectée depuis la carte. Gouvernorat, délégation, adresse et code postal ont été synchronisés."
        );
        return;
      }

      if (updatedGovernorat) {
        setSyncMessage(
          "Localisation détectée depuis la carte. Le gouvernorat, l’adresse et la position ont été synchronisés, mais aucune délégation exacte n’a pu être confirmée."
        );
        return;
      }

      if (updatedAddress || updatedPostalCode) {
        setSyncMessage(
          "Adresse et code postal synchronisés. Le gouvernorat ou la délégation n’ont pas pu être déduits exactement depuis ce point."
        );
        return;
      }

      setSyncMessage(
        "Position mise à jour sur la carte, mais les informations administratives n’ont pas pu être synchronisées pour ce point."
      );
    },
    onError: () => {
      setSyncMessage(
        "Position mise à jour, mais certaines informations d’adresse n’ont pas pu être récupérées."
      );
    },
  });

  function handlePick(lat: number, lng: number) {
    reverseMutation.mutate({ lat, lng });
  }

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setSyncMessage("La géolocalisation n’est pas supportée par ce navigateur.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        handlePick(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        setSyncMessage(`Impossible de récupérer la position : ${error.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const selectClass =
    "h-11 w-full rounded-2xl border border-border bg-[hsl(var(--input))] px-4 text-sm text-card-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-primary/45 focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="app-surface space-y-6 p-8">
      <div>
        <h2 className="text-xl font-bold text-card-foreground">
          Localisation synchronisée
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choisissez le gouvernorat et la délégation pour déplacer la carte, ou
          cliquez directement sur la carte pour tenter de remplir automatiquement
          les champs.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-card-foreground">
            Gouvernorat
          </label>
          <div className="relative">
            <select
              className={selectClass}
              value={gouvernorat}
              onChange={(e) => handleGovernoratChange(Number(e.target.value))}
              disabled={gouvernorats.length === 0}
            >
              {gouvernorats.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-card-foreground">
            Délégation
          </label>
          <div className="relative">
            <select
              className={selectClass}
              value={delegation}
              onChange={(e) => handleDelegationChange(e.target.value)}
              disabled={delegationsLoading || delegations.length === 0}
            >
              <option value="">Choisir une délégation</option>
              {delegations.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-border/70 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-muted/30 px-4 py-3">
          <div className="text-sm font-semibold text-card-foreground">
            Carte interactive
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={handleUseCurrentLocation}
            isLoading={reverseMutation.isPending}
            disabled={reverseMutation.isPending}
          >
            Utiliser ma position
          </Button>
        </div>

        <div className="h-[360px] w-full">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            scrollWheelZoom
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapViewportSync
              latitude={resolvedLatitude}
              longitude={resolvedLongitude}
              zoom={mapZoom}
            />

            <MapPicker
              latitude={resolvedLatitude}
              longitude={resolvedLongitude}
              onPick={handlePick}
            />
          </MapContainer>
        </div>
      </div>

      <div className="rounded-[22px] border border-border/70 bg-muted/35 px-4 py-3 text-sm text-muted-foreground">
        {syncMessage}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-semibold text-card-foreground">
            Adresse
          </label>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Rue, résidence, repère..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-card-foreground">
            Code postal
          </label>
          <Input
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="Ex: 3000"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[20px] border border-border/70 bg-card px-4 py-3 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Latitude
            </div>
            <div className="mt-2 text-sm font-bold text-card-foreground">
              {typeof latitude === "number" ? latitude.toFixed(6) : "—"}
            </div>
          </div>

          <div className="rounded-[20px] border border-border/70 bg-card px-4 py-3 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Longitude
            </div>
            <div className="mt-2 text-sm font-bold text-card-foreground">
              {typeof longitude === "number" ? longitude.toFixed(6) : "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
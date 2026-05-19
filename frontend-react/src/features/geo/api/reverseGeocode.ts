export type ReverseGeocodeResult = {
  displayName: string;
  road?: string;
  houseNumber?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
};

function buildShortAddress(r: ReverseGeocodeResult) {
  const parts: string[] = [];

  const street = [r.houseNumber, r.road].filter(Boolean).join(" ");
  if (street) parts.push(street);

  if (r.city) parts.push(r.city);
  else if (r.state) parts.push(r.state);

  return parts.join(", ");
}

/**
 * Reverse geocoding via Nominatim (OpenStreetMap)
 * - Gratuit mais rate-limited => on cache
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<{ full: string; short: string; raw: ReverseGeocodeResult }> {
  const url =
    `https://nominatim.openstreetmap.org/reverse?` +
    `format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`;

  const res = await fetch(url, {
    method: "GET",
    signal,
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Reverse geocode failed: HTTP ${res.status}`);
  }

  const data: any = await res.json();

  const address = data?.address ?? {};
  const result: ReverseGeocodeResult = {
    displayName: typeof data?.display_name === "string" ? data.display_name : "",
    road: address.road ?? address.pedestrian ?? address.residential ?? undefined,
    houseNumber: address.house_number ?? undefined,
    city:
      address.city ??
      address.town ??
      address.village ??
      address.municipality ??
      undefined,
    state: address.state ?? undefined,
    postcode: address.postcode ?? undefined,
    country: address.country ?? undefined,
  };

  const short = buildShortAddress(result) || result.displayName || "";
  const full = result.displayName || short || "";

  return { full, short, raw: result };
}
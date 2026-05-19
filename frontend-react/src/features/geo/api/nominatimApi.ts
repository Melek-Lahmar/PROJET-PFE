export type NominatimReverseResponse = {
  place_id?: number;
  licence?: string;
  osm_type?: string;
  osm_id?: number;
  lat?: string;
  lon?: string;
  category?: string;
  type?: string;
  place_rank?: number;
  importance?: number;
  addresstype?: string;
  name?: string;
  display_name?: string;
  address?: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    city_district?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    municipality?: string;
    county?: string;
    state_district?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
  boundingbox?: [string, string, string, string];
};

const NOMINATIM_ACCEPT_LANGUAGE = "fr,en";

export async function reverseGeocodeNominatim(
  lat: number,
  lon: number
): Promise<NominatimReverseResponse> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", "18");
  url.searchParams.set("accept-language", NOMINATIM_ACCEPT_LANGUAGE);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Accept-Language": NOMINATIM_ACCEPT_LANGUAGE,
      "User-Agent": "PFE-Ecommerce-SageX3/1.0 (dev)",
      Referer: window.location.origin,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Nominatim reverse failed (${res.status}): ${text}`);
  }

  return (await res.json()) as NominatimReverseResponse;
}
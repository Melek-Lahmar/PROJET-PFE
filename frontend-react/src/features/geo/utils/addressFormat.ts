import type { NominatimReverseResponse } from "../types/nominatim";

function pickCity(a?: NominatimReverseResponse["address"]) {
  return a?.city || a?.town || a?.village || a?.county || a?.state || "";
}

/** Exemple: "3093 Rte Lafrane, Sfax" */
export function formatShortAddress(data?: NominatimReverseResponse | null) {
  if (!data) return "";

  const a = data.address;

  const road = a?.road ?? "";
  const house = a?.house_number ?? "";
  const suburb = a?.suburb || a?.neighbourhood || "";
  const city = pickCity(a);
  const state = a?.state ?? "";

  const line1 = [house, road].filter(Boolean).join(" ").trim();
  const cityState =
    city && state && city.toLowerCase() !== state.toLowerCase()
      ? `${city}, ${state}`
      : (city || state);

  const parts = [line1 || road || suburb, cityState].filter(Boolean);

  if (parts.length === 0 && data.display_name) return data.display_name;

  return parts.join(", ");
}
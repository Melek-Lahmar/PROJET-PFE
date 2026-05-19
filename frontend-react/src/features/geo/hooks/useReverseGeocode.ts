import { useQuery } from "@tanstack/react-query";
import { reverseGeocodeNominatim } from "../api/nominatimApi";

export function useReverseGeocode(lat?: number | null, lon?: number | null) {
  return useQuery({
    queryKey: ["reverse-geocode", lat, lon],
    queryFn: () => reverseGeocodeNominatim(lat as number, lon as number),
    enabled: typeof lat === "number" && typeof lon === "number",
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });
}
import { useCallback, useRef, useState } from "react";

export interface MapboxFeature {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
  place_type: string[];
  context?: Array<{ id: string; text: string }>;
}

interface MapboxGeocodeOptions {
  /** Token Mapbox. Fallback : import.meta.env.VITE_MAPBOX_TOKEN */
  token?: string;
  /** Pays limités (défaut: "tn") */
  country?: string;
  /** Types de résultats (défaut: "place,postcode,address,locality,neighborhood") */
  types?: string;
  /** Nombre max de résultats (défaut: 5) */
  limit?: number;
}

const DEBOUNCE_MS = 300;

export function useMapboxGeocode(options: MapboxGeocodeOptions = {}) {
  const {
    token = (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined) ?? "",
    country = "tn",
    types = "place,postcode,address,locality,neighborhood",
    limit = 5,
  } = options;

  const [results, setResults] = useState<MapboxFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(
    (query: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!query.trim() || query.trim().length < 2) {
        setResults([]);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        setLoading(true);
        setError(null);

        try {
          const encoded = encodeURIComponent(query.trim());
          const url =
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json` +
            `?access_token=${token}&country=${country}&types=${types}&limit=${limit}&language=fr`;

          const res = await fetch(url, { signal: abortRef.current.signal });
          if (!res.ok) throw new Error(`Mapbox Geocoding: ${res.status}`);

          const json = (await res.json()) as { features: MapboxFeature[] };
          setResults(json.features ?? []);
        } catch (err) {
          if ((err as Error).name === "AbortError") return;
          setError("Recherche indisponible. Vérifiez la clé Mapbox.");
          setResults([]);
        } finally {
          setLoading(false);
        }
      }, DEBOUNCE_MS);
    },
    [token, country, types, limit]
  );

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return { search, results, loading, error, clear };
}

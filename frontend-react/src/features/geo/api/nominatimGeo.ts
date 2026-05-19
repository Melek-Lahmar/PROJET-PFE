export type GeoBBox = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type GeoCenterResult = {
  lat: number;
  lng: number;
  bbox?: GeoBBox;
  displayName?: string;
  source: "nominatim" | "cache";
};

type CacheEntry = {
  lat: number;
  lng: number;
  bbox?: GeoBBox;
  displayName?: string;
  savedAt: number;
};

const CACHE_KEY = "geo-center-cache-v1";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const NOMINATIM_ACCEPT_LANGUAGE = "fr,en";

function loadCache(): Record<string, CacheEntry> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, CacheEntry>;
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, CacheEntry>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore localStorage failures
  }
}

function norm(value: string) {
  return value.trim().toLowerCase();
}

function makeKey(gouvernoratName: string, delegation: string) {
  return `${norm(gouvernoratName)}|${norm(delegation)}`;
}

function parseBoundingBox(raw: unknown): GeoBBox | undefined {
  if (!Array.isArray(raw) || raw.length !== 4) return undefined;

  const south = Number(raw[0]);
  const north = Number(raw[1]);
  const west = Number(raw[2]);
  const east = Number(raw[3]);

  if (![south, north, west, east].every((x) => Number.isFinite(x))) {
    return undefined;
  }

  return { south, west, north, east };
}

async function fetchCenterFromQuery(
  query: string,
  signal?: AbortSignal
): Promise<GeoCenterResult> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "tn");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", NOMINATIM_ACCEPT_LANGUAGE);
  url.searchParams.set("q", query);

  const res = await fetch(url.toString(), {
    method: "GET",
    signal,
    headers: {
      Accept: "application/json",
      "Accept-Language": NOMINATIM_ACCEPT_LANGUAGE,
      "User-Agent": "PFE-Ecommerce-SageX3/1.0 (dev)",
      Referer: window.location.origin,
    },
  });

  if (!res.ok) {
    throw new Error(`Nominatim: HTTP ${res.status}`);
  }

  const data = (await res.json()) as Array<{
    lat?: string;
    lon?: string;
    boundingbox?: unknown;
    display_name?: string;
  }>;

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("Aucun résultat trouvé pour cette requête.");
  }

  const item = data[0];
  const lat = Number(item.lat);
  const lng = Number(item.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Coordonnées invalides renvoyées par Nominatim.");
  }

  return {
    lat,
    lng,
    bbox: parseBoundingBox(item.boundingbox),
    displayName:
      typeof item.display_name === "string" ? item.display_name : undefined,
    source: "nominatim",
  };
}

export async function fetchCenterByGovDelegation(
  gouvernoratName: string,
  delegation: string,
  signal?: AbortSignal
): Promise<GeoCenterResult> {
  const key = makeKey(gouvernoratName, delegation);

  const cache = loadCache();
  const entry = cache[key];

  if (entry && Date.now() - entry.savedAt < CACHE_TTL_MS) {
    return {
      lat: entry.lat,
      lng: entry.lng,
      bbox: entry.bbox,
      displayName: entry.displayName,
      source: "cache",
    };
  }

  const attempts = [
    `${delegation}, ${gouvernoratName}, Tunisie`,
    `${delegation}, ${gouvernoratName}, Tunisia`,
    `${delegation}, Tunisie`,
    `${delegation}, Tunisia`,
  ];

  let lastError: unknown = null;

  for (const attempt of attempts) {
    try {
      const result = await fetchCenterFromQuery(attempt, signal);

      cache[key] = {
        lat: result.lat,
        lng: result.lng,
        bbox: result.bbox,
        displayName: result.displayName,
        savedAt: Date.now(),
      };
      saveCache(cache);

      return result;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Aucun résultat trouvé pour cette délégation.");
}
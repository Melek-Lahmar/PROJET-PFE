const rawApiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? "";
const normalizedApiBaseUrl = rawApiBaseUrl.replace(/\/+$/, "");

function tryGetOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url.replace(/\/+$/, "");
  }
}

export const env = {
  apiBaseUrl: normalizedApiBaseUrl,
  apiOrigin: tryGetOrigin(normalizedApiBaseUrl),
};
export function resolveImageUrl(raw: string | null | undefined, apiBaseUrl: string): string | null {
  const src = (raw ?? "").trim();
  if (!src) return null;

  const lower = src.toLowerCase();

  if (lower.startsWith("http://") || lower.startsWith("https://")) return src;
  if (lower.startsWith("data:") || lower.startsWith("blob:")) return src;
  if (src.startsWith("//")) return `https:${src}`;

  const base = (apiBaseUrl ?? "").replace(/\/+$/, "");
  const path = src.startsWith("/") ? src : `/${src}`;
  return `${base}${path}`;
}
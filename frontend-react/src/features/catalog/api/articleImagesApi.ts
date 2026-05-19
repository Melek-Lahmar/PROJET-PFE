import { axiosClient } from "../../../core/http/axiosClient";
import { endpoints } from "../../../core/http/endpoints";

export async function getArticleImageUrls(arRef: string): Promise<string[]> {
  const normalizedRef = arRef.trim();
  const { data } = await axiosClient.get<unknown>(endpoints.articleImages(normalizedRef));
  return Array.isArray(data)
    ? data.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean)
    : [];
}

export type MainImagesMap = Record<string, string | null | undefined>;

export async function getMainImagesMap(arRefs: string[]): Promise<MainImagesMap> {
  const sanitizedRefs = Array.from(new Set(arRefs.map((item) => item.trim()).filter(Boolean)));
  if (sanitizedRefs.length === 0) {
    return {};
  }

  const { data } = await axiosClient.post<Record<string, unknown>>(endpoints.mainImagesForArticles, {
    arRefs: sanitizedRefs,
  });

  const normalized: MainImagesMap = {};
  for (const [key, value] of Object.entries(data ?? {})) {
    normalized[key.trim()] = typeof value === "string" ? value.trim() : null;
  }

  return normalized;
}

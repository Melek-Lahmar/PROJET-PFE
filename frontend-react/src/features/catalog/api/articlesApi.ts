import axios from "axios";
import { axiosClient } from "../../../core/http/axiosClient";
import { endpoints } from "../../../core/http/endpoints";
import type { PagedResult } from "../../../core/types/api";
import type { Article, ArticleSortBy, SortDirection } from "../types/article";
import { normalizeArticle, normalizeArticlesPage } from "./articleMapper";

export type GetArticlesParams = {
  publishedOnly?: boolean;
  includeSleeping?: boolean;
  take?: number;
  skip?: number;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  stockStatus?: string;
  catalogueNo?: number;
  familyCode?: string;
  depotNo?: number;
  depotNos?: number[];
  sortBy?: ArticleSortBy;
  sortDirection?: SortDirection;
};

export type ArticleFilterMetadata = {
  count: number;
  minPrice: number | null;
  maxPrice: number | null;
};

function normalizeArticleRefForCompare(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .trim()
    .toUpperCase();
}

function buildApiError(error: unknown, fallback: string): Error {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error : new Error(fallback);
  }

  const payload = error.response?.data;
  const messageFromPayload =
    typeof payload === "string"
      ? payload
      : payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string"
        ? payload.message
        : null;

  return new Error(messageFromPayload || error.message || fallback);
}

function appendIfDefined(params: URLSearchParams, key: string, value: string | number | boolean | undefined) {
  if (value === undefined || value === null || value === "") return;
  params.append(key, String(value));
}

function buildArticlesQueryParams(params: GetArticlesParams = {}) {
  const searchParams = new URLSearchParams();

  appendIfDefined(searchParams, "publishedOnly", params.publishedOnly ?? true);
  appendIfDefined(searchParams, "includeSleeping", params.includeSleeping ?? false);
  appendIfDefined(searchParams, "take", params.take ?? 24);
  appendIfDefined(searchParams, "skip", params.skip ?? 0);
  appendIfDefined(searchParams, "search", params.search?.trim() || undefined);
  appendIfDefined(searchParams, "minPrice", params.minPrice);
  appendIfDefined(searchParams, "maxPrice", params.maxPrice);
  appendIfDefined(searchParams, "stockStatus", params.stockStatus);
  appendIfDefined(searchParams, "catalogueNo", params.catalogueNo);
  appendIfDefined(searchParams, "familyCode", params.familyCode?.trim() || undefined);
  appendIfDefined(searchParams, "depotNo", params.depotNo);
  appendIfDefined(searchParams, "sortBy", params.sortBy);
  appendIfDefined(searchParams, "sortDirection", params.sortDirection);

  for (const depotNo of params.depotNos ?? []) {
    appendIfDefined(searchParams, "depotNos", depotNo);
  }

  return searchParams;
}

function normalizeMetadata(raw: unknown): ArticleFilterMetadata {
  if (!raw || typeof raw !== "object") {
    return { count: 0, minPrice: null, maxPrice: null };
  }

  const source = raw as Record<string, unknown>;

  const count = typeof source.count === "number" ? source.count : Number(source.count ?? 0) || 0;
  const minRaw = source.minPrice;
  const maxRaw = source.maxPrice;

  const minPrice = typeof minRaw === "number" ? minRaw : typeof minRaw === "string" ? Number(minRaw) : null;
  const maxPrice = typeof maxRaw === "number" ? maxRaw : typeof maxRaw === "string" ? Number(maxRaw) : null;

  return {
    count,
    minPrice: Number.isFinite(minPrice as number) ? (minPrice as number) : null,
    maxPrice: Number.isFinite(maxPrice as number) ? (maxPrice as number) : null,
  };
}

export async function getArticles(params: GetArticlesParams = {}): Promise<PagedResult<Article>> {
  try {
    const res = await axiosClient.get<unknown>(endpoints.articles, {
      params: buildArticlesQueryParams(params),
    });

    return normalizeArticlesPage(res.data);
  } catch (error) {
    throw buildApiError(error, "Impossible de charger les articles.");
  }
}

export async function getArticleFilterMetadata(params: GetArticlesParams = {}): Promise<ArticleFilterMetadata> {
  try {
    const res = await axiosClient.get<unknown>(endpoints.articleFilterMetadata, {
      params: buildArticlesQueryParams({
        publishedOnly: params.publishedOnly,
        includeSleeping: params.includeSleeping,
        search: params.search,
        stockStatus: params.stockStatus,
        catalogueNo: params.catalogueNo,
        familyCode: params.familyCode,
        depotNo: params.depotNo,
        depotNos: params.depotNos,
      }),
    });

    return normalizeMetadata(res.data);
  } catch (error) {
    throw buildApiError(error, "Impossible de charger la plage de prix.");
  }
}

export async function getArticleByRef(arRef: string, params?: { depotNo?: number; depotNos?: number[] }): Promise<Article> {
  const normalizedRef = arRef.trim();
  const expectedRef = normalizeArticleRefForCompare(normalizedRef);

  try {
    const { data } = await axiosClient.get<unknown>(`/api/articles/${encodeURIComponent(normalizedRef)}`, {
      params: buildArticlesQueryParams({ depotNo: params?.depotNo, depotNos: params?.depotNos }),
    });

    return normalizeArticle(data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      throw error;
    }

    try {
      const fallback = await getArticles({
        search: normalizedRef,
        take: 200,
        skip: 0,
        publishedOnly: false,
        includeSleeping: true,
        depotNo: params?.depotNo,
        depotNos: params?.depotNos,
      });

      const match = fallback.items.find(
        (item) => normalizeArticleRefForCompare(item.aR_Ref) === expectedRef
      );

      if (match) {
        return match;
      }
    } catch {
      // On garde l'erreur initiale du détail.
    }

    throw buildApiError(error, `Impossible de charger l'article ${normalizedRef}.`);
  }
}
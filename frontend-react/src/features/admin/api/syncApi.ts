import { axiosClient } from "../../../core/http/axiosClient";
import { endpoints } from "../../../core/http/endpoints";

/**
 * Réponse typique d'un endpoint /api/sync/* — la forme varie selon le
 * contrôleur backend (parfois `{ message, count, ... }`, parfois texte brut).
 * On reste large pour ne pas mentir sur le schéma.
 */
export type SyncResult = {
  message?: string;
  count?: number;
  upserted?: number;
  inserted?: number;
  updated?: number;
  errors?: unknown;
  [key: string]: unknown;
};

/**
 * Réponse de `/api/SyncAll` — agrège les résultats des 4 syncs unitaires
 * en s'appuyant sur les noms exacts du contrôleur SyncAllController.cs.
 */
export type SyncAllResult = {
  message: string;
  results: Array<{
    type: string;
    statusCode: number;
    response: string | null;
  }>;
  errors: string[] | null;
  date: string;
};

export type SyncAllStatus = {
  message: string;
  statuses: Array<{
    type: string;
    statusCode: number;
    response: string | null;
  }>;
  date: string;
};

export async function syncArticles(): Promise<SyncResult> {
  const { data } = await axiosClient.post<SyncResult>(endpoints.syncArticles);
  return data;
}

export async function syncCatalogues(): Promise<SyncResult> {
  const { data } = await axiosClient.post<SyncResult>(endpoints.syncCatalogues);
  return data;
}

export async function syncDepots(): Promise<SyncResult> {
  const { data } = await axiosClient.post<SyncResult>(endpoints.syncDepots);
  return data;
}

export async function syncStocks(): Promise<SyncResult> {
  const { data } = await axiosClient.post<SyncResult>(endpoints.syncStocks);
  return data;
}

export async function syncAll(): Promise<SyncAllResult> {
  const { data } = await axiosClient.post<SyncAllResult>(endpoints.syncAll);
  return data;
}

export async function getSyncAllStatus(): Promise<SyncAllStatus> {
  const { data } = await axiosClient.get<SyncAllStatus>(endpoints.syncAllStatus);
  return data;
}

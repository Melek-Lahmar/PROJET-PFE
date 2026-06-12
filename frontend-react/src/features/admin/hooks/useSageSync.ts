import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  syncArticles,
  syncCatalogues,
  syncDepots,
  syncStocks,
  syncAll
} from "../api/syncApi"

function useSyncMutation<T>(mutationFn: () => Promise<T>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["pro-dashboard"] })
      void queryClient.invalidateQueries({ queryKey: ["sync-all-status"] })
    }
  })
}

export const useSyncArticles = () =>
  useSyncMutation(syncArticles)

export const useSyncCatalogues = () =>
  useSyncMutation(syncCatalogues)

export const useSyncDepots = () =>
  useSyncMutation(syncDepots)

export const useSyncStocks = () =>
  useSyncMutation(syncStocks)

export const useSyncAll = () =>
  useSyncMutation(syncAll)

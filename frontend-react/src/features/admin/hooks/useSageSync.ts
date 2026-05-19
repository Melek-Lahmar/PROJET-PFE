import { useMutation } from "@tanstack/react-query"

import {
  syncArticles,
  syncCatalogues,
  syncDepots,
  syncStocks,
  syncAll
} from "../api/syncApi"

export const useSyncArticles = () =>
  useMutation({
    mutationFn: syncArticles
  })

export const useSyncCatalogues = () =>
  useMutation({
    mutationFn: syncCatalogues
  })

export const useSyncDepots = () =>
  useMutation({
    mutationFn: syncDepots
  })

export const useSyncStocks = () =>
  useMutation({
    mutationFn: syncStocks
  })

export const useSyncAll = () =>
  useMutation({
    mutationFn: syncAll
  })
import type { PagedResult } from "../../../core/types/api";
import type { Article, StockStatus } from "../types/article";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function pick<T = unknown>(source: Record<string, unknown>, keys: string[]): T | undefined {
  for (const key of keys) {
    if (key in source) {
      return source[key] as T;
    }
  }
  return undefined;
}

function asString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "oui"].includes(normalized)) return true;
    if (["false", "0", "no", "non"].includes(normalized)) return false;
  }
  return fallback;
}

function normalizeStockStatus(value: unknown, availableStock: number, tracked: boolean): StockStatus {
  const normalized = asString(value).toUpperCase().replace(/\s+/g, "_");

  if (normalized === "IN_STOCK" || normalized === "INSTOCK" || normalized === "AVAILABLE") {
    return "IN_STOCK";
  }

  if (normalized === "LOW_STOCK" || normalized === "LOWSTOCK" || normalized === "LOW") {
    return "LOW_STOCK";
  }

  if (normalized === "OUT_OF_STOCK" || normalized === "OUTOFSTOCK" || normalized === "OUT") {
    return "OUT_OF_STOCK";
  }

  if (normalized === "NOT_TRACKED" || normalized === "UNTRACKED") {
    return "NOT_TRACKED";
  }

  if (!tracked) {
    return "NOT_TRACKED";
  }

  if (availableStock <= 0) return "OUT_OF_STOCK";
  if (availableStock <= 5) return "LOW_STOCK";
  return "IN_STOCK";
}

export function normalizeArticle(raw: unknown): Article {
  const source = isRecord(raw) ? raw : {};

  const aR_Ref = asString(pick(source, ["aR_Ref", "AR_Ref", "ar_Ref", "arRef"]));
  const aR_Design = asString(pick(source, ["aR_Design", "AR_Design", "ar_Design", "arDesign"]));
  const aR_DescriptionValue = pick(source, ["aR_Description", "AR_Description", "ar_Description", "arDescription"]);
  const fA_CodeFamille = asString(pick(source, ["fA_CodeFamille", "FA_CodeFamille", "fa_CodeFamille", "faCodeFamille"]));
  const aR_ImageValue = pick(source, ["aR_Image", "AR_Image", "ar_Image", "arImage"]);
  const availableStock = asNumber(pick(source, ["availableStock", "AvailableStock"]));
  const suiviStock = asNumber(pick(source, ["aR_SuiviStock", "AR_SuiviStock", "ar_SuiviStock", "arSuiviStock"]));
  const rawStockStatus = pick(source, ["stockStatus", "StockStatus"]);
  const tracked = suiviStock === 1 || availableStock !== 0 || asBoolean(pick(source, ["isOutOfStock", "IsOutOfStock"])) || asBoolean(pick(source, ["isLowStock", "IsLowStock"])) || asBoolean(pick(source, ["isInStock", "IsInStock"])) || ["IN_STOCK", "INSTOCK", "AVAILABLE", "LOW_STOCK", "LOWSTOCK", "LOW", "OUT_OF_STOCK", "OUTOFSTOCK", "OUT"].includes(asString(rawStockStatus).toUpperCase());
  const stockStatus = normalizeStockStatus(rawStockStatus, availableStock, tracked);
  const isOutOfStock = asBoolean(pick(source, ["isOutOfStock", "IsOutOfStock"]), stockStatus === "OUT_OF_STOCK");
  const isLowStock = asBoolean(pick(source, ["isLowStock", "IsLowStock"]), stockStatus === "LOW_STOCK");
  const isInStock = asBoolean(pick(source, ["isInStock", "IsInStock"]), stockStatus === "IN_STOCK");

  return {
    cbMarq: asNumber(pick(source, ["cbMarq", "CbMarq"])),
    aR_Ref,
    aR_Design,
    aR_Description: aR_DescriptionValue == null ? null : asString(aR_DescriptionValue),
    fA_CodeFamille,
    aR_UniteVen: asNumber(pick(source, ["aR_UniteVen", "AR_UniteVen"])),
    aR_PrixVen: asNumber(pick(source, ["aR_PrixVen", "AR_PrixVen"])),
    aR_PrixTTC: asNumber(pick(source, ["aR_PrixTTC", "AR_PrixTTC"])),
    aR_SuiviStock: suiviStock,
    aR_Sommeil: asNumber(pick(source, ["aR_Sommeil", "AR_Sommeil"])),
    aR_Image: aR_ImageValue == null ? null : asString(aR_ImageValue),
    aR_CodeBarre: asString(pick(source, ["aR_CodeBarre", "AR_CodeBarre"])),
    aR_Publie: asNumber(pick(source, ["aR_Publie", "AR_Publie"])),
    cL_No1: asNumber(pick(source, ["cL_No1", "CL_No1"])),
    cL_No2: asNumber(pick(source, ["cL_No2", "CL_No2"])),
    cL_No3: asNumber(pick(source, ["cL_No3", "CL_No3"])),
    cL_No4: asNumber(pick(source, ["cL_No4", "CL_No4"])),
    aR_Type: asNumber(pick(source, ["aR_Type", "AR_Type"])),
    availableStock,
    stockStatus,
    isOutOfStock,
    isLowStock,
    isInStock,
  };
}

export function normalizeArticlesPage(raw: unknown): PagedResult<Article> {
  const source = isRecord(raw) ? raw : {};
  const itemsRaw = pick<unknown[]>(source, ["items", "Items"]);
  const items = Array.isArray(itemsRaw) ? itemsRaw.map(normalizeArticle) : [];

  return {
    total: asNumber(pick(source, ["total", "Total"]), items.length),
    skip: asNumber(pick(source, ["skip", "Skip"])),
    take: asNumber(pick(source, ["take", "Take"]), items.length),
    items,
  };
}

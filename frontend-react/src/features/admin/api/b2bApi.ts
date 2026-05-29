import { axiosClient } from "../../../core/http/axiosClient";
import { endpoints } from "../../../core/http/endpoints";

export type B2BClient = {
  userId: string | null;
  nomComplet: string | null;
  nomSociete: string | null;
  telephone: string | null;
  discountPercent: number | null;
  legacyRemise: number | null;
  gouvernorat: string | null;
  totalRevenue: number;
  ordersCount: number;
  averageOrderAmount: number;
  lastOrderDate: string | null;
  suggestedDiscountPercent: number;
  discountLevelLabel: string;
};

export type B2BDiscountUpdateResult = {
  clientUserId: string;
  oldValue: number | null;
  newValue: number | null;
  reason: string | null;
  changedAt: string;
  discountPercent: number | null;
};

export type B2BDiscountHistoryRow = {
  id: string;
  clientUserId: string;
  oldValue: number | null;
  newValue: number | null;
  changedByAdminId: string;
  changedAt: string;
  reason: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function pick(source: Record<string, unknown>, camel: string, pascal: string) {
  return source[camel] ?? source[pascal];
}

function asString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return null;
  return String(value);
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export async function listB2BClients(): Promise<B2BClient[]> {
  const { data } = await axiosClient.get<unknown>("/api/admin/clients/b2b");
  return Array.isArray(data) ? data.filter(isRecord).map((d) => ({
    userId: asString(pick(d, "userId", "UserId")),
    nomComplet: asString(pick(d, "nomComplet", "NomComplet")),
    nomSociete: asString(pick(d, "nomSociete", "NomSociete")),
    telephone: asString(pick(d, "telephone", "Telephone")),
    discountPercent: asNumber(pick(d, "discountPercent", "DiscountPercent")),
    legacyRemise: asNumber(pick(d, "legacyRemise", "LegacyRemise")),
    gouvernorat: asString(pick(d, "gouvernorat", "Gouvernorat")),
    totalRevenue: asNumber(pick(d, "totalRevenue", "TotalRevenue")) ?? 0,
    ordersCount: asNumber(pick(d, "ordersCount", "OrdersCount")) ?? 0,
    averageOrderAmount: asNumber(pick(d, "averageOrderAmount", "AverageOrderAmount")) ?? 0,
    lastOrderDate: asString(pick(d, "lastOrderDate", "LastOrderDate")),
    suggestedDiscountPercent: asNumber(pick(d, "suggestedDiscountPercent", "SuggestedDiscountPercent")) ?? 0,
    discountLevelLabel: asString(pick(d, "discountLevelLabel", "DiscountLevelLabel")) ?? "Standard",
  })) : [];
}

export async function setClientDiscount(clientId: string, value: number | null, reason?: string): Promise<B2BDiscountUpdateResult> {
  const { data } = await axiosClient.patch(endpoints.adminClientDiscount(clientId), { value, reason });
  return data;
}

export async function listClientDiscountHistory(clientId: string): Promise<B2BDiscountHistoryRow[]> {
  const { data } = await axiosClient.get<unknown>(endpoints.adminClientDiscountHistory(clientId));
  return Array.isArray(data) ? data.filter(isRecord).map((d) => ({
    id: asString(pick(d, "id", "Id")) ?? "",
    clientUserId: asString(pick(d, "clientUserId", "ClientUserId")) ?? "",
    oldValue: asNumber(pick(d, "oldValue", "OldValue")),
    newValue: asNumber(pick(d, "newValue", "NewValue")),
    changedByAdminId: asString(pick(d, "changedByAdminId", "ChangedByAdminId")) ?? "",
    changedAt: asString(pick(d, "changedAt", "ChangedAt")) ?? "",
    reason: asString(pick(d, "reason", "Reason")),
  })) : [];
}

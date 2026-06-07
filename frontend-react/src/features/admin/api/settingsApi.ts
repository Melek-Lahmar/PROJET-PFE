import { axiosClient } from "../../../core/http/axiosClient";
import { endpoints } from "../../../core/http/endpoints";

export type AppSetting = {
  key: string;
  valueJson: string;
  description?: string | null;
  isPublic: boolean;
  updatedAt: string;
  updatedByAdminId?: string | null;
};

export type DeliveryFeeSetting = {
  key: string;
  value: number;
  isPublic: boolean;
  updatedAt?: string | null;
  updatedByAdminId?: string | null;
};

function normalize(raw: any): AppSetting {
  return {
    key: raw.key ?? raw.Key,
    valueJson: raw.valueJson ?? raw.ValueJson ?? "null",
    description: raw.description ?? raw.Description ?? null,
    isPublic: Boolean(raw.isPublic ?? raw.IsPublic ?? false),
    updatedAt: raw.updatedAt ?? raw.UpdatedAt,
    updatedByAdminId: raw.updatedByAdminId ?? raw.UpdatedByAdminId ?? null,
  };
}

export async function listSettings(): Promise<AppSetting[]> {
  const { data } = await axiosClient.get<any[]>(endpoints.adminSettings);
  return Array.isArray(data) ? data.map(normalize) : [];
}

export async function getPublicSettings(): Promise<Record<string, unknown>> {
  const { data } = await axiosClient.get<Record<string, string>>(endpoints.publicSettings);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data ?? {})) {
    try { out[k] = JSON.parse(v as string); } catch { out[k] = v; }
  }
  return out;
}

export async function putSetting(key: string, valueJson: string, isPublic: boolean, description?: string) {
  const { data } = await axiosClient.put(endpoints.adminSettingByKey(key), { valueJson, isPublic, description });
  return normalize(data);
}

export async function getDeliveryFee(): Promise<DeliveryFeeSetting> {
  const { data } = await axiosClient.get<any>(endpoints.adminDeliveryFee);
  return {
    key: data.key ?? data.Key ?? "checkout.deliveryFee.home",
    value: Number(data.value ?? data.Value ?? 8),
    isPublic: Boolean(data.isPublic ?? data.IsPublic ?? true),
    updatedAt: data.updatedAt ?? data.UpdatedAt ?? null,
    updatedByAdminId: data.updatedByAdminId ?? data.UpdatedByAdminId ?? null,
  };
}

export async function putDeliveryFee(value: number): Promise<DeliveryFeeSetting> {
  const { data } = await axiosClient.put<any>(endpoints.adminDeliveryFee, { value });
  return {
    key: data.key ?? data.Key ?? "checkout.deliveryFee.home",
    value: Number(data.value ?? data.Value ?? value),
    isPublic: Boolean(data.isPublic ?? data.IsPublic ?? true),
    updatedAt: data.updatedAt ?? data.UpdatedAt ?? null,
    updatedByAdminId: data.updatedByAdminId ?? data.UpdatedByAdminId ?? null,
  };
}

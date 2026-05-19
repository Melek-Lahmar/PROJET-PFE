import { axiosClient } from "../../../core/http/axiosClient";
import { endpoints } from "../../../core/http/endpoints";
import type {
  ClientAddress,
  ClientAddressAdminDto,
  ClientAddressUpsert,
} from "../types";

function normalize(raw: any): ClientAddress {
  return {
    id: String(raw.id ?? raw.Id ?? ""),
    clientUserId: raw.clientUserId ?? raw.ClientUserId,
    label: raw.label ?? raw.Label ?? "",
    adresse: raw.adresse ?? raw.Adresse ?? "",
    gouvernorat: raw.gouvernorat ?? raw.Gouvernorat ?? "",
    delegation: raw.delegation ?? raw.Delegation ?? null,
    ville: raw.ville ?? raw.Ville ?? "",
    codePostal: raw.codePostal ?? raw.CodePostal ?? null,
    latitude: raw.latitude ?? raw.Latitude ?? null,
    longitude: raw.longitude ?? raw.Longitude ?? null,
    isDefault: Boolean(raw.isDefault ?? raw.IsDefault ?? false),
    createdAt: raw.createdAt ?? raw.CreatedAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? raw.UpdatedAt ?? null,
  };
}

function normalizeAdmin(raw: any): ClientAddressAdminDto {
  return {
    id: String(raw.id ?? raw.Id ?? ""),
    label: raw.label ?? raw.Label ?? "",
    adresse: raw.adresse ?? raw.Adresse ?? "",
    gouvernorat: raw.gouvernorat ?? raw.Gouvernorat ?? "",
    delegation: raw.delegation ?? raw.Delegation ?? null,
    ville: raw.ville ?? raw.Ville ?? "",
    codePostal: raw.codePostal ?? raw.CodePostal ?? null,
    isDefault: Boolean(raw.isDefault ?? raw.IsDefault ?? false),
    createdAt: raw.createdAt ?? raw.CreatedAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? raw.UpdatedAt ?? null,
  };
}

export async function listAddresses(): Promise<ClientAddress[]> {
  const { data } = await axiosClient.get<any[]>(endpoints.clientAddresses);
  return Array.isArray(data) ? data.map(normalize) : [];
}

export async function createAddress(
  payload: ClientAddressUpsert,
): Promise<ClientAddress> {
  const { data } = await axiosClient.post(endpoints.clientAddresses, payload);
  return normalize(data);
}

export async function updateAddress(
  id: string,
  payload: ClientAddressUpsert,
): Promise<ClientAddress> {
  const { data } = await axiosClient.put(endpoints.clientAddressById(id), payload);
  return normalize(data);
}

export async function deleteAddress(id: string): Promise<void> {
  await axiosClient.delete(endpoints.clientAddressById(id));
}

export async function setDefaultAddress(id: string): Promise<ClientAddress> {
  const { data } = await axiosClient.put(endpoints.clientAddressSetDefault(id));
  return normalize(data);
}

export async function listAdminClientAddresses(
  clientId: string,
): Promise<ClientAddressAdminDto[]> {
  const { data } = await axiosClient.get<any[]>(
    endpoints.adminClientAddresses(clientId),
  );
  return Array.isArray(data) ? data.map(normalizeAdmin) : [];
}

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

export async function listB2BClients(): Promise<B2BClient[]> {
  const { data } = await axiosClient.get<any[]>("/api/admin/clients/b2b");
  return Array.isArray(data) ? data.map((d) => ({
    userId: d.userId ?? d.UserId ?? null,
    nomComplet: d.nomComplet ?? d.NomComplet ?? null,
    nomSociete: d.nomSociete ?? d.NomSociete ?? null,
    telephone: d.telephone ?? d.Telephone ?? null,
    discountPercent: d.discountPercent ?? d.DiscountPercent ?? null,
    legacyRemise: d.legacyRemise ?? d.LegacyRemise ?? null,
    gouvernorat: d.gouvernorat ?? d.Gouvernorat ?? null,
  })) : [];
}

export async function setClientDiscount(clientId: string, value: number | null, reason?: string) {
  const { data } = await axiosClient.patch(endpoints.adminClientDiscount(clientId), { value, reason });
  return data;
}

export async function listClientDiscountHistory(clientId: string): Promise<B2BDiscountHistoryRow[]> {
  const { data } = await axiosClient.get<any[]>(endpoints.adminClientDiscountHistory(clientId));
  return Array.isArray(data) ? data.map((d) => ({
    id: d.id ?? d.Id,
    clientUserId: d.clientUserId ?? d.ClientUserId,
    oldValue: d.oldValue ?? d.OldValue ?? null,
    newValue: d.newValue ?? d.NewValue ?? null,
    changedByAdminId: d.changedByAdminId ?? d.ChangedByAdminId,
    changedAt: d.changedAt ?? d.ChangedAt,
    reason: d.reason ?? d.Reason ?? null,
  })) : [];
}

import { axiosClient } from "../../../core/http/axiosClient";
import { endpoints } from "../../../core/http/endpoints";
import type {
  AdminClientDetail,
  AdminClientListItem,
  AdminOrderDetail,
  AdminOrderSummary,
  AdminPersonnelItem,
  ClientKind,
  OrderBucket,
} from "../types/adminBackoffice";

export async function adminListPersonnel() {
  const { data } = await axiosClient.get<AdminPersonnelItem[]>(endpoints.adminPersonnel);
  return data;
}

export async function adminListClients(kind: ClientKind) {
  const { data } = await axiosClient.get<AdminClientListItem[]>(endpoints.adminClients, {
    params: kind === "ALL" ? undefined : { kind },
  });
  return data;
}

export async function adminGetClientById(userId: string) {
  const { data } = await axiosClient.get<AdminClientDetail>(endpoints.adminClientById(userId));
  return data;
}

export async function adminGetClientOrders(userId: string) {
  const { data } = await axiosClient.get<AdminOrderSummary[]>(endpoints.adminClientOrders(userId));
  return data;
}

export async function adminListOrders(bucket: OrderBucket) {
  const { data } = await axiosClient.get<AdminOrderSummary[]>(endpoints.adminOrders, {
    params: { bucket },
  });
  return data;
}

export async function adminGetOrderByPiece(piece: string) {
  const { data } = await axiosClient.get<AdminOrderDetail>(endpoints.adminOrderByPiece(piece));
  return data;
}
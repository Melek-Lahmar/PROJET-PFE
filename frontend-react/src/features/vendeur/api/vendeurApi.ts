import { axiosClient } from "../../../core/http/axiosClient";
import { endpoints } from "../../../core/http/endpoints";
import type {
  VendeurClientLookupItemDto,
  VendeurContextResponseDto,
  VendeurCreateBonCommandeRequestDto,
  VendeurOrderResponseDto,
} from "../types/vendeur";

export async function getVendeurContext() {
  const res = await axiosClient.get<VendeurContextResponseDto>(endpoints.vendeurContext);
  return res.data;
}

export async function searchVendeurClients(query: string) {
  const res = await axiosClient.get<VendeurClientLookupItemDto[]>(endpoints.vendeurClients, {
    params: { q: query.trim() || undefined },
  });
  return res.data;
}

export async function createVendeurOrder(payload: VendeurCreateBonCommandeRequestDto) {
  const res = await axiosClient.post<VendeurOrderResponseDto>(endpoints.vendeurOrders, payload);
  return res.data;
}

export async function getVendeurOrders() {
  const res = await axiosClient.get<VendeurOrderResponseDto[]>(endpoints.vendeurOrders);
  return res.data;
}

export async function getVendeurOrderByPiece(piece: string) {
  const res = await axiosClient.get<VendeurOrderResponseDto>(endpoints.vendeurOrderByPiece(piece));
  return res.data;
}

export async function getVendeurFacturePdf(piece: string): Promise<Blob> {
  const res = await axiosClient.get(`/api/vendeur/orders/${encodeURIComponent(piece)}/facture-pdf`, {
    responseType: "blob",
  });
  return res.data;
}
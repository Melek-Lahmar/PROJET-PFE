import { axiosClient } from "../../../core/http/axiosClient";
import type {
  BonCommandeResponseDto,
  CreateBonCommandeRequestDto,
  CreateGuestBonCommandeRequestDto,
  OrderItemsTransitSummaryDto,
  OrderTimelineDto,
} from "../types/order";

export async function getMyOrders() {
  const res = await axiosClient.get<BonCommandeResponseDto[]>("/api/orders");
  return res.data;
}

export async function getOrderByPiece(piece: string) {
  const res = await axiosClient.get<BonCommandeResponseDto>(
    `/api/orders/${encodeURIComponent(piece)}`
  );
  return res.data;
}

export async function getOrderTimeline(piece: string) {
  const res = await axiosClient.get<OrderTimelineDto>(
    `/api/orders/${encodeURIComponent(piece)}/timeline`
  );
  return res.data;
}

export async function getOrderTransitSummary(piece: string) {
  const res = await axiosClient.get<OrderItemsTransitSummaryDto>(
    `/api/orders/${encodeURIComponent(piece)}/transit-summary`
  );
  return res.data;
}

export async function createOrder(payload: CreateBonCommandeRequestDto) {
  const res = await axiosClient.post<BonCommandeResponseDto>("/api/orders", payload);
  return res.data;
}

export async function createGuestOrder(payload: CreateGuestBonCommandeRequestDto) {
  const res = await axiosClient.post<BonCommandeResponseDto>("/api/orders/guest", payload);
  return res.data;
}

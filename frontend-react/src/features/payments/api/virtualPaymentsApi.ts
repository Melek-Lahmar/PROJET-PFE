import { axiosClient } from "../../../core/http/axiosClient";
import { endpoints } from "../../../core/http/endpoints";
import type {
  CreateBonCommandeRequestDto,
  CreateGuestBonCommandeRequestDto,
} from "../../orders/types/order";
import type {
  PendingVirtualPayment,
  VirtualCancelPaymentRequestDto,
  VirtualConfirmPaymentRequestDto,
  VirtualInitiatePaymentResponseDto,
  VirtualPaymentResultDto,
  VirtualPaymentStatusDto,
  VirtualTestCardDto,
} from "../types/virtualPayment";

const STORAGE_KEY = "virtual_pending_payments_v1";

function canUseSessionStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function readPendingPayments(): PendingVirtualPayment[] {
  if (!canUseSessionStorage()) return [];

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is PendingVirtualPayment => {
      return (
        item &&
        typeof item.piece === "string" &&
        typeof item.paymentRef === "string" &&
        typeof item.source === "string" &&
        typeof item.amount === "number" &&
        typeof item.createdAt === "number"
      );
    });
  } catch {
    return [];
  }
}

function writePendingPayments(items: PendingVirtualPayment[]) {
  if (!canUseSessionStorage()) return;

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 10)));
  } catch {
    // Session storage can be unavailable in restricted browser modes.
  }
}

export function savePendingVirtualPayment(item: PendingVirtualPayment) {
  const current = readPendingPayments().filter(
    (x) => !(x.piece === item.piece && x.paymentRef === item.paymentRef)
  );

  const next = [item, ...current].sort((a, b) => b.createdAt - a.createdAt);
  writePendingPayments(next);
}

export function getPendingVirtualPaymentByPiece(piece: string) {
  const normalized = piece.trim();
  return readPendingPayments().find((x) => x.piece === normalized) ?? null;
}

export function removePendingVirtualPayment(piece: string, paymentRef?: string) {
  const normalizedPiece = piece.trim();
  const normalizedRef = paymentRef?.trim();

  const next = readPendingPayments().filter((x) => {
    if (x.piece !== normalizedPiece) return true;
    if (!normalizedRef) return false;
    return x.paymentRef !== normalizedRef;
  });

  writePendingPayments(next);
}

export async function initiateVirtualPayment(payload: CreateBonCommandeRequestDto) {
  const res = await axiosClient.post<VirtualInitiatePaymentResponseDto>(
    endpoints.virtualInitiate,
    payload
  );
  return res.data;
}

export async function initiateVirtualGuestPayment(payload: CreateGuestBonCommandeRequestDto) {
  const res = await axiosClient.post<VirtualInitiatePaymentResponseDto>(
    endpoints.virtualInitiateGuest,
    payload
  );
  return res.data;
}

export async function confirmVirtualPayment(payload: VirtualConfirmPaymentRequestDto) {
  const res = await axiosClient.post<VirtualPaymentResultDto>(
    endpoints.virtualConfirm,
    payload
  );
  return res.data;
}

export async function cancelVirtualPayment(piece: string, paymentRef: string) {
  const payload: VirtualCancelPaymentRequestDto = { piece, paymentRef };
  const res = await axiosClient.post<VirtualPaymentStatusDto>(
    endpoints.virtualCancel,
    payload
  );
  return res.data;
}

export async function getVirtualPaymentStatus(piece: string, paymentRef: string) {
  const res = await axiosClient.get<VirtualPaymentStatusDto>(endpoints.virtualStatus, {
    params: {
      piece,
      paymentRef,
    },
  });

  return res.data;
}

export async function getVirtualTestCards() {
  const res = await axiosClient.get<VirtualTestCardDto[]>(endpoints.virtualTestCards);
  return res.data;
}

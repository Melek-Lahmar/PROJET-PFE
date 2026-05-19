import { axiosClient } from "../../../core/http/axiosClient";
import { endpoints } from "../../../core/http/endpoints";
import type { CreateBonCommandeRequestDto } from "../../orders/types/order";
import type {
  KonnectInitiatePaymentResponseDto,
  KonnectPublicPaymentStatusDto,
  PendingKonnectPayment,
} from "../types/konnectPayment";

const STORAGE_KEY = "konnect_pending_payments_v1";

function canUseSessionStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function readPendingPayments(): PendingKonnectPayment[] {
  if (!canUseSessionStorage()) return [];

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is PendingKonnectPayment => {
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

function writePendingPayments(items: PendingKonnectPayment[]) {
  if (!canUseSessionStorage()) return;

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 10)));
  } catch {
    // no-op
  }
}

export function savePendingKonnectPayment(item: PendingKonnectPayment) {
  const current = readPendingPayments().filter(
    (x) => !(x.piece === item.piece && x.paymentRef === item.paymentRef)
  );

  const next = [item, ...current].sort((a, b) => b.createdAt - a.createdAt);
  writePendingPayments(next);
}

export function getPendingKonnectPaymentByPiece(piece: string) {
  const normalized = piece.trim();
  return readPendingPayments().find((x) => x.piece === normalized) ?? null;
}

export function removePendingKonnectPayment(piece: string, paymentRef?: string) {
  const normalizedPiece = piece.trim();
  const normalizedRef = paymentRef?.trim();

  const next = readPendingPayments().filter((x) => {
    if (x.piece !== normalizedPiece) return true;
    if (!normalizedRef) return false;
    return x.paymentRef !== normalizedRef;
  });

  writePendingPayments(next);
}

export async function initiateKonnectPayment(payload: CreateBonCommandeRequestDto) {
  const res = await axiosClient.post<KonnectInitiatePaymentResponseDto>(
    endpoints.konnectInitiate,
    payload
  );
  return res.data;
}

export async function getKonnectPaymentStatus(
  piece: string,
  paymentRef: string,
  refresh = true
) {
  const res = await axiosClient.get<KonnectPublicPaymentStatusDto>(endpoints.konnectStatus, {
    params: {
      piece,
      paymentRef,
      refresh,
    },
  });

  return res.data;
}
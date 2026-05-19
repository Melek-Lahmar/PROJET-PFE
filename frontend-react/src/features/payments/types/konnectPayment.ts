export type CheckoutPaymentMethod = "COD" | "VIRTUAL";

export type KonnectReturnSource = "account" | "guest";

export type KonnectInitiatePaymentResponseDto = {
  localPaymentId: number;
  piece: string;
  provider: string;
  paymentRef: string;
  payUrl: string;
  amount: number;
  currency: string;
  localStatusCode: number;
  localStatus: string;
  isSandbox: boolean;
  isMock: boolean;
};

export type KonnectPublicPaymentStatusDto = {
  localPaymentId: number;
  piece: string;
  provider: string;
  paymentRef: string;
  providerPaymentId?: string | null;
  amount: number;
  currency: string;
  localStatusCode: number;
  localStatus: string;
  externalStatus?: string | null;
  createdAtUtc: string;
  lastModifiedAtUtc?: string | null;
  paidAtUtc?: string | null;
  isSandbox: boolean;
  isMock: boolean;
  isFinal: boolean;
};

export type PendingKonnectPayment = {
  piece: string;
  paymentRef: string;
  source: KonnectReturnSource;
  amount: number;
  createdAt: number;
};

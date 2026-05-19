export type VirtualPaymentStatusCode =
  | "INITIE"
  | "EN_ATTENTE"
  | "SUCCES"
  | "ECHEC"
  | "ANNULE"
  | "EXPIRE"
  | string;

export type VirtualPaymentResult =
  | "SUCCES"
  | "ECHEC"
  | "ANNULE"
  | "EXPIRE"
  | "EN_ATTENTE"
  | string;

export type VirtualInitiatePaymentResponseDto = {
  localPaymentId: number;
  piece: string;
  provider: string;
  paymentRef: string;
  providerPaymentId?: string | null;
  payUrl: string;
  amount: number;
  currency: string;
  localStatusCode: number;
  localStatus: VirtualPaymentStatusCode;
  status?: VirtualPaymentStatusCode;
  isSandbox: boolean;
  message: string;
};

export type VirtualConfirmPaymentRequestDto = {
  piece: string;
  paymentRef: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
  cardHolderName: string;
  otp: string;
};

export type VirtualCancelPaymentRequestDto = {
  piece: string;
  paymentRef: string;
};

export type VirtualPaymentStatusDto = {
  localPaymentId: number;
  piece: string;
  provider: string;
  paymentRef: string;
  providerPaymentId?: string | null;
  amount: number;
  currency: string;
  localStatusCode: number;
  localStatus: VirtualPaymentStatusCode;
  status?: VirtualPaymentStatusCode;
  externalStatus?: string | null;
  message: string;
  createdAtUtc: string;
  lastModifiedAtUtc?: string | null;
  paidAtUtc?: string | null;
  isSandbox: boolean;
  isFinal: boolean;
  isSuccess: boolean;
};

export type VirtualTestCardDto = {
  cardNumber: string;
  result: VirtualPaymentResult;
  externalStatus: string;
  message: string;
  cvv: string;
  otp: string;
};

export type VirtualPaymentResultDto = {
  success: boolean;
  result: VirtualPaymentResult;
  message: string;
  status: VirtualPaymentStatusDto;
};

export type VirtualReturnSource = "account" | "guest";

export type PendingVirtualPayment = {
  piece: string;
  paymentRef: string;
  source: VirtualReturnSource;
  amount: number;
  createdAt: number;
};

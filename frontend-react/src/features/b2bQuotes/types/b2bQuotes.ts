export type QuoteStatus =
  | "BROUILLON"
  | "SOUMIS"
  | "EN_ETUDE"
  | "INFO_MANQUANTE"
  | "REPONSE_CLIENT"
  | "MODIFIE"
  | "VALIDE"
  | "ENVOYE_CLIENT"
  | "ACCEPTE_CLIENT"
  | "REFUSE_CLIENT"
  | "EXPIRE"
  | "CONVERTI_BC"
  | "ANNULE";

export type CreateQuoteLineRequestDto = {
  articleRef: string;
  qty: number;
};

export type CreateQuoteRequestDto = {
  clientUserId: string;
  validUntil?: string | null;
  internalNote?: string | null;
  clientNote?: string | null;
  sendImmediately: boolean;
  lines: CreateQuoteLineRequestDto[];
};

export type QuoteLineDto = {
  articleRef: string;
  designation?: string | null;
  qty: number;
  unitPrice: number;
  amountHT: number;
  amountTTC: number;
};

export type QuoteTimelineItemDto = {
  label: string;
  date?: string | null;
  status: string;
};

export type QuoteListItemDto = {
  piece: string;
  devisPiece?: string;
  date?: string | null;
  createdAt?: string | null;
  clientName?: string | null;
  companyName?: string | null;
  clientCode?: string | null;
  clientPhone?: string | null;
  quoteStatus: QuoteStatus | string;
  statusKey?: QuoteStatus | string;
  validUntil?: string | null;
  totalBeforeDiscount: number;
  b2bDiscountRate?: number | null;
  b2bDiscountAmount: number;
  netAPayer: number;
  createdBy?: string | null;
  assignedTo?: string | null;
  bcPiece?: string | null;
};

export type QuoteDetailDto = QuoteListItemDto & {
  clientUserId?: string | null;
  discountSource?: string | null;
  clientNote?: string | null;
  internalNote?: string | null;
  sentAt?: string | null;
  acceptedAt?: string | null;
  refusedAt?: string | null;
  convertedAt?: string | null;
  quoteConvertedToPiece?: string | null;
  bcPiece?: string | null;
  version?: number;
  lines: QuoteLineDto[];
  timeline: QuoteTimelineItemDto[];
  events?: QuoteEventDto[];
};

export type QuoteDecisionRequestDto = {
  reason?: string | null;
  comment?: string | null;
};

export type ConvertQuoteToOrderResult = {
  piece: string;
  quotePiece: string;
  devisPiece?: string;
  bcPiece?: string;
  alreadyConverted?: boolean;
  message?: string;
};

export type QuoteEventDto = {
  id: number;
  eventType: string;
  authorRole?: string | null;
  oldStatus?: string | null;
  newStatus?: string | null;
  message?: string | null;
  isPublic: boolean;
  createdAt: string;
};

export type AddQuoteCommentPayload = {
  message: string;
  isPublic?: boolean;
};

export type UpdateQuoteLinesPayload = {
  message: string;
  lines: Array<{
    articleRef: string;
    qty: number;
    unitPriceHT?: number | null;
    discountLinePercent?: number | null;
  }>;
};

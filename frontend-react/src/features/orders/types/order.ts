export type BonCommandeLineResponseDto = {
  articleRef: string;
  designation?: string | null;
  qty: number;
  unitPrice: number;
  amountHT: number;
  amountTTC: number;
};

export type BonCommandeResponseDto = {
  piece: string;
  date?: string | null;

  clientCode: string;
  depotNo: number;

  status?: string | null;
  statusCode?: number | null;
  timelineStage?: string | null;

  totalHT: number;
  totalTTC: number;
  fraisLivraison: number;
  timbreFiscal: number;
  netAPayer: number;

  deliveryType?: "HOME" | "PICKUP" | string | null;
  paymentMethod?: string | null;

  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  latitude?: string | null;
  longitude?: string | null;

  lines: BonCommandeLineResponseDto[];
};

export type OrderTimelineStepDto = {
  code: string;
  label: string;
  status: "DONE" | "ACTIVE" | "PENDING" | "ERROR" | string;
  date?: string | null;
  description?: string | null;
};

export type OrderItemTransitStatusDto = {
  articleRef: string;
  articleName: string;
  quantity: number;
  status: string;
  sourceDepotName?: string | null;
  destinationDepotName?: string | null;
  currentMessage?: string | null;
};

export type OrderTimelineDto = {
  commandeId: string;
  currentStatus: string;
  deliveryMode: string;
  destinationDepotNo?: number | null;
  destinationDepotName?: string | null;
  transitReceivedCount: number;
  transitTotalCount: number;
  steps: OrderTimelineStepDto[];
  items: OrderItemTransitStatusDto[];
};

export type OrderItemsTransitSummaryDto = {
  commandeId: string;
  totalTransitItems: number;
  receivedTransitItems: number;
  isTransitRequired: boolean;
  isTransitComplete: boolean;
  items: OrderItemTransitStatusDto[];
};

export type CreateBonCommandeLineRequestDto = {
  articleRef: string;
  qty: number;
};

export type CreateBonCommandeRequestDto = {
  depotNo?: number | null;
  deliveryType: "HOME" | "PICKUP";
  paymentMethod?: string;

  address?: string;
  city?: string;
  postalCode?: string;
  latitude?: number | null;
  longitude?: number | null;

  lines: CreateBonCommandeLineRequestDto[];
};

export type GuestCustomerType = "B2C" | "B2B";

export type GuestBonCommandeCustomerDto = {
  typeClient: GuestCustomerType;
  nomComplet?: string;
  telephone: string;
  cin?: string;
  nomSociete?: string;
  matriculeFiscal?: string;
  registreCommerce?: string;
  numeroTVA?: string;
  gouvernorat?: string;
  delegation?: string;
  adresse?: string;
  adresseComplementaire?: string;
  codePostal?: string;
};

export type CreateGuestBonCommandeRequestDto = {
  depotNo?: number | null;
  deliveryType: "HOME" | "PICKUP";
  paymentMethod?: string;

  address?: string;
  city?: string;
  postalCode?: string;
  latitude?: number | null;
  longitude?: number | null;

  customer: GuestBonCommandeCustomerDto;
  lines: CreateBonCommandeLineRequestDto[];
};

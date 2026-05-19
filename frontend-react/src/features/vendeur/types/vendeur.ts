import type {
  BonCommandeLineResponseDto,
  CreateBonCommandeLineRequestDto,
} from "../../orders/types/order";

export type VendeurClientLookupItemDto = {
  userId: string;
  email: string;
  displayName?: string | null;
  typeClient?: "B2C" | "B2B" | string | null;
  nomComplet?: string | null;
  nomSociete?: string | null;
  telephone?: string | null;
  cin?: string | null;
  matriculeFiscal?: string | null;
  codeClientSage?: string | null;
  adresse?: string | null;
  adresseComplementaire?: string | null;
  gouvernorat?: string | null;
  delegation?: string | null;
  codePostal?: string | null;
};

export type VendeurPassagerClientDto = {
  typeClient: "B2C" | "B2B";
  nomComplet?: string;
  telephone?: string;
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

export type VendeurCreateBonCommandeRequestDto = {
  customerMode: "EXISTING" | "PASSAGER";
  clientUserId?: string | null;
  passager?: VendeurPassagerClientDto;
  paymentMethod: string;
  lines: CreateBonCommandeLineRequestDto[];

  depotNo?: number | null;
  deliveryType?: "HOME" | "PICKUP" | string;
  address?: string;
  city?: string;
  postalCode?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export type VendeurPaymentOptionDto = {
  code: string;
  label: string;
};

export type VendeurDepotContextDto = {
  depotNo: number;
  depotCode?: string | null;
  depotIntitule?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
};

export type VendeurContextResponseDto = {
  vendeurUserId: string;
  vendeurDisplayName?: string | null;
  vendeurEmail?: string | null;
  modeRemise: "SUR_PLACE" | string;
  deliveryTypeStored: "PICKUP" | string;
  fraisLivraison: number;
  timbreFiscal: number;
  depot: VendeurDepotContextDto;
  paymentMethods: VendeurPaymentOptionDto[];
};

export type VendeurOrderCustomerDto = {
  customerMode: "EXISTING" | "PASSAGER" | string;
  clientUserId?: string | null;
  clientCode?: string | null;
  typeClient?: string | null;
  displayName?: string | null;
  email?: string | null;
  nomComplet?: string | null;
  telephone?: string | null;
  cin?: string | null;
  nomSociete?: string | null;
  matriculeFiscal?: string | null;
  registreCommerce?: string | null;
  numeroTVA?: string | null;
  gouvernorat?: string | null;
  delegation?: string | null;
  adresse?: string | null;
  adresseComplementaire?: string | null;
  codePostal?: string | null;
};

export type VendeurOrderResponseDto = {
  piece: string;
  date?: string | null;
  clientCode: string;
  vendeurUserId?: string | null;
  vendeurDisplayName?: string | null;
  depotNo: number;
  depotCode?: string | null;
  depotIntitule?: string | null;
  depotAddress?: string | null;
  depotCity?: string | null;
  depotPostalCode?: string | null;
  modeRemise?: "SUR_PLACE" | string | null;
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
  customer?: VendeurOrderCustomerDto | null;
  lines: BonCommandeLineResponseDto[];
};
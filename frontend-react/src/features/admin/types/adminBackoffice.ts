export type PersonnelRole = "ADMIN" | "VENDEUR" | "CONFIRMATEUR" | "LIVREUR" | "CLIENT" | string;

export type AdminPersonnelItem = {
  userId: string;
  email: string;
  roles: string[];
  primaryRole?: string | null;
  nomComplet?: string | null;
  telephone?: string | null;
  departement?: string | null;
  poste?: string | null;
  codeEmploye?: string | null;
  codeDepot?: string | null;
  zoneLivraison?: string | null;
  isActive: boolean;
  dateCreation?: string | null;
  dateModification?: string | null;
};

export type ClientKind = "ALL" | "B2B" | "B2C";

export type AdminClientListItem = {
  userId: string;
  email: string;
  typeClient?: "B2B" | "B2C" | string | null;
  displayName?: string | null;
  nomComplet?: string | null;
  nomSociete?: string | null;
  telephone?: string | null;
  adresse?: string | null;
  ville?: string | null;
  gouvernorat?: string | null;
  codePostal?: string | null;
  orderCount: number;
  isActive: boolean;
  dateCreation?: string | null;
};

export type AdminClientDetail = {
  userId: string;
  email: string;
  roles: string[];
  isActive: boolean;
  typeProfil?: number | null;
  typeClient?: "B2B" | "B2C" | string | null;
  nomComplet?: string | null;
  telephone?: string | null;
  cin?: string | null;
  dateNaissance?: string | null;
  nomSociete?: string | null;
  matriculeFiscal?: string | null;
  registreCommerce?: string | null;
  numeroTVA?: string | null;
  remise?: number | null;
  plafondCredit?: number | null;
  adresse?: string | null;
  adresseComplementaire?: string | null;
  delegation?: string | null;
  gouvernorat?: string | null;
  codePostal?: string | null;
  pays?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  codeClientSage?: string | null;
  estSynchroniseAvecSage?: boolean | null;
  dateDerniereSynchronisation?: string | null;
  dateCreation?: string | null;
  dateModification?: string | null;
};

export type OrderBucket = "EN_ATTENTE" | "TENTATIVE" | "REFUSEE" | "CONFIRMED_BL";

export type AdminOrderSummary = {
  piece: string;
  documentKind: "BC" | "BL" | string;
  bucket?: OrderBucket | string | null;
  date?: string | null;
  clientCode?: string | null;
  clientUserId?: string | null;
  clientDisplay?: string | null;
  clientType?: string | null;
  status?: string | null;
  statusCode?: number | null;
  totalTTC: number;
  netAPayer: number;
  deliveryType?: string | null;
  paymentMethod?: string | null;
  cbCreation?: string | null;
  cbModification?: string | null;
  lineCount: number;
};

export type AdminOrderLine = {
  articleRef: string;
  designation?: string | null;
  qty: number;
  unitPrice: number;
  amountHT: number;
  amountTTC: number;
};

export type AdminOrderDetail = {
  piece: string;
  documentKind: "BC" | "BL" | string;
  bucket?: OrderBucket | string | null;
  date?: string | null;
  clientCode?: string | null;
  clientUserId?: string | null;
  clientDisplay?: string | null;
  clientType?: string | null;
  status?: string | null;
  statusCode?: number | null;
  totalHT: number;
  totalTTC: number;
  fraisLivraison: number;
  timbreFiscal: number;
  netAPayer: number;
  depotNo?: number | null;
  deliveryType?: string | null;
  paymentMethod?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  cbCreation?: string | null;
  cbModification?: string | null;
  client?: AdminClientDetail | null;
  lines: AdminOrderLine[];
};
export type ConfirmateurClient = {
  typeClient?: "B2C" | "B2B" | string | null;

  utilisateurId?: string | null;
  telephone?: string | null;

  nomComplet?: string | null;
  cin?: string | null;

  nomSociete?: string | null;
  matriculeFiscal?: string | null;
  numeroTVA?: string | null;
  remise?: number | null;
  plafondCredit?: number | null;

  gouvernorat?: string | null;
  delegation?: string | null;
  codePostal?: string | null;
  adresse?: string | null;
  adresseComplementaire?: string | null;
};

export type TentativeLogEntry = {
  actorName?: string | null;
  createdAt?: string | null;
};

export type ConfirmateurOrderLine = {
  ar_Ref?: string | null;
  dL_Design?: string | null;
  dL_Qte?: number | null;
  dL_PrixUnitaire?: number | null;
  dL_MontantHT?: number | null;
  dL_MontantTTC?: number | null;
};

export type ConfirmateurOrder = {
  dO_Piece?: string | null;
  dO_Tiers?: string | null;
  dO_Ref?: string | null;
  dE_No?: number | null;
  dO_Date?: string | null;

  dO_TotalHT?: number | null;
  dO_TotalTTC?: number | null;
  dO_NetAPayer?: number | null;
  totalBeforeDiscount?: number | null;
  b2BDiscountRate?: number | null;
  b2BDiscountAmount?: number | null;
  discountSource?: string | null;

  dO_Valide?: number | null;
  tentativeCount?: number | null;
  tentativeLog?: TentativeLogEntry[];
  statusLabel?: string | null;

  clientType?: string | null;
  clientDisplay?: string | null;
  clientPhone?: string | null;

  client?: ConfirmateurClient | null;
  lignes?: ConfirmateurOrderLine[];

  // Champs livraison
  dO_PassagerGouvernorat?: string | null;
  dO_PassagerDelegation?: string | null;
  dO_LatitudeLivraison?: string | null;
  dO_LongitudeLivraison?: string | null;
  dO_ModeLivraison?: string | null;
  dO_ModePaiement?: string | null;
  dO_FraisLivraison?: number | null;
  dO_TimbreFiscal?: number | null;
  dO_AdresseLivraison?: string | null;
  dO_VilleLivraison?: string | null;
  dO_CodePostalLivraison?: string | null;
  dO_TelephoneLivraison?: string | null;
};

export type ZoneCoverageLivreur = {
  userId: string;
  nomComplet: string | null;
  telephone: string | null;
  activeOrders: number;
};

export type ZoneCoverageDto = {
  hasCoverage: boolean;
  gouvernorat: string | null;
  delegation: string | null;
  livreurCount: number;
  livreurs: ZoneCoverageLivreur[];
};

export type SupervisorDto = {
  userId: string;
  nomComplet: string | null;
  telephone: string | null;
  email: string | null;
};

export type OrderStatusValue = 0 | 2 | 3;

export const STATUS_LABEL: Record<OrderStatusValue, string> = {
  0: "EN_ATTENTE",
  2: "TENTATIVE",
  3: "REFUSE",
};

export function statusLabelFromValide(val?: number | null): string {
  if (val === 0) return "EN_ATTENTE";
  if (val === 2) return "TENTATIVE";
  if (val === 3) return "REFUSE";
  if (val === 1) return "TRANSFORME"; // historique BC transformé vers BL
  return "INCONNU";
}

export type ReclamationStatus = "ENVOYEE" | "EN_COURS_DE_TRAITEMENT" | "CLOTUREE" | "REFUSEE";

export type ReclamationTab = "a-traiter" | "en-attente-client" | "historique";

export type ReclamationListItem = {
  id: number;
  codeReclamation: string;
  doPiece: string;
  arRef?: string | null;
  arDesignation?: string | null;
  isGlobal: boolean;
  visibleClient: boolean;
  motif: string;
  descriptionPreview: string;
  statut: ReclamationStatus | string;
  source: string;
  typeCas?: string | null;
  typeReclamation?: string | null;
  priorite?: string | null;
  clientDisplay?: string | null;
  clientPhone?: string | null;
  clientGouvernorat?: string | null;
  assignedToDisplay?: string | null;
  tentativesCount: number;
  photosCount: number;
  hasCorrectionProposee: boolean;
  hasAddressChange: boolean;
  hasPhoneChange: boolean;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
};

export type ReclamationOrderLine = {
  arRef: string;
  designation?: string | null;
  qty: number;
  unitPrice: number;
  amountTTC: number;
};

export type ReclamationTentative = {
  id: number;
  commandePiece: string;
  dateJour: string;
  motif: string;
  livreurUserId: string;
  livreurDisplay?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  photoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReclamationPhoto = {
  id: number;
  url: string;
  fileName?: string | null;
  contentType?: string | null;
  size?: number | null;
  uploadedByUserId?: string | null;
  createdAt: string;
};

export type ReclamationDetails = ReclamationListItem & {
  description: string;
  correctionProposee?: string | null;
  correctionAppliquee: boolean;
  motifRefus?: string | null;
  echangeDemandeText?: string | null;
  noteInterne?: string | null;
  firstAttemptAt?: string | null;
  lastAttemptAt?: string | null;
  clientEmail?: string | null;
  clientAddress?: string | null;
  clientDelegation?: string | null;
  clientCodeSage?: string | null;
  clientCommandesCount: number;
  clientReclamationsCount: number;
  clientUserId?: string | null;
  livreurDisplay?: string | null;
  livreurPhone?: string | null;
  livreurUserId?: string | null;
  orderStatut?: string | null;
  orderDate?: string | null;
  orderNetAPayer?: number | null;
  orderPaymentMethod?: string | null;
  orderDeliveryMode?: string | null;
  orderLines: ReclamationOrderLine[];
  tentatives: ReclamationTentative[];
  photos: ReclamationPhoto[];
  resolvedAt?: string | null;
};

export type ReclamationFilters = {
  tab?: ReclamationTab;
  crossGouvernorat?: boolean;
  statut?: string | null;
  source?: string | null;
  typeCas?: string | null;
  motif?: string | null;
  doPiece?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
};

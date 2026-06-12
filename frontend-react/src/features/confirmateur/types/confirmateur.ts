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

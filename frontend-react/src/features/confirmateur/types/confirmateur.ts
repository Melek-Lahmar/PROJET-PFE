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

export type ConfirmateurOrderLine = {
  ar_Ref?: string | null;
  dL_Design?: string | null;
  dL_Qte?: number | null;
  dL_PrixUnitaire?: number | null;
  dL_MontantTTC?: number | null;
};

export type ConfirmateurOrder = {
  dO_Piece?: string | null;
  dO_Tiers?: string | null;
  dO_Date?: string | null;

  dO_TotalHT?: number | null;
  dO_TotalTTC?: number | null;
  dO_NetAPayer?: number | null;

  dO_Valide?: number | null;
  statusLabel?: string | null;

  clientType?: string | null;
  clientDisplay?: string | null;

  client?: ConfirmateurClient | null;
  lignes?: ConfirmateurOrderLine[];
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
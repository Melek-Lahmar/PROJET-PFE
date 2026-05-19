export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "NOT_TRACKED";

export type Article = {
  cbMarq: number;
  aR_Ref: string;
  aR_Design: string;
  fA_CodeFamille: string;
  aR_UniteVen: number;
  aR_PrixVen: number;
  aR_PrixTTC: number;
  aR_SuiviStock: number;
  aR_Sommeil: number;
  aR_Image?: string | null;
  aR_CodeBarre: string;
  aR_Publie: number;
  cL_No1: number;
  cL_No2: number;
  cL_No3: number;
  cL_No4: number;
  aR_Type: number;
  availableStock: number;
  stockStatus: StockStatus;
  isOutOfStock: boolean;
  isLowStock: boolean;
  isInStock: boolean;
};

export type ArticleSortBy = "designation" | "price" | "ref" | "stock";
export type SortDirection = "asc" | "desc";

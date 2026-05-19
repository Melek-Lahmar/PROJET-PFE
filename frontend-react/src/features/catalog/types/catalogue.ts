export type Catalogue = {
  cbMarq: number;
  cL_Intitule: string;
  cL_Code: string;
  cL_Stock: number;
  cL_NoParent: number;
  cL_Niveau: number;
  cL_No: number;
};

export type CatalogueNode = Catalogue & {
  children: CatalogueNode[];
};

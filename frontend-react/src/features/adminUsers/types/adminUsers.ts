export type AdminRole = "CLIENT" | "VENDEUR" | "CONFIRMATEUR" | "LIVREUR" | "SUPERVISEUR" | "ADMIN";

export type UserCreationKind =
  | "CLIENT_B2C"
  | "CLIENT_B2B"
  | "VENDEUR"
  | "CONFIRMATEUR"
  | "LIVREUR"
  | "LIVREUR_TRANSIT"
  | "SUPERVISEUR"
  | "ADMIN";

export type ProfilUtilisateur = {
  cbMarq: number;
  utilisateurId: string;
  typeProfil: number | null; // 0 client, 1 employe
  typeClient: number | null; // 0 b2c, 1 b2b
  nomComplet: string | null;
  telephone: string | null;

  cin: string | null;
  dateNaissance: string | null;

  nomSociete: string | null;
  matriculeFiscal: string | null;
  registreCommerce?: string | null;
  numeroTVA?: string | null;

  gouvernorat: number | null;
  delegation: string | null;
  adresse?: string | null;
  adresseComplementaire?: string | null;
  codePostal?: string | null;
  pays?: string | null;

  poste?: string | null;
  departement?: string | null;
  codeEmploye?: string | null;
  codeDepot?: string | null;
  zoneLivraison?: string | null;
  isTransit?: boolean;
  depotRattacheNo?: number | null;
  plafondCredit?: number | null;
  discountPercent?: number | null;

  latitude: number | null;
  longitude: number | null;

  dateCreation: string | null;
  dateModification: string | null;

  codeDepot?: string | null;
  codeEmploye?: string | null;
  poste?: string | null;
  depotRattacheNo?: number | null;
};

export type UserAdminResponseDto = {
  userId: string;
  email: string;
  roles: string[];
  profile: ProfilUtilisateur | null;
};

export type PagedUsersResponse = {
  total: number;
  skip: number;
  take: number;
  items: UserAdminResponseDto[];
};

export type CreateUserRequestDto = {
  email: string;
  password: string;
  role: AdminRole;

  typeProfil: number; // 0 Client, 1 Employe
  typeClient?: number | null;

  nomComplet?: string | null;
  telephone?: string | null;

  cin?: string | null;
  dateNaissance?: string | null; // YYYY-MM-DD

  gouvernorat: number;
  delegation: string;

  nomSociete?: string | null;
  matriculeFiscal?: string | null;
  registreCommerce?: string | null;
  numeroTVA?: string | null;

  adresse?: string | null;
  adresseComplementaire?: string | null;
  codePostal?: string | null;
  pays?: string | null;

  poste?: string | null;
  departement?: string | null;
  codeEmploye?: string | null;
  codeDepot?: string | null;
  zoneLivraison?: string | null;
  isTransit?: boolean;
  depotRattacheNo?: number | null;
  plafondCredit?: number | null;
  discountPercent?: number | null;

  latitude?: number | null;
  longitude?: number | null;
};

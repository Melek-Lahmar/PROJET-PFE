export type AdminRole = "CLIENT" | "VENDEUR" | "CONFIRMATEUR" | "LIVREUR" | "SUPERVISEUR" | "ADMIN";

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

  gouvernorat: number | null;
  delegation: string | null;

  latitude: number | null;
  longitude: number | null;

  dateCreation: string | null;
  dateModification: string | null;
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

  latitude?: number | null;
  longitude?: number | null;
};

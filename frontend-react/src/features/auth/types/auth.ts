export type ProfilUtilisateur = {
  typeProfil?: number | null;
  typeClient?: number | null;

  nomComplet?: string | null;
  telephone?: string | null;
  cin?: string | null;
  dateNaissance?: string | null;

  gouvernorat?: number | null;
  delegation?: string | null;

  adresse?: string | null;
  adresseComplementaire?: string | null;
  codePostal?: string | null;
  pays?: string | null;

  latitude?: number | null;
  longitude?: number | null;

  nomSociete?: string | null;
  matriculeFiscal?: string | null;
  registreCommerce?: string | null;
  numeroTVA?: string | null;

  codeEmploye?: string | null;
  departement?: string | null;
  poste?: string | null;
  codeDepot?: string | null;
  zoneLivraison?: string | null;
  codeClientSage?: string | null;
};

export type RegisterRequestDto = {
  email: string;
  password: string;

  typeProfil: number;
  typeClient?: number | null;

  gouvernorat: number;
  delegation: string;

  adresse: string;
  adresseComplementaire?: string | null;
  codePostal?: string | null;
  pays?: string | null;

  nomComplet?: string | null;
  telephone?: string | null;

  cin?: string | null;
  dateNaissance?: string | null;

  latitude?: number | null;
  longitude?: number | null;

  nomSociete?: string | null;
  matriculeFiscal?: string | null;
};

export type UpdateProfileRequestDto = {
  gouvernorat: number;
  delegation: string;

  adresse: string;
  adresseComplementaire?: string | null;
  codePostal?: string | null;
  pays?: string | null;

  nomComplet?: string | null;
  telephone?: string | null;

  cin?: string | null;
  dateNaissance?: string | null;

  latitude?: number | null;
  longitude?: number | null;

  nomSociete?: string | null;
  matriculeFiscal?: string | null;
};

export type AuthResponseDto = {
  accessToken: string;
  expiresInMinutes: number;
  userId: string;
  email: string;
  roles: string[];
};

export type LoginRequestDto = {
  email: string;
  password: string;
};

export type ForgotPasswordRequestDto = {
  email: string;
};

export type ResetPasswordRequestDto = {
  email: string;
  token: string;
  newPassword: string;
};

export type MeResponseDto = {
  userId: string;
  email: string;
  roles: string[];
  profile: ProfilUtilisateur | null;
};
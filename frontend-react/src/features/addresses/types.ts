export type ClientAddress = {
  id: string;
  clientUserId?: string;
  label: string;
  adresse: string;
  gouvernorat: string;
  delegation?: string | null;
  ville: string;
  codePostal?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt?: string | null;
};

export type ClientAddressUpsert = {
  label: string;
  adresse: string;
  gouvernorat: string;
  delegation?: string;
  ville: string;
  codePostal?: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault?: boolean;
};

export type ClientAddressAdminDto = Omit<
  ClientAddress,
  "latitude" | "longitude" | "clientUserId"
>;

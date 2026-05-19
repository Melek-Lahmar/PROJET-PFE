import { axiosClient } from "../../../core/http/axiosClient";

export type DepotDto = {
  dE_No: number;
  dE_Code: string;
  dE_Intitule: string;
  dE_Adresse?: string | null;
  dE_Complement?: string | null;
  dE_CodePostal?: string | null;
  dE_Ville?: string | null;
  dE_Pays?: string | null;
  dE_Principal: number;
  dE_CodeSociete?: string | null;
  dE_Banque?: string | null;
};

type PagedResponse<T> = {
  total: number;
  skip?: number;
  take?: number;
  items: T[];
};

export async function getDepots(principalOnly?: boolean): Promise<DepotDto[]> {
  const url = principalOnly ? "/api/depots?principalOnly=true" : "/api/depots";
  const res = await axiosClient.get<PagedResponse<DepotDto> | DepotDto[]>(url);

  const data: unknown = res.data;
  if (Array.isArray(data)) return data as DepotDto[];
  if (data && typeof data === 'object' && Array.isArray((data as PagedResponse<DepotDto>).items)) {
    return (data as PagedResponse<DepotDto>).items;
  }

  return [];
}
import { axiosClient } from "../../../core/http/axiosClient";
import { endpoints } from "../../../core/http/endpoints";
import type { GouvernoratItem } from "../types/geo";

export async function getGouvernorats(): Promise<GouvernoratItem[]> {
  const { data } = await axiosClient.get<GouvernoratItem[]>(
    endpoints.geoGouvernorats
  );
  return data;
}

export async function getDelegations(
  gouvernoratId: number
): Promise<string[]> {
  const { data } = await axiosClient.get<string[]>(
    endpoints.geoDelegations(gouvernoratId)
  );
  return data;
}

export type DepotCoverageResult = {
  hasCoverage: boolean;
  gouvernorat: string;
  gouvernoratId: number;
  depotCount: number;
};

export async function getDepotCoverage(gouvernoratId: number): Promise<DepotCoverageResult> {
  const { data } = await axiosClient.get<DepotCoverageResult>(
    endpoints.geoDepotCoverage(gouvernoratId)
  );
  return data;
}
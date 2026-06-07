import { axiosClient } from "../../../../core/http/axiosClient";
import { endpoints } from "../../../../core/http/endpoints";

export type DepotZoneItem = {
  id: string;
  depotNo: number;
  depotName: string;
  gouvernorat: string;
  delegation: string;
  isPrimary: boolean;
};

export async function listDepotZones(): Promise<DepotZoneItem[]> {
  const { data } = await axiosClient.get<DepotZoneItem[]>(endpoints.adminDepotZones);
  return data;
}

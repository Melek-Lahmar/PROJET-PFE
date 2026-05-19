import { axiosClient } from "../../../core/http/axiosClient";
import { endpoints } from "../../../core/http/endpoints";
import type { ListResult } from "../../../core/types/api";
import type { Catalogue } from "../types/catalogue";

export type GetCataloguesParams = {
  search?: string;
  parentNo?: number;
  niveau?: number;
};

export async function getCatalogues(params?: GetCataloguesParams) {
  const { data } = await axiosClient.get<ListResult<Catalogue>>(endpoints.catalogues, {
    params,
  });
  return data; // { total, items }
}

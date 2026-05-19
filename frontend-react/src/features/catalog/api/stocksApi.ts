import { axiosClient } from "../../../core/http/axiosClient";

export type StockDto = {
  aR_Ref: string;
  dE_No: number;
  aS_QteSto: number;
  aS_QteRes: number;
  aS_Principal: number;
};

type PagedStockResult = {
  total: number;
  skip: number;
  take: number;
  items?: StockDto[];
  Items?: StockDto[]; // fallback si casing différent
};

export async function getStocksByArticle(arRef: string) {
  const res = await axiosClient.get<PagedStockResult>("/api/stocks", {
    params: { arRef, take: 2000, skip: 0, principalOnly: false },
  });

  const data = res.data;
  const items = data.items ?? data.Items ?? [];
  return items;
}

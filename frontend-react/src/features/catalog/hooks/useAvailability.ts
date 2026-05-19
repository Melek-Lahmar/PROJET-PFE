import { useQuery } from "@tanstack/react-query";
import { getDepots, type DepotDto } from "../api/depotsApi";
import { getStocksByArticle, type StockDto } from "../api/stocksApi";

export type AvailabilityItem = {
  dE_No: number;
  dE_Code: string;
  dE_Intitule: string;

  aS_QteSto: number;
  aS_QteRes: number;
  dispo: number;

  statut: "En stock" | "Commande 48h";
};

export function useAvailability(arRef?: string) {
  return useQuery<AvailabilityItem[]>({
    queryKey: ["availability", arRef],
    enabled: !!arRef,
    queryFn: async () => {
      const [depots, stocks] = await Promise.all([
        getDepots(false),
        getStocksByArticle(arRef!),
      ]);

      const safeDepots: DepotDto[] = depots ?? [];
      const safeStocks: StockDto[] = stocks ?? [];

      const rows: AvailabilityItem[] = safeDepots.map((depot) => {
        const stock = safeStocks.find(
          (s) => s.dE_No === depot.dE_No
        );

        const aS_QteSto = Number(stock?.aS_QteSto ?? 0);
        const aS_QteRes = Number(stock?.aS_QteRes ?? 0);
        const dispo = aS_QteSto - aS_QteRes;

        return {
          dE_No: depot.dE_No,
          dE_Code: depot.dE_Code,
          dE_Intitule: depot.dE_Intitule,

          aS_QteSto,
          aS_QteRes,
          dispo,

          statut: dispo > 0 ? "En stock" : "Commande 48h",
        };
      });

      rows.sort((a, b) => {
        const diff = b.dispo - a.dispo;
        if (diff !== 0) return diff;
        return a.dE_Intitule.localeCompare(b.dE_Intitule);
      });

      return rows;
    },
  });
}

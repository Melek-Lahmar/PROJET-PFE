import { axiosClient } from "../../../core/http/axiosClient";

export type ManifesteBLItem = {
  piece: string;
  date?: string | null;
  sourceBcPiece?: string | null;
  clientCode: string;
  clientName?: string | null;
  depotNo: number;
  status?: string | null;
  totalHT: number;
  totalTTC: number;
  fraisLivraison: number;
  timbreFiscal: number;
  netAPayer: number;
  address?: string | null;
  city?: string | null;
  clientPhone?: string | null;
  // Classification manifeste
  printed?: boolean;
  routeType?: "DOMICILE" | "TRANSIT" | null;
  destinationGouvernorat?: string | null;
  destinationDepotName?: string | null;
  lines: Array<{
    articleRef: string;
    designation?: string | null;
    qty: number;
    unitPrice: number;
    amountHT: number;
    amountTTC: number;
  }>;
};

export type ManifestEnAttenteResponse = {
  depotGouvernorat?: string | null;
  depotIntitule?: string | null;
  items: ManifesteBLItem[];
};

export type ManifesteBlocSummary = {
  id: number;
  printedAt: string;
  blCount: number;
  totalAmount: number;
  depotNo: number;
};

export type ManifesteBlocDetail = ManifesteBlocSummary & {
  // BL complets (même forme que « En attente ») : nom client, destination, date, articles.
  items: ManifesteBLItem[];
};

export type HistoriqueResponse = {
  total: number;
  page: number;
  pageSize: number;
  items: ManifesteBlocSummary[];
};

export async function getEnAttente(): Promise<ManifestEnAttenteResponse> {
  const res = await axiosClient.get("/api/vendeur/manifeste/en-attente");
  // Normalise : le backend peut retourner un tableau (ancienne version) ou le nouveau wrapper
  if (Array.isArray(res.data)) return { depotGouvernorat: null, depotIntitule: null, items: res.data };
  return res.data;
}

// BLs déjà imprimés mais pas encore partis (réimpression individuelle possible).
export async function getImprime(): Promise<ManifestEnAttenteResponse> {
  const res = await axiosClient.get("/api/vendeur/manifeste/imprime");
  if (Array.isArray(res.data)) return { depotGouvernorat: null, depotIntitule: null, items: res.data };
  return res.data;
}

export async function printManifeste(
  blPieces: string[],
  type: "DOMICILE" | "TRANSIT" = "DOMICILE"
): Promise<Blob> {
  const res = await axiosClient.post(
    "/api/vendeur/manifeste/print",
    { blPieces, type },
    { responseType: "blob" }
  );
  return res.data;
}

export async function getHistorique(
  page = 1,
  pageSize = 20,
  type?: "DOMICILE" | "TRANSIT"
): Promise<HistoriqueResponse> {
  const res = await axiosClient.get("/api/vendeur/manifeste/historique", {
    params: { page, pageSize, ...(type ? { type } : {}) },
  });
  return res.data;
}

export async function getBlocDetail(id: number): Promise<ManifesteBlocDetail> {
  const res = await axiosClient.get(`/api/vendeur/manifeste/${id}`);
  return res.data;
}

export async function getBlocPdf(id: number): Promise<Blob> {
  const res = await axiosClient.get(`/api/vendeur/manifeste/${id}/pdf`, {
    responseType: "blob",
  });
  return res.data;
}

export async function getSingleBlPdf(piece: string): Promise<Blob> {
  const res = await axiosClient.get(`/api/vendeur/manifeste/bl/${piece}/pdf`, {
    responseType: "blob",
  });
  return res.data;
}

export function openPdfBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (!win) {
    // Fallback si les popups sont bloqués : déclenche le téléchargement
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  }
  // Libère l'URL après que le navigateur ait eu le temps de la charger
  setTimeout(() => URL.revokeObjectURL(url), 15_000);
}

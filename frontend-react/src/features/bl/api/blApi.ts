import { axiosClient } from "../../../core/http/axiosClient";
import type { BonLivraison } from "../types/bl";

export async function getBonLivraisons() {
  const res = await axiosClient.get<BonLivraison[]>("/api/bl");
  return res.data;
}

export async function getBonLivraisonByPiece(piece: string) {
  const res = await axiosClient.get<BonLivraison>(`/api/bl/${encodeURIComponent(piece)}`);
  return res.data;
}
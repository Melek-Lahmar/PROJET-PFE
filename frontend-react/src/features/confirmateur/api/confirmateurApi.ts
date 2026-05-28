import { axiosClient } from "../../../core/http/axiosClient";
import type { ConfirmateurClient, ConfirmateurOrder, ConfirmateurOrderLine } from "../types/confirmateur";
import type { AddQuoteCommentPayload, ConvertQuoteToOrderResult, QuoteDetailDto, QuoteListItemDto, UpdateQuoteLinesPayload } from "../../b2bQuotes/types/b2bQuotes";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function pick<T = unknown>(source: Record<string, unknown>, keys: string[]): T | undefined {
  for (const key of keys) {
    if (key in source) {
      return source[key] as T;
    }
  }
  return undefined;
}

function asString(value: unknown): string | null {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return null;
  return String(value).trim();
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeClient(raw: unknown): ConfirmateurClient | null {
  if (!isRecord(raw)) return null;

  return {
    typeClient: asString(pick(raw, ["typeClient", "TypeClient"])),
    utilisateurId: asString(pick(raw, ["utilisateurId", "UtilisateurId"])),
    telephone: asString(pick(raw, ["telephone", "Telephone"])),
    nomComplet: asString(pick(raw, ["nomComplet", "NomComplet"])),
    cin: asString(pick(raw, ["cin", "Cin"])),
    nomSociete: asString(pick(raw, ["nomSociete", "NomSociete"])),
    matriculeFiscal: asString(pick(raw, ["matriculeFiscal", "MatriculeFiscal"])),
    numeroTVA: asString(pick(raw, ["numeroTVA", "NumeroTVA"])),
    remise: asNumber(pick(raw, ["remise", "Remise"])),
    plafondCredit: asNumber(pick(raw, ["plafondCredit", "PlafondCredit"])),
    gouvernorat: asString(pick(raw, ["gouvernorat", "Gouvernorat"])),
    delegation: asString(pick(raw, ["delegation", "Delegation"])),
    codePostal: asString(pick(raw, ["codePostal", "CodePostal"])),
    adresse: asString(pick(raw, ["adresse", "Adresse"])),
    adresseComplementaire: asString(pick(raw, ["adresseComplementaire", "AdresseComplementaire"])),
  };
}

function normalizeOrderLine(raw: unknown): ConfirmateurOrderLine {
  const source = isRecord(raw) ? raw : {};
  return {
    ar_Ref: asString(pick(source, ["ar_Ref", "AR_Ref"])),
    dL_Design: asString(pick(source, ["dL_Design", "DL_Design"])),
    dL_Qte: asNumber(pick(source, ["dL_Qte", "DL_Qte"])),
    dL_PrixUnitaire: asNumber(pick(source, ["dL_PrixUnitaire", "DL_PrixUnitaire"])),
    dL_MontantHT: asNumber(pick(source, ["dL_MontantHT", "DL_MontantHT"])),
    dL_MontantTTC: asNumber(pick(source, ["dL_MontantTTC", "DL_MontantTTC"])),
  };
}

function normalizeOrder(raw: unknown): ConfirmateurOrder {
  const source = isRecord(raw) ? raw : {};
  const lignesRaw = pick<unknown[]>(source, ["lignes", "Lignes"]);

  return {
    dO_Piece: asString(pick(source, ["dO_Piece", "DO_Piece"])),
    dO_Tiers: asString(pick(source, ["dO_Tiers", "DO_Tiers"])),
    dO_Ref: asString(pick(source, ["dO_Ref", "DO_Ref"])),
    dE_No: asNumber(pick(source, ["dE_No", "DE_No"])),
    dO_Date: asString(pick(source, ["dO_Date", "DO_Date"])),
    dO_TotalHT: asNumber(pick(source, ["dO_TotalHT", "DO_TotalHT"])),
    dO_TotalTTC: asNumber(pick(source, ["dO_TotalTTC", "DO_TotalTTC"])),
    dO_NetAPayer: asNumber(pick(source, ["dO_NetAPayer", "DO_NetAPayer"])),
    totalBeforeDiscount: asNumber(pick(source, ["totalBeforeDiscount", "TotalBeforeDiscount"])),
    b2BDiscountRate: asNumber(pick(source, ["b2BDiscountRate", "B2BDiscountRate"])),
    b2BDiscountAmount: asNumber(pick(source, ["b2BDiscountAmount", "B2BDiscountAmount"])),
    discountSource: asString(pick(source, ["discountSource", "DiscountSource"])),
    dO_Valide: asNumber(pick(source, ["dO_Valide", "DO_Valide"])),
    statusLabel: asString(pick(source, ["statusLabel", "StatusLabel"])),
    clientType: asString(pick(source, ["clientType", "ClientType"])),
    clientDisplay: asString(pick(source, ["clientDisplay", "ClientDisplay"])),
    client: normalizeClient(pick(source, ["client", "Client"])),
    lignes: Array.isArray(lignesRaw) ? lignesRaw.map(normalizeOrderLine) : [],
  };
}

export async function getConfirmateurOrders(status?: number) {
  const { data } = await axiosClient.get<unknown>("/api/confirmateur/commandes", {
    params: status === undefined ? undefined : { status },
  });
  return Array.isArray(data) ? data.map(normalizeOrder) : [];
}

export async function getConfirmateurOrderByPiece(piece: string) {
  const { data } = await axiosClient.get<unknown>(`/api/confirmateur/commandes/${encodeURIComponent(piece.trim())}`);
  return normalizeOrder(data);
}

export async function updateConfirmateurOrderStatus(piece: string, status: number) {
  await axiosClient.put(`/api/confirmateur/commandes/${encodeURIComponent(piece.trim())}/status`, { status });
}

export type TransformResult = { blPiece?: string | null };

export async function transformBcToBl(piece: string) {
  const { data } = await axiosClient.post<TransformResult>(`/api/confirmateur/commandes/${encodeURIComponent(piece.trim())}/transform-to-bl`);
  return data;
}

export async function getConfirmateurBlList(status?: number) {
  const { data } = await axiosClient.get<unknown>("/api/confirmateur/bl", {
    params: status === undefined ? undefined : { status },
  });
  return Array.isArray(data) ? data.map(normalizeOrder) : [];
}

export async function getConfirmateurBlByPiece(piece: string) {
  const { data } = await axiosClient.get<unknown>(`/api/confirmateur/bl/${encodeURIComponent(piece.trim())}`);
  return normalizeOrder(data);
}

export async function getConfirmateurDevis(status?: string | null) {
  const { data } = await axiosClient.get<QuoteListItemDto[]>("/api/confirmateur/devis", {
    params: status ? { status } : undefined,
  });
  return data;
}

export async function getConfirmateurDevisByPiece(piece: string) {
  const { data } = await axiosClient.get<QuoteDetailDto>(`/api/confirmateur/devis/${encodeURIComponent(piece.trim())}`);
  return data;
}

export async function updateConfirmateurDevisStatus(piece: string, status: string, reason?: string | null) {
  const { data } = await axiosClient.put<QuoteDetailDto>(`/api/confirmateur/devis/${encodeURIComponent(piece.trim())}/status`, {
    status,
    message: reason,
  });
  return data;
}

export async function takeConfirmateurDevis(piece: string) {
  const { data } = await axiosClient.post<QuoteDetailDto>(`/api/confirmateur/devis/${encodeURIComponent(piece.trim())}/take`, {});
  return data;
}

export async function addConfirmateurDevisComment(piece: string, payload: AddQuoteCommentPayload) {
  const { data } = await axiosClient.post<QuoteDetailDto>(`/api/confirmateur/devis/${encodeURIComponent(piece.trim())}/comments`, payload);
  return data;
}

export async function updateConfirmateurDevisLines(piece: string, payload: UpdateQuoteLinesPayload) {
  const { data } = await axiosClient.put<QuoteDetailDto>(`/api/confirmateur/devis/${encodeURIComponent(piece.trim())}/lines`, payload);
  return data;
}

export async function sendConfirmateurDevisToClient(piece: string, message?: string | null) {
  const { data } = await axiosClient.post<QuoteDetailDto>(`/api/confirmateur/devis/${encodeURIComponent(piece.trim())}/send-to-client`, { message });
  return data;
}

export async function cancelConfirmateurDevis(piece: string, message: string) {
  const { data } = await axiosClient.post<QuoteDetailDto>(`/api/confirmateur/devis/${encodeURIComponent(piece.trim())}/cancel`, { message });
  return data;
}

export async function transformConfirmateurDevisToBc(piece: string) {
  const { data } = await axiosClient.post<ConvertQuoteToOrderResult>(`/api/confirmateur/devis/${encodeURIComponent(piece.trim())}/transform-to-bc`, {});
  return data;
}

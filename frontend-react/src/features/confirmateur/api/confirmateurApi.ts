import { axiosClient } from "../../../core/http/axiosClient";
import type { ConfirmateurClient, ConfirmateurOrder, ConfirmateurOrderLine, ZoneCoverageDto, SupervisorDto } from "../types/confirmateur";

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
    dL_MontantTTC: asNumber(pick(source, ["dL_MontantTTC", "DL_MontantTTC"])),
  };
}

function normalizeOrder(raw: unknown): ConfirmateurOrder {
  const source = isRecord(raw) ? raw : {};
  const lignesRaw = pick<unknown[]>(source, ["lignes", "Lignes"]);

  return {
    dO_Piece: asString(pick(source, ["dO_Piece", "DO_Piece"])),
    dO_Tiers: asString(pick(source, ["dO_Tiers", "DO_Tiers"])),
    dO_Date: asString(pick(source, ["dO_Date", "DO_Date"])),
    dO_TotalHT: asNumber(pick(source, ["dO_TotalHT", "DO_TotalHT"])),
    dO_TotalTTC: asNumber(pick(source, ["dO_TotalTTC", "DO_TotalTTC"])),
    dO_NetAPayer: asNumber(pick(source, ["dO_NetAPayer", "DO_NetAPayer"])),
    dO_Valide: asNumber(pick(source, ["dO_Valide", "DO_Valide"])),
    statusLabel: asString(pick(source, ["statusLabel", "StatusLabel"])),
    clientType: asString(pick(source, ["clientType", "ClientType"])),
    clientDisplay: asString(pick(source, ["clientDisplay", "ClientDisplay"])),
    client: normalizeClient(pick(source, ["client", "Client"])),
    lignes: Array.isArray(lignesRaw) ? lignesRaw.map(normalizeOrderLine) : [],
    dO_PassagerGouvernorat: asString(pick(source, ["dO_PassagerGouvernorat", "DO_PassagerGouvernorat"])),
    dO_PassagerDelegation: asString(pick(source, ["dO_PassagerDelegation", "DO_PassagerDelegation"])),
    dO_LatitudeLivraison: asString(pick(source, ["dO_LatitudeLivraison", "DO_LatitudeLivraison"])),
    dO_LongitudeLivraison: asString(pick(source, ["dO_LongitudeLivraison", "DO_LongitudeLivraison"])),
    dO_ModeLivraison: asString(pick(source, ["dO_ModeLivraison", "DO_ModeLivraison"])),
    dO_AdresseLivraison: asString(pick(source, ["dO_AdresseLivraison", "DO_AdresseLivraison"])),
    dO_VilleLivraison: asString(pick(source, ["dO_VilleLivraison", "DO_VilleLivraison"])),
    dO_CodePostalLivraison: asString(pick(source, ["dO_CodePostalLivraison", "DO_CodePostalLivraison"])),
    dO_TelephoneLivraison: asString(pick(source, ["dO_TelephoneLivraison", "DO_TelephoneLivraison"])),
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

export type UpdateLocationPayload = {
  gouvernorat?: string | null;
  delegation?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export async function updateConfirmateurLocation(piece: string, payload: UpdateLocationPayload) {
  await axiosClient.put(`/api/confirmateur/commandes/${encodeURIComponent(piece.trim())}/location`, payload);
}

export async function getZoneCoverage(piece: string): Promise<ZoneCoverageDto> {
  const { data } = await axiosClient.get<ZoneCoverageDto>(
    `/api/confirmateur/commandes/${encodeURIComponent(piece.trim())}/zone-coverage`
  );
  return data;
}

export async function getConfirmateurSupervisors(): Promise<SupervisorDto[]> {
  const { data } = await axiosClient.get<SupervisorDto[]>("/api/confirmateur/supervisors");
  return Array.isArray(data) ? data : [];
}

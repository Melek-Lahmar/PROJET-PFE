import { axiosClient } from "../../../core/http/axiosClient";
import type {
  ConfirmateurClient,
  ConfirmateurOrder,
  ConfirmateurOrderLine,
  ReclamationDetails,
  ReclamationFilters,
  ReclamationListItem,
  ReclamationOrderLine,
  ReclamationPhoto,
  ReclamationTentative,
  SupervisorDto,
  ZoneCoverageDto,
} from "../types/confirmateur";
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

function asBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value.toLowerCase() === "true" || value === "1";
  return false;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
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
    dO_PassagerGouvernorat: asString(pick(source, ["dO_PassagerGouvernorat", "DO_PassagerGouvernorat"])),
    dO_PassagerDelegation: asString(pick(source, ["dO_PassagerDelegation", "DO_PassagerDelegation"])),
    dO_LatitudeLivraison: asString(pick(source, ["dO_LatitudeLivraison", "DO_LatitudeLivraison"])),
    dO_LongitudeLivraison: asString(pick(source, ["dO_LongitudeLivraison", "DO_LongitudeLivraison"])),
    dO_ModeLivraison: asString(pick(source, ["dO_ModeLivraison", "DO_ModeLivraison"])),
    dO_ModePaiement: asString(pick(source, ["dO_ModePaiement", "DO_ModePaiement"])),
    dO_FraisLivraison: asNumber(pick(source, ["dO_FraisLivraison", "DO_FraisLivraison"])),
    dO_TimbreFiscal: asNumber(pick(source, ["dO_TimbreFiscal", "DO_TimbreFiscal"])),
    dO_AdresseLivraison: asString(pick(source, ["dO_AdresseLivraison", "DO_AdresseLivraison"])),
    dO_VilleLivraison: asString(pick(source, ["dO_VilleLivraison", "DO_VilleLivraison"])),
    dO_CodePostalLivraison: asString(pick(source, ["dO_CodePostalLivraison", "DO_CodePostalLivraison"])),
    dO_TelephoneLivraison: asString(pick(source, ["dO_TelephoneLivraison", "DO_TelephoneLivraison"])),
  };
}

function normalizeReclamationOrderLine(raw: unknown): ReclamationOrderLine {
  const source = isRecord(raw) ? raw : {};
  return {
    arRef: asString(pick(source, ["arRef", "ArRef"])) ?? "",
    designation: asString(pick(source, ["designation", "Designation"])),
    qty: asNumber(pick(source, ["qty", "Qty"])) ?? 0,
    unitPrice: asNumber(pick(source, ["unitPrice", "UnitPrice"])) ?? 0,
    amountTTC: asNumber(pick(source, ["amountTTC", "AmountTTC"])) ?? 0,
  };
}

function normalizeReclamationTentative(raw: unknown): ReclamationTentative {
  const source = isRecord(raw) ? raw : {};
  return {
    id: asNumber(pick(source, ["id", "Id"])) ?? 0,
    commandePiece: asString(pick(source, ["commandePiece", "CommandePiece"])) ?? "",
    dateJour: asString(pick(source, ["dateJour", "DateJour"])) ?? "",
    motif: asString(pick(source, ["motif", "Motif"])) ?? "",
    livreurUserId: asString(pick(source, ["livreurUserId", "LivreurUserId"])) ?? "",
    livreurDisplay: asString(pick(source, ["livreurDisplay", "LivreurDisplay"])),
    latitude: asNumber(pick(source, ["latitude", "Latitude"])),
    longitude: asNumber(pick(source, ["longitude", "Longitude"])),
    photoUrl: asString(pick(source, ["photoUrl", "PhotoUrl"])),
    createdAt: asString(pick(source, ["createdAt", "CreatedAt"])) ?? "",
    updatedAt: asString(pick(source, ["updatedAt", "UpdatedAt"])) ?? "",
  };
}

function normalizeReclamationPhoto(raw: unknown): ReclamationPhoto {
  const source = isRecord(raw) ? raw : {};
  return {
    id: asNumber(pick(source, ["id", "Id"])) ?? 0,
    url: asString(pick(source, ["url", "Url"])) ?? "",
    fileName: asString(pick(source, ["fileName", "FileName"])),
    contentType: asString(pick(source, ["contentType", "ContentType"])),
    size: asNumber(pick(source, ["size", "Size"])),
    uploadedByUserId: asString(pick(source, ["uploadedByUserId", "UploadedByUserId"])),
    createdAt: asString(pick(source, ["createdAt", "CreatedAt"])) ?? "",
  };
}

function normalizeReclamation(raw: unknown): ReclamationListItem {
  const source = isRecord(raw) ? raw : {};
  return {
    id: asNumber(pick(source, ["id", "Id"])) ?? 0,
    codeReclamation: asString(pick(source, ["codeReclamation", "CodeReclamation"])) ?? "",
    doPiece: asString(pick(source, ["doPiece", "DoPiece"])) ?? "",
    arRef: asString(pick(source, ["arRef", "ArRef"])),
    arDesignation: asString(pick(source, ["arDesignation", "ArDesignation"])),
    isGlobal: asBoolean(pick(source, ["isGlobal", "IsGlobal"])),
    visibleClient: asBoolean(pick(source, ["visibleClient", "VisibleClient"])),
    motif: asString(pick(source, ["motif", "Motif"])) ?? "",
    descriptionPreview: asString(pick(source, ["descriptionPreview", "DescriptionPreview"])) ?? "",
    statut: asString(pick(source, ["statut", "Statut"])) ?? "ENVOYEE",
    source: asString(pick(source, ["source", "Source"])) ?? "CLIENT",
    typeCas: asString(pick(source, ["typeCas", "TypeCas"])),
    typeReclamation: asString(pick(source, ["typeReclamation", "TypeReclamation"])),
    priorite: asString(pick(source, ["priorite", "Priorite"])),
    clientDisplay: asString(pick(source, ["clientDisplay", "ClientDisplay"])),
    clientPhone: asString(pick(source, ["clientPhone", "ClientPhone"])),
    clientGouvernorat: asString(pick(source, ["clientGouvernorat", "ClientGouvernorat"])),
    assignedToDisplay: asString(pick(source, ["assignedToDisplay", "AssignedToDisplay"])),
    tentativesCount: asNumber(pick(source, ["tentativesCount", "TentativesCount"])) ?? 0,
    photosCount: asNumber(pick(source, ["photosCount", "PhotosCount"])) ?? 0,
    hasCorrectionProposee: asBoolean(pick(source, ["hasCorrectionProposee", "HasCorrectionProposee"])),
    hasAddressChange: asBoolean(pick(source, ["hasAddressChange", "HasAddressChange"])),
    hasPhoneChange: asBoolean(pick(source, ["hasPhoneChange", "HasPhoneChange"])),
    createdAt: asString(pick(source, ["createdAt", "CreatedAt"])) ?? "",
    updatedAt: asString(pick(source, ["updatedAt", "UpdatedAt"])) ?? "",
    closedAt: asString(pick(source, ["closedAt", "ClosedAt"])),
  };
}

function normalizeReclamationDetails(raw: unknown): ReclamationDetails {
  const source = isRecord(raw) ? raw : {};
  return {
    ...normalizeReclamation(raw),
    description: asString(pick(source, ["description", "Description"])) ?? "",
    correctionProposee: asString(pick(source, ["correctionProposee", "CorrectionProposee"])),
    correctionAppliquee: asBoolean(pick(source, ["correctionAppliquee", "CorrectionAppliquee"])),
    motifRefus: asString(pick(source, ["motifRefus", "MotifRefus"])),
    echangeDemandeText: asString(pick(source, ["echangeDemandeText", "EchangeDemandeText"])),
    noteInterne: asString(pick(source, ["noteInterne", "NoteInterne"])),
    firstAttemptAt: asString(pick(source, ["firstAttemptAt", "FirstAttemptAt"])),
    lastAttemptAt: asString(pick(source, ["lastAttemptAt", "LastAttemptAt"])),
    clientEmail: asString(pick(source, ["clientEmail", "ClientEmail"])),
    clientAddress: asString(pick(source, ["clientAddress", "ClientAddress"])),
    clientDelegation: asString(pick(source, ["clientDelegation", "ClientDelegation"])),
    clientCodeSage: asString(pick(source, ["clientCodeSage", "ClientCodeSage"])),
    clientCommandesCount: asNumber(pick(source, ["clientCommandesCount", "ClientCommandesCount"])) ?? 0,
    clientReclamationsCount: asNumber(pick(source, ["clientReclamationsCount", "ClientReclamationsCount"])) ?? 0,
    clientUserId: asString(pick(source, ["clientUserId", "ClientUserId"])),
    livreurDisplay: asString(pick(source, ["livreurDisplay", "LivreurDisplay"])),
    livreurPhone: asString(pick(source, ["livreurPhone", "LivreurPhone"])),
    livreurUserId: asString(pick(source, ["livreurUserId", "LivreurUserId"])),
    orderStatut: asString(pick(source, ["orderStatut", "OrderStatut"])),
    orderDate: asString(pick(source, ["orderDate", "OrderDate"])),
    orderNetAPayer: asNumber(pick(source, ["orderNetAPayer", "OrderNetAPayer"])),
    orderPaymentMethod: asString(pick(source, ["orderPaymentMethod", "OrderPaymentMethod"])),
    orderDeliveryMode: asString(pick(source, ["orderDeliveryMode", "OrderDeliveryMode"])),
    orderLines: asArray(pick(source, ["orderLines", "OrderLines"])).map(normalizeReclamationOrderLine),
    tentatives: asArray(pick(source, ["tentatives", "Tentatives"])).map(normalizeReclamationTentative),
    photos: asArray(pick(source, ["photos", "Photos"])).map(normalizeReclamationPhoto),
    resolvedAt: asString(pick(source, ["resolvedAt", "ResolvedAt"])),
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

export async function getConfirmateurReclamations(filters: ReclamationFilters = {}) {
  const { data } = await axiosClient.get<unknown>("/api/confirmateur/reclamations", {
    params: {
      tab: filters.tab,
      crossGouvernorat: filters.crossGouvernorat || undefined,
      statut: filters.statut || undefined,
      source: filters.source || undefined,
      typeCas: filters.typeCas || undefined,
      motif: filters.motif || undefined,
      doPiece: filters.doPiece || undefined,
      fromDate: filters.fromDate || undefined,
      toDate: filters.toDate || undefined,
    },
  });
  return Array.isArray(data) ? data.map(normalizeReclamation) : [];
}

export async function getConfirmateurReclamationDetails(id: number) {
  const { data } = await axiosClient.get<unknown>(`/api/confirmateur/reclamations/${id}`);
  return normalizeReclamationDetails(data);
}

export async function reprendreConfirmateurReclamation(id: number) {
  const { data } = await axiosClient.post<unknown>(`/api/confirmateur/reclamations/${id}/reprendre`, {});
  return normalizeReclamationDetails(data);
}

export async function updateConfirmateurReclamationStatus(id: number, statut: string, motifRefus?: string | null) {
  const { data } = await axiosClient.put<unknown>(`/api/confirmateur/reclamations/${id}/status`, {
    statut,
    motifRefus,
  });
  return normalizeReclamationDetails(data);
}

export async function updateConfirmateurReclamationNote(id: number, noteInterne?: string | null) {
  const { data } = await axiosClient.put<unknown>(`/api/confirmateur/reclamations/${id}/note`, {
    noteInterne,
  });
  return normalizeReclamationDetails(data);
}

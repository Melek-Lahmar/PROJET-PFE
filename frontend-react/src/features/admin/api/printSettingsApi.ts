import { axiosClient } from "../../../core/http/axiosClient";

export type PrintFieldsConfig = {
  showBlNumber: boolean;
  showDate: boolean;
  showSourceBc: boolean;
  showDepot: boolean;
  showClientCode: boolean;
  showClientPhone: boolean;
  showLivreur: boolean;
  showUnitPriceHT: boolean;
  showAmountHT: boolean;
  showAmountTTC: boolean;
  showTotalHT: boolean;
  showTVA: boolean;
  showFraisLivraison: boolean;
  showTimbreFiscal: boolean;
  showNetAPayer: boolean;
  showSignatureClient: boolean;
  showSignatureLivreur: boolean;
};

export type PrintSettings = {
  id: number;
  companyName?: string | null;
  companyAddress?: string | null;
  companyPhone?: string | null;
  companyEmail?: string | null;
  matriculeFiscal?: string | null;
  registreCommerce?: string | null;
  logoUrl?: string | null;
  footerText?: string | null;
  updatedAt?: string;
  fieldsConfig: PrintFieldsConfig;
};

export const defaultFieldsConfig: PrintFieldsConfig = {
  showBlNumber: true,
  showDate: true,
  showSourceBc: true,
  showDepot: false,
  showClientCode: true,
  showClientPhone: true,
  showLivreur: true,
  showUnitPriceHT: true,
  showAmountHT: false,
  showAmountTTC: true,
  showTotalHT: false,
  showTVA: true,
  showFraisLivraison: true,
  showTimbreFiscal: true,
  showNetAPayer: true,
  showSignatureClient: true,
  showSignatureLivreur: true,
};

export async function getPrintSettings(): Promise<PrintSettings> {
  const res = await axiosClient.get("/api/admin/print-settings");
  return res.data;
}

export async function savePrintSettings(data: Omit<PrintSettings, "id" | "updatedAt">): Promise<void> {
  await axiosClient.put("/api/admin/print-settings", data);
}

export async function uploadLogo(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await axiosClient.post("/api/admin/print-settings/logo", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.logoUrl;
}

export async function previewBLPdf(): Promise<Blob> {
  const res = await axiosClient.get("/api/admin/print-settings/preview", {
    responseType: "blob",
  });
  return res.data;
}

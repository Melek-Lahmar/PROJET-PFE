import type { ConfirmateurClient, ConfirmateurOrder, ConfirmateurOrderLine } from "../types/confirmateur";

export type ConfirmateurWorkflowState = "pending" | "attempted" | "refused" | "transformed" | "unknown";

export type ConfirmateurStatusMeta = {
  label: string;
  badgeClass: string;
  description: string;
  workflowState: ConfirmateurWorkflowState;
};

export function safe(value?: string | null) {
  return value && value.trim() ? value.trim() : "-";
}

export function money(value?: number | null) {
  return typeof value === "number" ? `${value.toFixed(3)} TND` : "-";
}

export function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";

  return parsed.toLocaleString("fr-FR", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function clientTypeLabel(client?: ConfirmateurClient | null) {
  const normalized = (client?.typeClient ?? "").trim().toUpperCase();
  if (normalized === "B2B") return "B2B";
  if (normalized === "B2C") return "B2C";
  return "INCONNU";
}

export function clientDisplayFromClient(client?: ConfirmateurClient | null) {
  const normalized = (client?.typeClient ?? "").trim().toUpperCase();
  if (normalized === "B2B") return safe(client?.nomSociete);
  if (normalized === "B2C") return safe(client?.nomComplet);
  return safe(client?.nomSociete ?? client?.nomComplet);
}

export function clientDisplayFromOrder(order?: ConfirmateurOrder | null) {
  if (!order) return "-";
  if (order.clientDisplay && order.clientDisplay.trim()) return order.clientDisplay.trim();
  return clientDisplayFromClient(order.client ?? null);
}

export function lineAmount(line: ConfirmateurOrderLine) {
  if (typeof line.dL_MontantTTC === "number") return line.dL_MontantTTC;
  const qty = Number(line.dL_Qte ?? 0);
  const unitPrice = Number(line.dL_PrixUnitaire ?? 0);
  return qty * unitPrice;
}

export function getConfirmateurStatusMeta(
  statusLabel?: string | null,
  dO_Valide?: number | null,
) : ConfirmateurStatusMeta {
  const normalized = (statusLabel ?? "").trim().toUpperCase();

  if (dO_Valide === 1 || normalized.includes("TRANSFORM")) {
    return {
      label: statusLabel?.trim() || "TRANSFORME",
      badgeClass: "badge-success",
      description: "Le bon de commande a déjà été confirmé et converti en bon de livraison.",
      workflowState: "transformed",
    };
  }

  if (dO_Valide === 3 || normalized.includes("REFUS")) {
    return {
      label: statusLabel?.trim() || "REFUSE",
      badgeClass: "badge-danger",
      description: "Le traitement s’est terminé par un refus métier.",
      workflowState: "refused",
    };
  }

  if (dO_Valide === 2 || normalized.includes("TENT")) {
    return {
      label: statusLabel?.trim() || "TENTATIVE",
      badgeClass: "badge-info",
      description: "Une tentative ou un point d’attention a été remonté pendant le traitement.",
      workflowState: "attempted",
    };
  }

  if (dO_Valide === 0 || normalized.includes("ATTENTE")) {
    return {
      label: statusLabel?.trim() || "EN_ATTENTE",
      badgeClass: "badge-warning",
      description: "Le bon de commande est encore en attente d’analyse confirmateur.",
      workflowState: "pending",
    };
  }

  return {
    label: statusLabel?.trim() || "INCONNU",
    badgeClass: "badge-neutral",
    description: "Le statut existe mais n’est pas encore interprété dans l’interface confirmateur.",
    workflowState: "unknown",
  };
}
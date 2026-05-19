/**
 * Mirror of flutter/lib/core/theme/app_status_palette.dart.
 *
 * Maps numeric Statut + optional API status string to a visual descriptor
 * (colour class + label + svg icon). Keeps React parity with Flutter — same
 * colours, same labels, same logic.
 */

export type StatusVariant =
  | "pending"
  | "in-delivery"
  | "delivered"
  | "rescheduled"
  | "returned"
  | "depot"
  | "unknown";

export interface StatusVisual {
  variant: StatusVariant;
  label: string;
  /** Tailwind utility class added to the pill root */
  pillClass: string;
  /** lucide-style SVG path (24x24 viewBox, stroke="currentColor") */
  iconPath: string;
}

const PENDING: StatusVisual = {
  variant: "pending",
  label: "Nouvelle",
  pillClass: "status-pill status-pill-pending",
  // Inbox
  iconPath:
    "M22 12h-6l-2 3h-4l-2-3H2 M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z",
};

const IN_DELIVERY: StatusVisual = {
  variant: "in-delivery",
  label: "En livraison",
  pillClass: "status-pill status-pill-in-delivery",
  // Truck
  iconPath:
    "M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2 M15 18H9 M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14 M9 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M19 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
};

const DELIVERED: StatusVisual = {
  variant: "delivered",
  label: "Livrée",
  pillClass: "status-pill status-pill-delivered",
  // CheckCircle2
  iconPath:
    "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z M9 12l2 2 4-4",
};

const RESCHEDULED: StatusVisual = {
  variant: "rescheduled",
  label: "Reportée",
  pillClass: "status-pill status-pill-rescheduled",
  // RotateCcw / Calendar repeat
  iconPath:
    "M3 12a9 9 0 1 0 3-6.7L3 8 M3 3v5h5",
};

const RETURNED: StatusVisual = {
  variant: "returned",
  label: "Retournée",
  pillClass: "status-pill status-pill-returned",
  // Undo2
  iconPath:
    "M9 14 4 9l5-5 M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11",
};

const DEPOT: StatusVisual = {
  variant: "depot",
  label: "Au dépôt",
  pillClass: "status-pill status-pill-depot",
  // Warehouse
  iconPath:
    "M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35a2 2 0 0 1 1.21-1.84l8-3.43a2 2 0 0 1 1.58 0l8 3.43A2 2 0 0 1 22 8.35Z M6 18h12 M6 14h12 M6 10h12",
};

const UNKNOWN: StatusVisual = {
  variant: "unknown",
  label: "Inconnu",
  pillClass: "status-pill status-pill-depot",
  // HelpCircle
  iconPath:
    "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3 M12 17h.01",
};

export function statusVisual(statut?: number | null, apiStatus?: string | null): StatusVisual {
  const api = (apiStatus ?? "").toUpperCase();
  if (api === "CONFIRME" || api === "EN_ATTENTE") return PENDING;

  switch (statut) {
    case 1: return PENDING;
    case 2: return IN_DELIVERY;
    case 3: return DELIVERED;
    case 4: return RESCHEDULED;
    case 5: return RETURNED;
    case 6: return DEPOT;
    default: return UNKNOWN;
  }
}

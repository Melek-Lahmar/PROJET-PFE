export type OrderTimelineStage = "PENDING" | "ATTEMPTED" | "CONFIRMED" | "REFUSED";

export type TimelineStep = {
  key: string;
  label: string;
  description: string;
  state: "done" | "active" | "pending" | "failed";
};

export function resolveOrderTimelineStage(
  statusCode?: number | null,
  status?: string | null,
  timelineStage?: string | null
): OrderTimelineStage {
  const normalizedTimelineStage = (timelineStage ?? "").trim().toUpperCase();

  if (
    normalizedTimelineStage === "PENDING" ||
    normalizedTimelineStage === "ATTEMPTED" ||
    normalizedTimelineStage === "CONFIRMED" ||
    normalizedTimelineStage === "REFUSED"
  ) {
    return normalizedTimelineStage;
  }

  if (statusCode === 1) return "CONFIRMED";
  if (statusCode === 2) return "ATTEMPTED";
  if (statusCode === 3) return "REFUSED";

  const normalizedStatus = (status ?? "").trim().toUpperCase();

  if (normalizedStatus.includes("REFUS")) return "REFUSED";
  if (normalizedStatus.includes("TENT")) return "ATTEMPTED";
  if (normalizedStatus.includes("CONFIR") || normalizedStatus.includes("VALID")) return "CONFIRMED";

  return "PENDING";
}

export function buildOrderTimeline(
  statusCode?: number | null,
  status?: string | null,
  timelineStage?: string | null
): TimelineStep[] {
  const stage = resolveOrderTimelineStage(statusCode, status, timelineStage);

  return [
    {
      key: "created",
      label: "Commande créée",
      description: "Le bon de commande a bien été enregistré dans le système.",
      state: "done",
    },
    {
      key: "pending",
      label: "Analyse en attente",
      description: "La commande est en cours de revue avant validation métier.",
      state:
        stage === "PENDING"
          ? "active"
          : stage === "ATTEMPTED" || stage === "CONFIRMED" || stage === "REFUSED"
            ? "done"
            : "pending",
    },
    {
      key: "attempted",
      label: "Tentative signalée",
      description: "Une tentative de traitement ou un point d’attention a été remonté.",
      state:
        stage === "ATTEMPTED"
          ? "active"
          : stage === "CONFIRMED" || stage === "REFUSED"
            ? "done"
            : "pending",
    },
    {
      key: "confirmed",
      label: "Commande confirmée",
      description: "La commande a été validée côté métier.",
      state: stage === "CONFIRMED" ? "done" : "pending",
    },
    {
      key: "refused",
      label: "Commande refusée",
      description: "La commande a été clôturée avec un refus métier.",
      state: stage === "REFUSED" ? "failed" : "pending",
    },
  ];
}
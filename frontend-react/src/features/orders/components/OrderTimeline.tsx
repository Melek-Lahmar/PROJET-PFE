import type { OrderTimelineDto } from "../types/order";
import { buildOrderTimeline, resolveOrderTimelineStage, type TimelineStep } from "../utils/orderTimeline";

function toStepState(status?: string | null): TimelineStep["state"] {
  const normalized = (status ?? "").trim().toUpperCase();
  if (normalized === "DONE") return "done";
  if (normalized === "ACTIVE") return "active";
  if (normalized === "ERROR") return "failed";
  return "pending";
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeBackendSteps(timeline?: OrderTimelineDto | null): TimelineStep[] | null {
  if (!timeline?.steps?.length) return null;
  return timeline.steps.map((step) => ({
    key: step.code,
    label: step.label,
    description: [step.description, formatDate(step.date)].filter(Boolean).join(" · "),
    state: toStepState(step.status),
  }));
}

function getSummaryFromBackend(timeline?: OrderTimelineDto | null) {
  if (!timeline) return null;
  const status = (timeline.currentStatus ?? "").trim().toUpperCase();
  const hasTransit = timeline.transitTotalCount > 0;
  const completeTransit = hasTransit && timeline.transitReceivedCount === timeline.transitTotalCount;

  if (status.includes("REFUS")) {
    return {
      label: "Commande refusée",
      note: "Le traitement s’est terminé par un refus.",
      badgeClass: "badge-danger",
    };
  }

  if (hasTransit && !completeTransit) {
    return {
      label: "Transit inter-dépôts",
      note: `${timeline.transitReceivedCount} / ${timeline.transitTotalCount} article(s) reçus au dépôt destiné.`,
      badgeClass: "badge-info",
    };
  }

  if (completeTransit) {
    return {
      label: "Transit terminé",
      note: "Les articles nécessaires sont arrivés au dépôt destination.",
      badgeClass: "badge-success",
    };
  }

  if (status.includes("LIVRE")) {
    return {
      label: "Commande livrée",
      note: "Le colis a été remis au client.",
      badgeClass: "badge-success",
    };
  }

  return {
    label: timeline.currentStatus || "Suivi commande",
    note: "Timeline construite depuis la vérité backend.",
    badgeClass: "badge-warning",
  };
}

function getStageSummary(stage: ReturnType<typeof resolveOrderTimelineStage>) {
  switch (stage) {
    case "CONFIRMED":
      return {
        label: "Commande validée",
        note: "La commande a été confirmée côté métier.",
        badgeClass: "badge-success",
      };
    case "ATTEMPTED":
      return {
        label: "Point d’attention",
        note: "Une tentative ou un incident de traitement a été signalé.",
        badgeClass: "badge-info",
      };
    case "REFUSED":
      return {
        label: "Commande refusée",
        note: "Le traitement s’est terminé par un refus.",
        badgeClass: "badge-danger",
      };
    default:
      return {
        label: "En cours de traitement",
        note: "La commande est en attente de validation métier.",
        badgeClass: "badge-warning",
      };
  }
}

function getNodeClass(state: TimelineStep["state"]) {
  switch (state) {
    case "done":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "active":
      return "border-primary/30 bg-primary text-white shadow-lg shadow-primary/20";
    case "failed":
      return "border-rose-200 bg-rose-500 text-white";
    default:
      return "border-border bg-card text-muted-foreground";
  }
}

function getLineClass(state: TimelineStep["state"]) {
  switch (state) {
    case "done":
      return "bg-emerald-400";
    case "active":
      return "bg-primary/40";
    case "failed":
      return "bg-rose-300";
    default:
      return "bg-border";
  }
}

function getStepTextClass(state: TimelineStep["state"]) {
  switch (state) {
    case "done":
      return "text-emerald-700";
    case "active":
      return "text-primary";
    case "failed":
      return "text-rose-600";
    default:
      return "text-muted-foreground";
  }
}

function getStepCaption(state: TimelineStep["state"]) {
  switch (state) {
    case "done":
      return "Validée";
    case "active":
      return "En cours";
    case "failed":
      return "Échec";
    default:
      return "En attente";
  }
}

function getStepIcon(state: TimelineStep["state"], index: number) {
  if (state === "done") return "✓";
  if (state === "failed") return "!";
  if (state === "active") return "•";
  return String(index + 1);
}

function TransitItems({ timeline }: { timeline?: OrderTimelineDto | null }) {
  if (!timeline?.items?.length) return null;

  return (
    <div className="border-t border-border px-6 py-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Articles</div>
          <h3 className="mt-1 text-base font-black text-card-foreground">Détail transit</h3>
        </div>
        {timeline.transitTotalCount > 0 ? (
          <span className="inline-flex items-center rounded-full bg-muted/55 px-3 py-1 text-xs font-bold text-card-foreground/90 ring-1 ring-border">
            {timeline.transitReceivedCount} / {timeline.transitTotalCount} reçus
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {timeline.items.map((item, index) => (
          <div key={`${item.articleRef}-${item.status}-${index}`} className="rounded-[18px] border border-border/70 bg-muted/20 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-mono text-xs font-bold text-muted-foreground">{item.articleRef}</div>
                <div className="mt-1 text-sm font-bold text-card-foreground">{item.articleName}</div>
              </div>
              <span className="shrink-0 rounded-full bg-card px-2.5 py-1 text-[11px] font-bold uppercase text-card-foreground ring-1 ring-border">
                {item.status}
              </span>
            </div>
            <div className="mt-2 text-sm leading-6 text-muted-foreground">{item.currentMessage}</div>
            <div className="mt-2 text-xs font-semibold text-muted-foreground">
              Qté {item.quantity}
              {item.sourceDepotName ? ` · ${item.sourceDepotName}` : ""}
              {item.destinationDepotName ? ` → ${item.destinationDepotName}` : ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OrderTimeline({
  statusCode,
  status,
  timelineStage,
  timeline,
}: {
  statusCode?: number | null;
  status?: string | null;
  timelineStage?: string | null;
  timeline?: OrderTimelineDto | null;
}) {
  const backendSteps = normalizeBackendSteps(timeline);
  const stage = resolveOrderTimelineStage(statusCode, status, timelineStage);
  const steps = backendSteps ?? buildOrderTimeline(statusCode, status, timelineStage);
  const stageSummary = getSummaryFromBackend(timeline) ?? getStageSummary(stage);

  return (
    <section className="rounded-[30px] border border-border bg-card shadow-sm">
      <div className="border-b border-border px-6 py-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Suivi métier</div>
            <h2 className="mt-1 text-xl font-black tracking-tight text-card-foreground">Timeline de la commande</h2>
            <div className="mt-1 text-sm text-muted-foreground">{stageSummary.note}</div>
          </div>

          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${stageSummary.badgeClass}`}>
            {stageSummary.label}
          </span>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="overflow-x-auto">
          <div className="min-w-[920px]">
            <div className="flex items-start">
              {steps.map((step, index) => {
                const isLast = index === steps.length - 1;
                const lineState =
                  step.state === "done"
                    ? "done"
                    : step.state === "failed"
                      ? "failed"
                      : step.state === "active"
                        ? "active"
                        : "pending";

                return (
                  <div
                    key={`${step.key}-${index}`}
                    className={`flex min-w-0 ${isLast ? "flex-[0_0_180px]" : "flex-[1_1_0%]"} items-start`}
                  >
                    <div className="w-full min-w-[160px]">
                      <div className="flex items-center">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border text-base font-black shadow-sm ${getNodeClass(
                            step.state
                          )}`}
                        >
                          {getStepIcon(step.state, index)}
                        </div>

                        {!isLast ? (
                          <div className="mx-3 h-[3px] flex-1 overflow-hidden rounded-full bg-border/70">
                            <div className={`h-full w-full rounded-full ${getLineClass(lineState)}`} />
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-4 pr-3">
                        <div className={`text-sm font-black leading-5 ${getStepTextClass(step.state)}`}>
                          {step.label}
                        </div>
                        <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          {getStepCaption(step.state)}
                        </div>
                        <div className="mt-2 text-sm leading-6 text-muted-foreground">
                          {step.description}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <TransitItems timeline={timeline} />
    </section>
  );
}

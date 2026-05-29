import type { OrderTimelineDto } from "../types/order";
import { buildOrderTimeline, resolveOrderTimelineStage, type TimelineStep } from "../utils/orderTimeline";

const TRANSIT_STATUS_LABELS: Record<string, string> = {
  EN_ATTENTE_TRANSIT: "En attente de départ",
  EN_ATTENTE_AFFECTATION_TRANSIT: "En attente d'affectation",
  EN_COURS_TRANSIT: "En transit",
  RECU_DEPOT_DESTINE: "Arrivé au dépôt",
  TRANSIT_TERMINE: "Transit terminé",
  AUCUN_TRANSIT: "Stock local disponible",
};

function toStepState(status?: string | null): TimelineStep["state"] {
  const s = (status ?? "").trim().toUpperCase();
  if (s === "DONE") return "done";
  if (s === "ACTIVE") return "active";
  if (s === "ERROR") return "failed";
  return "pending";
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("fr-FR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
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
  const status = (timeline.currentStatus ?? "").toUpperCase();
  const hasTransit = timeline.transitTotalCount > 0;
  const allReceived = hasTransit && timeline.transitReceivedCount === timeline.transitTotalCount;

  if (status.includes("REFUS"))
    return { label: "Commande refusée", note: "La commande a été rejetée.", badgeClass: "badge-danger" };
  if (hasTransit && !allReceived)
    return {
      label: "Transit inter-dépôts",
      note: `${timeline.transitReceivedCount} / ${timeline.transitTotalCount} article(s) reçus au dépôt destination.`,
      badgeClass: "badge-info",
    };
  if (allReceived && hasTransit)
    return { label: "Transit terminé", note: "Tous les articles sont au dépôt destination.", badgeClass: "badge-success" };
  if (status.includes("LIVRE"))
    return { label: "Commande livrée", note: "Le colis a été remis au client.", badgeClass: "badge-success" };

  return { label: timeline.currentStatus || "Suivi commande", note: "Suivi en temps réel.", badgeClass: "badge-warning" };
}

function getStageSummary(stage: ReturnType<typeof resolveOrderTimelineStage>) {
  switch (stage) {
    case "CONFIRMED": return { label: "Commande validée", note: "Confirmée côté métier.", badgeClass: "badge-success" };
    case "ATTEMPTED": return { label: "Point d'attention", note: "Tentative ou incident signalé.", badgeClass: "badge-info" };
    case "REFUSED":   return { label: "Commande refusée", note: "Rejet définitif.", badgeClass: "badge-danger" };
    default:          return { label: "En cours de traitement", note: "En attente de validation.", badgeClass: "badge-warning" };
  }
}

// ── Nœud vertical ─────────────────────────────────────────────────────────────

function nodeColors(state: TimelineStep["state"]) {
  switch (state) {
    case "done":    return { circle: "border-emerald-300 bg-emerald-500 text-white", line: "bg-emerald-300", label: "text-emerald-700", caption: "text-emerald-600" };
    case "active":  return { circle: "border-primary/40 bg-primary text-white shadow-lg shadow-primary/25", line: "bg-primary/30", label: "text-primary", caption: "text-primary/70" };
    case "failed":  return { circle: "border-rose-300 bg-rose-500 text-white", line: "bg-rose-200", label: "text-rose-600", caption: "text-rose-500" };
    default:        return { circle: "border-border bg-card text-muted-foreground", line: "bg-border/50", label: "text-muted-foreground", caption: "text-muted-foreground/60" };
  }
}

function stepIcon(state: TimelineStep["state"], index: number) {
  if (state === "done")   return "✓";
  if (state === "failed") return "!";
  if (state === "active") return "●";
  return String(index + 1);
}

function VerticalStep({
  step, index, isLast,
}: { step: TimelineStep; index: number; isLast: boolean }) {
  const c = nodeColors(step.state);
  return (
    <div className="flex gap-4">
      {/* Colonne gauche : cercle + ligne */}
      <div className="flex flex-col items-center">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black transition-all ${c.circle}`}>
          {stepIcon(step.state, index)}
        </div>
        {!isLast && <div className={`mt-1 w-[2px] flex-1 rounded-full ${c.line}`} style={{ minHeight: 32 }} />}
      </div>
      {/* Contenu */}
      <div className={`pb-6 pt-1.5 min-w-0 ${isLast ? "" : ""}`}>
        <div className={`text-sm font-black leading-5 ${c.label}`}>{step.label}</div>
        <div className={`mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${c.caption}`}>
          {step.state === "done" ? "Terminé" : step.state === "active" ? "En cours" : step.state === "failed" ? "Échec" : "En attente"}
        </div>
        {step.description && (
          <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.description}</div>
        )}
      </div>
    </div>
  );
}

// ── Transit items ─────────────────────────────────────────────────────────────

function transitStatusColor(status: string) {
  const s = status.toUpperCase();
  if (s === "EN_COURS_TRANSIT") return { bg: "bg-primary/8 border-primary/20", badge: "bg-primary/10 text-primary", dot: "bg-primary" };
  if (s === "RECU_DEPOT_DESTINE" || s === "TRANSIT_TERMINE") return { bg: "bg-emerald-50 border-emerald-200", badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" };
  if (s === "AUCUN_TRANSIT") return { bg: "bg-slate-50 border-slate-200", badge: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
  return { bg: "bg-amber-50 border-amber-200", badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" };
}

function TransitItems({ timeline }: { timeline?: OrderTimelineDto | null }) {
  if (!timeline?.items?.length) return null;

  return (
    <div className="border-t border-border px-6 py-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Détail article par article</div>
          <h3 className="mt-0.5 text-base font-black text-card-foreground">Articles en transit</h3>
        </div>
        {timeline.transitTotalCount > 0 && (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ring-border ${
            timeline.transitReceivedCount === timeline.transitTotalCount
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : "bg-primary/8 text-primary ring-primary/20"
          }`}>
            <span className={`h-2 w-2 rounded-full ${timeline.transitReceivedCount === timeline.transitTotalCount ? "bg-emerald-500" : "bg-primary animate-pulse"}`} />
            {timeline.transitReceivedCount} / {timeline.transitTotalCount} reçus
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {timeline.items.map((item, i) => {
          const c = transitStatusColor(item.status);
          const label = TRANSIT_STATUS_LABELS[item.status.toUpperCase()] ?? item.status;
          return (
            <div key={`${item.articleRef}-${i}`} className={`rounded-2xl border p-4 ${c.bg}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-mono text-[10px] font-bold text-muted-foreground">{item.articleRef}</div>
                  <div className="mt-0.5 text-sm font-black text-card-foreground leading-snug">{item.articleName}</div>
                </div>
                <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${c.badge}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
                  {label}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.currentMessage}</p>
              {(item.sourceDepotName || item.destinationDepotName) && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                  <span className="rounded bg-card px-1.5 py-0.5 ring-1 ring-border">{item.sourceDepotName ?? "?"}</span>
                  <span>→</span>
                  <span className="rounded bg-card px-1.5 py-0.5 ring-1 ring-border">{item.destinationDepotName ?? "?"}</span>
                  <span className="ml-auto text-muted-foreground/60">Qté {item.quantity}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────────────────────

export function OrderTimeline({
  statusCode, status, timelineStage, timeline,
}: {
  statusCode?: number | null;
  status?: string | null;
  timelineStage?: string | null;
  timeline?: OrderTimelineDto | null;
}) {
  const backendSteps = normalizeBackendSteps(timeline);
  const stage = resolveOrderTimelineStage(statusCode, status, timelineStage);
  const steps = backendSteps ?? buildOrderTimeline(statusCode, status, timelineStage);
  const summary = getSummaryFromBackend(timeline) ?? getStageSummary(stage);

  return (
    <section className="rounded-[30px] border border-border bg-card shadow-sm">
      {/* En-tête */}
      <div className="border-b border-border px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Suivi métier</div>
            <h2 className="mt-0.5 text-xl font-black tracking-tight text-card-foreground">Timeline de la commande</h2>
            <div className="mt-0.5 text-sm text-muted-foreground">{summary.note}</div>
          </div>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${summary.badgeClass}`}>
            {summary.label}
          </span>
        </div>
      </div>

      {/* Étapes verticales */}
      <div className="px-6 py-6">
        {steps.map((step, i) => (
          <VerticalStep key={`${step.key}-${i}`} step={step} index={i} isLast={i === steps.length - 1} />
        ))}
      </div>

      {/* Articles en transit */}
      <TransitItems timeline={timeline} />
    </section>
  );
}

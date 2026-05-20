import type { KpiMetric } from "../types/dashboard";

const iconByFormat: Record<string, string> = {
  currency: "د.ت",
  percent: "%",
  days: "J",
  quantity: "Σ",
  count: "#",
};

function toneForMetric(metric: KpiMetric) {
  const key = `${metric.key} ${metric.label}`.toLowerCase();
  if (metric.severity) return metric.severity;
  if (key.includes("revenue") || key.includes("chiffre") || key.includes("vente")) return "success";
  if (key.includes("stock") || key.includes("pending") || key.includes("attente")) return "warning";
  if (key.includes("refus") || key.includes("claim") || key.includes("reclamation") || key.includes("réclamation")) return "critical";
  if (key.includes("livraison") || key.includes("delivery") || key.includes("depot") || key.includes("dépôt")) return "info";
  return "default";
}

export function KpiCard({ metric }: { metric: KpiMetric }) {
  const direction = metric.deltaDirection ?? "flat";
  const icon = iconByFormat[metric.format ?? "count"] ?? "#";
  const tone = toneForMetric(metric);
  return (
    <article className={`pro-kpi pro-kpi--${tone}`}>
      <div className="pro-kpi__top">
        <span className="pro-kpi__icon" aria-hidden="true">{icon}</span>
        {metric.deltaFormatted ? <span className={`pro-kpi__delta pro-kpi__delta--${direction}`}>{metric.deltaFormatted}</span> : null}
      </div>
      <div className="pro-kpi__body">
        <strong>{metric.formattedValue}</strong>
        <span>{metric.label}</span>
      </div>
      {metric.hint ? <small>{metric.hint}</small> : <small className="pro-kpi__empty-hint" aria-hidden="true">&nbsp;</small>}
    </article>
  );
}

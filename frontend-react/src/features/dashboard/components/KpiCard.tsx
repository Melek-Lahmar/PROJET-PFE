import type { KpiMetric } from "../types/dashboard";

const iconByFormat: Record<string, string> = {
  currency: "د.ت",
  percent: "%",
  days: "J",
  quantity: "Σ",
  count: "#",
};

export function KpiCard({ metric }: { metric: KpiMetric }) {
  const direction = metric.deltaDirection ?? "flat";
  const icon = iconByFormat[metric.format ?? "count"] ?? "#";
  return (
    <article className={`pro-kpi pro-kpi--${metric.severity || "default"}`}>
      <div className="pro-kpi__top">
        <span className="pro-kpi__icon">{icon}</span>
        {metric.deltaFormatted ? <span className={`pro-kpi__delta pro-kpi__delta--${direction}`}>{metric.deltaFormatted}</span> : null}
      </div>
      <strong>{metric.formattedValue}</strong>
      <span>{metric.label}</span>
      {metric.hint ? <small>{metric.hint}</small> : null}
    </article>
  );
}

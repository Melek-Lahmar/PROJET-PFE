import type { ReactNode } from "react";
import type { KpiMetric } from "../types/dashboard";

const iconByFormat: Record<string, ReactNode> = {
  currency: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><path d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8" /><path d="M12 6v2m0 8v2" />
    </svg>
  ),
  percent: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="19" y1="5" x2="5" y2="19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  ),
  days: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  quantity: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  ),
  count: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" /><line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  ),
};

const defaultIcon: ReactNode = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

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
  const icon = iconByFormat[metric.format ?? "count"] ?? defaultIcon;
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

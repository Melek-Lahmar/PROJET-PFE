import type { DashboardInsight } from "../types/dashboard";
import { StatusBadge } from "./StatusBadge";

export function InsightCard({ insight }: { insight: DashboardInsight }) {
  return (
    <article className={`pro-insight pro-insight--${insight.severity}`}>
      <div className="pro-insight__header">
        <strong>{insight.title}</strong>
        <StatusBadge label={insight.impact || String(insight.severity)} severity={insight.severity} />
      </div>
      <p>{insight.description}</p>
      {insight.action ? <small>{insight.action}</small> : null}
    </article>
  );
}

import type { DashboardInsight } from "../types/dashboard";
import { StatusBadge } from "./StatusBadge";

export function InsightCard({ insight }: { insight: DashboardInsight }) {
  return (
    <article className={`pro-insight pro-insight--${insight.severity}`}>
      <div className="pro-insight__header">
        <span className="pro-insight__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        </span>
        <strong>{insight.title}</strong>
        <StatusBadge label={insight.impact || String(insight.severity)} severity={insight.severity} />
      </div>
      <p>{insight.description}</p>
      {insight.action ? <small>{insight.action}</small> : null}
    </article>
  );
}

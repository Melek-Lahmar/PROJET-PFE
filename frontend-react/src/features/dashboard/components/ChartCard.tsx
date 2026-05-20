import type { ReactNode } from "react";

export function ChartCard({ title, description, children }: { title: string; description?: string | null; children: ReactNode }) {
  return (
    <section className="pro-card pro-chart-card">
      <div className="pro-card__header">
        <div>
          <span className="pro-card__eyebrow">Analyse</span>
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      <div className="pro-chart-card__body">{children}</div>
    </section>
  );
}

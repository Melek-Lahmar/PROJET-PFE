import type { DashboardAlert } from "../types/dashboard";
import { StatusBadge } from "./StatusBadge";
import { EmptyState } from "./EmptyState";

export function AlertPanel({ alerts, title }: { alerts: DashboardAlert[]; title: string }) {
  return (
    <section className="pro-card pro-alert-panel">
      <div className="pro-card__header"><h3>{title}</h3></div>
      {!alerts.length ? <EmptyState title="Aucune alerte" description="Aucune anomalie prioritaire détectée avec les données actuelles." /> : (
        <div className="pro-alert-list">
          {alerts.map((alert) => (
            <article key={alert.key} className={`pro-alert pro-alert--${alert.severity}`}>
              <div>
                <strong>{alert.title}</strong>
                <p>{alert.description}</p>
                {alert.action ? <small>{alert.action}</small> : null}
              </div>
              <StatusBadge label={alert.module || alert.severity} severity={alert.severity} />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

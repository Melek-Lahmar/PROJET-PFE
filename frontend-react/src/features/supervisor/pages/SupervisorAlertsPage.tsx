import { useEffect, useState } from "react";
import { axiosClient } from "../../../core/http/axiosClient";
import { endpoints } from "../../../core/http/endpoints";
import { Button } from "../../../shared/components/Button";
import { PremiumHero } from "../../../shared/components/premium";

type Alert = {
  id: string;
  severity: string;
  alertType: string;
  message: string;
  createdAt: string;
  acknowledgedAt?: string | null;
};

function severityClass(severity: string) {
  const normalized = severity.toUpperCase();
  if (normalized === "HIGH" || normalized === "URGENT") return "badge-danger";
  if (normalized === "WARNING" || normalized === "MEDIUM") return "badge-warning";
  return "badge-info";
}

export function SupervisorAlertsPage() {
  const [items, setItems] = useState<Alert[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const { data } = await axiosClient.get<Alert[]>(endpoints.supervisorIssues, { params: { includeRead: true } });
      setItems(data);
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Impossible de charger les problèmes superviseur.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function resolve(id: string) {
    setError(null);
    try {
      await axiosClient.post(endpoints.supervisorIssueResolve(id));
      await load();
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Résolution impossible.");
    }
  }

  return (
    <div className="space-y-6 pb-10">
      <PremiumHero
        kicker="Superviseur"
        title="Problèmes et alertes"
        description="Alertes opérationnelles. Résolvez les problèmes bloquants."
        actions={
          <Button type="button" variant="outline" onClick={() => void load()}>Actualiser</Button>
        }
      />

      {error ? <div className="ds-alert ds-alert-danger">{error}</div> : null}

      {items.map((a) => (
        <div key={a.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${severityClass(a.severity)}`}>
                  {a.severity}
                </span>
                <b className="text-card-foreground">{a.alertType}</b>
              </div>
              <p className="mt-2 text-sm text-card-foreground/90">{a.message}</p>
              <p className="mt-2 text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString("fr-FR")}</p>
            </div>

            {!a.acknowledgedAt ? (
              <Button type="button" variant="outline" size="sm" onClick={() => void resolve(a.id)}>
                Résoudre
              </Button>
            ) : (
              <span className="rounded-full bg-muted/55 px-3 py-1 text-xs font-bold text-muted-foreground ring-1 ring-border">
                Résolu
              </span>
            )}
          </div>
        </div>
      ))}

      {items.length === 0 ? <div className="rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">Aucun problème superviseur.</div> : null}
    </div>
  );
}

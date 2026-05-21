import { useEffect, useState } from "react";
import { axiosClient } from "../../../core/http/axiosClient";
import { endpoints } from "../../../core/http/endpoints";
import { Button } from "../../../shared/components/Button";
import { PremiumHero } from "../../../shared/components/premium";

type Stats = { pending: number; inProgress: number; receivedToday: number; blocked24h: number };
type Transfert = {
  id: string;
  doPiece: string;
  arRef: string;
  quantite?: number;
  status: string;
  sourceDepotNo: number;
  destinationDepotNo: number;
  transitLivreurUserId?: string | null;
  version: number;
};

function badgeClass(status: string) {
  const normalized = status.toUpperCase();
  if (normalized.includes("RECU") || normalized.includes("TERMINE")) return "badge-success";
  if (normalized.includes("TRANSIT") && !normalized.includes("ATTENTE")) return "badge-info";
  if (normalized.includes("AFFECTATION")) return "badge-danger";
  return "badge-warning";
}

export function SupervisorDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [items, setItems] = useState<Transfert[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const [statsRes, missionsRes] = await Promise.all([
        axiosClient.get<Stats>(endpoints.supervisorDashboardStats),
        axiosClient.get<Transfert[]>(endpoints.supervisorTransitMissions),
      ]);
      setStats(statsRes.data);
      setItems(missionsRes.data);
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Impossible de charger le dashboard superviseur.");
    }
  }

  async function retryAssignment(piece: string) {
    setError(null);
    try {
      await axiosClient.post(endpoints.supervisorRetryAssignment(piece));
      await load();
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Relance affectation impossible.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const cards = [
    ["En attente transit", stats?.pending ?? 0],
    ["En transit", stats?.inProgress ?? 0],
    ["Reçus aujourd’hui", stats?.receivedToday ?? 0],
    ["Bloqués >24h", stats?.blocked24h ?? 0],
  ] as const;

  return (
    <div className="space-y-6 pb-10">
      <PremiumHero
        kicker="Superviseur"
        title="Dashboard superviseur"
        description="Suivi des missions transit en temps réel."
        actions={
          <Button type="button" variant="outline" onClick={() => void load()}>Actualiser</Button>
        }
      />

      {error ? <div className="ds-alert ds-alert-danger">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-bold text-card-foreground">{value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-card-foreground">Missions transit</h2>
            <p className="mt-1 text-sm text-muted-foreground">Flux backend `/api/supervisor/transit-missions`.</p>
          </div>
          <span className="rounded-full bg-muted/55 px-3 py-1 text-xs font-bold text-card-foreground ring-1 ring-border">
            {items.length}
          </span>
        </div>

        <div className="mt-4 space-y-2">
          {items.map((t) => (
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3" key={t.id}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-card-foreground">{t.doPiece}</span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${badgeClass(t.status)}`}>
                      {t.status}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {t.arRef} · dépôt {t.sourceDepotNo} → {t.destinationDepotNo} · quantité {Number(t.quantite ?? 0).toLocaleString("fr-FR")}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-muted-foreground">
                    Livreur transit: {t.transitLivreurUserId ?? "non affecté"}
                  </div>
                </div>

                {!t.transitLivreurUserId ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => void retryAssignment(t.doPiece)}>
                    Relancer affectation
                  </Button>
                ) : null}
              </div>
            </div>
          ))}

          {items.length === 0 ? <div className="py-8 text-sm text-muted-foreground">Aucune mission transit.</div> : null}
        </div>
      </section>
    </div>
  );
}

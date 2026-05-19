import { useEffect, useMemo, useState } from "react";
import { axiosClient } from "../../../core/http/axiosClient";
import { endpoints } from "../../../core/http/endpoints";

type Stats = { pending: number; inProgress: number; completed: number };
type Transfert = {
  id: string;
  doPiece: string;
  arRef: string;
  quantite?: number;
  status: string;
  sourceDepotNo: number;
  destinationDepotNo: number;
  pickedUpAt?: string | null;
  deliveredAt?: string | null;
};

function isWaiting(status: string) {
  return status === "EN_ATTENTE_TRANSIT" || status === "EN_ATTENTE_AFFECTATION_TRANSIT";
}

function isInProgress(status: string) {
  return status === "EN_TRANSIT" || status === "EN_COURS_TRANSIT";
}

function isCompleted(status: string) {
  return status === "RECU_AU_DEPOT" || status === "RECU_DEPOT_DESTINE" || status === "TRANSIT_TERMINE";
}

function MissionList({ title, items }: { title: string; items: Transfert[] }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-bold text-card-foreground">{title}</h2>
        <span className="rounded-full bg-muted/55 px-3 py-1 text-xs font-bold text-card-foreground ring-1 ring-border">
          {items.length}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {items.map((x) => (
          <div key={x.id} className="rounded-xl border border-border/70 bg-muted/20 p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-card-foreground">{x.doPiece}</span>
              <span className="rounded-full bg-card px-2.5 py-1 text-[11px] font-bold uppercase text-card-foreground ring-1 ring-border">
                {x.status}
              </span>
            </div>
            <div className="mt-2 text-muted-foreground">
              {x.arRef} · dépôt {x.sourceDepotNo} → {x.destinationDepotNo}
            </div>
            <div className="mt-1 text-xs font-semibold text-muted-foreground">
              Quantité {Number(x.quantite ?? 0).toLocaleString("fr-FR")}
            </div>
          </div>
        ))}

        {items.length === 0 ? <div className="py-6 text-sm text-muted-foreground">Aucune mission.</div> : null}
      </div>
    </section>
  );
}

export function TransitDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [missions, setMissions] = useState<Transfert[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const [statsRes, missionsRes] = await Promise.all([
        axiosClient.get<Stats>(endpoints.transitStats),
        axiosClient.get<Transfert[]>(endpoints.transitMyMissions),
      ]);
      setStats(statsRes.data);
      setMissions(missionsRes.data);
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Impossible de charger les missions transit.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const grouped = useMemo(
    () => ({
      waiting: missions.filter((x) => isWaiting(x.status)),
      progress: missions.filter((x) => isInProgress(x.status)),
      completed: missions.filter((x) => isCompleted(x.status)),
    }),
    [missions]
  );

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Transit</div>
          <h1 className="text-2xl font-bold text-card-foreground">Espace livreur-transit</h1>
        </div>
        <button type="button" onClick={() => void load()} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">
          Actualiser
        </button>
      </div>

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">À prendre: <b>{stats?.pending ?? grouped.waiting.length}</b></div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">En cours: <b>{stats?.inProgress ?? grouped.progress.length}</b></div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">Terminés: <b>{stats?.completed ?? grouped.completed.length}</b></div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <MissionList title="À prendre" items={grouped.waiting} />
        <MissionList title="En cours" items={grouped.progress} />
        <MissionList title="Historique" items={grouped.completed} />
      </div>
    </main>
  );
}

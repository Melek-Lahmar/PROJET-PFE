import { useEffect, useState } from "react";
import { axiosClient } from "../../../../core/http/axiosClient";
import { endpoints } from "../../../../core/http/endpoints";
import { Button } from "../../../../shared/components/Button";
import { Input } from "../../../../shared/components/Input";
import { Loader } from "../../../../shared/components/Loader";
import { PremiumHero } from "../../../../shared/components/premium";

type DepotZone = {
  id: string;
  depotNo: number;
  depotName: string;
  gouvernorat: string;
  delegation: string;
  isPrimary: boolean;
};

export function AdminDepotZonesPage() {
  const [items, setItems] = useState<DepotZone[]>([]);
  const [form, setForm] = useState({ depotNo: 1, gouvernorat: "", delegation: "", isPrimary: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axiosClient.get<DepotZone[]>(endpoints.adminDepotZones);
      setItems(data);
    } catch {
      setError("Impossible de charger le mapping délégation ↔ dépôt.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function create() {
    setError(null);
    try {
      await axiosClient.post(endpoints.adminDepotZones, form);
      setForm({ depotNo: 1, gouvernorat: "", delegation: "", isPrimary: true });
      await load();
    } catch {
      setError("Création refusée : vérifiez les doublons ou le dépôt principal.");
    }
  }

  async function remove(id: string) {
    await axiosClient.delete(endpoints.adminDepotZoneById(id));
    await load();
  }

  return (
    <div className="space-y-6 pb-10">
      <PremiumHero
        kicker="Logistique"
        title="Zones de livraison"
        description="Configuration des zones de livraison tunisiennes. Une délégation ne peut avoir qu'un seul dépôt principal."
      />

      <section className="app-surface p-5 md:p-6">
        <div className="mb-4 text-sm font-semibold text-card-foreground">Ajouter une zone</div>
        <div className="grid gap-3 md:grid-cols-5">
          <Input
            placeholder="Gouvernorat"
            value={form.gouvernorat}
            onChange={(e) => setForm({ ...form, gouvernorat: e.target.value })}
          />
          <Input
            placeholder="Délégation"
            value={form.delegation}
            onChange={(e) => setForm({ ...form, delegation: e.target.value })}
          />
          <Input
            type="number"
            min={1}
            placeholder="N° dépôt"
            value={form.depotNo}
            onChange={(e) => setForm({ ...form, depotNo: Number(e.target.value) })}
          />
          <label className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
            <input
              type="checkbox"
              checked={form.isPrimary}
              onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            Principal
          </label>
          <Button type="button" variant="primary" onClick={() => void create()}>
            Ajouter
          </Button>
        </div>
      </section>

      {error && (
        <div className="ds-alert ds-alert-danger">{error}</div>
      )}

      {loading ? (
        <Loader label="Chargement des zones..." />
      ) : (
        <section className="table-shell">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3.5 text-left">Gouvernorat</th>
                  <th className="px-4 py-3.5 text-left">Délégation</th>
                  <th className="px-4 py-3.5 text-left">Dépôt</th>
                  <th className="px-4 py-3.5 text-left">Type</th>
                  <th className="px-4 py-3.5 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      Aucune zone configurée.
                    </td>
                  </tr>
                ) : (
                  items.map((x) => (
                    <tr key={x.id} className="table-row">
                      <td className="px-4 py-3.5 font-semibold text-card-foreground">{x.gouvernorat}</td>
                      <td className="px-4 py-3.5 text-card-foreground">{x.delegation}</td>
                      <td className="px-4 py-3.5 text-muted-foreground">{x.depotName} #{x.depotNo}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
                          x.isPrimary
                            ? "bg-primary/10 text-primary ring-primary/20"
                            : "bg-muted/55 text-muted-foreground ring-border"
                        }`}>
                          {x.isPrimary ? "Principal" : "Secondaire"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => void remove(x.id)}
                        >
                          Supprimer
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

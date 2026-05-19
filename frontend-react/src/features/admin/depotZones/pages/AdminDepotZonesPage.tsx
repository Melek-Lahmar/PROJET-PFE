import { useEffect, useState } from "react";
import { axiosClient } from "../../../../core/http/axiosClient";
import { endpoints } from "../../../../core/http/endpoints";

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
    } catch (e) {
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
    } catch (e) {
      setError("Création refusée : vérifiez les doublons ou le dépôt principal.");
    }
  }

  async function remove(id: string) {
    await axiosClient.delete(endpoints.adminDepotZoneById(id));
    await load();
  }

  return (
    <main className="p-6 space-y-6">
      <section className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-900 dark:border-slate-800">
        <h1 className="text-2xl font-bold">Mapping délégation ↔ dépôt</h1>
        <p className="mt-2 text-sm text-slate-500">Configuration des zones de livraison tunisiennes. Une délégation ne peut avoir qu’un seul dépôt principal.</p>
      </section>

      <section className="grid gap-3 rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-900 dark:border-slate-800 md:grid-cols-5">
        <input className="rounded-xl border p-3 dark:bg-slate-950 dark:border-slate-700" placeholder="Gouvernorat" value={form.gouvernorat} onChange={(e) => setForm({ ...form, gouvernorat: e.target.value })} />
        <input className="rounded-xl border p-3 dark:bg-slate-950 dark:border-slate-700" placeholder="Délégation" value={form.delegation} onChange={(e) => setForm({ ...form, delegation: e.target.value })} />
        <input className="rounded-xl border p-3 dark:bg-slate-950 dark:border-slate-700" type="number" min={1} value={form.depotNo} onChange={(e) => setForm({ ...form, depotNo: Number(e.target.value) })} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPrimary} onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })} /> Principal</label>
        <button onClick={create} className="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700">Ajouter</button>
      </section>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}
      {loading ? <div>Chargement...</div> : (
        <section className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left dark:bg-slate-800"><tr><th className="p-3">Gouvernorat</th><th className="p-3">Délégation</th><th className="p-3">Dépôt</th><th className="p-3">Type</th><th className="p-3"></th></tr></thead>
            <tbody>{items.map((x) => <tr key={x.id} className="border-t dark:border-slate-800"><td className="p-3">{x.gouvernorat}</td><td className="p-3">{x.delegation}</td><td className="p-3">{x.depotName} #{x.depotNo}</td><td className="p-3">{x.isPrimary ? "Principal" : "Secondaire"}</td><td className="p-3 text-right"><button onClick={() => void remove(x.id)} className="rounded-lg border px-3 py-1 text-red-600">Supprimer</button></td></tr>)}</tbody>
          </table>
        </section>
      )}
    </main>
  );
}

import { useState } from "react";
import { axiosClient } from "../../../core/http/axiosClient";
import { endpoints } from "../../../core/http/endpoints";

type Option = { depotNo: number; name: string; city: string; distanceKm: number; isRecommended: boolean };
export function DepotPickerSection() {
  const [gouvernorat, setGouvernorat] = useState("");
  const [delegation, setDelegation] = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  async function load() {
    const { data } = await axiosClient.get(endpoints.geoPickupOptions, { params: { gouvernorat, delegation } });
    setOptions(data.nearestDepots ?? []);
  }
  return (
    <section className="space-y-3 rounded-2xl border p-4 dark:border-slate-800">
      <h3 className="font-bold">Retrait au dépôt</h3>
      <div className="grid gap-3 md:grid-cols-3"><input className="rounded-xl border p-3 dark:bg-slate-950 dark:border-slate-700" placeholder="Gouvernorat" value={gouvernorat} onChange={(e) => setGouvernorat(e.target.value)} /><input className="rounded-xl border p-3 dark:bg-slate-950 dark:border-slate-700" placeholder="Délégation" value={delegation} onChange={(e) => setDelegation(e.target.value)} /><button onClick={load} className="rounded-xl bg-blue-600 px-4 py-2 text-white">Chercher dépôts</button></div>
      {options.map((x) => <div key={x.depotNo} className="rounded-xl border p-3 dark:border-slate-800">{x.isRecommended && <span>✨ </span>}{x.name} — {x.city} — {x.distanceKm} km</div>)}
    </section>
  );
}

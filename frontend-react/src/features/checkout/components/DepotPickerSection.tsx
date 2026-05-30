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
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4 text-card-foreground">
      <h3 className="font-bold">Retrait au dépôt</h3>
      <div className="grid gap-3 md:grid-cols-3"><input className="rounded-xl border border-border bg-input p-3 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Gouvernorat" value={gouvernorat} onChange={(e) => setGouvernorat(e.target.value)} /><input className="rounded-xl border border-border bg-input p-3 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Délégation" value={delegation} onChange={(e) => setDelegation(e.target.value)} /><button type="button" onClick={load} className="rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground transition hover:bg-primary/90">Chercher dépôts</button></div>
      {options.map((x) => <div key={x.depotNo} className="rounded-xl border border-border bg-muted/25 p-3">{x.isRecommended && <span>✨ </span>}{x.name} — {x.city} — {x.distanceKm} km</div>)}
    </section>
  );
}

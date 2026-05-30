import { useState } from "react";
import { GpsValidatorSection } from "./GpsValidatorSection";

export function AddressTempForm() {
  const [form, setForm] = useState({ gouvernorat: "", delegation: "", adresse: "", landmark: "" });
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-4 text-card-foreground">
      <h3 className="font-bold">Adresse temporaire</h3>
      <input className="w-full rounded-xl border border-border bg-input p-3 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Adresse libre" value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} />
      <input className="w-full rounded-xl border border-border bg-input p-3 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Point de repère" value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} />
      <div className="grid gap-3 md:grid-cols-2"><input className="rounded-xl border border-border bg-input p-3 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Gouvernorat" value={form.gouvernorat} onChange={(e) => setForm({ ...form, gouvernorat: e.target.value })} /><input className="rounded-xl border border-border bg-input p-3 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Délégation" value={form.delegation} onChange={(e) => setForm({ ...form, delegation: e.target.value })} /></div>
      <GpsValidatorSection gouvernorat={form.gouvernorat} delegation={form.delegation} />
    </section>
  );
}

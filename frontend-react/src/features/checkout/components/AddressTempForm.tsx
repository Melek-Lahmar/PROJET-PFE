import { useState } from "react";
import { GpsValidatorSection } from "./GpsValidatorSection";

export function AddressTempForm() {
  const [form, setForm] = useState({ gouvernorat: "", delegation: "", adresse: "", landmark: "" });
  return (
    <section className="space-y-4 rounded-2xl border p-4 dark:border-slate-800">
      <h3 className="font-bold">Adresse temporaire</h3>
      <input className="w-full rounded-xl border p-3 dark:bg-slate-950 dark:border-slate-700" placeholder="Adresse libre" value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} />
      <input className="w-full rounded-xl border p-3 dark:bg-slate-950 dark:border-slate-700" placeholder="Point de repère" value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} />
      <div className="grid gap-3 md:grid-cols-2"><input className="rounded-xl border p-3 dark:bg-slate-950 dark:border-slate-700" placeholder="Gouvernorat" value={form.gouvernorat} onChange={(e) => setForm({ ...form, gouvernorat: e.target.value })} /><input className="rounded-xl border p-3 dark:bg-slate-950 dark:border-slate-700" placeholder="Délégation" value={form.delegation} onChange={(e) => setForm({ ...form, delegation: e.target.value })} /></div>
      <GpsValidatorSection gouvernorat={form.gouvernorat} delegation={form.delegation} />
    </section>
  );
}

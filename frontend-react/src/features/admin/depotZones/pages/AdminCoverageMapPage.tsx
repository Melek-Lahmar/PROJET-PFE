export function AdminCoverageMapPage() {
  return (
    <main className="p-6 space-y-6">
      <section className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-900 dark:border-slate-800">
        <h1 className="text-2xl font-bold">Carte de couverture</h1>
        <p className="mt-2 text-sm text-slate-500">Écran préparé pour visualiser les délégations couvertes et non couvertes. La carte GeoJSON sera branchée après stabilisation du Chantier 1.</p>
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border p-5 dark:border-slate-800"><div className="text-3xl">🟢</div><b>Délégations couvertes</b><p className="text-sm text-slate-500">Mappées dans F_DEPOT_ZONE.</p></div>
        <div className="rounded-2xl border p-5 dark:border-slate-800"><div className="text-3xl">⚫</div><b>Hors-zone</b><p className="text-sm text-slate-500">Bascule retrait dépôt.</p></div>
        <div className="rounded-2xl border p-5 dark:border-slate-800"><div className="text-3xl">✨</div><b>Dépôt recommandé</b><p className="text-sm text-slate-500">Tri par distance Haversine.</p></div>
      </div>
    </main>
  );
}

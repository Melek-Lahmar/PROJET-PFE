export function AdminCoverageMapPage() {
  return (
    <main className="p-6 space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-card-foreground">Carte de couverture</h1>
        <p className="mt-2 text-sm text-muted-foreground">Écran préparé pour visualiser les délégations couvertes et non couvertes. La carte GeoJSON sera branchée après stabilisation du Chantier 1.</p>
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5"><div className="text-3xl">🟢</div><b className="text-card-foreground">Délégations couvertes</b><p className="text-sm text-muted-foreground">Mappées dans F_DEPOT_ZONE.</p></div>
        <div className="rounded-2xl border border-border bg-card p-5"><div className="text-3xl">⚫</div><b className="text-card-foreground">Hors-zone</b><p className="text-sm text-muted-foreground">Bascule retrait dépôt.</p></div>
        <div className="rounded-2xl border border-border bg-card p-5"><div className="text-3xl">✨</div><b className="text-card-foreground">Dépôt recommandé</b><p className="text-sm text-muted-foreground">Tri par distance Haversine.</p></div>
      </div>
    </main>
  );
}

export function SupervisorAuditLogPage() {
  return (
    <main className="p-6">
      <section className="rounded-2xl border border-border bg-card p-5">
        <h1 className="text-2xl font-bold text-card-foreground">Audit superviseur</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Lecture des overrides et actions système. Le backend écrit déjà F_TRANSFERT_AUDIT_LOG lors des scans et overrides.
        </p>
      </section>
    </main>
  );
}

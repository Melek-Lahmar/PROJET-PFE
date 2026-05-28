import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getConfirmateurBlList, getConfirmateurDevis, getConfirmateurOrders } from "../../confirmateur/api/confirmateurApi";
import { Button } from "../../../shared/components/Button";

function money(value: number) {
  return `${value.toFixed(3)} TND`;
}

function StatCard({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-black text-card-foreground">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

function ControlCard({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-black text-card-foreground">{title}</h2>
      <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">{description}</p>
      <Link to={href} className="mt-4 inline-flex">
        <Button type="button" variant="primary">Ouvrir</Button>
      </Link>
    </article>
  );
}

export function ConfirmateurDashboardPage() {
  const ordersQuery = useQuery({ queryKey: ["confirmateur", "commandes"], queryFn: () => getConfirmateurOrders() });
  const blQuery = useQuery({ queryKey: ["confirmateur", "bl"], queryFn: () => getConfirmateurBlList() });
  const devisQuery = useQuery({ queryKey: ["confirmateur", "devis"], queryFn: () => getConfirmateurDevis() });

  const orders = ordersQuery.data ?? [];
  const bl = blQuery.data ?? [];
  const devis = devisQuery.data ?? [];
  const totalAmount = orders.reduce((sum, item) => sum + Number(item.dO_TotalTTC ?? 0), 0);
  const isLoading = ordersQuery.isLoading || blQuery.isLoading || devisQuery.isLoading;

  return (
    <div className="w-full space-y-5 pb-10">
      <section className="rounded-2xl border border-border/70 bg-card px-5 py-5 shadow-sm md:px-7">
        <div className="max-w-3xl">
          <div className="text-xs font-black text-primary">Accueil / Centre de contrôle</div>
          <h1 className="mt-2 text-2xl font-black text-card-foreground md:text-3xl">Centre de contrôle des documents</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Supervisez et gérez séparément vos bons de commande, bons de livraison et devis B2B pour assurer une validation fluide.
          </p>
        </div>
      </section>

      {isLoading ? <div className="text-sm text-muted-foreground">Chargement du centre de contrôle...</div> : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total documents" value={orders.length + bl.length + devis.length} hint="BC + BL + Devis B2B" />
        <StatCard label="BC en attente" value={orders.filter((x) => x.dO_Valide === 0).length} hint="À contrôler" />
        <StatCard label="BL à confirmer" value={bl.filter((x) => x.dO_Valide === 0).length} hint="À suivre" />
        <StatCard label="Devis à valider" value={devis.filter((x) => x.quoteStatus === "SENT").length} hint="B2B uniquement" />
        <StatCard label="Montant BC" value={money(totalAmount)} hint="Total TTC des BC" />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <ControlCard title="Bons de commande (BC)" href="/confirmateur/commandes" description="Liste dédiée des bons de commande à contrôler, filtrer et confirmer." />
        <ControlCard title="Bons de livraison (BL)" href="/confirmateur/bl" description="Liste dédiée des bons de livraison à contrôler et suivre." />
        <ControlCard title="Devis B2B" href="/confirmateur/devis" description="Liste dédiée des devis clients professionnels à traiter ou convertir en BC." />
      </section>
    </div>
  );
}

import { Link } from "react-router-dom";
import { PremiumHero, StaggeredColumn, AnimatedEntry } from "../../../shared/components/premium";

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="hover-lift rounded-[24px] border border-border/70 bg-card px-6 py-5 text-center shadow-sm">
      <div className="text-3xl font-black tracking-tight text-primary">{value}</div>
      <div className="mt-1 text-sm font-semibold text-muted-foreground">{label}</div>
    </div>
  );
}

function FeatureRow({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-4 rounded-[20px] border border-border/60 bg-card p-5 shadow-sm">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-2xl">
        {icon}
      </div>
      <div>
        <div className="text-sm font-extrabold text-card-foreground">{title}</div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

export function AboutPage() {
  return (
    <div className="w-full space-y-10 pb-10">
      <PremiumHero
        kicker="Projet PFE"
        title="À propos de la plateforme"
        description="Application e-commerce connectée à Sage X3 — catalogue produits, gestion de commandes, suivi de livraison et back-office intégré."
      />

      <StaggeredColumn className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" step={60}>
        <StatCard value="100+" label="Articles catalogue" />
        <StatCard value="7" label="Rôles utilisateurs" />
        <StatCard value="24/7" label="Suivi en temps réel" />
        <StatCard value="ERP" label="Intégration Sage X3" />
      </StaggeredColumn>

      <div className="app-surface p-8">
        <div className="app-kicker mb-2">Architecture</div>
        <h2 className="app-title mb-6">Stack technique</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Frontend</div>
            {[
              "React 18 + TypeScript",
              "Vite + Tailwind CSS v4",
              "React Router v6",
              "React Query + Zustand",
              "i18next (FR/AR)",
              "Recharts + Leaflet",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm text-card-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {item}
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Backend</div>
            {[
              "ASP.NET Core Web API",
              "SQL Server + EF Core",
              "Sage X3 (ERP)",
              "Konnect (paiement en ligne)",
              "JWT + refresh token",
              "SignalR (temps réel)",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm text-card-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <AnimatedEntry>
        <div>
          <div className="app-kicker mb-2">Fonctionnalités</div>
          <h2 className="app-title mb-6">Ce que propose la plateforme</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <FeatureRow icon="🛍️" title="Catalogue & Recherche" desc="Parcourez le catalogue complet avec filtres avancés, comparaison de produits et gestion des favoris." />
            <FeatureRow icon="🛒" title="Panier & Checkout" desc="Panier local persistant, checkout invité ou authentifié, livraison domicile ou retrait dépôt." />
            <FeatureRow icon="💳" title="Paiement Konnect" desc="Paiement sécurisé en ligne via la passerelle Konnect, avec retour de confirmation automatique." />
            <FeatureRow icon="📦" title="Gestion commandes" desc="Suivi complet des bons de commande (BC) et bons de livraison (BL) en temps réel." />
            <FeatureRow icon="👥" title="Rôles & Permissions" desc="7 rôles distincts : visiteur, client, vendeur, confirmateur, livreur, superviseur, administrateur." />
            <FeatureRow icon="🗺️" title="Géolocalisation" desc="Carte interactive pour la saisie d'adresse, zones de livraison et transit logistique." />
          </div>
        </div>
      </AnimatedEntry>

      <div className="flex flex-wrap gap-4">
        <Link
          to="/articles"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-7 text-sm font-bold text-primary-foreground shadow-[0_14px_32px_-18px_hsl(var(--primary)/0.7)] transition hover:-translate-y-0.5 hover:brightness-110"
        >
          Voir le catalogue
        </Link>
        <Link
          to="/contact"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-7 text-sm font-bold text-card-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"
        >
          Nous contacter
        </Link>
      </div>
    </div>
  );
}

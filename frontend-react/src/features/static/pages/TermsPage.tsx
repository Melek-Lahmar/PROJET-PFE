import { PremiumHero } from "../../../shared/components/premium";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[24px] border border-border/70 bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-extrabold text-card-foreground">{title}</h2>
      <div className="space-y-3 text-sm leading-7 text-muted-foreground">{children}</div>
    </div>
  );
}

export function TermsPage() {
  return (
    <div className="w-full space-y-6 pb-10">
      <PremiumHero
        kicker="Légal"
        title="Conditions d'utilisation"
        description="En utilisant notre plateforme, vous acceptez les présentes conditions. Veuillez les lire attentivement."
      />

      <div className="grid gap-5">
        <Section title="1. Objet">
          <p>
            La présente plateforme e-commerce permet aux utilisateurs de consulter un catalogue de produits, passer des commandes
            et suivre leur livraison, en connexion avec l'ERP Sage X3. Elle est développée dans le cadre d'un projet de fin d'études (PFE).
          </p>
        </Section>

        <Section title="2. Accès à la plateforme">
          <ul className="list-disc space-y-1 pl-5">
            <li>L'accès au catalogue est ouvert à tous les visiteurs.</li>
            <li>La passation de commande nécessite la création d'un compte client.</li>
            <li>Les accès internes (vendeur, confirmateur, livreur, superviseur, admin) sont attribués par l'administrateur.</li>
            <li>Chaque utilisateur est responsable de la confidentialité de ses identifiants.</li>
          </ul>
        </Section>

        <Section title="3. Prix et disponibilité">
          <p>
            Les prix affichés sont synchronisés depuis Sage X3 et peuvent évoluer sans préavis.
            La disponibilité des produits dépend des stocks enregistrés dans l'ERP.
            Les totaux finaux des commandes sont calculés côté serveur et peuvent différer de l'estimation panier.
          </p>
        </Section>

        <Section title="4. Commandes et paiement">
          <ul className="list-disc space-y-1 pl-5">
            <li>Toute commande passée est soumise à la validation d'un confirmateur.</li>
            <li>Le paiement en ligne est sécurisé par la passerelle Konnect.</li>
            <li>En cas d'annulation ou de retour, contactez le support dans les délais indiqués.</li>
            <li>Les bons de commande (BC) sont générés automatiquement dans Sage X3.</li>
          </ul>
        </Section>

        <Section title="5. Livraison">
          <p>
            Deux modes de livraison sont disponibles : domicile (8 TND) ou retrait en dépôt.
            Les délais de livraison sont indicatifs et peuvent varier en fonction de la disponibilité du livreur et de la zone géographique.
          </p>
        </Section>

        <Section title="6. Responsabilité">
          <p>
            La plateforme est fournie « en l'état » dans le cadre d'un projet académique.
            Nous ne pouvons être tenus responsables de pertes liées à des interruptions de service, des erreurs de synchronisation ERP
            ou des fluctuations de prix.
          </p>
        </Section>

        <Section title="7. Modification des conditions">
          <p>
            Nous nous réservons le droit de modifier les présentes conditions à tout moment.
            Les utilisateurs seront informés des changements importants via la plateforme.
          </p>
        </Section>

        <div className="rounded-[24px] border border-primary/20 bg-primary/[0.06] p-5 text-sm text-muted-foreground">
          <strong className="text-card-foreground">Note :</strong> Ces conditions sont fournies à titre indicatif dans le cadre d'un projet PFE.
          Pour un usage en production, elles doivent être rédigées et validées par un conseiller juridique.
        </div>
      </div>
    </div>
  );
}

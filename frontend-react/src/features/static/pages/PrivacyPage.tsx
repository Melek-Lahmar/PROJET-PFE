import { PremiumHero } from "../../../shared/components/premium";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[24px] border border-border/70 bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-extrabold text-card-foreground">{title}</h2>
      <div className="space-y-3 text-sm leading-7 text-muted-foreground">{children}</div>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <div className="w-full space-y-6 pb-10">
      <PremiumHero
        kicker="Légal"
        title="Politique de confidentialité"
        description="Dernière mise à jour : mai 2026. Cette politique explique comment nous collectons et protégeons vos données personnelles."
      />

      <div className="grid gap-5">
        <Section title="1. Données collectées">
          <p>
            Nous collectons uniquement les informations nécessaires à la création et au traitement de vos commandes :
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Nom, prénom, adresse email et numéro de téléphone.</li>
            <li>Adresse de livraison (rue, ville, code postal, gouvernorat).</li>
            <li>Coordonnées GPS (latitude/longitude) si vous utilisez la carte interactive.</li>
            <li>Informations de paiement (traitées par Konnect, non stockées chez nous).</li>
          </ul>
        </Section>

        <Section title="2. Utilisation des données">
          <p>Vos données sont utilisées exclusivement pour :</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Le traitement et le suivi de vos commandes.</li>
            <li>La coordination logistique (livraison, retrait en dépôt).</li>
            <li>La communication relative à votre commande (confirmation, livraison, retour).</li>
            <li>La synchronisation avec notre ERP (Sage X3) à des fins de gestion interne.</li>
          </ul>
        </Section>

        <Section title="3. Non-partage des données">
          <p>
            Vos données personnelles ne sont jamais vendues, louées ou transmises à des tiers à des fins commerciales.
            Elles ne sont partagées qu'avec les partenaires strictement nécessaires à l'exécution de votre commande (transporteur, ERP).
          </p>
        </Section>

        <Section title="4. Durée de conservation">
          <p>
            Vos données sont conservées pendant la durée nécessaire à la réalisation des services et, le cas échéant, jusqu'à
            5 ans après la dernière transaction, conformément aux obligations légales tunisiennes.
          </p>
        </Section>

        <Section title="5. Vos droits">
          <p>Conformément à la loi organique n° 2004-63 du 27 juillet 2004 (Tunisie), vous disposez du droit :</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>D'accéder à vos données personnelles (via « Mon compte »).</li>
            <li>De rectifier des informations inexactes.</li>
            <li>De demander la suppression de vos données.</li>
            <li>De retirer votre consentement à tout moment.</li>
          </ul>
          <p>Pour exercer ces droits, contactez-nous à <strong className="text-card-foreground">support@ecommerce.tn</strong>.</p>
        </Section>

        <Section title="6. Sécurité">
          <p>
            Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données contre
            tout accès non autorisé, perte ou altération. Les communications sont chiffrées via HTTPS.
          </p>
        </Section>

        <div className="rounded-[24px] border border-primary/20 bg-primary/[0.06] p-5 text-sm text-muted-foreground">
          <strong className="text-card-foreground">Note :</strong> Ce document est fourni à titre indicatif dans le cadre d'un projet PFE.
          Dans un contexte de production, il doit être complété et validé par un conseiller juridique.
        </div>
      </div>
    </div>
  );
}

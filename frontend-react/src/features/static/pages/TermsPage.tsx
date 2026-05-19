import { Card } from "../../../shared/components/Card";
import {
  PremiumHero,
} from "../../../shared/components/premium";

export function TermsPage() {
  return (
    <div className="w-full space-y-6 py-10">
      <PremiumHero
        kicker="Légal"
        title="Conditions d’utilisation"
        description="Résumé des conditions. À compléter pour un usage production."
      />

      <Card>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            En utilisant ce site, vous acceptez les conditions d’utilisation. Les prix et la disponibilité peuvent
            évoluer selon la synchronisation Sage.
          </p>
          <p>
            Les commandes sont validées côté backend. Les totaux affichés peuvent être recalculés lors de la
            confirmation.
          </p>
          <p>
            En cas de litige, contactez le support.
          </p>
        </div>
      </Card>
    </div>
  );
}

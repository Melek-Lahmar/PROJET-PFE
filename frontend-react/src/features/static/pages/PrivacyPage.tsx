import { Card } from "../../../shared/components/Card";
import {
  PremiumHero,
} from "../../../shared/components/premium";

export function PrivacyPage() {
  return (
    <div className="w-full space-y-6 py-10">
      <PremiumHero
        kicker="Légal"
        title="Politique de confidentialité"
        description="Cette page présente un résumé. Dans un contexte réel, elle doit être complétée selon les exigences légales."
      />

      <Card>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Nous collectons uniquement les informations nécessaires à la création de commande et à la livraison
            (nom, téléphone, adresse, coordonnées GPS si fournies).
          </p>
          <p>
            Les données sont utilisées pour le traitement des commandes et le suivi logistique. Elles ne sont pas
            revendues.
          </p>
          <p>
            Vous pouvez demander la mise à jour ou la suppression de vos informations via la page « Mon profil ».
          </p>
        </div>
      </Card>
    </div>
  );
}

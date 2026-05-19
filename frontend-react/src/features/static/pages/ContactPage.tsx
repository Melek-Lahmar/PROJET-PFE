import { Card } from "../../../shared/components/Card";
import { Button } from "../../../shared/components/Button";
import {
  PremiumHero,
  StaggeredColumn,
} from "../../../shared/components/premium";

export function ContactPage() {
  return (
    <div className="w-full space-y-6 py-10">
      <PremiumHero
        kicker="Support"
        title="Contact"
        description="Pour toute question (compte, commande, livraison), contactez-nous via les informations ci-dessous."
      />

      <StaggeredColumn className="grid gap-6 md:grid-cols-2" step={80}>
        <Card>
          <div className="space-y-2">
            <div className="text-sm font-extrabold text-card-foreground">Coordonnées</div>
            <div className="text-sm text-muted-foreground">
              <div>📧 support@ecommerce.tn</div>
              <div>📞 +216 00 000 000</div>
              <div>📍 Sfax, Tunisie</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="space-y-3">
            <div className="text-sm font-extrabold text-card-foreground">Horaires</div>
            <div className="text-sm text-muted-foreground">
              <div>Lun – Ven : 09:00 – 17:00</div>
              <div>Sam : 09:00 – 13:00</div>
            </div>
            <Button type="button" variant="outline" className="h-11 rounded-2xl">
              Envoyer un email
            </Button>
          </div>
        </Card>
      </StaggeredColumn>
    </div>
  );
}

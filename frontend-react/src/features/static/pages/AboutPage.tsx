import { Card } from "../../../shared/components/Card";
import {
  PremiumHero,
} from "../../../shared/components/premium";

export function AboutPage() {
  return (
    <div className="w-full space-y-6 py-10">
      <PremiumHero
        kicker="Projet PFE"
        title="À propos"
        description="Cette application e-commerce est connectée à Sage X3 et permet la gestion du catalogue, des commandes (BC) et du suivi de livraison (BL). Le frontend React consomme une API ASP.NET Core."
      />

      <Card>
        <div className="space-y-2">
          <h2 className="text-lg font-extrabold text-card-foreground">Fonctionnalités</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Catalogue produits + recherche</li>
            <li>Panier local + checkout</li>
            <li>Mes commandes + détail</li>
            <li>Admin : utilisateurs, synchronisation Sage, gestion images produits</li>
            <li>Confirmateur / Livreur : traitement BC et consultation BL</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}

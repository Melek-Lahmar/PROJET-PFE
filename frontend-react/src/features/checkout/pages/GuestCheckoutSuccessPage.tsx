import { Link, useSearchParams } from "react-router-dom";

import { Button } from "../../../shared/components/Button";
import {
  Confetti,
  EmptyView,
  PremiumHero,
} from "../../../shared/components/premium";

export function GuestCheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const piece = searchParams.get("piece")?.trim() ?? "";

  return (
    <div className="w-full space-y-6 py-10">
      <Confetti active={true} count={50} duration={3200} />
      <PremiumHero
        kicker="Commande enregistrée"
        title="Votre BC invité a bien été créé"
        description="Votre demande a été enregistrée côté système. Le suivi détaillé des commandes reste réservé aux utilisateurs connectés, mais le bon de commande a bien été transmis dans le flux interne."
      />
      <EmptyView
        title={piece ? `Référence BC : ${piece}` : "Bon de commande créé"}
        description="Pour bénéficier d’un parcours complet avec suivi des commandes, utilisez le parcours de connexion ou de création de compte avant la validation."
        iconPath="M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4 12 14.01l-3-3"
        action={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/articles">
              <Button type="button" size="lg" className="h-12 rounded-2xl px-7 text-base font-bold">
                Retour au catalogue
              </Button>
            </Link>
            <Link to="/checkout/start">
              <Button type="button" variant="outline" size="lg" className="h-12 rounded-2xl px-7 text-base">
                Refaire une commande
              </Button>
            </Link>
          </div>
        }
      />
    </div>
  );
}
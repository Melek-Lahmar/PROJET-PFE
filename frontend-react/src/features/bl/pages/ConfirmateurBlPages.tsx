import { BlListPage } from "./BlListPage";
import { BlDetailsPage } from "./BlDetailsPage";

export function ConfirmateurBlListPage() {
  return (
    <BlListPage
      title="Commandes passées (BL)"
      subtitle="Liste des bons de livraison générés après confirmation."
      detailsBasePath="/confirmateur/bl"
    />
  );
}

export function ConfirmateurBlDetailsPage() {
  return <BlDetailsPage backHref="/confirmateur/bl" backLabel="Retour aux BL" />;
}
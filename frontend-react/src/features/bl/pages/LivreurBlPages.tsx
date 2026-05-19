import { BlListPage } from "./BlListPage";
import { BlDetailsPage } from "./BlDetailsPage";

export function LivreurBlListPage() {
  return (
    <BlListPage
      title="BL à livrer"
      subtitle="Liste des bons de livraison disponibles pour les livreurs."
      detailsBasePath="/livreur/bl"
    />
  );
}

export function LivreurBlDetailsPage() {
  return <BlDetailsPage backHref="/livreur/bl" backLabel="Retour aux BL" />;
}
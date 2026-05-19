import { isRouteErrorResponse, useRouteError, Link } from "react-router-dom";
import { Button } from "../components/Button";

export function RouteErrorPage() {
  const err = useRouteError();

  let title = "Une erreur est survenue";
  let message = "Impossible d’afficher cette page pour le moment.";
  let status: number | undefined;

  if (isRouteErrorResponse(err)) {
    status = err.status;
    if (err.status === 404) {
      title = "Page introuvable (404)";
      message = "Le lien est invalide ou la page n’existe pas.";
    } else if (err.status === 401) {
      title = "Non autorisé (401)";
      message = "Veuillez vous connecter pour continuer.";
    } else if (err.status === 403) {
      title = "Accès refusé (403)";
      message = "Vous n’avez pas les droits nécessaires.";
    } else {
      title = `Erreur (${err.status})`;
      message = err.statusText || message;
    }
  } else if (err instanceof Error) {
    message = err.message;
  }

  return (
    <div className="mx-auto max-w-2xl py-16">
      <div className="card p-8 space-y-4">
        <div className="text-sm text-muted-foreground">
          {status ? `Code: ${status}` : "Erreur"}
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{message}</p>

        <div className="flex flex-wrap gap-2 pt-2">
          <Link to="/">
            <Button className="rounded-full">Accueil</Button>
          </Link>
          <Link to="/orders">
            <Button variant="ghost" className="rounded-full">
              Mes commandes
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
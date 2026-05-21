import { isRouteErrorResponse, useRouteError, Link } from "react-router-dom";
import { Button } from "../components/Button";

export function RouteErrorPage() {
  const err = useRouteError();

  let title = "Une erreur est survenue";
  let message = "Impossible d'afficher cette page pour le moment.";
  let status: number | undefined;

  if (isRouteErrorResponse(err)) {
    status = err.status;
    if (err.status === 404) {
      title = "Page introuvable";
      message = "Le lien est invalide ou la page n'existe plus.";
    } else if (err.status === 401) {
      title = "Non autorisé";
      message = "Veuillez vous connecter pour accéder à cette page.";
    } else if (err.status === 403) {
      title = "Accès refusé";
      message = "Vous n'avez pas les droits nécessaires pour afficher cette page.";
    } else {
      title = `Erreur serveur`;
      message = err.statusText || message;
    }
  } else if (err instanceof Error) {
    message = err.message;
  }

  return (
    <div className="flex min-h-[65vh] flex-col items-center justify-center gap-10 px-6 py-16 text-center">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at center, hsl(var(--primary) / 0.14), transparent 60%)",
        }}
        aria-hidden
      />

      <div className="relative space-y-6">
        {/* Status code */}
        {status && (
          <div
            className="text-[7rem] font-black leading-none tracking-tight text-primary/15 md:text-[9rem]"
            aria-hidden
          >
            {status}
          </div>
        )}

        {/* Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary ring-8 ring-primary/5">
          {status === 404 ? (
            <svg className="h-9 w-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
              <path d="M8 11h6" />
            </svg>
          ) : status === 401 || status === 403 ? (
            <svg className="h-9 w-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          ) : (
            <svg className="h-9 w-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              <line x1="12" x2="12" y1="9" y2="13" />
              <line x1="12" x2="12.01" y1="17" y2="17" />
            </svg>
          )}
        </div>

        {/* Text */}
        <div className="space-y-3">
          {status && (
            <div className="app-kicker">Code {status}</div>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-card-foreground md:text-3xl">
            {title}
          </h1>
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
            {message}
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link to="/">
            <Button variant="primary" className="h-11 rounded-2xl px-6">
              Retour à l'accueil
            </Button>
          </Link>
          <Link to="/orders">
            <Button variant="outline" className="h-11 rounded-2xl px-6">
              Mes commandes
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

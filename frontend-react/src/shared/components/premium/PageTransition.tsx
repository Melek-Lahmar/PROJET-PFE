import { type ReactNode } from "react";
import { useLocation } from "react-router-dom";

interface PageTransitionProps {
  children: ReactNode;
  /** Durée d'animation en ms (default 360). */
  duration?: number;
}

/**
 * Wrapper pour les transitions de page.
 *
 * Implémentation simplifiée 2026-05-14 : la machine à états "enter/idle"
 * précédente plaçait la page à opacity:0 et la révélait via setTimeout. Le
 * timer ne se déclenchait pas toujours sur les redirects (<Navigate>),
 * laissant des pages vides indéfiniment (cf. /orders, /profile).
 *
 * Maintenant le wrapper utilise simplement `key={pathname}` pour remonter
 * son sous-arbre à chaque navigation ; les animations CSS des enfants
 * (`.anim-fade-up`, `.anim-fade-in`) jouent toutes seules au mount.
 */
export function PageTransition({ children, duration = 360 }: PageTransitionProps) {
  const location = useLocation();

  return (
    <div
      key={location.pathname}
      className="premium-page-transition"
      data-stage="idle"
      style={{ ["--transition-duration" as string]: `${duration}ms` }}
    >
      {children}
    </div>
  );
}

/**
 * LivreurMobileGuard
 *
 * Si l'utilisateur connecté a le rôle LIVREUR ou LIVREUR_TRANSIT,
 * bloque l'accès au web et affiche un écran dédié avec CTA vers l'app mobile.
 * Sinon, rend les children normalement (transparence pour les autres rôles).
 *
 * Usage dans routes.tsx :
 *   <LivreurMobileGuard>
 *     <OutletOrPage />
 *   </LivreurMobileGuard>
 *
 * Ou via le composant <LivreurMobileWallPage /> directement sur les routes livreur.
 */

import { Outlet } from "react-router-dom";
import { useAuthStore } from "../../features/auth/store/authStore";

const LIVREUR_ROLES = ["LIVREUR", "LIVREUR_TRANSIT", "LIVREUR_COD"];

// ── Écran de blocage ──────────────────────────────────────────────────────────
export function LivreurMobileWallPage() {
  const email = useAuthStore((s) => s.email);
  const clear = useAuthStore((s) => s.clear);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gradient-to-br from-slate-50 to-slate-100 px-6 text-center">
      {/* Icône mobile */}
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 shadow-sm">
        <svg
          className="h-10 w-10 text-primary"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="5" y="2" width="14" height="20" rx="2" />
          <path d="M12 18h.01" />
        </svg>
      </div>

      {/* Titre */}
      <div className="max-w-sm space-y-3">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Application mobile requise
        </h1>
        <p className="text-base leading-relaxed text-slate-600">
          Votre compte livreur est configuré pour l'application mobile uniquement.
          Le tableau de bord web n'est pas disponible pour ce rôle.
        </p>
        {email && (
          <p className="text-sm font-semibold text-slate-500">Connecté en tant que : {email}</p>
        )}
      </div>

      {/* CTA principal */}
      <div className="flex flex-col items-center gap-3">
        <a
          href="https://play.google.com/store"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 items-center gap-2 rounded-2xl bg-primary px-7 text-sm font-extrabold text-primary-foreground shadow-lg shadow-primary/25 transition hover:-translate-y-0.5 hover:shadow-xl"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3.18 23.74a2.12 2.12 0 0 0 2.31-.3l12.57-7.26-2.9-2.9L3.18 23.74zM20.76 10.03 17.6 8.1 14.4 12l3.2 3.9 3.16-1.83a2.12 2.12 0 0 0 0-4.04zM1.5 1.2a2.11 2.11 0 0 0-.5 1.4v18.7a2.11 2.11 0 0 0 .5 1.4l.09.09L13.1 12v-.3L1.59 1.11 1.5 1.2zm4.8 6.71 10.51 6.09-2.9 2.9L5.5 11.01a2.12 2.12 0 0 1 0-3.1z" />
          </svg>
          Télécharger sur Google Play
        </a>

        <a
          href="https://apps.apple.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 items-center gap-2 rounded-2xl border border-border bg-card px-7 text-sm font-extrabold text-card-foreground shadow-sm transition hover:bg-muted"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
          Télécharger sur l'App Store
        </a>
      </div>

      {/* Se déconnecter */}
      <button
        type="button"
        onClick={() => {
          clear();
          window.location.replace("/login");
        }}
        className="text-sm font-semibold text-muted-foreground underline underline-offset-2 hover:text-card-foreground"
      >
        Se déconnecter
      </button>
    </div>
  );
}

// ── Guard wrapper (children) ──────────────────────────────────────────────────
export function LivreurMobileGuard({ children }: { children: React.ReactNode }) {
  const roles = useAuthStore((s) => s.roles);
  const isLivreur = roles.some((r) => LIVREUR_ROLES.includes(r));

  if (isLivreur) return <LivreurMobileWallPage />;
  return <>{children}</>;
}

// ── Guard outlet (React Router layout route) ──────────────────────────────────
export function LivreurMobileGuardOutlet() {
  const roles = useAuthStore((s) => s.roles);
  const isLivreur = roles.some((r) => LIVREUR_ROLES.includes(r));

  if (isLivreur) return <LivreurMobileWallPage />;
  return <Outlet />;
}

import { Link } from "react-router-dom";
import { useAuthStore } from "../../features/auth/store/authStore";

function SocialIcon({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <span
      aria-label={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-shell-border/80 bg-shell-elevated/80 text-shell-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:text-shell-foreground hover:shadow-lg"
    >
      {children}
    </span>
  );
}

export function Footer() {
  const isAuth = useAuthStore((s) => s.isAuthenticated());
  const roles = useAuthStore((s) => s.roles);

  const isAdmin = roles.includes("ADMIN");
  const isConfirmateur = roles.includes("CONFIRMATEUR");
  const isLivreur = roles.includes("LIVREUR");

  return (
    <footer className="relative z-10 mt-auto border-t border-shell-border/80 bg-shell/70 text-shell-foreground backdrop-blur-xl">
      <div className="container-app py-10">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-indigo-600 text-sm font-black text-white shadow-[0_18px_38px_-24px_hsl(var(--primary)/0.8)]">
                E
              </div>
              <div className="leading-tight">
                <div className="text-sm font-extrabold text-shell-foreground">E-commerce</div>
                <div className="text-xs text-shell-foreground/70">Catalogue & commandes</div>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-shell-foreground/70">
              Plateforme e-commerce connectée à Sage X3 : catalogue, commandes et suivi de livraison.
            </p>

            <div className="mt-5 flex items-center gap-2">
              <SocialIcon label="LinkedIn">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                  <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5ZM.5 8.5h4V24h-4V8.5Zm7 0h3.8v2.1h.1c.5-1 1.9-2.1 4-2.1 4.3 0 5.1 2.8 5.1 6.5V24h-4v-7.6c0-1.8 0-4.1-2.5-4.1s-2.9 2-2.9 4V24h-4V8.5Z" />
                </svg>
              </SocialIcon>
              <SocialIcon label="Facebook">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                  <path d="M22 12a10 10 0 1 0-11.5 9.9v-7H8v-3h2.5V9.5C10.5 7 12 5.7 14.3 5.7c1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.7-1.6 1.5V12H16l-.4 3h-2.3v7A10 10 0 0 0 22 12Z" />
                </svg>
              </SocialIcon>
              <SocialIcon label="Email">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M4 4h16v16H4z" />
                  <path d="m22 6-10 7L2 6" />
                </svg>
              </SocialIcon>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-shell-foreground/60">Boutique</div>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link className="transition hover:text-shell-foreground" to="/articles">
                  Articles
                </Link>
              </li>
              <li>
                <Link className="transition hover:text-shell-foreground" to="/cart">
                  Panier
                </Link>
              </li>
              <li>
                <Link className="transition hover:text-shell-foreground" to={isAuth ? "/orders" : "/login"}>
                  Mes commandes
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-shell-foreground/60">Espace pro</div>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link className="transition hover:text-shell-foreground" to={isAuth ? "/profile" : "/login"}>
                  Mon profil
                </Link>
              </li>
              {isAdmin ? (
                <li>
                  <Link className="transition hover:text-shell-foreground" to="/admin">
                    Administration
                  </Link>
                </li>
              ) : null}
              {isConfirmateur ? (
                <li>
                  <Link className="transition hover:text-shell-foreground" to="/confirmateur/commandes">
                    Confirmateur
                  </Link>
                </li>
              ) : null}
              {isLivreur ? (
                <li>
                  <Link className="transition hover:text-shell-foreground" to="/livreur/bl">
                    Livreur
                  </Link>
                </li>
              ) : null}
            </ul>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-shell-foreground/60">Support</div>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link className="transition hover:text-shell-foreground" to="/contact">
                  Contact
                </Link>
              </li>
              <li>
                <Link className="transition hover:text-shell-foreground" to="/privacy">
                  Politique de confidentialité
                </Link>
              </li>
              <li>
                <Link className="transition hover:text-shell-foreground" to="/terms">
                  Conditions d’utilisation
                </Link>
              </li>
            </ul>

            <div className="mt-5 rounded-2xl border border-shell-border/70 bg-shell-elevated/70 px-4 py-3 text-sm text-shell-foreground/75">
              <div className="font-semibold text-shell-foreground">Contact</div>
              <div className="mt-1">support@ecommerce.tn</div>
              <div>+216 00 000 000</div>
              <div className="mt-2 text-xs text-shell-foreground/60">Sfax, Tunisie</div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-shell-border/80 pt-6 text-sm text-shell-foreground/70 md:flex-row">
          <div className="font-medium">© {new Date().getFullYear()} E-commerce • Projet PFE</div>
          <div className="flex items-center gap-4">
            <Link className="transition hover:text-shell-foreground" to="/about">
              À propos
            </Link>
            <Link className="transition hover:text-shell-foreground" to="/contact">
              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

import { Link } from "react-router-dom";
import { useAuthStore } from "../../features/auth/store/authStore";
import { usePublicSettings } from "../hooks/usePublicSettings";

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconLinkedIn() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5ZM.5 8.5h4V24h-4V8.5Zm7 0h3.8v2.1h.1c.5-1 1.9-2.1 4-2.1 4.3 0 5.1 2.8 5.1 6.5V24h-4v-7.6c0-1.8 0-4.1-2.5-4.1s-2.9 2-2.9 4V24h-4V8.5Z" />
    </svg>
  );
}

function IconFacebook() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M22 12a10 10 0 1 0-11.5 9.9v-7H8v-3h2.5V9.5C10.5 7 12 5.7 14.3 5.7c1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.7-1.6 1.5V12H16l-.4 3h-2.3v7A10 10 0 0 0 22 12Z" />
    </svg>
  );
}

function IconX() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function IconMail() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 4h16v16H4z" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  );
}

function IconPhone() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2Z" />
    </svg>
  );
}

function IconPin() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s7-4.5 7-12a7 7 0 0 0-14 0c0 7.5 7 12 7 12z" />
      <circle cx="12" cy="10" r="2" />
    </svg>
  );
}

function IconX3() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3h7l2 4-2 4H3" />
      <path d="M14 7h3l4 4-4 4h-3" />
      <line x1="14" y1="11" x2="21" y2="11" />
    </svg>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  const isExternal = href.startsWith("http") || href.startsWith("mailto:");
  const cls =
    "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-shell-border/80 bg-shell-elevated/60 text-shell-foreground/70 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/10 hover:text-primary hover:shadow-md";

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link to={href} aria-label={label} className={cls}>
      {children}
    </Link>
  );
}

function FooterColTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-shell-foreground/55">
      {children}
    </div>
  );
}

function FooterLink({ to, children, external }: { to: string; children: React.ReactNode; external?: boolean }) {
  const cls = "group flex items-center gap-1.5 text-sm text-shell-foreground/65 transition-colors duration-150 hover:text-shell-foreground";
  const dot = (
    <span className="h-1 w-1 rounded-full bg-primary opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
  );
  if (external) {
    return (
      <a href={to} target="_blank" rel="noopener noreferrer" className={cls}>
        {dot}{children}
      </a>
    );
  }
  return (
    <Link to={to} className={cls}>
      {dot}{children}
    </Link>
  );
}

function ContactRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 text-sm text-shell-foreground/65">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="leading-snug">{children}</span>
    </div>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

export function Footer() {
  const isAuth = useAuthStore((s) => s.isAuthenticated());
  const roles = useAuthStore((s) => s.roles);
  const { get } = usePublicSettings();

  const isAdmin = roles.includes("ADMIN");
  const isVendeur = roles.includes("VENDEUR");
  const isConfirmateur = roles.includes("CONFIRMATEUR");
  const isLivreur = roles.includes("LIVREUR");
  const isSupervisor = roles.includes("SUPERVISEUR");

  // Settings with fallbacks
  const companyName = get<string>("company.name", "E-commerce");
  const companyTagline = get<string>("company.tagline", "Catalogue & Commandes");
  const footerDescription = get<string>(
    "footer.description",
    "Plateforme e-commerce connectée à Sage X3 : catalogue, commandes et suivi de livraison en temps réel."
  );
  const footerCopyright = get<string>("footer.copyright", "");
  const footerBadge = get<string>("footer.badge", "Propulsé par Sage X3");
  const companyEmail = get<string>("company.email", "support@ecommerce.tn");
  const companyPhone = get<string>("company.phone", "+216 00 000 000");
  const companyAddress = get<string>("company.address", "Sfax, Tunisie");

  const socialLinkedIn = get<string>("footer.social.linkedin", "");
  const socialFacebook = get<string>("footer.social.facebook", "");
  const socialTwitter = get<string>("footer.social.twitter", "");

  const copyrightText = footerCopyright || `© ${new Date().getFullYear()} ${companyName} — Tous droits réservés`;

  return (
    <footer className="relative z-10 mt-auto border-t border-shell-border/60 bg-shell/80 text-shell-foreground backdrop-blur-xl">
      {/* Top accent bar */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="container-app py-12">
        <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr_1fr_1.4fr]">

          {/* ── Column 1 : Brand ─────────────────────────────────────── */}
          <div>
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#2563eb,#4f46e5)] text-sm font-black text-white shadow-[0_14px_30px_-14px_rgba(37,99,235,0.85)]">
                {companyName.charAt(0).toUpperCase()}
              </div>
              <div className="leading-tight">
                <div className="text-base font-extrabold text-shell-foreground">{companyName}</div>
                <div className="text-[11px] text-shell-foreground/55">{companyTagline}</div>
              </div>
            </div>

            {/* Description */}
            <p className="mt-5 max-w-[280px] text-sm leading-7 text-shell-foreground/60">
              {footerDescription}
            </p>

            {/* Social icons */}
            <div className="mt-5 flex items-center gap-2">
              {socialLinkedIn && (
                <SocialLink href={socialLinkedIn} label="LinkedIn">
                  <IconLinkedIn />
                </SocialLink>
              )}
              {socialFacebook && (
                <SocialLink href={socialFacebook} label="Facebook">
                  <IconFacebook />
                </SocialLink>
              )}
              {socialTwitter && (
                <SocialLink href={socialTwitter} label="Twitter / X">
                  <IconX />
                </SocialLink>
              )}
              <SocialLink href={`mailto:${companyEmail}`} label="Email">
                <IconMail />
              </SocialLink>
            </div>

            {/* Tech badge */}
            {footerBadge && (
              <div className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-3 py-1.5 text-[11px] font-bold text-primary/80">
                <IconX3 />
                {footerBadge}
              </div>
            )}
          </div>

          {/* ── Column 2 : Boutique ──────────────────────────────────── */}
          <div>
            <FooterColTitle>Boutique</FooterColTitle>
            <ul className="space-y-2.5">
              <li><FooterLink to="/articles">Catalogue</FooterLink></li>
              <li><FooterLink to="/cart">Panier</FooterLink></li>
              <li><FooterLink to={isAuth ? "/orders" : "/login"}>Mes commandes</FooterLink></li>
              <li><FooterLink to={isAuth ? "/favorites" : "/login"}>Favoris</FooterLink></li>
              <li><FooterLink to={isAuth ? "/compare" : "/articles"}>Comparateur</FooterLink></li>
            </ul>
          </div>

          {/* ── Column 3 : Espace Pro ────────────────────────────────── */}
          <div>
            <FooterColTitle>Espace Pro</FooterColTitle>
            <ul className="space-y-2.5">
              <li><FooterLink to={isAuth ? "/profile" : "/login"}>Mon profil</FooterLink></li>
              {isAuth && <li><FooterLink to="/profile/addresses">Mes adresses</FooterLink></li>}
              {isAdmin && <li><FooterLink to="/admin">Administration</FooterLink></li>}
              {isVendeur && <li><FooterLink to="/vendeur/articles">Espace vendeur</FooterLink></li>}
              {isConfirmateur && <li><FooterLink to="/confirmateur/commandes">Confirmateur</FooterLink></li>}
              {isSupervisor && <li><FooterLink to="/supervisor">Superviseur</FooterLink></li>}
              {isLivreur && <li><FooterLink to="/livreur/bl">Espace livreur</FooterLink></li>}
              {!isAuth && <li><FooterLink to="/register">Créer un compte</FooterLink></li>}
            </ul>
          </div>

          {/* ── Column 4 : Contact & Support ─────────────────────────── */}
          <div>
            <FooterColTitle>Contact &amp; Support</FooterColTitle>

            <div className="space-y-3">
              <ContactRow icon={<IconMail />}>
                <a
                  href={`mailto:${companyEmail}`}
                  className="transition-colors hover:text-primary"
                >
                  {companyEmail}
                </a>
              </ContactRow>
              <ContactRow icon={<IconPhone />}>
                <a
                  href={`tel:${companyPhone.replace(/\s/g, "")}`}
                  className="transition-colors hover:text-primary"
                >
                  {companyPhone}
                </a>
              </ContactRow>
              <ContactRow icon={<IconPin />}>
                {companyAddress}
              </ContactRow>
            </div>

            {/* Support links */}
            <div className="mt-6 space-y-2.5">
              <FooterColTitle>Liens utiles</FooterColTitle>
              <ul className="space-y-2.5">
                <li><FooterLink to="/contact">Nous contacter</FooterLink></li>
                <li><FooterLink to="/about">À propos</FooterLink></li>
                <li><FooterLink to="/privacy">Confidentialité</FooterLink></li>
                <li><FooterLink to="/terms">Conditions d'utilisation</FooterLink></li>
              </ul>
            </div>
          </div>
        </div>

        {/* ── Bottom bar ─────────────────────────────────────────────── */}
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-shell-border/60 pt-6 md:flex-row">
          <div className="text-[13px] font-medium text-shell-foreground/50">
            {copyrightText}
          </div>
          <div className="flex items-center gap-5 text-[13px] text-shell-foreground/50">
            <Link to="/privacy" className="transition-colors hover:text-shell-foreground">
              Confidentialité
            </Link>
            <Link to="/terms" className="transition-colors hover:text-shell-foreground">
              CGU
            </Link>
            <Link to="/contact" className="transition-colors hover:text-shell-foreground">
              Support
            </Link>
            {isAdmin && (
              <Link
                to="/admin/settings"
                className="flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/8 px-2.5 py-1 text-[11px] font-bold text-primary/80 transition-colors hover:bg-primary/15 hover:text-primary"
              >
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                </svg>
                Personnaliser
              </Link>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}

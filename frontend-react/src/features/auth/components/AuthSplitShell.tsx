import type { ReactNode, SVGProps } from "react";

type AuthScreen = "login" | "register" | "forgot";

type AuthSplitShellProps = {
  screen: AuthScreen;
  children: ReactNode;
  formClassName?: string;
};

function IconShield(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3 19 6v5.5c0 4.4-2.9 8.4-7 9.5-4.1-1.1-7-5.1-7-9.5V6l7-3Z" />
      <path d="m9.5 12 1.8 1.8 3.7-4" />
    </svg>
  );
}

function IconFile(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </svg>
  );
}

function IconCart(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6.5 7h14l-1.6 7.4a2 2 0 0 1-2 1.6H9.2a2 2 0 0 1-2-1.7L6 4H3" />
      <circle cx="9.5" cy="20" r="1.5" />
      <circle cx="17" cy="20" r="1.5" />
    </svg>
  );
}

function IconChart(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 20V10" />
      <path d="M10 20V5" />
      <path d="M16 20v-8" />
      <path d="M22 20H2" />
    </svg>
  );
}

function IconLock(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="6" y="10" width="12" height="10" rx="2" />
      <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
      <path d="M12 14v2" />
    </svg>
  );
}

function IconSend(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m22 2-7 20-4-9-9-4 20-7Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function FeatureItem({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/12 text-white shadow-[0_18px_44px_-24px_rgba(2,6,23,0.65)] backdrop-blur-md">
        {icon}
      </div>
      <div>
        <div className="text-sm font-extrabold text-white">{title}</div>
        <p className="mt-1 max-w-[250px] text-[13px] leading-6 text-white/78">{text}</p>
      </div>
    </div>
  );
}

function DashboardIllustration() {
  return (
    <div className="pointer-events-none absolute bottom-8 right-4 hidden h-[220px] w-[330px] select-none 2xl:block">
      <div className="absolute bottom-8 right-12 h-32 w-52 -skew-x-6 rounded-[20px] border border-white/20 bg-white/88 p-4 dark:border-white/10 dark:bg-slate-950/50 shadow-[0_30px_80px_-34px_rgba(2,6,23,0.8)]">
        <div className="flex h-full gap-3">
          <div className="w-9 rounded-xl bg-blue-950/85 p-2">
            <div className="h-2 w-3 rounded-full bg-white/65" />
            <div className="mt-5 space-y-2">
              <div className="h-1.5 rounded bg-white/40" />
              <div className="h-1.5 rounded bg-white/25" />
              <div className="h-1.5 rounded bg-white/25" />
            </div>
          </div>

          <div className="flex-1">
            <div className="h-4 w-24 rounded-full bg-muted" />
            <div className="mt-5 flex items-end gap-1.5">
              {[28, 42, 34, 54, 40, 62, 50].map((h) => (
                <div key={h} className="w-4 rounded-t-lg bg-blue-500/70" style={{ height: `${h}px` }} />
              ))}
            </div>
            <div className="mt-4 h-2 w-36 rounded-full bg-muted" />
            <div className="mt-2 h-2 w-24 rounded-full bg-muted" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 right-0 flex h-24 w-24 items-center justify-center rounded-[26px] border border-white/25 bg-white/28 text-white dark:border-white/12 dark:bg-slate-950/30 shadow-[0_30px_70px_-38px_rgba(2,6,23,0.75)] backdrop-blur-md">
        <IconCart className="h-10 w-10" />
      </div>

      <div className="absolute bottom-2 right-24 h-14 w-20 rounded-[18px] bg-blue-200/50 dark:bg-blue-950/35 shadow-[0_24px_50px_-30px_rgba(2,6,23,0.8)]" />

      <div className="absolute bottom-14 left-12 flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/25 bg-white/90 text-blue-700 dark:border-white/12 dark:bg-slate-950/60 dark:text-blue-200 shadow-[0_24px_55px_-32px_rgba(2,6,23,0.7)]">
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
          <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z" />
        </svg>
      </div>
    </div>
  );
}

function RecoveryIllustration() {
  return (
    <div className="relative mx-auto mt-6 hidden h-[250px] w-full max-w-[420px] md:block">
      <div className="absolute left-1/2 top-8 h-44 w-44 -translate-x-1/2 rounded-full border border-white/10" />
      <div className="absolute left-1/2 top-2 h-60 w-60 -translate-x-1/2 rounded-full border border-white/10" />

      <div className="absolute left-[28%] top-20 flex h-32 w-32 items-center justify-center rounded-[34px] border border-white/20 bg-white/14 text-white shadow-[0_30px_80px_-32px_rgba(2,6,23,0.7)] backdrop-blur-md">
        <IconLock className="h-16 w-16" />
      </div>

      <div className="absolute right-[18%] top-[104px] h-[86px] w-[150px] -rotate-3 rounded-[22px] border border-white/22 bg-white/38 dark:border-white/12 dark:bg-slate-950/40 shadow-[0_22px_55px_-28px_rgba(2,6,23,0.65)] backdrop-blur-md">
        <div className="absolute inset-x-0 top-0 h-full rounded-[22px] bg-gradient-to-br from-white/65 to-white/10 dark:from-white/12 dark:to-white/5" />
        <div className="absolute left-0 top-0 h-full w-full rounded-[22px] border-t border-white/35" />
        <div className="absolute left-5 top-6 h-2 w-20 rounded-full bg-white/45" />
        <div className="absolute left-5 top-10 h-2 w-28 rounded-full bg-white/25" />
      </div>

      <div className="absolute right-[10%] top-[136px] flex h-14 w-14 items-center justify-center rounded-full bg-blue-400 text-white shadow-[0_18px_42px_-20px_rgba(37,99,235,0.95)]">
        <IconSend className="h-6 w-6" />
      </div>
    </div>
  );
}

function MarketingPanel({ screen }: { screen: AuthScreen }) {
  const isRegister = screen === "register";
  const isForgot = screen === "forgot";

  return (
    <aside className="relative overflow-hidden bg-[radial-gradient(circle_at_76%_45%,rgba(96,165,250,0.35),transparent_0_30%,transparent_55%),linear-gradient(140deg,#0b4dc8_0%,#0a48b6_46%,#073479_100%)] px-8 py-9 text-white sm:px-11 lg:px-12 lg:py-14">
      <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full border border-white/10" />
      <div className="absolute -bottom-36 right-14 h-[420px] w-[420px] rounded-full border border-white/8" />

      <div className="absolute left-8 top-8 h-32 w-32 opacity-30 [background-image:radial-gradient(rgba(255,255,255,0.42)_1px,transparent_1px)] [background-size:12px_12px]" />
      <div className="absolute right-16 top-24 h-24 w-24 opacity-25 [background-image:radial-gradient(rgba(255,255,255,0.50)_1px,transparent_1px)] [background-size:10px_10px]" />

      <div className="relative z-10 max-w-[440px]">
        <div className="inline-flex items-center gap-2 rounded-2xl border border-white/16 bg-white/10 px-4 py-2 text-xs font-bold text-white/90 shadow-[0_18px_44px_-28px_rgba(2,6,23,0.8)] backdrop-blur-md">
          <IconShield className="h-4 w-4" />
          {isForgot ? "Récupération sécurisée" : isRegister ? "Création de compte sécurisée" : "Accès sécurisé"}
        </div>

        {isForgot ? (
          <>
            <RecoveryIllustration />

            <div className="mt-8 text-[11px] font-bold uppercase tracking-[0.24em] text-white/60">
              Récupération sécurisée
            </div>

            <h2 className="mt-4 max-w-[360px] text-4xl font-black leading-[1.08] tracking-[-0.045em] text-white md:text-[42px]">
              Nous sommes là
              <br />
              pour vous aider
            </h2>

            <p className="mt-5 max-w-[420px] text-[15px] leading-7 text-white/82">
              Saisissez votre email et nous vous enverrons un lien sécurisé pour réinitialiser votre mot de passe.
            </p>
          </>
        ) : (
          <>
            <h2 className="mt-10 max-w-[430px] text-4xl font-black leading-[1.05] tracking-[-0.045em] text-white md:text-[44px]">
              {isRegister ? "Rejoignez E-commerce" : "Bienvenue"}
            </h2>

            <p className="mt-5 max-w-[390px] text-[15px] leading-7 text-white/84">
              {isRegister
                ? "Créez votre compte pour accéder à notre catalogue complet, gérer vos commandes et optimiser votre activité en toute simplicité."
                : "Connectez-vous à votre compte pour accéder à votre catalogue, gérer vos commandes et optimiser votre activité."}
            </p>

            <div className="mt-11 space-y-6">
              <FeatureItem icon={<IconFile className="h-6 w-6" />} title="Catalogue complet" text="Trouvez rapidement vos produits et références." />

              <FeatureItem
                icon={<IconCart className="h-6 w-6" />}
                title={isRegister ? "Gestion simplifiée" : "Gestion des commandes"}
                text="Suivez, gérez et pilotez vos commandes en toute simplicité."
              />

              <FeatureItem icon={<IconChart className="h-6 w-6" />} title="Expérience optimisée" text="Des outils conçus pour gagner du temps et booster votre efficacité." />
            </div>

            <DashboardIllustration />
          </>
        )}
      </div>
    </aside>
  );
}

export function BrandMark({ label = "E" }: { label?: string }) {
  return (
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#2563eb,#4f46e5)] text-xl font-black text-white shadow-[0_20px_45px_-20px_rgba(37,99,235,0.9)]">
      {label}
    </div>
  );
}

export function AuthSplitShell({
  screen,
  children,
  formClassName = "",
}: AuthSplitShellProps) {
  const isRegister = screen === "register";

  return (
    <div className="auth-page-wrapper w-full max-w-[1180px] py-6 md:py-8 lg:py-10">
      <section
        className={[
          "auth-split-card mx-auto grid w-full",
          "lg:grid-cols-[0.84fr_1fr]",
          isRegister ? "min-h-[720px]" : "min-h-[600px]",
        ].join(" ")}
      >
        <MarketingPanel screen={screen} />

        <div
          className={[
            "auth-form-panel relative flex items-center justify-center px-6 py-10 sm:px-10 lg:px-14",
            formClassName,
          ].join(" ")}
        >
          <div className="pointer-events-none absolute right-0 top-0 h-full w-1.5 bg-[linear-gradient(180deg,#60a5fa,#7c3aed)] opacity-80" />

          <div className="pointer-events-none absolute -right-28 top-1/3 h-56 w-56 rounded-full border border-blue-200/50 dark:border-blue-400/10" />

          {children}
        </div>
      </section>
    </div>
  );
}
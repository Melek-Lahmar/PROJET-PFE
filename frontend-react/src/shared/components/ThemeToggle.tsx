import { useLayoutStore } from "../store/layoutStore";

function IconSun(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function IconMoon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3c0 5 4 9 9 9 .27 0 .53-.01.79-.03Z" />
    </svg>
  );
}

export function ThemeToggle() {
  const themeMode = useLayoutStore((s) => s.themeMode);
  const toggleThemeMode = useLayoutStore((s) => s.toggleThemeMode);

  const isDark = themeMode === "dark";

  return (
    <button
      type="button"
      onClick={toggleThemeMode}
      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-shell-border/80 bg-shell-elevated/90 text-shell-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:text-shell-foreground hover:shadow-lg"
      aria-label={isDark ? "Activer le mode clair" : "Activer le mode sombre"}
      title={isDark ? "Mode clair" : "Mode sombre"}
    >
      {isDark ? <IconSun className="h-5 w-5" /> : <IconMoon className="h-5 w-5" />}
    </button>
  );
}

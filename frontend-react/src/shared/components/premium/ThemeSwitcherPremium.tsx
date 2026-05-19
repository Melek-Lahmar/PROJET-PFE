import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "auto";

interface ThemeSwitcherPremiumProps {
  /** Persiste la préférence dans localStorage sous cette clé. */
  storageKey?: string;
}

/**
 * Switcher de thème premium avec animation morph sun↔moon.
 * - 3 modes : light, dark, auto (suit le système).
 * - Toggle entre light et dark sur clic ; option auto via long-press / second clic.
 */
export function ThemeSwitcherPremium({ storageKey = "react-ecommerce-theme" }: ThemeSwitcherPremiumProps) {
  const [theme, setTheme] = useState<Theme>("auto");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(storageKey) as Theme | null;
    if (stored === "light" || stored === "dark" || stored === "auto") {
      setTheme(stored);
    }
  }, [storageKey]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const apply = (effective: "light" | "dark") => {
      root.dataset.theme = effective;
      root.classList.toggle("dark", effective === "dark");
    };

    if (theme === "auto") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      apply(mq.matches ? "dark" : "light");
      const onChange = (e: MediaQueryListEvent) => apply(e.matches ? "dark" : "light");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    } else {
      apply(theme);
    }
  }, [theme]);

  const cycle = () => {
    const next: Theme = theme === "light" ? "dark" : theme === "dark" ? "auto" : "light";
    setTheme(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, next);
    }
  };

  const label = theme === "light" ? "Mode clair" : theme === "dark" ? "Mode sombre" : "Auto (système)";

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Basculer thème — actuellement ${label}`}
      title={label}
      className="premium-theme-switcher relative inline-grid place-items-center w-10 h-10 rounded-full ring-1 ring-slate-200 bg-white hover:bg-slate-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:bg-slate-800 dark:ring-slate-700 dark:hover:bg-slate-700"
      data-theme={theme}
    >
      {/* Sun (light) */}
      <svg
        className="premium-icon-sun absolute w-5 h-5 text-amber-500 transition-all duration-500"
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.07-6.07l-1.41 1.41M6.34 17.66l-1.41 1.41m12.73 0l-1.41-1.41M6.34 6.34L4.93 4.93M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
      {/* Moon (dark) */}
      <svg
        className="premium-icon-moon absolute w-5 h-5 text-indigo-400 transition-all duration-500"
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
      </svg>
      {/* Auto indicator */}
      {theme === "auto" && (
        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-800" />
      )}
    </button>
  );
}

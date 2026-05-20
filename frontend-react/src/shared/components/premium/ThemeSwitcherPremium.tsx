import { useEffect, useState } from "react";
import { useLayoutStore } from "../../store/layoutStore";

type AutoTheme = "light" | "dark" | "auto";

interface ThemeSwitcherPremiumProps {
  storageKey?: string;
}

export function ThemeSwitcherPremium({ storageKey = "react-ecommerce-theme" }: ThemeSwitcherPremiumProps) {
  const themeMode = useLayoutStore((s) => s.themeMode);
  const setThemeMode = useLayoutStore((s) => s.setThemeMode);

  const [autoMode, setAutoMode] = useState<AutoTheme>(() => {
    if (typeof window === "undefined") return "auto";
    const stored = window.localStorage.getItem(storageKey) as AutoTheme | null;
    return stored === "light" || stored === "dark" || stored === "auto" ? stored : "auto";
  });

  // When auto mode, track system preference and push it to the store
  useEffect(() => {
    if (autoMode !== "auto") {
      setThemeMode(autoMode);
      return;
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setThemeMode(mq.matches ? "dark" : "light");
    const onChange = (e: MediaQueryListEvent) => setThemeMode(e.matches ? "dark" : "light");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [autoMode, setThemeMode]);

  const cycle = () => {
    const next: AutoTheme = autoMode === "light" ? "dark" : autoMode === "dark" ? "auto" : "light";
    setAutoMode(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, next);
    }
  };

  const label =
    autoMode === "light" ? "Mode clair" : autoMode === "dark" ? "Mode sombre" : "Auto (système)";

  const isDark = themeMode === "dark";

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Basculer thème — actuellement ${label}`}
      title={label}
      className="premium-theme-switcher relative inline-grid place-items-center w-10 h-10 rounded-full ring-1 ring-border bg-card hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      data-theme={autoMode}
    >
      {/* Sun */}
      <svg
        className="premium-icon-sun absolute w-5 h-5 text-amber-500 transition-all duration-500"
        style={{
          opacity: isDark ? 0 : 1,
          transform: isDark ? "scale(0.4) rotate(-90deg)" : "scale(1) rotate(0deg)",
        }}
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.07-6.07l-1.41 1.41M6.34 17.66l-1.41 1.41m12.73 0l-1.41-1.41M6.34 6.34L4.93 4.93M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
      {/* Moon */}
      <svg
        className="premium-icon-moon absolute w-5 h-5 text-indigo transition-all duration-500"
        style={{
          opacity: isDark ? 1 : 0,
          transform: isDark ? "scale(1) rotate(0deg)" : "scale(0.4) rotate(90deg)",
        }}
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
      </svg>
      {/* Auto indicator */}
      {autoMode === "auto" && (
        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green ring-2 ring-card" />
      )}
    </button>
  );
}

// ============================================================
// FICHIER: HomepageThemeProvider.tsx
// CHEMIN: frontend-react/src/features/homepage/providers/HomepageThemeProvider.tsx
//
// Description: Provider et hooks pour gerer les themes homepage
// ============================================================

import React, { createContext, useContext, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { 
  HOMEPAGE_THEMES, 
  getTheme, 
  hexToHsl,
  type HomepageThemeId,
  type HomepageThemeConfig 
} from "../themes/HomepageThemes";

interface HomepageThemeContextType {
  activeThemeId: HomepageThemeId;
  activeTheme: HomepageThemeConfig;
  setTheme: (themeId: HomepageThemeId) => void;
  themes: Record<HomepageThemeId, HomepageThemeConfig>;
}

const HomepageThemeContext = createContext<HomepageThemeContextType | undefined>(undefined);

interface HomepageThemeProviderProps {
  initialThemeId?: HomepageThemeId;
  children: ReactNode;
}

export function HomepageThemeProvider({
  initialThemeId = "minimaliste",
  children
}: HomepageThemeProviderProps) {
  const [activeThemeId, setActiveThemeId] = React.useState<HomepageThemeId>(() => {
    try {
      const saved = localStorage.getItem("homepage-theme-id");
      if (saved && saved in HOMEPAGE_THEMES) return saved as HomepageThemeId;
    } catch {}
    return initialThemeId;
  });

  const handleSetTheme = (themeId: HomepageThemeId) => {
    try { localStorage.setItem("homepage-theme-id", themeId); } catch {}
    setActiveThemeId(themeId);
  };

  const activeTheme = useMemo(() => getTheme(activeThemeId), [activeThemeId]);

  // Inject Tailwind-compatible CSS vars into :root so every component using
  // classes like bg-primary, text-card-foreground etc. picks up the theme.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary", hexToHsl(activeTheme.colors.primary));
    root.style.setProperty("--primary-foreground", hexToHsl(activeTheme.buttons.primary.text));
    root.style.setProperty("--background", hexToHsl(activeTheme.colors.background));
    root.style.setProperty("--foreground", hexToHsl(activeTheme.colors.text));
    root.style.setProperty("--card", hexToHsl(activeTheme.colors.surface));
    root.style.setProperty("--card-foreground", hexToHsl(activeTheme.colors.text));
    root.style.setProperty("--muted", hexToHsl(activeTheme.colors.surface));
    root.style.setProperty("--muted-foreground", hexToHsl(activeTheme.colors.textLight));
    root.style.setProperty("--border", hexToHsl(activeTheme.colors.border));
    root.style.setProperty("--accent", hexToHsl(activeTheme.colors.accent));
    root.style.setProperty("--accent-foreground", hexToHsl(activeTheme.colors.text));
    root.style.setProperty("--info", hexToHsl(activeTheme.colors.secondary));
  }, [activeTheme]);

  const value: HomepageThemeContextType = {
    activeThemeId,
    activeTheme,
    setTheme: handleSetTheme,
    themes: HOMEPAGE_THEMES,
  };

  return (
    <HomepageThemeContext.Provider value={value}>
      {children}
    </HomepageThemeContext.Provider>
  );
}

export function useHomepageTheme(): HomepageThemeContextType {
  const context = useContext(HomepageThemeContext);
  if (!context) {
    throw new Error("useHomepageTheme must be used within HomepageThemeProvider");
  }
  return context;
}

export function useOptionalHomepageTheme(): HomepageThemeContextType | undefined {
  return useContext(HomepageThemeContext);
}

export function useThemeColor(colorKey: keyof HomepageThemeConfig["colors"]): string {
  const { activeTheme } = useHomepageTheme();
  return activeTheme.colors[colorKey];
}

export function useThemeButton(buttonType: "primary" | "secondary" | "tertiary") {
  const { activeTheme } = useHomepageTheme();
  return activeTheme.buttons[buttonType];
}

export function useThemeSpacing() {
  const { activeTheme } = useHomepageTheme();
  return activeTheme.spacing;
}

export function useThemeBorderRadius() {
  const { activeTheme } = useHomepageTheme();
  return activeTheme.borderRadius;
}

export function useThemeShadows() {
  const { activeTheme } = useHomepageTheme();
  return activeTheme.shadows;
}

export function useThemeTypography() {
  const { activeTheme } = useHomepageTheme();
  return activeTheme.typography;
}

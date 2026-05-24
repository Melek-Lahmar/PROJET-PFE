// ============================================================
// FICHIER: HomepageThemeProvider.tsx
// CHEMIN: frontend-react/src/features/homepage/providers/HomepageThemeProvider.tsx
//
// Description: Provider et hooks pour gérer les thèmes homepage
// ============================================================

import React, { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { 
  HOMEPAGE_THEMES, 
  getTheme, 
  getThemeCSS, 
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
  const [activeThemeId, setActiveThemeId] = React.useState<HomepageThemeId>(initialThemeId);

  const activeTheme = useMemo(() => getTheme(activeThemeId), [activeThemeId]);

  const themeCSS = useMemo(() => getThemeCSS(activeTheme), [activeTheme]);

  const value: HomepageThemeContextType = {
    activeThemeId,
    activeTheme,
    setTheme: setActiveThemeId,
    themes: HOMEPAGE_THEMES,
  };

  return (
    <HomepageThemeContext.Provider value={value}>
      <div style={themeCSS as React.CSSProperties}>
        {children}
      </div>
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

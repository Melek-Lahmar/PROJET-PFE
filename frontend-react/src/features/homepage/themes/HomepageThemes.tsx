// ============================================================
// FICHIER: HomepageThemes.tsx
// CHEMIN: frontend-react/src/features/homepage/themes/HomepageThemes.tsx
//
// Description: 8 thèmes complets pour la homepage avec:
// - Couleurs différentes pour tous les boutons
// - Placements différents des catégories
// - Affichages différents des articles
// - Layouts variés
// ============================================================

import type { CSSProperties } from "react";

export type HomepageThemeId =
  | "minimaliste"
  | "moderne-colore"
  | "professionnel"
  | "warmth"
  | "luxe"
  | "eco"
  | "startup"
  | "classique";

export interface HomepageThemeConfig {
  id: HomepageThemeId;
  name: string;
  description: string;
  
  // Couleurs
  colors: {
    primary: string;
    secondary: string;
    tertiary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textLight: string;
    border: string;
  };

  // Boutons
  buttons: {
    primary: {
      bg: string;
      text: string;
      hover: string;
      border?: string;
    };
    secondary: {
      bg: string;
      text: string;
      hover: string;
      border?: string;
    };
    tertiary: {
      bg: string;
      text: string;
      hover: string;
      border?: string;
    };
  };

  // Layout catégories
  categoriesLayout: "grid" | "carousel" | "vertical" | "horizontal-scroll" | "tiles" | "compact";
  categoriesPerRow: number;

  // Affichage articles
  productsDisplay: "grid-3" | "grid-4" | "grid-5" | "carousel" | "list" | "card-large";
  productCardStyle: "minimal" | "rich" | "compact" | "modern" | "hover-detail";

  // Hero section
  heroAlign: "left" | "center" | "right";
  heroOverlay: boolean;
  heroOverlayOpacity: number;

  // Badges et labels
  badgeStyle: "rounded" | "square" | "pill";
  badgePosition: "top-left" | "top-right" | "overlay";

  // Spacing
  spacing: {
    sectionGap: string;
    itemGap: string;
    padding: string;
  };

  // Border radius
  borderRadius: {
    button: string;
    card: string;
    container: string;
  };

  // Shadows
  shadows: {
    card: string;
    hover: string;
    subtle: string;
  };

  // Typography
  typography: {
    fontFamily: string;
    headingWeight: number;
    bodyWeight: number;
  };

  // Variantes spéciales
  specialFeatures: {
    hasGradient: boolean;
    hasAnimation: boolean;
    hasDarkMode: boolean;
    hasTransparency: boolean;
  };
}

// ============================================================
// THÈME 1: MINIMALISTE
// ============================================================
export const THEME_MINIMALISTE: HomepageThemeConfig = {
  id: "minimaliste",
  name: "Minimaliste",
  description: "Design épuré et simple, couleurs neutres",

  colors: {
    primary: "#000000",
    secondary: "#666666",
    tertiary: "#CCCCCC",
    accent: "#F5F5F5",
    background: "#FFFFFF",
    surface: "#FAFAFA",
    text: "#1A1A1A",
    textLight: "#808080",
    border: "#E0E0E0",
  },

  buttons: {
    primary: { bg: "#000000", text: "#FFFFFF", hover: "#333333" },
    secondary: { bg: "#F5F5F5", text: "#000000", hover: "#E8E8E8", border: "#CCCCCC" },
    tertiary: { bg: "transparent", text: "#000000", hover: "#F0F0F0" },
  },

  categoriesLayout: "horizontal-scroll",
  categoriesPerRow: 6,
  productsDisplay: "grid-4",
  productCardStyle: "minimal",

  heroAlign: "left",
  heroOverlay: false,
  heroOverlayOpacity: 0,

  badgeStyle: "square",
  badgePosition: "top-left",

  spacing: { sectionGap: "4rem", itemGap: "1.5rem", padding: "2rem" },
  borderRadius: { button: "0px", card: "0px", container: "0px" },
  shadows: { card: "none", hover: "0 2px 4px rgba(0,0,0,0.1)", subtle: "0 1px 2px rgba(0,0,0,0.05)" },

  typography: { fontFamily: "'Inter', sans-serif", headingWeight: 600, bodyWeight: 400 },

  specialFeatures: { hasGradient: false, hasAnimation: false, hasDarkMode: false, hasTransparency: false },
};

// ============================================================
// THÈME 2: MODERNE COLORÉ
// ============================================================
export const THEME_MODERNE_COLORE: HomepageThemeConfig = {
  id: "moderne-colore",
  name: "Moderne Coloré",
  description: "Vibrant avec couleurs vives et animations",

  colors: {
    primary: "#FF6B6B",
    secondary: "#4ECDC4",
    tertiary: "#95E1D3",
    accent: "#FFE66D",
    background: "#FFFFFF",
    surface: "#F8F9FF",
    text: "#2D3436",
    textLight: "#636E72",
    border: "#DFE6E9",
  },

  buttons: {
    primary: { bg: "#FF6B6B", text: "#FFFFFF", hover: "#FF5252" },
    secondary: { bg: "#4ECDC4", text: "#FFFFFF", hover: "#45B7B0" },
    tertiary: { bg: "#FFE66D", text: "#2D3436", hover: "#FFD93D" },
  },

  categoriesLayout: "grid",
  categoriesPerRow: 4,
  productsDisplay: "grid-4",
  productCardStyle: "modern",

  heroAlign: "center",
  heroOverlay: true,
  heroOverlayOpacity: 0.3,

  badgeStyle: "pill",
  badgePosition: "overlay",

  spacing: { sectionGap: "3.5rem", itemGap: "1.5rem", padding: "2.5rem" },
  borderRadius: { button: "50px", card: "16px", container: "24px" },
  shadows: { card: "0 4px 16px rgba(0,0,0,0.1)", hover: "0 8px 24px rgba(0,0,0,0.15)", subtle: "0 2px 8px rgba(0,0,0,0.08)" },

  typography: { fontFamily: "'Poppins', sans-serif", headingWeight: 700, bodyWeight: 500 },

  specialFeatures: { hasGradient: true, hasAnimation: true, hasDarkMode: false, hasTransparency: true },
};

// ============================================================
// THÈME 3: PROFESSIONNEL (B2B)
// ============================================================
export const THEME_PROFESSIONNEL: HomepageThemeConfig = {
  id: "professionnel",
  name: "Professionnel",
  description: "B2B moderne, couleurs froides, layout strict",

  colors: {
    primary: "#003D82",
    secondary: "#0066CC",
    tertiary: "#E8F0FF",
    accent: "#F0F4FA",
    background: "#FFFFFF",
    surface: "#F8FAFC",
    text: "#1E293B",
    textLight: "#64748B",
    border: "#CBD5E1",
  },

  buttons: {
    primary: { bg: "#003D82", text: "#FFFFFF", hover: "#002855" },
    secondary: { bg: "#0066CC", text: "#FFFFFF", hover: "#0052A3" },
    tertiary: { bg: "#E8F0FF", text: "#003D82", hover: "#D1E0FF" },
  },

  categoriesLayout: "vertical",
  categoriesPerRow: 1,
  productsDisplay: "grid-5",
  productCardStyle: "compact",

  heroAlign: "left",
  heroOverlay: true,
  heroOverlayOpacity: 0.4,

  badgeStyle: "rounded",
  badgePosition: "top-left",

  spacing: { sectionGap: "3rem", itemGap: "1rem", padding: "2rem" },
  borderRadius: { button: "8px", card: "12px", container: "16px" },
  shadows: { card: "0 1px 3px rgba(0,0,0,0.12)", hover: "0 4px 12px rgba(0,0,0,0.15)", subtle: "0 1px 2px rgba(0,0,0,0.05)" },

  typography: { fontFamily: "'Roboto', sans-serif", headingWeight: 600, bodyWeight: 400 },

  specialFeatures: { hasGradient: false, hasAnimation: false, hasDarkMode: true, hasTransparency: false },
};

// ============================================================
// THÈME 4: WARMTH
// ============================================================
export const THEME_WARMTH: HomepageThemeConfig = {
  id: "warmth",
  name: "Warmth",
  description: "Couleurs chaudes, convivial et accueillant",

  colors: {
    primary: "#E67E22",
    secondary: "#D35400",
    tertiary: "#F39C12",
    accent: "#F8D5B7",
    background: "#FFF8F0",
    surface: "#FFF5E6",
    text: "#5D4037",
    textLight: "#A1887F",
    border: "#E8D4C4",
  },

  buttons: {
    primary: { bg: "#E67E22", text: "#FFFFFF", hover: "#D35400" },
    secondary: { bg: "#F39C12", text: "#FFFFFF", hover: "#E67E22" },
    tertiary: { bg: "#F8D5B7", text: "#5D4037", hover: "#F0C9A9" },
  },

  categoriesLayout: "carousel",
  categoriesPerRow: 4,
  productsDisplay: "grid-3",
  productCardStyle: "rich",

  heroAlign: "right",
  heroOverlay: true,
  heroOverlayOpacity: 0.2,

  badgeStyle: "rounded",
  badgePosition: "overlay",

  spacing: { sectionGap: "4rem", itemGap: "2rem", padding: "3rem" },
  borderRadius: { button: "25px", card: "20px", container: "28px" },
  shadows: { card: "0 4px 12px rgba(230,126,34,0.15)", hover: "0 8px 20px rgba(230,126,34,0.2)", subtle: "0 2px 6px rgba(230,126,34,0.1)" },

  typography: { fontFamily: "'Playfair Display', serif", headingWeight: 700, bodyWeight: 500 },

  specialFeatures: { hasGradient: true, hasAnimation: true, hasDarkMode: false, hasTransparency: true },
};

// ============================================================
// THÈME 5: LUXE
// ============================================================
export const THEME_LUXE: HomepageThemeConfig = {
  id: "luxe",
  name: "Luxe",
  description: "Premium, sombre et élégant avec accents dorés",

  colors: {
    primary: "#1A1A1A",
    secondary: "#2D2D2D",
    tertiary: "#404040",
    accent: "#D4AF37",
    background: "#0A0A0A",
    surface: "#1A1A1A",
    text: "#FFFFFF",
    textLight: "#B0B0B0",
    border: "#404040",
  },

  buttons: {
    primary: { bg: "#D4AF37", text: "#1A1A1A", hover: "#E6C158" },
    secondary: { bg: "#2D2D2D", text: "#D4AF37", hover: "#3D3D3D", border: "#D4AF37" },
    tertiary: { bg: "transparent", text: "#D4AF37", hover: "#1A1A1A" },
  },

  categoriesLayout: "tiles",
  categoriesPerRow: 3,
  productsDisplay: "grid-3",
  productCardStyle: "hover-detail",

  heroAlign: "center",
  heroOverlay: true,
  heroOverlayOpacity: 0.6,

  badgeStyle: "rounded",
  badgePosition: "top-left",

  spacing: { sectionGap: "5rem", itemGap: "2.5rem", padding: "3.5rem" },
  borderRadius: { button: "0px", card: "0px", container: "0px" },
  shadows: { card: "0 8px 32px rgba(212,175,55,0.15)", hover: "0 12px 48px rgba(212,175,55,0.25)", subtle: "0 2px 8px rgba(0,0,0,0.3)" },

  typography: { fontFamily: "'Cormorant Garamond', serif", headingWeight: 600, bodyWeight: 400 },

  specialFeatures: { hasGradient: false, hasAnimation: true, hasDarkMode: true, hasTransparency: true },
};

// ============================================================
// THÈME 6: ÉCO
// ============================================================
export const THEME_ECO: HomepageThemeConfig = {
  id: "eco",
  name: "Éco",
  description: "Vert naturel, écologique et sustainable",

  colors: {
    primary: "#27AE60",
    secondary: "#16A085",
    tertiary: "#1ABC9C",
    accent: "#2ECC71",
    background: "#F4F9F7",
    surface: "#EEFAF7",
    text: "#0B5E3B",
    textLight: "#52917C",
    border: "#D0E8E0",
  },

  buttons: {
    primary: { bg: "#27AE60", text: "#FFFFFF", hover: "#1E8449" },
    secondary: { bg: "#16A085", text: "#FFFFFF", hover: "#117A65" },
    tertiary: { bg: "#2ECC71", text: "#FFFFFF", hover: "#27AE60" },
  },

  categoriesLayout: "grid",
  categoriesPerRow: 4,
  productsDisplay: "grid-4",
  productCardStyle: "modern",

  heroAlign: "center",
  heroOverlay: true,
  heroOverlayOpacity: 0.25,

  badgeStyle: "pill",
  badgePosition: "overlay",

  spacing: { sectionGap: "3.5rem", itemGap: "1.5rem", padding: "2.5rem" },
  borderRadius: { button: "30px", card: "16px", container: "20px" },
  shadows: { card: "0 4px 12px rgba(39,174,96,0.15)", hover: "0 8px 20px rgba(39,174,96,0.2)", subtle: "0 2px 6px rgba(39,174,96,0.1)" },

  typography: { fontFamily: "'Open Sans', sans-serif", headingWeight: 700, bodyWeight: 500 },

  specialFeatures: { hasGradient: true, hasAnimation: true, hasDarkMode: false, hasTransparency: true },
};

// ============================================================
// THÈME 7: STARTUP
// ============================================================
export const THEME_STARTUP: HomepageThemeConfig = {
  id: "startup",
  name: "Startup",
  description: "Gradient moderne, audacieux et dynamique",

  colors: {
    primary: "#6366F1",
    secondary: "#EC4899",
    tertiary: "#8B5CF6",
    accent: "#06B6D4",
    background: "#0F172A",
    surface: "#1E293B",
    text: "#F1F5F9",
    textLight: "#94A3B8",
    border: "#334155",
  },

  buttons: {
    primary: { bg: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)", text: "#FFFFFF", hover: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)" },
    secondary: { bg: "#EC4899", text: "#FFFFFF", hover: "#DB2777" },
    tertiary: { bg: "#06B6D4", text: "#0F172A", hover: "#06A8D0" },
  },

  categoriesLayout: "horizontal-scroll",
  categoriesPerRow: 6,
  productsDisplay: "carousel",
  productCardStyle: "modern",

  heroAlign: "center",
  heroOverlay: true,
  heroOverlayOpacity: 0.5,

  badgeStyle: "pill",
  badgePosition: "overlay",

  spacing: { sectionGap: "3.5rem", itemGap: "1.5rem", padding: "2.5rem" },
  borderRadius: { button: "50px", card: "12px", container: "16px" },
  shadows: { card: "0 8px 32px rgba(99,102,241,0.2)", hover: "0 12px 48px rgba(99,102,241,0.3)", subtle: "0 2px 8px rgba(0,0,0,0.2)" },

  typography: { fontFamily: "'Sora', sans-serif", headingWeight: 800, bodyWeight: 500 },

  specialFeatures: { hasGradient: true, hasAnimation: true, hasDarkMode: true, hasTransparency: true },
};

// ============================================================
// THÈME 8: CLASSIQUE
// ============================================================
export const THEME_CLASSIQUE: HomepageThemeConfig = {
  id: "classique",
  name: "Classique",
  description: "Traditionnel, bleu ciel, sérieux et fiable",

  colors: {
    primary: "#1E5A96",
    secondary: "#2E7DAE",
    tertiary: "#4A9FD8",
    accent: "#87CEEB",
    background: "#FFFFFF",
    surface: "#F0F7FF",
    text: "#1A1A2E",
    textLight: "#4A5568",
    border: "#B8D4E8",
  },

  buttons: {
    primary: { bg: "#1E5A96", text: "#FFFFFF", hover: "#154070" },
    secondary: { bg: "#2E7DAE", text: "#FFFFFF", hover: "#225683" },
    tertiary: { bg: "#F0F7FF", text: "#1E5A96", hover: "#D9E8F5" },
  },

  categoriesLayout: "grid",
  categoriesPerRow: 5,
  productsDisplay: "grid-4",
  productCardStyle: "rich",

  heroAlign: "left",
  heroOverlay: true,
  heroOverlayOpacity: 0.35,

  badgeStyle: "rounded",
  badgePosition: "top-left",

  spacing: { sectionGap: "4rem", itemGap: "1.5rem", padding: "2.5rem" },
  borderRadius: { button: "6px", card: "8px", container: "12px" },
  shadows: { card: "0 2px 8px rgba(30,90,150,0.1)", hover: "0 6px 16px rgba(30,90,150,0.15)", subtle: "0 1px 4px rgba(30,90,150,0.05)" },

  typography: { fontFamily: "'Georgia', serif", headingWeight: 700, bodyWeight: 500 },

  specialFeatures: { hasGradient: false, hasAnimation: false, hasDarkMode: false, hasTransparency: false },
};

// ============================================================
// EXPORT TOUS LES THÈMES
// ============================================================
export const HOMEPAGE_THEMES: Record<HomepageThemeId, HomepageThemeConfig> = {
  minimaliste: THEME_MINIMALISTE,
  "moderne-colore": THEME_MODERNE_COLORE,
  professionnel: THEME_PROFESSIONNEL,
  warmth: THEME_WARMTH,
  luxe: THEME_LUXE,
  eco: THEME_ECO,
  startup: THEME_STARTUP,
  classique: THEME_CLASSIQUE,
};

// ============================================================
// UTILITAIRES
// ============================================================

export function getTheme(themeId: HomepageThemeId): HomepageThemeConfig {
  return HOMEPAGE_THEMES[themeId] || THEME_MINIMALISTE;
}

export function getThemeCSS(theme: HomepageThemeConfig): CSSProperties {
  return {
    "--homepage-primary": theme.colors.primary,
    "--homepage-secondary": theme.colors.secondary,
    "--homepage-tertiary": theme.colors.tertiary,
    "--homepage-accent": theme.colors.accent,
    "--homepage-bg": theme.colors.background,
    "--homepage-surface": theme.colors.surface,
    "--homepage-text": theme.colors.text,
    "--homepage-text-light": theme.colors.textLight,
    "--homepage-border": theme.colors.border,

    "--homepage-btn-primary-bg": theme.buttons.primary.bg,
    "--homepage-btn-primary-text": theme.buttons.primary.text,
    "--homepage-btn-primary-hover": theme.buttons.primary.hover,

    "--homepage-btn-secondary-bg": theme.buttons.secondary.bg,
    "--homepage-btn-secondary-text": theme.buttons.secondary.text,
    "--homepage-btn-secondary-hover": theme.buttons.secondary.hover,

    "--homepage-btn-tertiary-bg": theme.buttons.tertiary.bg,
    "--homepage-btn-tertiary-text": theme.buttons.tertiary.text,
    "--homepage-btn-tertiary-hover": theme.buttons.tertiary.hover,

    "--homepage-radius-button": theme.borderRadius.button,
    "--homepage-radius-card": theme.borderRadius.card,
    "--homepage-radius-container": theme.borderRadius.container,

    "--homepage-shadow-card": theme.shadows.card,
    "--homepage-shadow-hover": theme.shadows.hover,
    "--homepage-shadow-subtle": theme.shadows.subtle,

    "--homepage-gap-section": theme.spacing.sectionGap,
    "--homepage-gap-item": theme.spacing.itemGap,
    "--homepage-padding": theme.spacing.padding,

    "--homepage-font-family": theme.typography.fontFamily,
    "--homepage-font-weight-heading": theme.typography.headingWeight,
    "--homepage-font-weight-body": theme.typography.bodyWeight,
  } as any;
}

export function getAllThemes(): HomepageThemeConfig[] {
  return Object.values(HOMEPAGE_THEMES);
}

export function getThemesByFeature(feature: keyof HomepageThemeConfig["specialFeatures"]): HomepageThemeConfig[] {
  return Object.values(HOMEPAGE_THEMES).filter(
    (theme) => theme.specialFeatures[feature]
  );
}

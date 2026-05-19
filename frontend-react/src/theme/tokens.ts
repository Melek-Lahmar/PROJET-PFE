/**
 * Module 11 (Master Prompt) — Source unique des tokens visuels alignés
 * sur l'app Flutter (`flutter/lib/core/theme/app_colors.dart`).
 *
 * Toute nouvelle classe utilitaire / variante de composant doit consommer
 * ces tokens (et non des couleurs hardcodées) afin de garder la
 * cohérence Web ↔ Mobile.
 *
 * Mode dark : préparé mais Flutter actuel a son propre dark — quand le
 * design system mobile sera étendu, mirroir ici.
 */
export const tokens = {
  colors: {
    // Brand
    primary: "#2563EB",
    primaryDark: "#1D4ED8",
    secondary: "#14B8A6",
    accent: "#38BDF8",

    // Feedback
    success: "#16A34A",
    warning: "#F59E0B",
    danger: "#DC2626",
    info: "#0EA5E9",

    // Surfaces light
    lightBackground: "#F8FAFC",
    lightSurface: "#FFFFFF",
    lightSurfaceAlt: "#F1F5F9",

    // Surfaces dark
    darkBackground: "#0F172A",
    darkSurface: "#111827",
    darkSurfaceAlt: "#1F2937",

    // Texte
    lightText: "#0F172A",
    lightTextSoft: "#475569",
    darkText: "#F8FAFC",
    darkTextSoft: "#CBD5E1",

    // Bordures
    lightBorder: "#E2E8F0",
    darkBorder: "#334155",
  },
  radii: {
    sm: "6px",
    md: "10px",
    lg: "16px",
    xl: "20px",
    "2xl": "24px",
    full: "9999px",
  },
  shadows: {
    card: "0 2px 8px rgba(15,23,42,0.08)",
    cardHover: "0 24px 60px -32px rgba(15,23,42,0.45)",
    hero: "0 32px 80px -40px rgba(15,23,42,0.55)",
  },
  fonts: {
    sans: 'Inter, "Segoe UI", system-ui, -apple-system, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, monospace',
  },
  spacing: {
    page: "clamp(1rem, 2vw, 1.5rem)",
  },
} as const;

export type Tokens = typeof tokens;

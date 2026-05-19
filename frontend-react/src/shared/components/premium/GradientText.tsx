import type { ElementType, ReactNode } from "react";

interface GradientTextProps {
  children: ReactNode;
  /** Variante de gradient. `warm` = rose/violet/bleu (default), `cool` = teal/sky/violet. */
  variant?: "warm" | "cool";
  /** Element HTML à rendre (default span). */
  as?: ElementType;
  className?: string;
}

/**
 * Titre avec gradient animé (8s loop). Effet "wow" pour les heroes premium.
 * Mirror simplifié du Flutter ShaderMask + LinearGradient.
 */
export function GradientText({
  children,
  variant = "warm",
  as: Tag = "span",
  className = "",
}: GradientTextProps) {
  const variantClass = variant === "cool" ? "gradient-text-cool" : "gradient-text";
  return <Tag className={`${variantClass} ${className}`.trim()}>{children}</Tag>;
}

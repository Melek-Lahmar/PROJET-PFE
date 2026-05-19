import type { HTMLAttributes, ReactNode } from "react";

type Tone = "default" | "soft" | "primary" | "success" | "warning" | "danger";

interface PremiumCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  tone?: Tone;
  /** Adds the lifted hover effect (translateY + shadow). */
  interactive?: boolean;
  /** Strip the default p-5 padding when the caller wants edge-to-edge content. */
  noPadding?: boolean;
}

const toneClasses: Record<Tone, string> = {
  default: "app-surface",
  soft: "app-surface-soft",
  primary: "homepage-premium-card",
  success: "dashboard-success-card",
  warning: "dashboard-warning-card",
  danger: "dashboard-critical-card",
};

/**
 * Premium glass card with optional hover-lift.
 * Mirrors flutter `lib/ui/widgets/premium/premium_card.dart` cards.
 */
export function PremiumCard({
  children,
  tone = "default",
  interactive = false,
  noPadding = false,
  className = "",
  ...rest
}: PremiumCardProps) {
  const padding = noPadding ? "" : "p-5";
  // 2026-05-13 — `interactive` ajoute aussi `.hover-lift` (translate Y + halo
  // coloré au hover), pour un effet Flutter-like sur les cards cliquables.
  const hover = interactive
    ? "homepage-card-hover hover-lift cursor-pointer"
    : "";
  return (
    <div
      className={`${toneClasses[tone]} ${padding} ${hover} ${className}`.trim()}
      {...rest}
    >
      {children}
    </div>
  );
}

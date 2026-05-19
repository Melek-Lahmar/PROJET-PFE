import type { ReactNode } from "react";
import { FloatingOrbs } from "./FloatingOrbs";

interface PremiumHeroProps {
  kicker?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  /**
   * Si `true` (default), affiche des orbes lumineux ambient en fond.
   * Mettre à `false` pour les heroes minimalistes.
   */
  withOrbs?: boolean;
  /**
   * Si `true`, applique un gradient animé au titre (effet "wow").
   * Default `false` — l'activer pour les heroes "vitrine" (homepage, dashboards).
   */
  gradientTitle?: boolean;
}

/**
 * Wide gradient hero banner with animated glow.
 * Mirrors flutter `lib/ui/widgets/premium/premium_hero.dart`.
 *
 * Étendu 2026-05-13 :
 * - Orbes lumineux ambient en fond (FloatingOrbs).
 * - Option gradient text animé sur le titre.
 */
export function PremiumHero({
  kicker,
  title,
  description,
  actions,
  trailing,
  className = "",
  withOrbs = true,
  gradientTitle = false,
}: PremiumHeroProps) {
  const titleClass = gradientTitle
    ? "app-title gradient-text text-balance"
    : "app-title text-balance";

  return (
    <section
      className={`premium-hero anim-fade-up relative overflow-hidden ${className}`}
    >
      {withOrbs && <FloatingOrbs />}
      <div className="relative grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          {kicker && <p className="app-kicker">{kicker}</p>}
          <h1 className={titleClass}>{title}</h1>
          {description && (
            <p className="app-description max-w-prose text-balance">{description}</p>
          )}
          {actions && <div className="flex flex-wrap items-center gap-3 pt-2">{actions}</div>}
        </div>
        {trailing && <div className="anim-scale-in">{trailing}</div>}
      </div>
    </section>
  );
}

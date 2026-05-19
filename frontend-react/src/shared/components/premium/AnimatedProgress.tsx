import { useEffect, useRef, useState } from "react";

interface AnimatedProgressProps {
  /** Pourcentage cible 0..100. */
  value: number;
  /** Durée animation en ms (default 900). */
  duration?: number;
  /** Hauteur de la barre en px (default 10). */
  height?: number;
  /** Variante de couleur. */
  variant?: "primary" | "success" | "warning" | "danger";
  /** Affiche le pourcentage à droite (default false). */
  showLabel?: boolean;
  /** Si true, ajoute un effet shimmer animé pendant la transition. */
  withShimmer?: boolean;
  className?: string;
}

const VARIANT_FILL: Record<NonNullable<AnimatedProgressProps["variant"]>, string> = {
  primary:
    "bg-[linear-gradient(90deg,hsl(var(--primary)),hsl(263_70%_65%))]",
  success:
    "bg-[linear-gradient(90deg,hsl(var(--success)),hsl(173_80%_45%))]",
  warning:
    "bg-[linear-gradient(90deg,hsl(var(--warning)),hsl(30_100%_55%))]",
  danger:
    "bg-[linear-gradient(90deg,hsl(var(--danger)),hsl(330_80%_55%))]",
};

/**
 * Barre de progression premium avec remplissage animé (ease-out-cubic).
 * Idéal pour les KPI : taux de livraison, satisfaction, complétude profil.
 *
 * Re-anime quand `value` change. Optimisé via rAF (pas de setState heavy).
 */
export function AnimatedProgress({
  value,
  duration = 900,
  height = 10,
  variant = "primary",
  showLabel = false,
  withShimmer = false,
  className = "",
}: AnimatedProgressProps) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const startValRef = useRef<number>(0);

  useEffect(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    startRef.current = null;
    startValRef.current = display;

    const target = Math.max(0, Math.min(100, value));

    const tick = (t: number) => {
      if (startRef.current === null) startRef.current = t;
      const elapsed = t - startRef.current;
      const p = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(startValRef.current + (target - startValRef.current) * eased);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(target);
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <div
        className="relative flex-1 overflow-hidden rounded-full bg-muted/60"
        style={{ height }}
      >
        <div
          className={`relative h-full rounded-full ${VARIANT_FILL[variant]}`}
          style={{ width: `${display}%` }}
        >
          {withShimmer && (
            <div
              aria-hidden="true"
              className="absolute inset-0 -translate-x-full"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 50%, transparent 100%)",
                animation: "shimmer-slide 1.6s ease-in-out infinite",
              }}
            />
          )}
        </div>
      </div>
      {showLabel && (
        <span className="min-w-[44px] text-right text-xs font-extrabold text-card-foreground">
          {display.toFixed(0)}%
        </span>
      )}
    </div>
  );
}

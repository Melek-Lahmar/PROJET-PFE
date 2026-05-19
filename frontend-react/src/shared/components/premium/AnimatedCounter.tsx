import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  /** Cible numérique. Le counter monte de 0 (ou `from`) jusqu'à `value`. */
  value: number;
  /** Valeur de départ (default 0). */
  from?: number;
  /** Durée totale en ms (default 1100). */
  duration?: number;
  /** Nombre de décimales (default 0). */
  decimals?: number;
  /** Suffixe optionnel (ex: "%", " TND"). */
  suffix?: string;
  /** Préfixe optionnel. */
  prefix?: string;
  /** Format thousands separator (default true en français = espace insécable). */
  groupThousands?: boolean;
  className?: string;
}

/**
 * Compteur animé Flutter-like (HistoryStat) — monte de `from` → `value`
 * avec une courbe ease-out-cubic. Re-déclenche quand `value` change.
 *
 * Optimisé : un seul rAF, pas de listener heavy, decimals géré.
 */
export function AnimatedCounter({
  value,
  from = 0,
  duration = 1100,
  decimals = 0,
  suffix,
  prefix,
  groupThousands = true,
  className = "",
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState<number>(from);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef<number>(from);

  useEffect(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    startTimeRef.current = null;
    startValueRef.current = display;

    const tick = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(1, elapsed / duration);
      // ease-out-cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = startValueRef.current + (value - startValueRef.current) * eased;
      setDisplay(next);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(value);
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  const formatted = (() => {
    const rounded = Number(display.toFixed(decimals));
    if (!groupThousands) return rounded.toFixed(decimals);
    return rounded.toLocaleString("fr-FR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  })();

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

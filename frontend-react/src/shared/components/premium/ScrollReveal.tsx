import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";

type Animation = "fade-up" | "fade-in" | "scale-in" | "slide-right" | "slide-left" | "bounce-in";

interface ScrollRevealProps {
  children: ReactNode;
  animation?: Animation;
  /** Délai en ms avant déclenchement (default 0). */
  delay?: number;
  /** Seuil de visibilité 0..1 pour déclencher (default 0.15). */
  threshold?: number;
  /** Si true, l'animation se rejoue à chaque ré-apparition (default false). */
  repeat?: boolean;
  className?: string;
}

/**
 * Déclenche une animation premium QUAND l'élément entre dans le viewport
 * (IntersectionObserver). Idéal pour long-scroll : homepage marketing,
 * dashboard, listings.
 *
 * Mirror du Flutter `EntryAnimation(onVisible: ...)`.
 */
export function ScrollReveal({
  children,
  animation = "fade-up",
  delay = 0,
  threshold = 0.15,
  repeat = false,
  className = "",
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      // SSR / vieux navigateurs : pas d'animation, render direct.
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            if (!repeat) obs.unobserve(el);
          } else if (repeat) {
            setVisible(false);
          }
        });
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, repeat]);

  const style: CSSProperties = {
    animationDelay: delay > 0 ? `${delay}ms` : undefined,
  };

  return (
    <div
      ref={ref}
      className={`${visible ? `anim-${animation}` : "opacity-0"} ${className}`.trim()}
      style={style}
    >
      {children}
    </div>
  );
}

import { useEffect, useRef, type ReactNode } from "react";

interface ParallaxHeroProps {
  children: ReactNode;
  /** Intensité du parallax (0.1-0.5 recommandé, default 0.25). */
  speed?: number;
  className?: string;
}

/**
 * Hero avec effet parallax au scroll + gradient background animé.
 * Le contenu se déplace plus lentement que le scroll → profondeur visuelle.
 */
export function ParallaxHero({ children, speed = 0.25, className = "" }: ParallaxHeroProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    let rafId = 0;
    const tick = () => {
      const el = ref.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const offset = rect.top * speed;
        const inner = el.querySelector<HTMLElement>("[data-parallax-inner]");
        if (inner) {
          inner.style.transform = `translate3d(0, ${-offset}px, 0)`;
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [speed]);

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden ${className}`}
    >
      <div
        aria-hidden
        className="absolute inset-0 premium-hero-gradient-anim"
      />
      <div data-parallax-inner className="relative z-10 will-change-transform">
        {children}
      </div>
    </div>
  );
}

import type { CSSProperties } from "react";

interface Orb {
  /** Pixel size (width = height). Default 280. */
  size?: number;
  /** Top position as a CSS value (px, %, etc.). Optional. */
  top?: string;
  /** Right position. */
  right?: string;
  /** Bottom position. */
  bottom?: string;
  /** Left position. */
  left?: string;
  /** Color tone class. */
  tone?: "primary" | "accent" | "warm";
  /** Animation delay in ms — staggers the drift across orbs. */
  delay?: number;
  /** Opacity override (0..1). */
  opacity?: number;
}

interface FloatingOrbsProps {
  orbs?: Orb[];
  className?: string;
}

const TONE_CLASS: Record<NonNullable<Orb["tone"]>, string> = {
  primary: "floating-orb-primary",
  accent: "floating-orb-accent",
  warm: "floating-orb-warm",
};

const DEFAULT_ORBS: Orb[] = [
  { size: 320, top: "-80px", left: "-60px", tone: "primary", delay: 0 },
  { size: 260, top: "20px", right: "-50px", tone: "accent", delay: 2400 },
  { size: 220, bottom: "-70px", left: "30%", tone: "warm", delay: 4800, opacity: 0.4 },
];

/**
 * Décor lumineux ambient pour les heroes / sections premium.
 * Mirror du `FloatingParticles` Flutter (premium_animation_system).
 *
 * Place ce composant en **first child** d'un container `relative overflow-hidden`.
 * Les orbes flottent doucement en boucle (animation `orb-drift` 18s).
 */
export function FloatingOrbs({
  orbs = DEFAULT_ORBS,
  className = "",
}: FloatingOrbsProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {orbs.map((orb, i) => {
        const size = orb.size ?? 280;
        const style: CSSProperties = {
          width: size,
          height: size,
          top: orb.top,
          right: orb.right,
          bottom: orb.bottom,
          left: orb.left,
          opacity: orb.opacity,
          animationDelay: orb.delay ? `${orb.delay}ms` : undefined,
        };
        return (
          <div
            key={i}
            className={`floating-orb ${TONE_CLASS[orb.tone ?? "primary"]}`}
            style={style}
          />
        );
      })}
    </div>
  );
}

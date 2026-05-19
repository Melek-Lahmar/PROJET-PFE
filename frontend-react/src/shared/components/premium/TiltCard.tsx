import { useRef, useState, type ReactNode } from "react";

interface TiltCardProps {
  children: ReactNode;
  /** Amplitude max du tilt en degrés (default 6). */
  maxTilt?: number;
  /** Active un reflet "glare" qui suit le curseur (default true). */
  glare?: boolean;
  className?: string;
}

/**
 * Card 3D qui suit le curseur (effet Linear/Stripe).
 * Le tilt est purement CSS — pas de re-render React pendant le hover.
 * Utiliser sur les CTA premium / heroes vitrine, pas en list (perf).
 */
export function TiltCard({
  children,
  maxTilt = 6,
  glare = true,
  className = "",
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50 });

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const tiltX = (0.5 - y) * 2 * maxTilt;
    const tiltY = (x - 0.5) * 2 * maxTilt;
    el.style.transform = `perspective(900px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
    if (glare) setGlarePos({ x: x * 100, y: y * 100 });
  }

  function handleLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)";
    setGlarePos({ x: 50, y: 50 });
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`relative transition-transform duration-300 ease-out [transform-style:preserve-3d] ${className}`}
    >
      {children}
      {glare && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-soft-light"
          style={{
            background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.35), transparent 50%)`,
          }}
        />
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";

interface ConfettiProps {
  /** Active = lance les particules. Repasse à false pour stopper. */
  active: boolean;
  /** Nombre de particules (default 40). */
  count?: number;
  /** Durée avant disparition en ms (default 2500). */
  duration?: number;
}

interface Particle {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  rotation: number;
  shape: "square" | "circle";
}

const COLORS = [
  "#6366F1", // indigo
  "#A855F7", // violet
  "#EC4899", // pink
  "#F59E0B", // amber
  "#22C55E", // emerald
  "#06B6D4", // cyan
  "#FFE066", // yellow accent
];

/**
 * Confetti CSS pure — particules colorées qui tombent du haut.
 * Pas de dépendance externe. À monter conditionnellement (open success modal,
 * route /konnect/return?status=success, etc.).
 */
export function Confetti({ active, count = 40, duration = 2500 }: ConfettiProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!active) {
      setShow(false);
      return;
    }
    setShow(true);
    const id = window.setTimeout(() => setShow(false), duration);
    return () => window.clearTimeout(id);
  }, [active, duration]);

  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 400,
      duration: 1600 + Math.random() * 1400,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * 360,
      shape: Math.random() > 0.5 ? "square" : "circle",
    }));
  }, [count]);

  if (!show) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[9500] overflow-hidden"
    >
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 animate-premium-confetti"
          style={{
            left: `${p.left}%`,
            width: 8,
            height: 8,
            background: p.color,
            borderRadius: p.shape === "circle" ? "50%" : "2px",
            transform: `rotate(${p.rotation}deg)`,
            animationDuration: `${p.duration}ms`,
            animationDelay: `${p.delay}ms`,
          }}
        />
      ))}
    </div>
  );
}

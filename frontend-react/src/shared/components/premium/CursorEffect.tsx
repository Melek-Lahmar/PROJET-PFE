import { useEffect, useState } from "react";

/**
 * Cursor dot premium qui suit la souris avec un léger lag.
 * Désactivé automatiquement sur touch devices.
 * Agrandit sur les éléments interactifs (a, button, [role=button]).
 */
export function CursorEffect() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Désactive sur écrans tactiles ou utilisateurs préférant reduced-motion.
    if (typeof window === "undefined") return;
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isTouch || reducedMotion) return;
    setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const dot = document.createElement("div");
    dot.className = "premium-cursor-dot";
    document.body.appendChild(dot);

    const ring = document.createElement("div");
    ring.className = "premium-cursor-ring";
    document.body.appendChild(ring);

    let mouseX = -100;
    let mouseY = -100;
    let ringX = -100;
    let ringY = -100;
    let rafId = 0;

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
    };

    const isInteractive = (el: Element | null): boolean => {
      let cur: Element | null = el;
      let depth = 0;
      while (cur && depth < 5) {
        const tag = cur.tagName?.toLowerCase();
        if (tag === "a" || tag === "button") return true;
        if (cur.getAttribute && cur.getAttribute("role") === "button") return true;
        cur = cur.parentElement;
        depth++;
      }
      return false;
    };

    const onOver = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (isInteractive(target)) {
        ring.classList.add("is-active");
      } else {
        ring.classList.remove("is-active");
      }
    };

    const tick = () => {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      ring.style.transform = `translate(${ringX}px, ${ringY}px)`;
      rafId = requestAnimationFrame(tick);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseover", onOver);
    rafId = requestAnimationFrame(tick);

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      cancelAnimationFrame(rafId);
      dot.remove();
      ring.remove();
    };
  }, [enabled]);

  return null;
}

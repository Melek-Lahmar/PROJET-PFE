import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface PremiumModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** Tailles préset. */
  size?: "sm" | "md" | "lg" | "xl";
  /** Désactive la fermeture sur clic backdrop. */
  preventBackdropClose?: boolean;
}

const SIZE_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
} as const;

/**
 * Modal premium avec backdrop blur + scale-in animation.
 * Focus trap basique (focus le panel à l'ouverture, ESC ferme).
 */
export function PremiumModal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  preventBackdropClose = false,
}: PremiumModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9000] grid place-items-center p-4 animate-premium-backdrop-in"
      onClick={(e) => {
        if (preventBackdropClose) return;
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ background: "rgba(15, 23, 42, 0.55)", backdropFilter: "blur(10px)" }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "premium-modal-title" : undefined}
        className={[
          "relative w-full bg-white rounded-3xl shadow-2xl ring-1 ring-slate-200",
          "animate-premium-modal-in focus:outline-none",
          SIZE_CLASSES[size],
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Fermer"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 inline-grid place-items-center w-9 h-9 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {(title || description) && (
          <div className="px-6 pt-6 pb-2">
            {title && (
              <h2
                id="premium-modal-title"
                className="text-lg font-bold text-slate-900 pr-12"
              >
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-sm text-slate-600">{description}</p>
            )}
          </div>
        )}
        {children && <div className="px-6 py-4">{children}</div>}
        {footer && (
          <div className="px-6 pb-6 pt-2 flex flex-row-reverse gap-2 border-t border-slate-100">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

import { useEffect, type ReactNode } from "react";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export function Modal({ open, title, onClose, children, footer }: Props) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 animate-premium-backdrop-in bg-slate-950/50 backdrop-blur-md"
        onClick={onClose}
        aria-label="Fermer la fenêtre"
      />

      {/* Panel */}
      <div className="relative w-full max-w-[min(94vw,780px)] animate-premium-modal-in">
        <div className="overflow-hidden rounded-[28px] border border-border/70 bg-card text-card-foreground shadow-[0_48px_130px_-52px_rgba(2,6,23,0.88)] backdrop-blur-xl">

          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-border/60 px-6 py-5">
            <div className="min-w-0">
              <div className="app-kicker">Boîte de dialogue</div>
              <h2 className="mt-1 truncate text-lg font-bold tracking-tight text-card-foreground">{title}</h2>
            </div>

            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted/50 text-muted-foreground shadow-sm transition hover:bg-accent hover:text-card-foreground"
              onClick={onClose}
              aria-label="Fermer"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6 6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="max-h-[66vh] overflow-y-auto px-6 py-5">{children}</div>

          {/* Footer */}
          {footer ? (
            <div className="border-t border-border/60 bg-muted/30 px-6 py-4">{footer}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

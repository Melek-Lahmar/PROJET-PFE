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
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-md"
        onClick={onClose}
        aria-label="Fermer la fenêtre"
      />

      <div className="absolute left-1/2 top-1/2 w-[min(94vw,780px)] -translate-x-1/2 -translate-y-1/2">
        <div className="overflow-hidden rounded-[30px] border border-border/70 bg-card text-card-foreground shadow-[0_40px_120px_-50px_rgba(2,6,23,0.9)]">
          <div className="flex items-center justify-between border-b border-border/70 px-6 py-5">
            <div>
              <div className="app-kicker">Boîte de dialogue</div>
              <h2 className="mt-1 text-lg font-bold text-card-foreground">{title}</h2>
            </div>

            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-[hsl(var(--input))] text-muted-foreground shadow-sm transition hover:bg-accent hover:text-card-foreground"
              onClick={onClose}
              aria-label="Fermer"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="max-h-[68vh] overflow-y-auto px-6 py-5">{children}</div>

          {footer ? <div className="border-t border-border/70 bg-muted/35 px-6 py-4">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}

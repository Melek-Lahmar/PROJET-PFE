import type { ReactNode } from "react";

interface EmptyViewProps {
  title: string;
  description?: string;
  action?: ReactNode;
  /** SVG path data ("M…"). Same convention as the StatusPill. */
  iconPath?: string;
  className?: string;
}

export function EmptyView({
  title,
  description,
  action,
  iconPath = "M3 3h18v4H3z M5 7v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7 M10 12h4",
  className = "",
}: EmptyViewProps) {
  return (
    <div
      className={`app-surface-soft anim-fade-up flex flex-col items-center justify-center gap-4 px-8 py-14 text-center ${className}`}
    >
      <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary ring-8 ring-primary/5">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-9 w-9"
          aria-hidden="true"
        >
          {iconPath
            .split(" M")
            .map((seg, i) => (
              <path key={i} d={i === 0 ? seg : `M${seg}`} />
            ))}
        </svg>
      </div>

      <div className="space-y-2">
        <p className="text-base font-semibold text-card-foreground">{title}</p>
        {description && (
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>

      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

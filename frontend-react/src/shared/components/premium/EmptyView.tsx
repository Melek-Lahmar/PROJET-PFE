import type { ReactNode } from "react";

interface EmptyViewProps {
  title: string;
  description?: string;
  action?: ReactNode;
  /** SVG path data ("M…"). Same convention as the StatusPill. */
  iconPath?: string;
  className?: string;
}

/**
 * Empty state card used when a list/section has no data yet.
 * Mirrors flutter `lib/ui/widgets/premium/empty_view.dart`.
 */
export function EmptyView({
  title,
  description,
  action,
  iconPath = "M3 3h18v4H3z M5 7v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7 M10 12h4",
  className = "",
}: EmptyViewProps) {
  return (
    <div
      className={`app-surface-soft anim-fade-in flex flex-col items-center justify-center gap-3 px-8 py-12 text-center ${className}`}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-8 w-8"
          aria-hidden="true"
        >
          {iconPath
            .split(" M")
            .map((seg, i) => (
              <path key={i} d={i === 0 ? seg : `M${seg}`} />
            ))}
        </svg>
      </div>
      <p className="text-base font-semibold text-card-foreground">{title}</p>
      {description && (
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
      )}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

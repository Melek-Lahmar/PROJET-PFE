import type { ReactNode } from "react";

interface SectionHeaderProps {
  kicker?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}

/**
 * Section header with kicker + title + subtitle + optional trailing slot.
 * Mirrors flutter `lib/ui/widgets/premium/section_header.dart`.
 */
export function SectionHeader({
  kicker,
  title,
  subtitle,
  trailing,
  className = "",
}: SectionHeaderProps) {
  return (
    <header className={`flex flex-wrap items-end justify-between gap-4 ${className}`}>
      <div className="min-w-0 space-y-1.5">
        {kicker && <p className="app-kicker">{kicker}</p>}
        <h2 className="text-xl font-bold tracking-tight text-card-foreground md:text-2xl">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground md:text-[14px]">{subtitle}</p>
        )}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </header>
  );
}

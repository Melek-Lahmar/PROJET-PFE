import type { ReactNode } from "react";

export function Page({
  title,
  actions,
  children,
  description,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  description?: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-card-foreground md:text-3xl">{title}</h1>
          {description && (
            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
      {children}
    </div>
  );
}

export function Loader({ label = "Chargement..." }: { label?: string }) {
  return (
    <div className="flex min-h-[300px] w-full flex-col items-center justify-center gap-6 text-muted-foreground">
      <div className="relative flex h-16 w-16 items-center justify-center">
        {/* Outer ring */}
        <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-muted border-t-primary" />
        {/* Inner ring — contra-rotating */}
        <div
          className="absolute inset-2.5 animate-spin rounded-full border-[2px] border-muted/60 border-t-indigo"
          style={{ animationDirection: "reverse", animationDuration: "0.7s" }}
        />
        {/* Centre dot */}
        <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
      </div>
      <span className="animate-pulse text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

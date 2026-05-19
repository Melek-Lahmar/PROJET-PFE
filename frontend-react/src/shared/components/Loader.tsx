export function Loader({ label = "Chargement..." }: { label?: string }) {
  return (
    <div className="flex min-h-[300px] w-full flex-col items-center justify-center gap-5 text-muted-foreground">
      <div className="relative">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        </div>
      </div>
      <span className="text-sm font-medium animate-pulse tracking-wide uppercase text-xs">{label}</span>
    </div>
  );
}

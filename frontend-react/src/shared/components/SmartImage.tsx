import { useMemo, useState } from "react";

type Props = {
  src?: string | null;
  alt?: string;
  className?: string;
  placeholderClassName?: string;
  loading?: "eager" | "lazy";
  fit?: "cover" | "contain";
};

export function SmartImage({
  src,
  alt,
  className,
  placeholderClassName,
  loading = "lazy",
  fit = "contain",
}: Props) {
  const [failed, setFailed] = useState(false);

  const show = Boolean(src) && !failed;

  const initials = useMemo(() => {
    const a = (alt ?? "").trim();
    if (!a) return "IMG";
    const parts = a.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? "I";
    const second = parts[1]?.[0] ?? parts[0]?.[1] ?? "M";
    return `${first}${second}`.toUpperCase();
  }, [alt]);

  if (!show) {
    return (
      <div
        className={
          placeholderClassName ??
          "flex h-full w-full items-center justify-center bg-muted/35 text-muted-foreground/60"
        }
        aria-label={alt ?? "Image indisponible"}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-card shadow-sm ring-1 ring-black/[0.06]">
          <span className="text-sm font-extrabold tracking-wide text-muted-foreground/70">{initials}</span>
        </div>
      </div>
    );
  }

  const fitClass = fit === "cover" ? "object-cover" : "object-contain";

  return (
    <img
      src={src ?? ""}
      alt={alt ?? ""}
      className={`${fitClass} ${className ?? ""}`}
      loading={loading}
      onError={() => setFailed(true)}
    />
  );
}
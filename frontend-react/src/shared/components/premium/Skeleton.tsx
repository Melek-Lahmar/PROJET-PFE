import type { CSSProperties, HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
  /** Tailwind shape utilities or width/height classes. */
  className?: string;
  /** Convenience: numeric width in px. */
  width?: number | string;
  /** Convenience: numeric height in px. */
  height?: number | string;
  rounded?: "sm" | "md" | "lg" | "xl" | "full";
};

const radiusByName: Record<NonNullable<Props["rounded"]>, string> = {
  sm: "rounded-md",
  md: "rounded-xl",
  lg: "rounded-2xl",
  xl: "rounded-3xl",
  full: "rounded-full",
};

/**
 * Shimmering skeleton placeholder. Mirrors `lib/ui/widgets/premium/skeleton.dart`.
 */
export function Skeleton({
  className = "",
  width,
  height,
  rounded = "md",
  style,
  ...rest
}: Props) {
  const inline: CSSProperties = { ...style };
  if (width !== undefined) inline.width = typeof width === "number" ? `${width}px` : width;
  if (height !== undefined) inline.height = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      aria-hidden="true"
      className={`skeleton ${radiusByName[rounded]} ${className}`}
      style={inline}
      {...rest}
    />
  );
}

/** Convenience cluster: a list of N skeleton lines (used in cards). */
export function SkeletonLines({ rows = 3, gap = 8 }: { rows?: number; gap?: number }) {
  return (
    <div className="flex flex-col" style={{ gap }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton
          key={i}
          height={i === 0 ? 18 : 14}
          width={i === rows - 1 ? "60%" : "100%"}
        />
      ))}
    </div>
  );
}

import { Children, cloneElement, isValidElement, type CSSProperties, type ReactNode } from "react";

type Animation = "fade-up" | "fade-in" | "scale-in";

interface AnimatedEntryProps {
  children: ReactNode;
  animation?: Animation;
  /** Delay in ms before the animation starts. */
  delay?: number;
  className?: string;
}

/**
 * Wraps a child in a CSS-driven entry animation.
 * Mirrors flutter `lib/ui/widgets/premium/animated_entry.dart` (EntryAnimation).
 */
export function AnimatedEntry({
  children,
  animation = "fade-up",
  delay = 0,
  className = "",
}: AnimatedEntryProps) {
  const style: CSSProperties = delay > 0 ? { animationDelay: `${delay}ms` } : {};
  return (
    <div className={`anim-${animation} ${className}`} style={style}>
      {children}
    </div>
  );
}

interface StaggeredColumnProps {
  children: ReactNode;
  /** Per-step delay in ms (applied multiplicatively). */
  step?: number;
  /** Initial offset in ms before the first child starts. */
  initialDelay?: number;
  animation?: Animation;
  className?: string;
}

/**
 * Renders children with a staggered entry animation.
 * Mirrors flutter `StaggeredColumn`.
 */
export function StaggeredColumn({
  children,
  step = 70,
  initialDelay = 0,
  animation = "fade-up",
  className = "",
}: StaggeredColumnProps) {
  const items = Children.toArray(children);
  return (
    <div className={className}>
      {items.map((child, index) => {
        const delay = initialDelay + index * step;
        if (!isValidElement(child)) {
          return (
            <AnimatedEntry key={index} animation={animation} delay={delay}>
              {child}
            </AnimatedEntry>
          );
        }
        const childProps = (child.props ?? {}) as { className?: string; style?: CSSProperties };
        return cloneElement(
          child as React.ReactElement<{ className?: string; style?: CSSProperties }>,
          {
            key: child.key ?? index,
            className: `${childProps.className ?? ""} anim-${animation}`.trim(),
            style: { ...(childProps.style ?? {}), animationDelay: `${delay}ms` },
          }
        );
      })}
    </div>
  );
}

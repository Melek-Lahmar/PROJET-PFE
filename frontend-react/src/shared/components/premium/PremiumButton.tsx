import {
  type ButtonHTMLAttributes,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useRef,
  useState,
} from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

interface PremiumButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  /** Ajoute l'effet "magnetic" (le bouton suit légèrement le curseur). */
  magnetic?: boolean;
  /** Désactive l'effet ripple au clic. */
  noRipple?: boolean;
  /** Halo gradient animé au hover. */
  glow?: boolean;
  children?: ReactNode;
}

const VARIANT_STYLES: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 hover:shadow-primary/30",
  secondary:
    "bg-card text-card-foreground border border-border shadow-sm hover:bg-accent hover:text-primary hover:shadow-md",
  ghost:
    "bg-transparent text-card-foreground hover:bg-accent hover:text-primary",
  danger:
    "bg-danger text-danger-foreground shadow-lg shadow-danger/20 hover:bg-danger/90 hover:shadow-danger/30",
  success:
    "bg-success text-success-foreground shadow-lg shadow-success/20 hover:bg-success/90 hover:shadow-success/30",
};

const SIZE_STYLES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5 rounded-lg",
  md: "px-4 py-2.5 text-sm gap-2 rounded-xl",
  lg: "px-6 py-3.5 text-base gap-2.5 rounded-2xl",
};

type Ripple = { id: number; x: number; y: number; size: number };

/**
 * Bouton premium polyvalent. Animations CSS pures :
 *   - hover : lift -2px + scale 1.02
 *   - active : scale 0.97
 *   - glow : halo gradient animé (option)
 *   - magnetic : le bouton suit le curseur en hover (option)
 *   - ripple : onde au clic (par défaut)
 */
export function PremiumButton({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  iconPosition = "left",
  magnetic = false,
  noRipple = false,
  glow = false,
  className = "",
  children,
  disabled,
  onClick,
  ...rest
}: PremiumButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const idRef = useRef(0);

  const handleClick = (e: ReactMouseEvent<HTMLButtonElement>) => {
    if (loading || disabled) return;
    if (!noRipple && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.4;
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      const id = ++idRef.current;
      setRipples((r) => [...r, { id, x, y, size }]);
      setTimeout(() => setRipples((r) => r.filter((rp) => rp.id !== id)), 700);
    }
    onClick?.(e);
  };

  const handleMove = (e: ReactMouseEvent<HTMLButtonElement>) => {
    if (!magnetic || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);
    btnRef.current.style.transform = `translate(${x * 0.18}px, ${y * 0.18}px)`;
  };

  const handleLeave = () => {
    if (btnRef.current) btnRef.current.style.transform = "";
  };

  return (
    <button
      ref={btnRef}
      onClick={handleClick}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      disabled={loading || disabled}
      className={[
        "relative overflow-hidden inline-flex items-center justify-center font-semibold",
        "transition-all duration-200 ease-out will-change-transform",
        "hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.97]",
        "disabled:opacity-60 disabled:pointer-events-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        glow ? "premium-btn-glow" : "",
        className,
      ].join(" ")}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden
          className="absolute inset-0 grid place-items-center bg-inherit"
        >
          <span className="block w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
        </span>
      )}
      <span className={`flex items-center ${SIZE_STYLES[size].split(" ")[2]} ${loading ? "opacity-0" : ""}`}>
        {icon && iconPosition === "left" && <span className="shrink-0">{icon}</span>}
        {children}
        {icon && iconPosition === "right" && <span className="shrink-0">{icon}</span>}
      </span>
      {ripples.map((r) => (
        <span
          key={r.id}
          aria-hidden
          className="pointer-events-none absolute rounded-full bg-white/40 animate-premium-ripple"
          style={{
            left: r.x,
            top: r.y,
            width: r.size,
            height: r.size,
          }}
        />
      ))}
    </button>
  );
}

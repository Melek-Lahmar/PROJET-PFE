import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "link" | "destructive" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  (
    {
      variant = "secondary",
      size = "md",
      isLoading = false,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    const base =
      "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]";

    const variants: Record<ButtonVariant, string> = {
      primary:
        "border border-primary/20 bg-primary text-primary-foreground shadow-[0_14px_32px_-18px_hsl(var(--primary)/0.7)] hover:-translate-y-0.5 hover:brightness-[1.08] hover:shadow-[0_20px_44px_-20px_hsl(var(--primary)/0.85)]",
      secondary:
        "border border-border/80 bg-card text-card-foreground shadow-sm hover:-translate-y-0.5 hover:border-primary/25 hover:bg-accent/60 hover:shadow-md",
      outline:
        "border border-border bg-transparent text-card-foreground hover:-translate-y-0.5 hover:bg-accent/70 hover:border-primary/30",
      ghost:
        "border border-transparent bg-transparent text-muted-foreground hover:bg-accent/80 hover:text-card-foreground",
      link: "bg-transparent text-primary underline-offset-4 hover:underline",
      destructive:
        "border border-danger/25 bg-danger text-danger-foreground shadow-[0_14px_32px_-18px_hsl(var(--danger)/0.5)] hover:-translate-y-0.5 hover:brightness-[1.08]",
      danger:
        "border border-danger/25 bg-danger text-danger-foreground shadow-[0_14px_32px_-18px_hsl(var(--danger)/0.5)] hover:-translate-y-0.5 hover:brightness-[1.08]",
    };

    const sizes: Record<ButtonSize, string> = {
      sm: "h-9 px-3.5 text-xs",
      md: "h-11 px-5 text-sm",
      lg: "h-12 px-7 text-base",
      icon: "h-11 w-11",
    };

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && (
          <svg className="h-4 w-4 shrink-0 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

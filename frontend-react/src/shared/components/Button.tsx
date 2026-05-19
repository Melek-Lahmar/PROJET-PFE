import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "link" | "destructive";
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
      "inline-flex items-center justify-center rounded-2xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:pointer-events-none disabled:opacity-55";

    const variants: Record<ButtonVariant, string> = {
      primary:
        "border border-primary/20 bg-primary text-primary-foreground shadow-[0_18px_40px_-24px_hsl(var(--primary)/0.8)] hover:-translate-y-0.5 hover:brightness-110",
      secondary:
        "border border-border/70 bg-[hsl(var(--input))] text-card-foreground shadow-sm hover:-translate-y-0.5 hover:border-primary/20 hover:bg-accent/55",
      outline:
        "border border-border/80 bg-card text-card-foreground shadow-sm hover:-translate-y-0.5 hover:bg-accent/70 hover:border-primary/20",
      ghost:
        "text-muted-foreground hover:bg-accent hover:text-card-foreground",
      link: "text-primary underline-offset-4 hover:underline",
      destructive:
        "border border-[hsl(var(--danger)/0.22)] bg-[hsl(var(--danger))] text-[hsl(var(--danger-foreground))] shadow-[0_18px_40px_-24px_hsl(var(--danger)/0.55)] hover:-translate-y-0.5 hover:brightness-110",
    };

    const sizes: Record<ButtonSize, string> = {
      sm: "h-9 px-3 text-sm",
      md: "h-11 px-4 text-sm",
      lg: "h-12 px-6 text-base",
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
          <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
            <circle
              className="opacity-20"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-80"
              fill="currentColor"
              d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

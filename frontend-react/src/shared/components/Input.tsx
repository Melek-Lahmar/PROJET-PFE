import type { InputHTMLAttributes } from "react";
import { forwardRef } from "react";

type Props = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, Props>(({ className = "", ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={`h-11 w-full rounded-2xl border border-border/80 bg-input px-4 text-sm text-card-foreground shadow-[inset_0_1px_2px_rgba(15,23,42,0.05)] outline-none transition-all duration-200 placeholder:text-muted-foreground focus:border-primary/50 focus:ring-4 focus:ring-primary/10 focus:shadow-[inset_0_1px_2px_rgba(15,23,42,0.03),0_0_0_4px_hsl(var(--primary)/0.10)] disabled:cursor-not-allowed disabled:opacity-55 disabled:bg-muted/40 ${className}`}
      {...props}
    />
  );
});

Input.displayName = "Input";

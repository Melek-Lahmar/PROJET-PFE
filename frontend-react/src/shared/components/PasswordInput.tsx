import { forwardRef, useState, type InputHTMLAttributes } from "react";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className = "", ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="relative">
        <input
          ref={ref}
          type={showPassword ? "text" : "password"}
          className={`h-11 w-full rounded-2xl border border-border/80 bg-input px-4 pr-12 text-sm text-card-foreground shadow-[inset_0_1px_2px_rgba(15,23,42,0.05)] outline-none transition-all duration-200 placeholder:text-muted-foreground focus:border-primary/50 focus:ring-4 focus:ring-primary/10 focus:shadow-[inset_0_1px_2px_rgba(15,23,42,0.03),0_0_0_4px_hsl(var(--primary)/0.10)] disabled:cursor-not-allowed disabled:opacity-55 ${className}`}
          {...props}
        />

        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute inset-y-0 right-1.5 flex w-10 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-accent hover:text-card-foreground"
          aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          title={showPassword ? "Masquer" : "Afficher"}
        >
          {showPassword ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.11 1 12c.73-1.73 1.79-3.29 3.06-4.6" />
              <path d="M10.58 10.58A2 2 0 1 0 13.41 13.41" />
              <path d="M9.88 5.09A10.94 10.94 0 0 1 12 4c5 0 9.27 3.89 11 8a10.94 10.94 0 0 1-4.24 5.36" />
              <path d="M1 1l22 22" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";

import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function Card({ children, className = "", noPadding = false }: CardProps) {
  return (
    <div className={`app-surface ${noPadding ? "" : "p-5"} ${className}`}>
      {children}
    </div>
  );
}

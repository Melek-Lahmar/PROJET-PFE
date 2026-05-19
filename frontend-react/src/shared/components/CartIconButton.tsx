import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCartStore } from "../../features/cart/store/cartStore";

function CartIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}

export function CartIconButton() {
  const qty = useCartStore((s) => s.totalQty());
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (qty <= 0) return;
    setPulse(true);
    const t = window.setTimeout(() => setPulse(false), 650);
    return () => window.clearTimeout(t);
  }, [qty]);

  return (
    <Link
      to="/cart"
      aria-label="Ouvrir le panier"
      className="group relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-shell-border/80 bg-card text-card-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg"
    >
      <CartIcon className="h-5 w-5 transition-transform group-hover:scale-110" />

      {qty > 0 && (
        <span
          className={[
            "absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white shadow-md ring-2 ring-shell",
            pulse ? "scale-110" : "scale-100",
            "transition-transform duration-200",
          ].join(" ")}
        >
          {qty}
        </span>
      )}
    </Link>
  );
}

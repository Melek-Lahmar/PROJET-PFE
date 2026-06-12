import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DeliveryMode = "HOME" | "PICKUP";

export type CartItem = {
  arRef: string;
  designation: string;
  unitPrice: number;
  qty: number;
};

type CartState = {
  items: CartItem[];
  deliveryMode: DeliveryMode;
  shippingHomeFee: number;

  addItem: (item: Omit<CartItem, "qty">, qty?: number) => void;
  removeItem: (arRef: string) => void;
  setQty: (arRef: string, qty: number) => void;
  clear: () => void;
  setDeliveryMode: (mode: DeliveryMode) => void;
  setShippingHomeFee: (value: number) => void;

  subtotal: () => number;
  shipping: () => number;
  stamp: () => number;
  total: () => number;

  totalQty: () => number;
};

export const DEFAULT_SHIPPING_HOME = 8; // TND
const STAMP = 1; // TND

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      deliveryMode: "HOME",
      shippingHomeFee: DEFAULT_SHIPPING_HOME,

      addItem: (item, qty = 1) => {
        const safeQty = Math.max(1, qty);

        set((state) => {
          const existing = state.items.find((x) => x.arRef === item.arRef);

          if (existing) {
            return {
              items: state.items.map((x) =>
                x.arRef === item.arRef ? { ...x, qty: x.qty + safeQty } : x
              ),
            };
          }

          return { items: [...state.items, { ...item, qty: safeQty }] };
        });
      },

      removeItem: (arRef) =>
        set((state) => ({
          items: state.items.filter((x) => x.arRef !== arRef),
        })),

      setQty: (arRef, qty) => {
        const safeQty = Math.max(1, Number.isFinite(qty) ? qty : 1);

        set((state) => ({
          items: state.items.map((x) =>
            x.arRef === arRef ? { ...x, qty: safeQty } : x
          ),
        }));
      },

      clear: () => set({ items: [] }),

      setDeliveryMode: (mode) => set({ deliveryMode: mode }),
      setShippingHomeFee: (value) =>
        set({ shippingHomeFee: Number.isFinite(value) && value >= 0 ? value : DEFAULT_SHIPPING_HOME }),

      subtotal: () => {
        const { items } = get();
        return items.reduce((sum, x) => sum + x.unitPrice * x.qty, 0);
      },

      shipping: () => {
        const { deliveryMode, items, shippingHomeFee } = get();
        if (items.length === 0) return 0; // ✅ panier vide => pas de frais
        return deliveryMode === "HOME" ? shippingHomeFee : 0;
      },

      stamp: () => {
        const { items } = get();
        if (items.length === 0) return 0; // ✅ panier vide => pas de timbre
        return STAMP;
      },

      total: () => {
        return get().subtotal() + get().shipping() + get().stamp();
      },

      totalQty: () => {
        const { items } = get();
        return items.reduce((sum, x) => sum + x.qty, 0);
      },
    }),
    {
      name: "melek-cart", // ✅ exactement comme dans CartPage.tsx
      version: 1,
      partialize: (state) => ({
        items: state.items,
        deliveryMode: state.deliveryMode,
      }),
    }
  )
);

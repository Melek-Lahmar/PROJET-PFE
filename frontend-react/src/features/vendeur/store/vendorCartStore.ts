import { create } from "zustand";
import { persist } from "zustand/middleware";

export type VendorCartItem = {
  arRef: string;
  designation: string;
  unitPrice: number;
  qty: number;
};

type VendorCartState = {
  items: VendorCartItem[];

  addItem: (item: Omit<VendorCartItem, "qty">, qty?: number) => void;
  removeItem: (arRef: string) => void;
  setQty: (arRef: string, qty: number) => void;
  clear: () => void;

  subtotal: () => number;
  shipping: () => number;
  stamp: () => number;
  total: () => number;
  totalQty: () => number;
};

const STAMP = 1;

export const useVendorCartStore = create<VendorCartState>()(
  persist(
    (set, get) => ({
      items: [],

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
        set((state) => ({ items: state.items.filter((x) => x.arRef !== arRef) })),

      setQty: (arRef, qty) => {
        const safeQty = Math.max(1, Number.isFinite(qty) ? qty : 1);
        set((state) => ({
          items: state.items.map((x) => (x.arRef === arRef ? { ...x, qty: safeQty } : x)),
        }));
      },

      clear: () => set({ items: [] }),

      subtotal: () => get().items.reduce((sum, x) => sum + x.unitPrice * x.qty, 0),
      shipping: () => 0,
      stamp: () => (get().items.length === 0 ? 0 : STAMP),
      total: () => get().subtotal() + get().shipping() + get().stamp(),
      totalQty: () => get().items.reduce((sum, x) => sum + x.qty, 0),
    }),
    {
      name: "melek-vendeur-cart",
      version: 2,
      migrate: (persistedState) => {
        const state = typeof persistedState === "object" && persistedState !== null
          ? (persistedState as { items?: Array<Record<string, unknown>> })
          : {};

        return {
          items: Array.isArray(state.items)
            ? state.items.map((item) => ({
                arRef: typeof item.arRef === "string" ? item.arRef : "",
                designation: typeof item.designation === "string" ? item.designation : "",
                unitPrice: typeof item.unitPrice === "number" ? item.unitPrice : 0,
                qty: typeof item.qty === "number" ? Math.max(1, Math.floor(item.qty)) : 1,
              }))
            : [],
        };
      },
    }
  )
);
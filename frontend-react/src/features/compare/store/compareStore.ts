import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StockStatus } from "../../catalog/types/article";

export type CompareProductSummary = {
  arRef: string;
  designation: string;
  price: number;
  image?: string | null;
  stockStatus: StockStatus;
  availableStock: number;
  family?: string | null;
};

type CompareState = {
  items: CompareProductSummary[];
  addItem: (item: CompareProductSummary) => { added: boolean; reason?: "duplicate" | "limit" };
  removeItem: (arRef: string) => void;
  clear: () => void;
  isSelected: (arRef: string) => boolean;
};

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const current = get().items;
        if (current.some((x) => x.arRef === item.arRef)) {
          return { added: false as const, reason: "duplicate" as const };
        }
        if (current.length >= 4) {
          return { added: false as const, reason: "limit" as const };
        }
        set({ items: [...current, item] });
        return { added: true as const };
      },
      removeItem: (arRef) => set((state) => ({ items: state.items.filter((x) => x.arRef !== arRef) })),
      clear: () => set({ items: [] }),
      isSelected: (arRef) => get().items.some((x) => x.arRef === arRef),
    }),
    {
      name: "melek-compare",
      version: 1,
    }
  )
);

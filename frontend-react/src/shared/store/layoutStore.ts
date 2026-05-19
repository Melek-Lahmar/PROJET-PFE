import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark";

type LayoutState = {
  isCatalogSidebarOpen: boolean;
  themeMode: ThemeMode;
  openCatalogSidebar: () => void;
  closeCatalogSidebar: () => void;
  toggleCatalogSidebar: () => void;
  setThemeMode: (themeMode: ThemeMode) => void;
  toggleThemeMode: () => void;
};

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set, get) => ({
      isCatalogSidebarOpen: false,
      themeMode: "dark",
      openCatalogSidebar: () => set({ isCatalogSidebarOpen: true }),
      closeCatalogSidebar: () => set({ isCatalogSidebarOpen: false }),
      toggleCatalogSidebar: () =>
        set({ isCatalogSidebarOpen: !get().isCatalogSidebarOpen }),
      setThemeMode: (themeMode) => set({ themeMode }),
      toggleThemeMode: () =>
        set({ themeMode: get().themeMode === "dark" ? "light" : "dark" }),
    }),
    {
      name: "layout-ui",
      version: 2,
    }
  )
);

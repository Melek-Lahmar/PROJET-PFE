import { useEffect } from "react";
import { QueryProvider } from "./providers/QueryProvider";
import { RouterProvider } from "./providers/RouterProvider";
import { useAuthBootstrap } from "../features/auth/hooks/useAuthBootstrap";
import { useLayoutStore } from "../shared/store/layoutStore";
import { CursorEffect, ToastProvider } from "../shared/components/premium";
import { ChatbotFab } from "../features/admin/chatbot/components/ChatbotFab";

function AuthBootstrapper() {
  useAuthBootstrap();
  return null;
}

function ThemeBootstrapper() {
  const themeMode = useLayoutStore((s) => s.themeMode);

  useEffect(() => {
    const root = document.documentElement;
    const isDark = themeMode === "dark";

    root.classList.toggle("dark", isDark);
    root.style.colorScheme = isDark ? "dark" : "light";
  }, [themeMode]);

  return null;
}

export function App() {
  return (
    <QueryProvider>
      <ToastProvider>
        <AuthBootstrapper />
        <ThemeBootstrapper />
        <CursorEffect />
        <RouterProvider />
        <ChatbotFab />
      </ToastProvider>
    </QueryProvider>
  );
}

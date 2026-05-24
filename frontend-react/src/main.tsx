import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/globals.css";

import "leaflet/dist/leaflet.css";
import "./shared/leaflet/leafletIconFix";
import "./features/homepage/styles/homepage-themes.css";

// Module 9 — bootstrap i18n FR/EN/AR + RTL
import "./i18n";

import { App } from "./app/App";

function initializeTheme() {
  const root = document.documentElement;

  try {
    const raw = window.localStorage.getItem("layout-ui");
    const parsed = raw ? JSON.parse(raw) : null;
    const themeMode = parsed?.state?.themeMode === "light" ? "light" : "dark";
    const isDark = themeMode === "dark";

    root.classList.toggle("dark", isDark);
    root.style.colorScheme = isDark ? "dark" : "light";
  } catch {
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  }
}

initializeTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

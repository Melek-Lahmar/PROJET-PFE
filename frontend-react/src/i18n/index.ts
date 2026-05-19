import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpBackend from "i18next-http-backend";

/**
 * Module 9 (Master Prompt) — i18n FR/EN/AR + RTL automatique pour l'arabe.
 *
 * Bundles servis depuis `public/locales/{lng}/{ns}.json` via i18next-http-backend.
 * Ordre de détection : localStorage > cookie > navigator > htmlTag.
 * La langue persiste dans localStorage (clé i18nextLng).
 *
 * Pour ajouter une chaîne : `t('namespace:cle')` dans un composant.
 * Si la clé n'existe pas dans la langue active, fallback sur français.
 */
i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "fr",
    supportedLngs: ["fr", "en", "ar"],
    load: "languageOnly", // ignore region (en-US → en)
    ns: ["common", "admin", "chatbot"],
    defaultNS: "common",
    preload: ["fr"], // pré-charge le FR pour éviter le flicker au démarrage
    interpolation: { escapeValue: false },
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },
    detection: {
      order: ["localStorage", "cookie", "navigator", "htmlTag"],
      caches: ["localStorage"],
    },
    react: {
      useSuspense: false,
    },
    returnEmptyString: false, // si une traduction est vide, fallback sur la clé/fr
  });

i18n.on("languageChanged", (lng: string) => {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lng;
  document.documentElement.dir = lng === "ar" ? "rtl" : "ltr";
});

export default i18n;

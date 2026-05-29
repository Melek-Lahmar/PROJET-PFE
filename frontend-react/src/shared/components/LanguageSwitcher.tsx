import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const LANGS: { code: "fr" | "en" | "ar"; label: string; native: string }[] = [
  { code: "fr", label: "Français", native: "FR" },
  { code: "en", label: "English", native: "EN" },
  { code: "ar", label: "العربية", native: "AR" },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(i18n.language ?? "fr");

  useEffect(() => {
    const onChange = (lng: string) => setCurrent(lng);
    i18n.on("languageChanged", onChange);
    return () => { i18n.off("languageChanged", onChange); };
  }, [i18n]);

  const active = LANGS.find((l) => current.startsWith(l.code)) ?? LANGS[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10"
        aria-label="Changer de langue"
      >
        <span>{active.native}</span>
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-label="Fermer"
          />
          <div className="absolute right-0 z-50 mt-2 min-w-[160px] overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => {
                  i18n.changeLanguage(l.code);
                  setOpen(false);
                }}
                className={[
                  "flex w-full items-center justify-between gap-3 px-3 py-2 text-sm",
                  current.startsWith(l.code) ? "bg-primary/10 font-bold text-primary" : "hover:bg-muted",
                ].join(" ")}
              >
                <span>{l.label}</span>
                <span className="text-xs text-muted-foreground">{l.native}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

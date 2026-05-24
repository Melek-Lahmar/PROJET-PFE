import { useMemo } from "react";
import { Button } from "../../../../shared/components/Button";
import { HomepageRenderer } from "../HomepageRenderer";
import type { HomepageView } from "../../types/homepage";
import type { HomepageTemplateDefinition } from "../../templates/homepageTemplates";
import { getTheme, getThemeCSS } from "../../themes/HomepageThemes";

type Props = {
  template: HomepageTemplateDefinition;
  view: HomepageView;
  onClose: () => void;
  onApply: (template: HomepageTemplateDefinition) => void;
};

export function HomepageTemplatePreviewModal({ template, view, onClose, onApply }: Props) {
  const theme = useMemo(() => getTheme(template.themeId), [template.themeId]);
  const themeCSS = useMemo(() => getThemeCSS(theme), [theme]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border shadow-2xl" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background }}>

        {/* En-tête coloré selon le thème */}
        <div
          className="flex flex-col gap-3 border-b px-5 py-4 md:flex-row md:items-center md:justify-between"
          style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}
        >
          <div className="flex items-start gap-4">
            {/* Palette de couleurs du thème */}
            <div className="mt-1 flex shrink-0 gap-1.5">
              {[theme.colors.primary, theme.colors.secondary, theme.colors.accent].map((color, i) => (
                <span
                  key={i}
                  className="inline-block h-5 w-5 rounded-full border"
                  style={{ backgroundColor: color, borderColor: theme.colors.border }}
                />
              ))}
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: theme.colors.primary }}>
                Prévisualisation — Thème {theme.name}
              </div>
              <h2 className="mt-0.5 text-2xl font-black" style={{ color: theme.colors.text }}>{template.name}</h2>
              <p className="mt-1 text-sm" style={{ color: theme.colors.textLight }}>{template.description}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Fermer
            </Button>
            <Button type="button" variant="primary" onClick={() => onApply(template)}>
              Appliquer au brouillon
            </Button>
          </div>
        </div>

        {/* Zone de prévisualisation avec couleurs du thème */}
        <div className="overflow-auto p-4 md:p-5" style={{ backgroundColor: theme.colors.accent }}>
          <div
            className="rounded-[26px] border p-4"
            style={{ ...themeCSS, backgroundColor: theme.colors.background, borderColor: theme.colors.border }}
          >
            <HomepageRenderer view={view} preview />
          </div>
        </div>
      </div>
    </div>
  );
}

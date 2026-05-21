import { Button } from "../../../../shared/components/Button";
import { HomepageRenderer } from "../HomepageRenderer";
import type { HomepageView } from "../../types/homepage";
import type { HomepageTemplateDefinition } from "../../templates/homepageTemplates";

type Props = {
  template: HomepageTemplateDefinition;
  view: HomepageView;
  onClose: () => void;
  onApply: (template: HomepageTemplateDefinition) => void;
};

export function HomepageTemplatePreviewModal({ template, view, onClose, onApply }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-border bg-background shadow-2xl">
        <div className="flex flex-col gap-3 border-b border-border/70 bg-card px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="app-kicker">Prévisualisation du modèle</div>
            <h2 className="mt-1 text-2xl font-black text-card-foreground">{template.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
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

        <div className="overflow-auto bg-muted/20 p-4 md:p-5">
          <div className="rounded-[26px] border border-border/70 bg-background p-4">
            <HomepageRenderer view={view} preview />
          </div>
        </div>
      </div>
    </div>
  );
}

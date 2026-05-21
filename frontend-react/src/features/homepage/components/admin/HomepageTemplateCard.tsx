import { Button } from "../../../../shared/components/Button";
import { Card } from "../../../../shared/components/Card";
import type { HomepageTemplateDefinition } from "../../templates/homepageTemplates";

type Props = {
  template: HomepageTemplateDefinition;
  onPreview: (template: HomepageTemplateDefinition) => void;
  onApply: (template: HomepageTemplateDefinition) => void;
};

export function HomepageTemplateCard({ template, onPreview, onApply }: Props) {
  return (
    <Card className="flex h-full flex-col gap-5 p-5 transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_28px_70px_-46px_rgba(15,23,42,0.52)]">
      <div className="space-y-3">
        <div className="inline-flex rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          {template.badge}
        </div>
        <div>
          <h3 className="text-xl font-black tracking-tight text-card-foreground">{template.name}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{template.description}</p>
        </div>
      </div>

      <div className="grid gap-3 text-sm">
        <div className="rounded-2xl border border-border/70 bg-muted/20 p-3">
          <div className="app-kicker">Objectif</div>
          <p className="mt-2 leading-6 text-card-foreground">{template.objective}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-muted/20 p-3">
          <div className="app-kicker">Style visuel</div>
          <p className="mt-2 leading-6 text-card-foreground">{template.visualStyle}</p>
        </div>
      </div>

      <div className="flex-1">
        <div className="app-kicker mb-2">Sections incluses</div>
        <div className="flex flex-wrap gap-2">
          {template.includedSections.map((label) => (
            <span
              key={label}
              className="rounded-full border border-border/70 bg-card px-3 py-1 text-xs font-semibold text-muted-foreground"
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button type="button" variant="outline" onClick={() => onPreview(template)}>
          Prévisualiser
        </Button>
        <Button type="button" variant="primary" onClick={() => onApply(template)}>
          Appliquer ce modèle
        </Button>
      </div>
    </Card>
  );
}

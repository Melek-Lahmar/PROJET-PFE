import { HomepageTemplateCard } from "./HomepageTemplateCard";
import type { HomepageTemplateDefinition } from "../../templates/homepageTemplates";

type Props = {
  templates: HomepageTemplateDefinition[];
  onPreview: (template: HomepageTemplateDefinition) => void;
  onApply: (template: HomepageTemplateDefinition) => void;
};

export function HomepageTemplateSelector({ templates, onPreview, onApply }: Props) {
  return (
    <section className="app-surface space-y-5 p-5 md:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="app-kicker">Choisir un modèle de page d’accueil</div>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-card-foreground md:text-3xl">
            Appliquez un modèle professionnel au brouillon
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Le modèle choisi remplace uniquement le brouillon. La version publiée visible par les visiteurs reste inchangée tant que vous ne publiez pas.
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-100">
          Application sécurisée au brouillon
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
        {templates.map((template) => (
          <HomepageTemplateCard
            key={template.id}
            template={template}
            onPreview={onPreview}
            onApply={onApply}
          />
        ))}
      </div>
    </section>
  );
}

import { Button } from "../../../../shared/components/Button";
import { Card } from "../../../../shared/components/Card";
import type { HomepageTemplateDefinition } from "../../templates/homepageTemplates";

type Props = {
  template: HomepageTemplateDefinition;
  onCancel: () => void;
  onConfirm: () => void;
};

export function HomepageTemplateApplyConfirmModal({ template, onCancel, onConfirm }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-xl space-y-5 p-6 shadow-2xl">
        <div>
          <div className="app-kicker">Confirmation</div>
          <h2 className="mt-2 text-2xl font-black text-card-foreground">
            Appliquer « {template.name} »
          </h2>
        </div>

        <p className="text-sm leading-7 text-muted-foreground">
          Ce modèle va remplacer le brouillon actuel de la page d’accueil. La version publiée ne sera pas modifiée tant que vous ne cliquez pas sur « Publier en ligne ». Voulez-vous continuer ?
        </p>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="button" variant="primary" onClick={onConfirm}>
            Appliquer au brouillon
          </Button>
        </div>
      </Card>
    </div>
  );
}

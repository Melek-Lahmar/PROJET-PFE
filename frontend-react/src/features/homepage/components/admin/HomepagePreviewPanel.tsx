import { Card } from '../../../../shared/components/Card';
import { HomepageRenderer } from '../HomepageRenderer';
import type { HomepageView } from '../../types/homepage';

type Props = {
  title: string;
  description?: string;
  view: HomepageView | null;
  preview?: boolean;
};

export function HomepagePreviewPanel({ title, description, view, preview = false }: Props) {
  return (
    <Card className="space-y-4 p-5">
      <div>
        <div className="app-kicker">Prévisualisation</div>
        <div className="text-xl font-black text-card-foreground">{title}</div>
        {description ? <div className="mt-2 app-description">{description}</div> : null}
      </div>

      {view ? (
        <HomepageRenderer view={view} preview={preview} />
      ) : (
        <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
          Aucun aperçu disponible.
        </div>
      )}
    </Card>
  );
}
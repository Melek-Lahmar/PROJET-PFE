import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import {
  useSyncAll,
  useSyncArticles,
  useSyncCatalogues,
  useSyncDepots,
  useSyncStocks,
} from "../hooks/useSageSync";

type SyncBtnProps = {
  title: string;
  onClick: () => void;
  isLoading: boolean;
};

function SyncBtn({ title, onClick, isLoading }: SyncBtnProps) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={isLoading}
      className="h-11 rounded-2xl"
    >
      {isLoading ? "Synchronisation…" : title}
    </Button>
  );
}

export default function SageSyncPanel() {
  const articles = useSyncArticles();
  const catalogues = useSyncCatalogues();
  const depots = useSyncDepots();
  const stocks = useSyncStocks();
  const all = useSyncAll();

  return (
    <Card className="space-y-5" noPadding>
      <div className="space-y-1 border-b border-border/60 px-6 py-5">
        <div className="app-kicker">Administration</div>
        <h2 className="text-lg font-extrabold text-card-foreground">Synchronisation Sage X3</h2>
        <p className="text-sm text-muted-foreground">
          Lancez la synchronisation entre Sage X3 et la base locale.
        </p>
      </div>

      <div className="grid gap-3 px-6 pb-2 sm:grid-cols-2">
        <SyncBtn
          title="Sync Articles"
          onClick={() => articles.mutate()}
          isLoading={articles.isPending}
        />
        <SyncBtn
          title="Sync Catalogues"
          onClick={() => catalogues.mutate()}
          isLoading={catalogues.isPending}
        />
        <SyncBtn
          title="Sync Dépôts"
          onClick={() => depots.mutate()}
          isLoading={depots.isPending}
        />
        <SyncBtn
          title="Sync Stocks"
          onClick={() => stocks.mutate()}
          isLoading={stocks.isPending}
        />
      </div>

      <div className="px-6 pb-6">
        <Button
          type="button"
          variant="primary"
          onClick={() => all.mutate()}
          isLoading={all.isPending}
          className="h-12 w-full rounded-2xl text-base"
        >
          Synchroniser tout
        </Button>
      </div>
    </Card>
  );
}

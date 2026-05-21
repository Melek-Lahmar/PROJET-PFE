import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../../../shared/components/Button";
import { Loader } from "../../../shared/components/Loader";
import { getVendeurOrders } from "../api/vendeurApi";
import type { VendeurOrderResponseDto } from "../types/vendeur";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";
import {
  EmptyView,
  PremiumHero,
  StaggeredColumn,
} from "../../../shared/components/premium";

function money(v: number) {
  return `${Number(v ?? 0).toFixed(3)} TND`;
}

function safe(value?: string | null) {
  return value && value.trim() ? value : "-";
}

function badgeClass(status?: string | null) {
  const s = (status ?? "").toUpperCase();
  if (s.includes("ATTENTE")) return "badge-warning";
  if (s.includes("CONFIR")) return "badge-success";
  if (s.includes("REFUS")) return "badge-danger";
  if (s.includes("TENT")) return "badge-info";
  return "badge-neutral";
}

export function VendeurOrdersPage() {
  const { data, isLoading, isError, error, refetch } = useQuery<VendeurOrderResponseDto[]>({
    queryKey: ["vendeur-orders"],
    queryFn: getVendeurOrders,
  });

  if (isLoading) return <Loader label="Chargement des commandes vendeur..." />;

  return (
    <div className="w-full space-y-6 pb-10">
      <PremiumHero
        kicker="Espace vendeur"
        title="Commandes saisies"gradientTitle
        description="Historique des commandes créées par le vendeur connecté."
        actions={
          <>
            <Link to="/vendeur/articles">
              <Button type="button" variant="primary">Nouvelle commande</Button>
            </Link>
            <Button type="button" variant="outline" onClick={() => refetch()}>Actualiser</Button>
          </>
        }
      />

      {isError ? (
        <div className="ds-alert ds-alert-danger">{getApiErrorMessage(error)}</div>
      ) : null}

      {!isError && (data?.length ?? 0) === 0 ? (
        <EmptyView
          title="Aucune commande vendeur"
          description="Commencez par créer une première commande depuis le catalogue vendeur."
          iconPath="M3 3h2l.4 2 M7 13h10l4-8H5.4 M7 13 5.4 5 M7 13l-2 7h13"
          action={
            <Link to="/vendeur/articles">
              <Button type="button" variant="primary" className="h-11 rounded-2xl px-5">
                Aller au catalogue vendeur
              </Button>
            </Link>
          }
        />
      ) : null}

      <StaggeredColumn className="grid gap-5 lg:grid-cols-2" step={55}>
        {(data ?? []).map((order) => (
          <article key={order.piece} className="app-surface px-6 py-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pièce</div>
                <h2 className="mt-1 text-xl font-extrabold tracking-tight text-card-foreground">{order.piece}</h2>
                <div className="mt-1 text-sm text-muted-foreground">{order.date ? new Date(order.date).toLocaleString("fr-FR") : "-"}</div>
              </div>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(order.status)}`}>{order.status || "-"}</span>
            </div>

            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div>
                <div className="text-muted-foreground">Client</div>
                <div className="font-semibold text-card-foreground">{order.customer?.displayName || order.clientCode}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Type</div>
                <div className="font-semibold text-card-foreground">{order.customer?.customerMode || "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Mode remise</div>
                <div className="font-semibold text-card-foreground">{safe(order.modeRemise || order.deliveryType)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Paiement</div>
                <div className="font-semibold text-card-foreground">{safe(order.paymentMethod)}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-muted-foreground">Dépôt</div>
                <div className="font-semibold text-card-foreground">
                  {order.depotIntitule || `Dépôt #${order.depotNo}`}
                  {order.depotCode ? ` (${order.depotCode})` : ""}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Net à payer</div>
                <div className="font-semibold text-primary">{money(order.netAPayer)}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link to={`/vendeur/orders/${encodeURIComponent(order.piece)}`}><Button type="button" variant="primary">Voir détail</Button></Link>
              <Link to="/vendeur/articles"><Button type="button" variant="outline">Nouvelle commande</Button></Link>
            </div>
          </article>
        ))}
      </StaggeredColumn>
    </div>
  );
}
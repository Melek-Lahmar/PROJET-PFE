import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "../../../shared/components/Button";
import { Loader } from "../../../shared/components/Loader";
import { getVendeurOrders, getVendeurFacturePdf } from "../api/vendeurApi";
import { openPdfBlob } from "../api/manifesteApi";
import type { VendeurOrderResponseDto } from "../types/vendeur";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";
import { EmptyView, PremiumHero } from "../../../shared/components/premium";

function money(v: number) {
  return `${Number(v ?? 0).toFixed(3)} TND`;
}

function safe(value?: string | null) {
  return value && value.trim() ? value : "—";
}

type StatusFilter = "all" | "livree" | "en-cours" | "retour";

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "Toutes" },
  { id: "livree", label: "Livrées" },
  { id: "en-cours", label: "En cours" },
  { id: "retour", label: "Retours" },
];

function matchesFilter(order: VendeurOrderResponseDto, filter: StatusFilter) {
  if (filter === "all") return true;
  const s = (order.status ?? "").toUpperCase();
  if (filter === "livree") return s.includes("LIVR");
  if (filter === "en-cours") return s.includes("LIVRAISON") || s.includes("COURS") || s.includes("DEPOT") || s.includes("CONFIRM");
  if (filter === "retour") return s.includes("RETOUR") || s.includes("REPORT");
  return true;
}

function statusBadge(status?: string | null) {
  const s = (status ?? "").toUpperCase();
  if (s.includes("LIVR") && !s.includes("LIVRAISON")) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
  if (s.includes("LIVRAISON")) return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
  if (s.includes("RETOUR") || s.includes("REPORT")) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
  if (s.includes("DEPOT")) return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
  return "bg-muted text-muted-foreground";
}

export function VendeurOrdersPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [printingPiece, setPrintingPiece] = useState<string | null>(null);

  const factureMut = useMutation({
    mutationFn: (piece: string) => getVendeurFacturePdf(piece),
    onSuccess: (blob, piece) => {
      openPdfBlob(blob, `facture-${piece}.pdf`);
      setPrintingPiece(null);
    },
    onError: () => setPrintingPiece(null),
  });

  const { data, isLoading, isError, error, refetch } = useQuery<VendeurOrderResponseDto[]>({
    queryKey: ["vendeur-orders"],
    queryFn: getVendeurOrders,
  });

  if (isLoading) return <Loader label="Chargement des commandes vendeur..." />;

  const filtered = (data ?? []).filter((o) => matchesFilter(o, filter));

  const countAll = (data ?? []).length;
  const counts: Record<StatusFilter, number> = {
    all: countAll,
    livree: (data ?? []).filter((o) => matchesFilter(o, "livree")).length,
    "en-cours": (data ?? []).filter((o) => matchesFilter(o, "en-cours")).length,
    retour: (data ?? []).filter((o) => matchesFilter(o, "retour")).length,
  };

  return (
    <div className="w-full space-y-6 pb-10">
      <PremiumHero
        kicker="Espace vendeur"
        title="Commandes saisies"
        description="Historique des commandes créées par le vendeur connecté."
        actions={
          <>
            <Button type="button" variant="primary" onClick={() => navigate("/vendeur/articles")}>
              + Nouvelle commande
            </Button>
            <Button type="button" variant="outline" onClick={() => refetch()}>
              Actualiser
            </Button>
          </>
        }
      />

      {isError && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {getApiErrorMessage(error)}
        </div>
      )}

      {/* Onglets filtre statut */}
      <div className="flex gap-1 rounded-2xl border border-border bg-muted/30 p-1">
        {STATUS_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              filter === t.id
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                filter === t.id ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
              }`}
            >
              {counts[t.id]}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 && !isError ? (
        <EmptyView
          title={filter === "all" ? "Aucune commande vendeur" : `Aucune commande (${STATUS_TABS.find(t => t.id === filter)?.label})`}
          description="Commencez par créer une première commande depuis le catalogue vendeur."
          iconPath="M3 3h2l.4 2 M7 13h10l4-8H5.4 M7 13 5.4 5 M7 13l-2 7h13"
          action={
            <Button type="button" variant="primary" className="h-11 rounded-2xl px-5"
              onClick={() => navigate("/vendeur/articles")}>
              Aller au catalogue
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {/* Header tableau */}
          <div className="grid grid-cols-12 gap-3 border-b border-border bg-muted/40 px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            <div className="col-span-2">Pièce</div>
            <div className="col-span-3">Client</div>
            <div className="col-span-2">Dépôt</div>
            <div className="col-span-1">Date</div>
            <div className="col-span-1 text-right">Statut</div>
            <div className="col-span-1 text-right">Net TND</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {filtered.map((order) => {
            const isPrinting = factureMut.isPending && printingPiece === order.piece;
            return (
              <div
                key={order.piece}
                className="grid grid-cols-12 items-center gap-3 border-b border-border/40 px-5 py-4 transition hover:bg-muted/20 last:border-0"
              >
                <div className="col-span-2">
                  <span className="rounded-xl border border-border bg-card px-2.5 py-1 font-mono text-xs font-bold">
                    {order.piece}
                  </span>
                </div>
                <div className="col-span-3 min-w-0">
                  <div className="truncate text-sm font-semibold text-card-foreground">
                    {order.customer?.displayName || order.clientCode || "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">{order.customer?.customerMode || ""}</div>
                </div>
                <div className="col-span-2 truncate text-sm text-muted-foreground">
                  {order.depotIntitule || `Dépôt #${order.depotNo}`}
                </div>
                <div className="col-span-1 text-sm text-muted-foreground">
                  {order.date ? new Date(order.date).toLocaleDateString("fr-FR") : "—"}
                </div>
                <div className="col-span-1 text-right">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${statusBadge(order.status)}`}>
                    {safe(order.status)}
                  </span>
                </div>
                <div className="col-span-1 text-right text-sm font-bold text-card-foreground">
                  {money(order.netAPayer)}
                </div>
                <div className="col-span-2 flex items-center justify-end gap-1.5">
                  {/* Bouton Facture PDF */}
                  <button
                    onClick={() => {
                      setPrintingPiece(order.piece);
                      factureMut.mutate(order.piece);
                    }}
                    disabled={isPrinting}
                    title="Imprimer la facture"
                    className="flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/10 disabled:opacity-50"
                  >
                    {isPrinting ? (
                      <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                    ) : (
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
                      </svg>
                    )}
                    Facture
                  </button>
                  {/* Bouton Voir détail */}
                  <Link to={`/vendeur/orders/${encodeURIComponent(order.piece)}`}>
                    <button className="rounded-lg bg-primary px-2.5 py-1.5 text-xs font-bold text-primary-foreground transition hover:bg-primary/90">
                      Voir
                    </button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

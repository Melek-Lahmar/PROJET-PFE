import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminGetOrderByPiece, adminListOrders } from "../api/adminBackofficeApi";
import { AdminSegmentedTabs, type SegmentedTab } from "../components/AdminSegmentedTabs";
import { AdminOrderDetailPanel } from "../components/AdminOrderDetailPanel";
import type { AdminOrderSummary, OrderBucket } from "../types/adminBackoffice";
import { Input } from "../../../shared/components/Input";
import { Loader } from "../../../shared/components/Loader";
import { Button } from "../../../shared/components/Button";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";
import {
  EmptyView,
  PremiumHero,
} from "../../../shared/components/premium";

function safe(value?: string | null) {
  return value && value.trim() ? value : "-";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("fr-FR");
}

function money(value: number) {
  return `${Number(value ?? 0).toFixed(3)} TND`;
}

function normalizeList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const candidates = [
      record.items,
      record.data,
      record.results,
      record.value,
      record.orders,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate as T[];
    }
  }

  return [];
}

function normalizeObject<T>(value: unknown): T | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  const candidates = [
    record.item,
    record.data,
    record.result,
    record.order,
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      return candidate as T;
    }
  }

  return value as T;
}

function statusBadgeClass(status?: string | null) {
  const normalized = (status ?? "").toUpperCase();
  if (normalized.includes("EN_ATTENTE")) return "badge-warning";
  if (normalized.includes("REFUS")) return "badge-danger";
  if (normalized.includes("TENT")) return "badge-info";
  if (normalized.includes("CONFIRM")) return "badge-success";
  return "badge-neutral";
}

function matchesOrder(item: AdminOrderSummary, term: string) {
  const haystack = [
    item.piece,
    item.clientDisplay,
    item.clientCode,
    item.clientType,
    item.status,
    item.deliveryType,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(term);
}

const TABS: Array<SegmentedTab<OrderBucket>> = [
  { key: "TENTATIVE", label: "Tentative" },
  { key: "REFUSEE", label: "Refusée" },
  { key: "CONFIRMED_BL", label: "Confirmée (BL)" },
  { key: "EN_ATTENTE", label: "En attente" },
];

export function AdminOrdersPage() {
  const [bucket, setBucket] = useState<OrderBucket>("EN_ATTENTE");
  const [search, setSearch] = useState("");
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ["admin-orders", bucket],
    queryFn: () => adminListOrders(bucket),
  });

  const orders = useMemo(() => normalizeList<AdminOrderSummary>(listQuery.data), [listQuery.data]);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter((item) => matchesOrder(item, term));
  }, [orders, search]);

  useEffect(() => {
    if (!filteredOrders.length) {
      setSelectedPiece(null);
      return;
    }

    if (!selectedPiece || !filteredOrders.some((item) => item.piece === selectedPiece)) {
      setSelectedPiece(filteredOrders[0].piece);
    }
  }, [filteredOrders, selectedPiece]);

  const detailQuery = useQuery({
    queryKey: ["admin-order-detail", selectedPiece],
    queryFn: () => adminGetOrderByPiece(selectedPiece as string),
    enabled: !!selectedPiece,
  });

  const orderDetail = useMemo(() => normalizeObject<any>(detailQuery.data), [detailQuery.data]);

  if (listQuery.isLoading) return <Loader label="Chargement des commandes admin..." />;

  if (listQuery.isError) {
    return (
      <div className="container-app space-y-6 py-8">
        <PremiumHero kicker="Administration" title="Gestion des commandes" />
        <EmptyView
          title="Erreur de chargement"
          description={getApiErrorMessage(listQuery.error)}
          iconPath="M12 9v4 M12 17h.01 M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
        />
      </div>
    );
  }

  return (
    <div className="container-app space-y-6 py-8">
      <PremiumHero
        kicker="Administration"
        title="Gestion des commandes"
        description="Suivez les commandes par statut métier : Tentative, Refusée, Confirmée (BL) et En attente, puis consultez le détail complet de chaque document."
      />

      <section className="app-surface overflow-hidden p-0">
        <div className="space-y-4 px-7 py-6">
          <AdminSegmentedTabs tabs={TABS} value={bucket} onChange={setBucket} />
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <label className="mb-2 block app-kicker">Recherche</label>
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="N° pièce, client, code client, statut..." />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => listQuery.refetch()}>
                Actualiser
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="app-surface overflow-hidden p-0">
          <div className="border-b border-border/70 px-6 py-5">
            <div className="app-kicker">Liste filtrée</div>
            <h2 className="mt-1 text-xl font-black text-card-foreground">Commandes</h2>
          </div>

          <div className="max-h-[76vh] overflow-y-auto">
            {filteredOrders.length === 0 ? (
              <div className="px-6 py-6">
                <EmptyView
                  title="Aucune commande"
                  description="Aucun document ne correspond à ce statut ni à votre recherche."
                  iconPath="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8"
                />
              </div>
            ) : (
              filteredOrders.map((order) => {
                const active = order.piece === selectedPiece;

                return (
                  <button
                    key={order.piece}
                    type="button"
                    onClick={() => setSelectedPiece(order.piece)}
                    className={`block w-full border-t border-border/60 px-6 py-5 text-left transition ${
                      active ? "bg-primary/6" : "hover:bg-accent/45"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-base font-black text-card-foreground">{safe(order.piece)}</div>
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${statusBadgeClass(order.status)}`}
                          >
                            {safe(order.status)}
                          </span>
                          <span className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold badge-neutral">
                            {safe(order.documentKind)}
                          </span>
                        </div>

                        <div className="text-sm text-muted-foreground">
                          {safe(order.clientDisplay)} • {safe(order.clientType)}
                        </div>

                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>{safe(order.deliveryType)}</span>
                          <span>cbCreation : {formatDate(order.cbCreation)}</span>
                          <span>cbModification : {formatDate(order.cbModification)}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Total TTC</div>
                        <div className="text-sm font-black text-card-foreground">{money(Number(order.totalTTC ?? 0))}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {Number(order.lineCount ?? 0)} ligne{Number(order.lineCount ?? 0) > 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="app-surface overflow-hidden p-0">
          <div className="border-b border-border/70 px-6 py-5">
            <div className="app-kicker">Détail</div>
            <h2 className="mt-1 text-xl font-black text-card-foreground">Commande sélectionnée</h2>
          </div>

          <div className="p-6">
            {detailQuery.isLoading && selectedPiece ? (
              <Loader label="Chargement du détail..." />
            ) : detailQuery.isError ? (
              <div className="rounded-[22px] border border-danger/20 bg-danger/5 px-4 py-4 text-sm text-rose-700">
                {getApiErrorMessage(detailQuery.error)}
              </div>
            ) : orderDetail ? (
              <AdminOrderDetailPanel order={orderDetail} />
            ) : (
              <div className="text-sm text-muted-foreground">Sélectionnez une commande pour afficher son détail.</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
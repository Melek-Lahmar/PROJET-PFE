import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminGetClientById, adminGetClientOrders, adminGetOrderByPiece, adminListClients } from "../api/adminBackofficeApi";
import { AdminSegmentedTabs, type SegmentedTab } from "../components/AdminSegmentedTabs";
import { AdminOrderDetailPanel } from "../components/AdminOrderDetailPanel";
import type { AdminClientListItem, ClientKind } from "../types/adminBackoffice";
import { Input } from "../../../shared/components/Input";
import { Loader } from "../../../shared/components/Loader";
import { Button } from "../../../shared/components/Button";
import { Modal } from "../../../shared/components/Modal";
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
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("fr-FR");
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
      record.clients,
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
    record.client,
    record.order,
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      return candidate as T;
    }
  }

  return value as T;
}

function matchesClient(item: AdminClientListItem, term: string) {
  const haystack = [
    item.displayName,
    item.email,
    item.telephone,
    item.adresse,
    item.ville,
    item.gouvernorat,
    item.typeClient,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(term);
}

const TABS: Array<SegmentedTab<ClientKind>> = [
  { key: "ALL", label: "All" },
  { key: "B2B", label: "Client B2B" },
  { key: "B2C", label: "Client B2C" },
];

export function AdminClientsPage() {
  const [kind, setKind] = useState<ClientKind>("ALL");
  const [search, setSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedOrderPiece, setSelectedOrderPiece] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ["admin-clients", kind],
    queryFn: () => adminListClients(kind),
  });

  const clients = useMemo(() => normalizeList<AdminClientListItem>(listQuery.data), [listQuery.data]);

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter((item) => matchesClient(item, term));
  }, [clients, search]);

  useEffect(() => {
    if (!filteredClients.length) {
      setSelectedClientId(null);
      return;
    }

    if (!selectedClientId || !filteredClients.some((item) => item.userId === selectedClientId)) {
      setSelectedClientId(filteredClients[0].userId);
    }
  }, [filteredClients, selectedClientId]);

  useEffect(() => {
    setSelectedOrderPiece(null);
  }, [selectedClientId]);

  const detailQuery = useQuery({
    queryKey: ["admin-client-detail", selectedClientId],
    queryFn: () => adminGetClientById(selectedClientId as string),
    enabled: !!selectedClientId,
  });

  const ordersQuery = useQuery({
    queryKey: ["admin-client-orders", selectedClientId],
    queryFn: () => adminGetClientOrders(selectedClientId as string),
    enabled: !!selectedClientId,
  });

  const orderDetailQuery = useQuery({
    queryKey: ["admin-order-detail", selectedOrderPiece],
    queryFn: () => adminGetOrderByPiece(selectedOrderPiece as string),
    enabled: !!selectedOrderPiece,
  });

  const clientDetail = useMemo(() => normalizeObject<any>(detailQuery.data), [detailQuery.data]);
  const clientOrders = useMemo(() => normalizeList<any>(ordersQuery.data), [ordersQuery.data]);
  const orderDetail = useMemo(() => normalizeObject<any>(orderDetailQuery.data), [orderDetailQuery.data]);

  if (listQuery.isLoading) return <Loader label="Chargement des clients..." />;

  if (listQuery.isError) {
    return (
      <div className="container-app space-y-6 py-8">
        <PremiumHero kicker="Administration" title="Gestion des clients" />
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
        title="Gestion des clients"
        description="Consultez la base clients, naviguez entre les profils B2B et B2C, puis accédez au détail du client et à son historique de commandes."
      />

      <section className="app-surface overflow-hidden p-0">
        <div className="space-y-4 px-7 py-6">
          <AdminSegmentedTabs tabs={TABS} value={kind} onChange={setKind} />
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <label className="mb-2 block app-kicker">Recherche</label>
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom, société, email, téléphone..." />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => listQuery.refetch()}>
                Actualiser
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="app-surface overflow-hidden p-0">
          <div className="border-b border-border/70 px-6 py-5">
            <div className="app-kicker">Liste</div>
            <h2 className="mt-1 text-xl font-black text-card-foreground">Clients visibles</h2>
          </div>

          <div className="max-h-[72vh] overflow-y-auto">
            {filteredClients.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                Aucun client ne correspond au filtre sélectionné.
              </div>
            ) : (
              filteredClients.map((client) => {
                const selected = client.userId === selectedClientId;

                return (
                  <button
                    key={client.userId}
                    type="button"
                    onClick={() => setSelectedClientId(client.userId)}
                    className={`block w-full border-t border-border/60 px-6 py-5 text-left transition ${
                      selected ? "bg-primary/6" : "hover:bg-accent/45"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-base font-black text-card-foreground">{safe(client.displayName)}</div>
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${
                              client.typeClient === "B2B" ? "badge-info" : "badge-neutral"
                            }`}
                          >
                            {safe(client.typeClient)}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${
                              client.isActive ? "badge-success" : "badge-danger"
                            }`}
                          >
                            {client.isActive ? "Actif" : "Bloqué"}
                          </span>
                        </div>

                        <div className="text-sm text-muted-foreground">{safe(client.email)}</div>

                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>Tél : {safe(client.telephone)}</span>
                          <span>Ville : {safe(client.ville)}</span>
                          <span>Commandes : {client.orderCount ?? 0}</span>
                        </div>
                      </div>

                      <div className="text-right text-xs text-muted-foreground">{formatDate(client.dateCreation)}</div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="app-surface overflow-hidden p-0">
            <div className="border-b border-border/70 px-6 py-5">
              <div className="app-kicker">Détail client</div>
              <h2 className="mt-1 text-xl font-black text-card-foreground">Profil sélectionné</h2>
            </div>

            <div className="p-6">
              {detailQuery.isLoading && selectedClientId ? (
                <Loader label="Chargement du détail client..." />
              ) : detailQuery.isError ? (
                <div className="rounded-[22px] border border-danger/20 bg-danger/5 px-4 py-4 text-sm text-rose-700">
                  {getApiErrorMessage(detailQuery.error)}
                </div>
              ) : clientDetail ? (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-black text-card-foreground">
                      {safe(clientDetail.typeClient === "B2B" ? clientDetail.nomSociete : clientDetail.nomComplet)}
                    </h3>
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${
                        clientDetail.typeClient === "B2B" ? "badge-info" : "badge-neutral"
                      }`}
                    >
                      {safe(clientDetail.typeClient)}
                    </span>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="app-surface-soft p-4">
                      <div className="app-kicker">Coordonnées</div>
                      <div className="mt-3 space-y-2 text-sm">
                        <div><span className="text-muted-foreground">Email :</span> <span className="font-semibold text-card-foreground">{safe(clientDetail.email)}</span></div>
                        <div><span className="text-muted-foreground">Téléphone :</span> <span className="font-semibold text-card-foreground">{safe(clientDetail.telephone)}</span></div>
                        <div><span className="text-muted-foreground">Adresse :</span> <span className="font-semibold text-card-foreground">{safe(clientDetail.adresse)}</span></div>
                        <div><span className="text-muted-foreground">Ville :</span> <span className="font-semibold text-card-foreground">{safe(clientDetail.delegation ?? clientDetail.ville)}</span></div>
                        <div><span className="text-muted-foreground">Gouvernorat :</span> <span className="font-semibold text-card-foreground">{safe(clientDetail.gouvernorat)}</span></div>
                      </div>
                    </div>

                    <div className="app-surface-soft p-4">
                      <div className="app-kicker">Informations métier</div>
                      <div className="mt-3 space-y-2 text-sm">
                        {clientDetail.typeClient === "B2B" ? (
                          <>
                            <div><span className="text-muted-foreground">Raison sociale :</span> <span className="font-semibold text-card-foreground">{safe(clientDetail.nomSociete)}</span></div>
                            <div><span className="text-muted-foreground">ICE / IF :</span> <span className="font-semibold text-card-foreground">{safe(clientDetail.matriculeFiscal)}</span></div>
                            <div><span className="text-muted-foreground">RC :</span> <span className="font-semibold text-card-foreground">{safe(clientDetail.registreCommerce)}</span></div>
                            <div><span className="text-muted-foreground">TVA :</span> <span className="font-semibold text-card-foreground">{safe(clientDetail.numeroTVA)}</span></div>
                          </>
                        ) : (
                          <>
                            <div><span className="text-muted-foreground">Nom complet :</span> <span className="font-semibold text-card-foreground">{safe(clientDetail.nomComplet)}</span></div>
                            <div><span className="text-muted-foreground">CIN :</span> <span className="font-semibold text-card-foreground">{safe(clientDetail.cin)}</span></div>
                            <div><span className="text-muted-foreground">Date naissance :</span> <span className="font-semibold text-card-foreground">{formatDate(clientDetail.dateNaissance)}</span></div>
                          </>
                        )}
                        <div><span className="text-muted-foreground">Créé le :</span> <span className="font-semibold text-card-foreground">{formatDate(clientDetail.dateCreation)}</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="app-surface-soft p-0">
                    <div className="border-b border-border/70 px-5 py-4">
                      <div className="app-kicker">Historique</div>
                      <h4 className="mt-1 text-lg font-black text-card-foreground">Commandes du client</h4>
                    </div>

                    <div className="divide-y divide-border/60">
                      {ordersQuery.isLoading ? (
                        <div className="px-5 py-6 text-sm text-muted-foreground">Chargement des commandes...</div>
                      ) : ordersQuery.isError ? (
                        <div className="px-5 py-6 text-sm text-rose-700">{getApiErrorMessage(ordersQuery.error)}</div>
                      ) : clientOrders.length === 0 ? (
                        <div className="px-5 py-6 text-sm text-muted-foreground">Aucune commande trouvée pour ce client.</div>
                      ) : (
                        clientOrders.map((order) => (
                          <button
                            key={order.piece}
                            type="button"
                            onClick={() => setSelectedOrderPiece(order.piece)}
                            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-accent/35"
                          >
                            <div className="space-y-1">
                              <div className="font-bold text-card-foreground">{safe(order.piece)}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatDate(order.date)} • {safe(order.status)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">{safe(order.documentKind)}</div>
                              <div className="text-sm font-black text-primary">{money(Number(order.netAPayer ?? 0))}</div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Sélectionnez un client pour afficher son détail.</div>
              )}
            </div>
          </div>
        </div>
      </section>

      <Modal
        open={!!selectedOrderPiece}
        title={selectedOrderPiece ? `Commande ${selectedOrderPiece}` : "Détail commande"}
        onClose={() => setSelectedOrderPiece(null)}
      >
        {orderDetailQuery.isLoading && selectedOrderPiece ? (
          <Loader label="Chargement du détail commande..." />
        ) : orderDetailQuery.isError ? (
          <div className="rounded-[22px] border border-danger/20 bg-danger/5 px-4 py-4 text-sm text-rose-700">
            {getApiErrorMessage(orderDetailQuery.error)}
          </div>
        ) : orderDetail ? (
          <AdminOrderDetailPanel order={orderDetail} />
        ) : null}
      </Modal>
    </div>
  );
}
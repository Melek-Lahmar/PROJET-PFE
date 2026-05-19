import { useMemo, useState } from "react";
import { Button } from "../../../../shared/components/Button";
import { Input } from "../../../../shared/components/Input";
import type { DepotDto } from "../../../catalog/api/depotsApi";
import {
  type HomepageSection,
  type HomepageStoreItem,
  type HomepageStoresPayload,
  createLocalId,
} from "../../types/homepage";
import {
  AdminField,
  AdminSectionShell,
  AdminTextarea,
  CtaFieldsEditor,
  ItemToolbar,
  AdminToggle,
} from "./HomepageAdminPrimitives";

function createStoreItem(order: number, depotNo: number): HomepageStoreItem {
  return {
    id: createLocalId("store"),
    depotNo,
    label: "",
    description: "",
    targetHref: "/contact",
    displayOrder: order,
    isActive: true,
    resolvedStore: null,
  };
}

function getSafePayload(payload: Partial<HomepageStoresPayload> | undefined): HomepageStoresPayload {
  return {
    title: payload?.title ?? "",
    subtitle: payload?.subtitle ?? "",
    description: payload?.description ?? "",
    selectionMode: "manual",
    displayMode: payload?.displayMode ?? "grid",
    maxItems: typeof payload?.maxItems === "number" ? payload.maxItems : 6,
    viewAllCta: payload?.viewAllCta ?? { text: "Nous contacter", href: "/contact" },
    depotNos: payload?.depotNos ?? [],
    items: payload?.items ?? [],
  };
}

export function HomepageStoresEditor({
  section,
  depots,
  onChange,
}: {
  section: HomepageSection;
  depots: DepotDto[];
  onChange: (section: HomepageSection) => void;
}) {
  const rawPayload = section.payload as Partial<HomepageStoresPayload>;
  const payload = getSafePayload(rawPayload);
  const [search, setSearch] = useState("");

  const availableDepots = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return depots
      .filter((depot) => !payload.depotNos.includes(depot.dE_No))
      .filter((depot) => {
        if (!keyword) return true;
        return [depot.dE_Intitule, depot.dE_Code, depot.dE_Ville, depot.dE_Adresse]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      })
      .slice(0, 20);
  }, [depots, payload.depotNos, search]);

  const selectedItems = payload.items;

  const setPayload = (next: HomepageStoresPayload) =>
    onChange({ ...section, payload: next });

  return (
    <div className="space-y-4">
      <AdminSectionShell
        title="Nos magasins / dépôts"
        subtitle="Basé sur les vraies données dépôts du système existant."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AdminField label="Titre">
            <Input
              value={payload.title ?? ""}
              onChange={(e) => setPayload({ ...payload, title: e.target.value })}
            />
          </AdminField>
          <AdminField label="Sous-titre">
            <Input
              value={payload.subtitle ?? ""}
              onChange={(e) => setPayload({ ...payload, subtitle: e.target.value })}
            />
          </AdminField>
          <AdminField label="Nombre maximum">
            <Input
              type="number"
              min="1"
              max="12"
              value={payload.maxItems}
              onChange={(e) =>
                setPayload({ ...payload, maxItems: Number(e.target.value || 6) })
              }
            />
          </AdminField>
        </div>

        <AdminField label="Description">
          <AdminTextarea
            value={payload.description ?? ""}
            onChange={(e) => setPayload({ ...payload, description: e.target.value })}
          />
        </AdminField>

        <div className="grid gap-4 md:grid-cols-2">
          <AdminField label="Mode d’affichage">
            <select
              className="h-11 w-full rounded-2xl border border-border bg-[hsl(var(--input))] px-4 text-sm text-card-foreground outline-none transition focus:border-primary/45 focus:ring-4 focus:ring-primary/10"
              value={payload.displayMode}
              onChange={(e) =>
                setPayload({
                  ...payload,
                  displayMode: e.target.value as HomepageStoresPayload["displayMode"],
                })
              }
            >
              <option value="grid">Grille</option>
              <option value="slider">Slider</option>
            </select>
          </AdminField>

          <CtaFieldsEditor
            label="CTA “Voir plus”"
            value={payload.viewAllCta}
            onChange={(viewAllCta) => setPayload({ ...payload, viewAllCta })}
          />
        </div>
      </AdminSectionShell>

      <AdminSectionShell
        title="Magasins sélectionnés"
        subtitle="Tu peux sélectionner, réordonner et personnaliser chaque carte dépôt."
      >
        {selectedItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-card px-4 py-6 text-sm text-muted-foreground">
            Aucun dépôt sélectionné.
          </div>
        ) : (
          <div className="space-y-4">
            {selectedItems.map((item, index) => {
              const depot = depots.find((entry) => entry.dE_No === item.depotNo);
              const title = item.label || depot?.dE_Intitule || `Dépôt ${item.depotNo}`;

              const updateItem = (nextItem: HomepageStoreItem) => {
                const nextItems = selectedItems.map((entry) =>
                  entry.id === item.id ? nextItem : entry,
                );
                setPayload({
                  ...payload,
                  items: nextItems.map((entry, order) => ({
                    ...entry,
                    displayOrder: order + 1,
                  })),
                });
              };

              return (
                <AdminSectionShell
                  key={item.id}
                  title={title}
                  subtitle={`Dépôt #${item.depotNo}${depot?.dE_Code ? ` • ${depot.dE_Code}` : ""}`}
                  actions={
                    <ItemToolbar
                      onMoveUp={() => {
                        const next = [...selectedItems];
                        [next[index - 1], next[index]] = [next[index], next[index - 1]];
                        setPayload({
                          ...payload,
                          items: next.map((entry, order) => ({
                            ...entry,
                            displayOrder: order + 1,
                          })),
                        });
                      }}
                      onMoveDown={() => {
                        const next = [...selectedItems];
                        [next[index + 1], next[index]] = [next[index], next[index + 1]];
                        setPayload({
                          ...payload,
                          items: next.map((entry, order) => ({
                            ...entry,
                            displayOrder: order + 1,
                          })),
                        });
                      }}
                      onDelete={() =>
                        setPayload({
                          ...payload,
                          depotNos: payload.depotNos.filter(
                            (depotNo) => depotNo !== item.depotNo,
                          ),
                          items: selectedItems
                            .filter((entry) => entry.id !== item.id)
                            .map((entry, order) => ({
                              ...entry,
                              displayOrder: order + 1,
                            })),
                        })
                      }
                      disableUp={index === 0}
                      disableDown={index === selectedItems.length - 1}
                    />
                  }
                >
                  <div className="flex flex-wrap gap-3">
                    <AdminToggle
                      label="Carte active"
                      checked={item.isActive}
                      onChange={(isActive) => updateItem({ ...item, isActive })}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <AdminField label="Nom affiché">
                      <Input
                        value={item.label ?? ""}
                        onChange={(e) => updateItem({ ...item, label: e.target.value })}
                        placeholder={depot?.dE_Intitule ?? "Nom affiché"}
                      />
                    </AdminField>
                    <AdminField label="Lien cible">
                      <Input
                        value={item.targetHref ?? ""}
                        onChange={(e) =>
                          updateItem({ ...item, targetHref: e.target.value })
                        }
                        placeholder="/contact"
                      />
                    </AdminField>
                  </div>

                  <AdminField label="Texte complémentaire">
                    <AdminTextarea
                      value={item.description ?? ""}
                      onChange={(e) =>
                        updateItem({ ...item, description: e.target.value })
                      }
                      placeholder="Ex: retrait rapide, magasin principal, horaires étendus..."
                    />
                  </AdminField>
                </AdminSectionShell>
              );
            })}
          </div>
        )}
      </AdminSectionShell>

      <AdminSectionShell
        title="Ajouter des dépôts"
        subtitle="Sélectionne les magasins à mettre en avant sur la homepage."
      >
        <AdminField label="Recherche">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, code, ville..."
          />
        </AdminField>

        <div className="grid gap-3 md:grid-cols-2">
          {availableDepots.map((depot) => (
            <div
              key={depot.dE_No}
              className="rounded-2xl border border-border/70 bg-card px-4 py-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-card-foreground">
                    {depot.dE_Intitule}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {depot.dE_Code}
                    {depot.dE_Ville ? ` • ${depot.dE_Ville}` : ""}
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setPayload({
                      ...payload,
                      depotNos: [...payload.depotNos, depot.dE_No],
                      items: [
                        ...payload.items,
                        createStoreItem(payload.items.length + 1, depot.dE_No),
                      ],
                    })
                  }
                >
                  Ajouter
                </Button>
              </div>
            </div>
          ))}
        </div>
      </AdminSectionShell>
    </div>
  );
}
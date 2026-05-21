import { useMemo, useState } from "react";
import { Button } from "../../../../shared/components/Button";
import { Input } from "../../../../shared/components/Input";
import type { Catalogue } from "../../../catalog/types/catalogue";
import {
  type HomepageCataloguesPayload,
  type HomepageCatalogueSpotlightItem,
  type HomepageFeaturedCategoriesPayload,
  type HomepageFeaturedCategoryItem,
  type HomepageSection,
  createDefaultHomepageImage,
  createLocalId,
} from "../../types/homepage";
import {
  AdminField,
  AdminSectionShell,
  AdminTextarea,
  CtaFieldsEditor,
  ImageFieldsEditor,
  ItemToolbar,
  AdminToggle,
} from "./HomepageAdminPrimitives";

function createCatalogueCard(
  order: number,
  catalogueNo: number,
): HomepageCatalogueSpotlightItem {
  return {
    id: createLocalId("catalogue"),
    catalogueNo,
    label: "",
    description: "",
    badgeText: order === 1 ? "À explorer" : "",
    image: createDefaultHomepageImage(),
    targetHref: `/articles?catalogueNo=${catalogueNo}`,
    displayOrder: order,
    isActive: true,
    resolvedCatalogue: null,
  };
}

function createFeaturedCategoryCard(
  order: number,
  catalogueNo: number,
): HomepageFeaturedCategoryItem {
  return {
    id: createLocalId("cat"),
    catalogueNo,
    label: "",
    description: "",
    image: createDefaultHomepageImage(),
    targetHref: `/articles?catalogueNo=${catalogueNo}`,
    displayOrder: order,
    isActive: true,
    resolvedCatalogue: null,
  };
}

function getSafePremiumPayload(
  payload: Partial<HomepageCataloguesPayload> | undefined,
): HomepageCataloguesPayload {
  return {
    title: payload?.title ?? "",
    subtitle: payload?.subtitle ?? "",
    description: payload?.description ?? "",
    displayMode: payload?.displayMode ?? "grid",
    maxItems: typeof payload?.maxItems === "number" ? payload.maxItems : 8,
    viewAllCta: payload?.viewAllCta ?? { text: "Voir tous les catalogues", href: "/articles" },
    catalogueNos: payload?.catalogueNos ?? [],
    items: payload?.items ?? [],
    resolvedCatalogues: payload?.resolvedCatalogues ?? [],
  };
}

function getSafeFeaturedCategoriesPayload(
  payload: Partial<HomepageFeaturedCategoriesPayload> | undefined,
): HomepageFeaturedCategoriesPayload {
  return {
    title: payload?.title ?? "",
    subtitle: payload?.subtitle ?? "",
    displayMode: payload?.displayMode ?? "grid",
    maxItems: typeof payload?.maxItems === "number" ? payload.maxItems : 8,
    items: payload?.items ?? [],
  };
}

export function HomepageFeaturedCataloguesEditor({
  section,
  catalogues,
  onChange,
}: {
  section: HomepageSection;
  catalogues: Catalogue[];
  onChange: (section: HomepageSection) => void;
}) {
  const [search, setSearch] = useState("");
  const isPremiumCatalogues = section.type === "catalogues";

  const premiumPayload = getSafePremiumPayload(section.payload as Partial<HomepageCataloguesPayload>);
  const categoryPayload = getSafeFeaturedCategoriesPayload(
    section.payload as Partial<HomepageFeaturedCategoriesPayload>,
  );

  const payload = isPremiumCatalogues ? premiumPayload : categoryPayload;

  const selectedCatalogueNos = useMemo(
    () =>
      isPremiumCatalogues
        ? premiumPayload.catalogueNos
        : categoryPayload.items.map((item) => item.catalogueNo),
    [categoryPayload.items, isPremiumCatalogues, premiumPayload.catalogueNos],
  );

  const availableCatalogues = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return catalogues
      .filter((catalogue) => !selectedCatalogueNos.includes(catalogue.cL_No))
      .filter((catalogue) => {
        if (!keyword) return true;
        return [catalogue.cL_Intitule, catalogue.cL_Code, String(catalogue.cL_No)]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      })
      .slice(0, 20);
  }, [catalogues, search, selectedCatalogueNos]);

  const selectedCards = isPremiumCatalogues ? premiumPayload.items : categoryPayload.items;

  const setPremiumPayload = (next: HomepageCataloguesPayload) =>
    onChange({ ...section, payload: next });

  const setCategoryPayload = (next: HomepageFeaturedCategoriesPayload) =>
    onChange({ ...section, payload: next });

  const addCatalogue = (catalogueNo: number) => {
    if (isPremiumCatalogues) {
      setPremiumPayload({
        ...premiumPayload,
        catalogueNos: [...premiumPayload.catalogueNos, catalogueNo],
        items: [
          ...premiumPayload.items,
          createCatalogueCard(premiumPayload.items.length + 1, catalogueNo),
        ],
      });
      return;
    }

    setCategoryPayload({
      ...categoryPayload,
      items: [
        ...categoryPayload.items,
        createFeaturedCategoryCard(categoryPayload.items.length + 1, catalogueNo),
      ],
    });
  };

  return (
    <div className="space-y-4">
      <AdminSectionShell
        title={isPremiumCatalogues ? "Catalogues / univers" : "Catégories mises en avant"}
        subtitle="Basé sur les vrais catalogues du projet, avec habillage éditorial optionnel."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AdminField label="Titre">
            <Input
              value={payload.title ?? ""}
              onChange={(e) =>
                onChange({ ...section, payload: { ...payload, title: e.target.value } })
              }
            />
          </AdminField>
          <AdminField label="Sous-titre">
            <Input
              value={payload.subtitle ?? ""}
              onChange={(e) =>
                onChange({ ...section, payload: { ...payload, subtitle: e.target.value } })
              }
            />
          </AdminField>
          <AdminField label="Nombre maximum">
            <Input
              type="number"
              min="1"
              max="12"
              value={payload.maxItems}
              onChange={(e) =>
                onChange({
                  ...section,
                  payload: { ...payload, maxItems: Number(e.target.value || 8) },
                })
              }
            />
          </AdminField>
        </div>

        {isPremiumCatalogues ? (
  <AdminField label="Description">
    <AdminTextarea
      value={premiumPayload.description ?? ""}
      onChange={(e) =>
        setPremiumPayload({
          ...premiumPayload,
          description: e.target.value,
        })
      }
    />
  </AdminField>
) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <AdminField label="Mode d’affichage">
            <select
              className="h-11 w-full rounded-2xl border border-border bg-[hsl(var(--input))] px-4 text-sm text-card-foreground outline-none transition focus:border-primary/45 focus:ring-4 focus:ring-primary/10"
              value={payload.displayMode}
              onChange={(e) =>
                onChange({
                  ...section,
                  payload: { ...payload, displayMode: e.target.value as typeof payload.displayMode },
                })
              }
            >
              <option value="grid">Grille</option>
              <option value="slider">Carrousel</option>
            </select>
          </AdminField>

          {isPremiumCatalogues ? (
            <CtaFieldsEditor
              label="Bouton « Voir tout »"
              value={premiumPayload.viewAllCta}
              onChange={(viewAllCta) => setPremiumPayload({ ...premiumPayload, viewAllCta })}
            />
          ) : null}
        </div>
      </AdminSectionShell>

      <AdminSectionShell
        title="Catalogues sélectionnés"
        subtitle="Tu peux réordonner et enrichir chaque carte."
      >
        {selectedCards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-card px-4 py-6 text-sm text-muted-foreground">
            Aucun catalogue sélectionné.
          </div>
        ) : (
          <div className="space-y-4">
            {selectedCards.map((item, index) => {
              const catalogue = catalogues.find((entry) => entry.cL_No === item.catalogueNo);
              const title = item.label || catalogue?.cL_Intitule || `Catalogue ${item.catalogueNo}`;

              const updateItem = (
                nextItem: HomepageCatalogueSpotlightItem | HomepageFeaturedCategoryItem,
              ) => {
                const nextItems = selectedCards.map((entry) =>
                  entry.id === item.id ? nextItem : entry,
                );

                onChange({
                  ...section,
                  payload: {
                    ...payload,
                    items: nextItems.map((entry, order) => ({
                      ...entry,
                      displayOrder: order + 1,
                    })),
                  },
                });
              };

              return (
                <AdminSectionShell
                  key={item.id}
                  title={title}
                  subtitle={`Catalogue #${item.catalogueNo}${catalogue?.cL_Code ? ` • ${catalogue.cL_Code}` : ""}`}
                  actions={
                    <ItemToolbar
                      onMoveUp={() => {
                        const next = [...selectedCards];
                        [next[index - 1], next[index]] = [next[index], next[index - 1]];
                        onChange({
                          ...section,
                          payload: {
                            ...payload,
                            items: next.map((entry, order) => ({
                              ...entry,
                              displayOrder: order + 1,
                            })),
                          },
                        });
                      }}
                      onMoveDown={() => {
                        const next = [...selectedCards];
                        [next[index + 1], next[index]] = [next[index], next[index + 1]];
                        onChange({
                          ...section,
                          payload: {
                            ...payload,
                            items: next.map((entry, order) => ({
                              ...entry,
                              displayOrder: order + 1,
                            })),
                          },
                        });
                      }}
                      onDelete={() => {
                        const nextItems = selectedCards
                          .filter((entry) => entry.id !== item.id)
                          .map((entry, order) => ({
                            ...entry,
                            displayOrder: order + 1,
                          }));

                        if (isPremiumCatalogues) {
                          setPremiumPayload({
                            ...premiumPayload,
                            catalogueNos: premiumPayload.catalogueNos.filter(
                              (catalogueNo) => catalogueNo !== item.catalogueNo,
                            ),
                            items: nextItems as HomepageCatalogueSpotlightItem[],
                          });
                        } else {
                          setCategoryPayload({
                            ...categoryPayload,
                            items: nextItems as HomepageFeaturedCategoryItem[],
                          });
                        }
                      }}
                      disableUp={index === 0}
                      disableDown={index === selectedCards.length - 1}
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
                    <AdminField label="Libellé affiché">
                      <Input
                        value={item.label ?? ""}
                        onChange={(e) => updateItem({ ...item, label: e.target.value })}
                        placeholder={catalogue?.cL_Intitule ?? "Nom affiché"}
                      />
                    </AdminField>
                    <AdminField label="Lien cible">
                      <Input
                        value={item.targetHref ?? ""}
                        onChange={(e) => updateItem({ ...item, targetHref: e.target.value })}
                        placeholder={`/articles?catalogueNo=${item.catalogueNo}`}
                      />
                    </AdminField>
                  </div>

                  {"badgeText" in item ? (
                    <AdminField label="Badge">
                      <Input
                        value={(item as HomepageCatalogueSpotlightItem).badgeText ?? ""}
                        onChange={(e) =>
                          updateItem({
                            ...(item as HomepageCatalogueSpotlightItem),
                            badgeText: e.target.value,
                          })
                        }
                      />
                    </AdminField>
                  ) : null}

                  <AdminField label="Accroche / description">
                    <AdminTextarea
                      value={item.description ?? ""}
                      onChange={(e) =>
                        updateItem({ ...item, description: e.target.value })
                      }
                    />
                  </AdminField>

                  <ImageFieldsEditor
                    label="Image éditoriale"
                    value={item.image ?? createDefaultHomepageImage()}
                    onChange={(image) => updateItem({ ...item, image })}
                  />
                </AdminSectionShell>
              );
            })}
          </div>
        )}
      </AdminSectionShell>

      <AdminSectionShell
        title="Ajouter des catalogues"
        subtitle="Recherche rapide dans les catalogues existants."
      >
        <AdminField label="Recherche">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, code, numéro..."
          />
        </AdminField>

        <div className="grid gap-3 md:grid-cols-2">
          {availableCatalogues.map((catalogue) => (
            <div
              key={catalogue.cL_No}
              className="rounded-2xl border border-border/70 bg-card px-4 py-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-card-foreground">
                    {catalogue.cL_Intitule}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    #{catalogue.cL_No} • {catalogue.cL_Code}
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addCatalogue(catalogue.cL_No)}
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

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { Input } from "../../../shared/components/Input";
import { Loader } from "../../../shared/components/Loader";
import { getArticles } from "../../catalog/api/articlesApi";
import { getCatalogues } from "../../catalog/api/cataloguesApi";
import { getDepots, type DepotDto } from "../../catalog/api/depotsApi";
import {
  getAdminHomepage,
  publishHomepage,
  saveHomepageDraft,
} from "../api/homepageApi";
import { HomepageRenderer } from "../components/HomepageRenderer";
import {
  HOMEPAGE_SECTION_TYPES,
  cloneHomepageDocument,
  createLocalHomepageView,
  createSectionByType,
  duplicateSection,
  sortHomepageSections,
  type HomepageDocument,
  type HomepageSection,
  type HomepageSectionType,
  type HomepageStoresPayload,
  type HomepageStoreItem,
  createLocalId,
} from "../types/homepage";
import { HomepageHeroCarouselEditor } from "../components/admin/HomepageHeroCarouselEditor";
import { HomepageFeaturedProductsEditor } from "../components/admin/HomepageFeaturedProductsEditor";
import { HomepageContactEditor } from "../components/admin/HomepageContactEditor";
import { HomepageFeaturedCataloguesEditor } from "../components/admin/HomepageFeaturedCataloguesEditor";
import { HomepageStoresEditor } from "../components/admin/HomepageStoresEditor";
import {
  AdminField,
  AdminSectionShell,
  AdminTextarea,
  AdminToggle,
  CtaFieldsEditor,
  ImageFieldsEditor,
} from "../components/admin/HomepageAdminPrimitives";

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

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

function getSafeStoresPayload(
  payload: Partial<HomepageStoresPayload> | undefined,
): HomepageStoresPayload {
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

function applyPremiumHomepagePreset(): HomepageDocument {
  const carousel = createSectionByType("carousel", 1);
  const featuredProducts = createSectionByType("featuredProducts", 2);
  const contact = createSectionByType("contact", 3);
  const catalogues = createSectionByType("catalogues", 4);
  const stores = createSectionByType("stores", 5);

  carousel.name = "Hero carousel principal";
  featuredProducts.name = "Sélection d’articles";
  contact.name = "Contactez-nous";
  catalogues.name = "Le meilleur de nos catégories";
  stores.name = "Nos magasins";

  return {
    pageTitle: "Homepage e-commerce premium",
    pageSubtitle:
      "Hero fort, sélection produits, contact, catalogues et magasins pilotés depuis l’administration.",
    sections: [carousel, featuredProducts, contact, catalogues, stores],
  };
}

function buildLocalPreview(
  document: HomepageDocument,
  articles: Awaited<ReturnType<typeof getArticles>>["items"],
  catalogues: Awaited<ReturnType<typeof getCatalogues>>["items"],
  depots: DepotDto[],
) {
  const view = createLocalHomepageView(document, articles, catalogues, null);

  view.content.sections = view.content.sections.map((section) => {
    if (section.type !== "stores") return section;

    const payload = getSafeStoresPayload(
      section.payload as Partial<HomepageStoresPayload>,
    );

    const existingItems =
      payload.items.length > 0
        ? payload.items
        : payload.depotNos.map((depotNo, index) =>
            createStoreItem(index + 1, depotNo),
          );

    return {
      ...section,
      payload: {
        ...payload,
        items: existingItems.map((item, index) => {
          const depot = depots.find((entry) => entry.dE_No === item.depotNo);
          return {
            ...item,
            displayOrder: index + 1,
            resolvedStore: depot
              ? {
                  depotNo: depot.dE_No,
                  code: depot.dE_Code,
                  title: depot.dE_Intitule,
                  address: depot.dE_Adresse ?? null,
                  complement: depot.dE_Complement ?? null,
                  postalCode: depot.dE_CodePostal ?? null,
                  city: depot.dE_Ville ?? null,
                  country: depot.dE_Pays ?? null,
                  isPrimary: depot.dE_Principal,
                }
              : null,
          };
        }),
      },
    };
  });

  return view;
}

function getSectionTypeOptions(): HomepageSectionType[] {
  return [...HOMEPAGE_SECTION_TYPES, "contact", "stores"];
}

function getSectionLabel(section: HomepageSection) {
  return section.name?.trim() || section.type;
}

function getSectionShortType(type: HomepageSectionType) {
  switch (type) {
    case "carousel":
      return "Hero";
    case "featuredProducts":
      return "Produits";
    case "contact":
      return "Contact";
    case "catalogues":
      return "Catalogues";
    case "stores":
      return "Magasins";
    case "featuredCategories":
      return "Catégories";
    default:
      return type;
  }
}

function SectionMetaEditor({
  section,
  onChange,
  onMove,
  onDuplicate,
  onDelete,
  isFirst,
  isLast,
}: {
  section: HomepageSection;
  onChange: (section: HomepageSection) => void;
  onMove: (direction: -1 | 1) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <Card className="space-y-4 p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <AdminToggle
            label="Section active"
            checked={section.isActive}
            onChange={(isActive) => onChange({ ...section, isActive })}
          />
          <span className="rounded-full bg-muted/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Position {section.displayOrder}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onMove(-1)} disabled={isFirst}>
            ↑ Monter
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => onMove(1)} disabled={isLast}>
            ↓ Descendre
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onDuplicate}>
            Dupliquer
          </Button>
          <Button type="button" variant="destructive" size="sm" onClick={onDelete}>
            Supprimer
          </Button>
        </div>
      </div>

      <AdminField label="Nom interne de cette section">
        <Input
          value={section.name ?? ""}
          onChange={(e) => onChange({ ...section, name: e.target.value })}
          placeholder="Ex. Hero principal, Top produits…"
        />
      </AdminField>

      <button
        type="button"
        onClick={() => setShowAdvanced((c) => !c)}
        className="self-start text-sm font-semibold text-primary hover:underline"
      >
        {showAdvanced ? "▾ Masquer les options avancées" : "▸ Options avancées (variants & planning)"}
      </button>

      {showAdvanced ? (
        <div className="grid gap-4 rounded-2xl border border-dashed border-border/70 bg-muted/30 p-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminField label="Variant layout">
            <Input
              value={section.layoutVariant ?? ""}
              onChange={(e) => onChange({ ...section, layoutVariant: e.target.value })}
              placeholder="hero-premium"
            />
          </AdminField>

          <AdminField label="Variant thème">
            <Input
              value={section.themeVariant ?? ""}
              onChange={(e) => onChange({ ...section, themeVariant: e.target.value })}
              placeholder="dark / light / neutral"
            />
          </AdminField>

          <AdminField label="Début de visibilité">
            <Input
              type="datetime-local"
              value={section.startAt?.slice(0, 16) ?? ""}
              onChange={(e) =>
                onChange({
                  ...section,
                  startAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                })
              }
            />
          </AdminField>

          <AdminField label="Fin de visibilité">
            <Input
              type="datetime-local"
              value={section.endAt?.slice(0, 16) ?? ""}
              onChange={(e) =>
                onChange({
                  ...section,
                  endAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                })
              }
            />
          </AdminField>
        </div>
      ) : null}
    </Card>
  );
}

function LegacySectionEditor({
  section,
  onChange,
}: {
  section: HomepageSection;
  onChange: (section: HomepageSection) => void;
}) {
  switch (section.type) {
    case "advantages": {
      const payload = section.payload as any;
      return (
        <AdminSectionShell
          title="Section legacy / secondaire"
          subtitle="Cette section reste compatible. Tu peux la garder, la déplacer ou la supprimer."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="Titre">
              <Input
                value={payload.title ?? ""}
                onChange={(e) =>
                  onChange({
                    ...section,
                    payload: { ...payload, title: e.target.value },
                  })
                }
              />
            </AdminField>

            <AdminField label="Sous-titre">
              <Input
                value={payload.subtitle ?? ""}
                onChange={(e) =>
                  onChange({
                    ...section,
                    payload: { ...payload, subtitle: e.target.value },
                  })
                }
              />
            </AdminField>
          </div>

          <AdminField label="Description">
            <AdminTextarea
              value={payload.description ?? ""}
              onChange={(e) =>
                onChange({
                  ...section,
                  payload: { ...payload, description: e.target.value },
                })
              }
            />
          </AdminField>
        </AdminSectionShell>
      );
    }

    case "finalCta": {
      const payload = section.payload as any;
      return (
        <div className="space-y-4">
          <AdminSectionShell
            title="CTA final"
            subtitle="Compatible avec l’ancien système si tu veux garder ce bloc."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <AdminField label="Titre">
                <Input
                  value={payload.title ?? ""}
                  onChange={(e) =>
                    onChange({
                      ...section,
                      payload: { ...payload, title: e.target.value },
                    })
                  }
                />
              </AdminField>

              <AdminField label="Sous-titre">
                <Input
                  value={payload.subtitle ?? ""}
                  onChange={(e) =>
                    onChange({
                      ...section,
                      payload: { ...payload, subtitle: e.target.value },
                    })
                  }
                />
              </AdminField>
            </div>

            <AdminField label="Description">
              <AdminTextarea
                value={payload.description ?? ""}
                onChange={(e) =>
                  onChange({
                    ...section,
                    payload: { ...payload, description: e.target.value },
                  })
                }
              />
            </AdminField>
          </AdminSectionShell>

          <ImageFieldsEditor
            label="Arrière-plan"
            value={payload.backgroundImage}
            onChange={(backgroundImage) =>
              onChange({
                ...section,
                payload: { ...payload, backgroundImage },
              })
            }
          />

          <div className="grid gap-4 xl:grid-cols-2">
            <CtaFieldsEditor
              label="CTA principal"
              value={payload.primaryCta}
              onChange={(primaryCta) =>
                onChange({
                  ...section,
                  payload: { ...payload, primaryCta },
                })
              }
            />

            <CtaFieldsEditor
              label="CTA secondaire"
              value={payload.secondaryCta}
              onChange={(secondaryCta) =>
                onChange({
                  ...section,
                  payload: { ...payload, secondaryCta },
                })
              }
            />
          </div>
        </div>
      );
    }

    default:
      return (
        <AdminSectionShell
          title="Section non prioritaire"
          subtitle="Elle reste supportée, mais l’édition détaillée n’est pas prioritaire dans cette phase."
        >
          <div className="rounded-2xl border border-dashed border-border/70 bg-card px-4 py-5 text-sm text-muted-foreground">
            Cette section peut être conservée, réordonnée, dupliquée ou supprimée.
            La refonte admin de cette phase cible surtout : carousel, produits,
            contact, catalogues et magasins.
          </div>
        </AdminSectionShell>
      );
    }
  }


function SectionAccordion({
  section,
  index,
  total,
  expanded,
  onToggle,
  onFocusOnly,
  children,
}: {
  section: HomepageSection;
  index: number;
  total: number;
  expanded: boolean;
  onToggle: () => void;
  onFocusOnly: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center gap-3 border-b px-4 py-3 text-left transition md:px-5 ${
          expanded
            ? "border-primary/20 bg-primary/5"
            : "border-border/60 bg-muted/15 hover:bg-muted/25"
        }`}
      >
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black transition ${
            expanded ? "bg-primary text-white" : "bg-card text-card-foreground border border-border/70"
          }`}
        >
          {index + 1}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-base font-black text-card-foreground md:text-lg">
              {getSectionLabel(section)}
            </div>
            <span className="rounded-full bg-card border border-border/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {getSectionShortType(section.type)}
            </span>
            {!section.isActive ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                Inactive
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {index + 1} / {total}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onFocusOnly();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onFocusOnly();
              }
            }}
            className="hidden md:inline-flex h-8 cursor-pointer items-center rounded-md border border-border/70 bg-card px-3 text-xs font-semibold hover:border-primary/30 hover:bg-accent/55"
          >
            Focus
          </span>
          <span
            aria-hidden
            className={`inline-flex h-7 w-7 items-center justify-center rounded-md bg-card text-card-foreground transition ${
              expanded ? "rotate-180" : ""
            }`}
          >
            ▾
          </span>
        </div>
      </button>

      {expanded ? <div className="space-y-4 p-4 md:p-6">{children}</div> : null}
    </Card>
  );
}

export function AdminHomepagePage() {
  const queryClient = useQueryClient();
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [draft, setDraft] = useState<HomepageDocument>(
    applyPremiumHomepagePreset(),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [sectionTypeToAdd, setSectionTypeToAdd] =
    useState<HomepageSectionType>("carousel");
  const [showPreview, setShowPreview] = useState(false);
  const [expandedSectionIds, setExpandedSectionIds] = useState<string[]>([]);

  const adminQuery = useQuery({
    queryKey: ["homepage", "admin"],
    queryFn: getAdminHomepage,
  });

  const articlesQuery = useQuery({
    queryKey: ["homepage", "articles-selection"],
    queryFn: async () =>
      (
        await getArticles({
          take: 120,
          skip: 0,
          publishedOnly: false,
          includeSleeping: true,
        })
      ).items,
  });

  const cataloguesQuery = useQuery({
    queryKey: ["homepage", "catalogues-selection"],
    queryFn: async () => (await getCatalogues()).items,
  });

  const depotsQuery = useQuery({
    queryKey: ["homepage", "depots-selection"],
    queryFn: () => getDepots(false),
  });

  useEffect(() => {
    if (adminQuery.data?.draft) {
      setDraft(cloneHomepageDocument(adminQuery.data.draft));
    }
  }, [adminQuery.data?.updatedAt]);

  const saveMutation = useMutation({
    mutationFn: saveHomepageDraft,
    onSuccess: async () => {
      setMessage("Brouillon enregistré.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["homepage", "admin"] }),
        queryClient.invalidateQueries({ queryKey: ["homepage", "preview"] }),
        queryClient.invalidateQueries({ queryKey: ["homepage", "public"] }),
      ]);
    },
    onError: (error: any) => {
      setMessage(
        error?.response?.data?.message ??
          error?.message ??
          "Erreur lors de l’enregistrement du brouillon.",
      );
    },
  });

  const publishMutation = useMutation({
    mutationFn: publishHomepage,
    onSuccess: async () => {
      setMessage("Homepage publiée.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["homepage", "admin"] }),
        queryClient.invalidateQueries({ queryKey: ["homepage", "preview"] }),
        queryClient.invalidateQueries({ queryKey: ["homepage", "public"] }),
      ]);
    },
    onError: (error: any) => {
      setMessage(
        error?.response?.data?.message ??
          error?.message ??
          "Erreur lors de la publication.",
      );
    },
  });

  const availableArticles = articlesQuery.data ?? [];
  const availableCatalogues = cataloguesQuery.data ?? [];
  const availableDepots = depotsQuery.data ?? [];

  const sortedSections = useMemo(
    () => sortHomepageSections(draft.sections),
    [draft.sections],
  );

  useEffect(() => {
    setExpandedSectionIds((current) => {
      const validIds = current.filter((id) =>
        sortedSections.some((section) => section.id === id),
      );

      if (validIds.length > 0) return validIds;
      if (sortedSections.length === 0) return [];
      return [sortedSections[0].id];
    });
  }, [sortedSections]);

  const localPreview = useMemo(
    () =>
      buildLocalPreview(
        { ...draft, sections: sortedSections },
        availableArticles,
        availableCatalogues,
        availableDepots,
      ),
    [draft, sortedSections, availableArticles, availableCatalogues, availableDepots],
  );

  const updateSection = (
    sectionId: string,
    updater: (section: HomepageSection) => HomepageSection,
  ) => {
    setDraft((current) => ({
      ...current,
      sections: sortHomepageSections(
        current.sections.map((section) =>
          section.id === sectionId ? updater(section) : section,
        ),
      ),
    }));
  };

  const isExpanded = (sectionId: string) => expandedSectionIds.includes(sectionId);

  const toggleSection = (sectionId: string) => {
    setExpandedSectionIds((current) =>
      current.includes(sectionId)
        ? current.filter((id) => id !== sectionId)
        : [...current, sectionId],
    );
  };

  const expandOnlySection = (sectionId: string) => {
    setExpandedSectionIds([sectionId]);
    requestAnimationFrame(() => {
      sectionRefs.current[sectionId]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const expandAllSections = () => {
    setExpandedSectionIds(sortedSections.map((section) => section.id));
  };

  const collapseAllSections = () => {
    setExpandedSectionIds([]);
  };

  const scrollToSection = (sectionId: string) => {
    if (!expandedSectionIds.includes(sectionId)) {
      setExpandedSectionIds((current) =>
        current.includes(sectionId) ? current : [...current, sectionId],
      );
    }

    requestAnimationFrame(() => {
      sectionRefs.current[sectionId]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  if (
    adminQuery.isLoading ||
    articlesQuery.isLoading ||
    cataloguesQuery.isLoading ||
    depotsQuery.isLoading
  ) {
    return <Loader />;
  }

  if (adminQuery.isError || !adminQuery.data) {
    return (
      <div className="app-surface p-8 text-center">
        <div className="app-kicker">Administration</div>
        <h1 className="mt-2 text-2xl font-black text-card-foreground">
          Homepage
        </h1>
        <p className="mt-3 app-description">
          Impossible de charger le module homepage.
        </p>
      </div>
    );
  }

  const lastSavedLabel = formatDate(adminQuery.data.updatedAt);
  const lastPublishedLabel = adminQuery.data.hasPublishedVersion
    ? formatDate(adminQuery.data.publishedAt)
    : "Jamais publiée";

  return (
    <div className="container-app space-y-5 pb-10">
      {/* Hero Homepage Builder — visuel pro, statut clair */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-rose-500/10 via-card to-card p-6 shadow-sm md:p-7">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-rose-500/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-32 w-32 rounded-full bg-amber-500/15 blur-3xl" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-lg">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M3 10.5 12 4l9 6.5 M5 9.8V20h14V9.8 M9 20v-5h6v5" />
                </svg>
              </span>
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-rose-600">Administration • Homepage</div>
                <h1 className="text-3xl font-black tracking-tight text-card-foreground">Éditeur de la page d'accueil</h1>
              </div>
            </div>

            {/* Statuts */}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 font-bold shadow-sm ring-1 ring-border">
                <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                {sortedSections.length} section{sortedSections.length > 1 ? "s" : ""}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 font-bold shadow-sm ring-1 ring-border">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                Brouillon : {lastSavedLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 font-bold shadow-sm ring-1 ring-border">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                {adminQuery.data.hasPublishedVersion ? `En ligne : ${lastPublishedLabel}` : "Jamais publiée"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              isLoading={saveMutation.isPending}
              onClick={() => saveMutation.mutate({ content: draft })}
              className="gap-2"
            >
              💾 Enregistrer brouillon
            </Button>
            <Button
              type="button"
              variant="primary"
              isLoading={publishMutation.isPending}
              onClick={() => publishMutation.mutate()}
              className="gap-2 shadow-lg shadow-rose-500/30"
            >
              🚀 Publier en ligne
            </Button>
          </div>
        </div>

        {/* Mode d'emploi visible */}
        <div className="relative mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card/80 p-3 shadow-sm">
            <div className="flex items-start gap-2">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-sm font-black text-rose-700">1</span>
              <div className="text-xs leading-5">
                <strong className="block text-card-foreground">Ajoutez des sections</strong>
                <span className="text-muted-foreground">Hero, carousels, produits, dépôts, contact… Cliquez sur "+ Ajouter une section" en bas.</span>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card/80 p-3 shadow-sm">
            <div className="flex items-start gap-2">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-sm font-black text-rose-700">2</span>
              <div className="text-xs leading-5">
                <strong className="block text-card-foreground">Modifiez & ré-ordonnez</strong>
                <span className="text-muted-foreground">Cliquez une section pour l'ouvrir, utilisez ↑ ↓ pour la déplacer, dupliquez ou supprimez.</span>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card/80 p-3 shadow-sm">
            <div className="flex items-start gap-2">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-sm font-black text-rose-700">3</span>
              <div className="text-xs leading-5">
                <strong className="block text-card-foreground">Publiez quand prêt</strong>
                <span className="text-muted-foreground">"Enregistrer" sauve un brouillon. "Publier" met en ligne pour les visiteurs.</span>
              </div>
            </div>
          </div>
        </div>

        {message ? (
          <div className="relative mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            ✓ {message}
          </div>
        ) : null}
      </section>

      <section className="app-surface sticky top-20 z-20 space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Sections
            </span>
            {sortedSections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => scrollToSection(section.id)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                  isExpanded(section.id)
                    ? "border-primary/25 bg-primary/10 text-primary"
                    : "border-border/70 bg-card text-card-foreground hover:border-primary/20 hover:bg-accent/55"
                }`}
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-black text-card-foreground">
                  {section.displayOrder}
                </span>
                <span>{getSectionShortType(section.type)}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={expandAllSections}>
              Tout ouvrir
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={collapseAllSections}>
              Tout replier
            </Button>
            <Button
              type="button"
              variant={showPreview ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowPreview((c) => !c)}
            >
              {showPreview ? "🙈 Masquer preview" : "👁 Preview"}
            </Button>
            <details className="relative">
              <summary className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-border/70 bg-card px-3 text-sm font-semibold text-card-foreground hover:bg-accent/55 list-none">
                ⋯ Plus
              </summary>
              <div className="absolute right-0 z-30 mt-2 flex w-64 flex-col gap-1 rounded-2xl border border-border/70 bg-card p-2 shadow-xl">
                <button
                  type="button"
                  onClick={() => setDraft(cloneHomepageDocument(adminQuery.data.draft))}
                  className="rounded-lg px-3 py-2 text-left text-sm hover:bg-accent/55"
                >
                  Recharger le draft serveur
                </button>
                <button
                  type="button"
                  onClick={() => setDraft(applyPremiumHomepagePreset())}
                  className="rounded-lg px-3 py-2 text-left text-sm hover:bg-accent/55"
                >
                  Appliquer le preset premium
                </button>
              </div>
            </details>
          </div>
        </div>
      </section>

      <section
        className={`grid gap-6 ${
          showPreview ? "2xl:grid-cols-[1.12fr_0.88fr]" : "grid-cols-1"
        }`}
      >
        <div className="space-y-5">
          <Card className="space-y-4 p-5">
            <details className="group">
              <summary className="flex cursor-pointer items-center justify-between list-none">
                <span className="text-sm font-bold text-card-foreground">
                  ⚙ Métadonnées globales de la page
                </span>
                <span className="text-xs text-muted-foreground group-open:hidden">Cliquer pour modifier</span>
              </summary>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <AdminField label="Titre global de la page">
                  <Input
                    value={draft.pageTitle ?? ""}
                    onChange={(e) =>
                      setDraft((current) => ({
                        ...current,
                        pageTitle: e.target.value,
                      }))
                    }
                  />
                </AdminField>

                <AdminField label="Sous-titre global de la page">
                  <Input
                    value={draft.pageSubtitle ?? ""}
                    onChange={(e) =>
                      setDraft((current) => ({
                        ...current,
                        pageSubtitle: e.target.value,
                      }))
                    }
                  />
                </AdminField>
              </div>
            </details>

            <div className="flex flex-wrap items-end gap-3 border-t border-border/60 pt-4">
              <AdminField label="Ajouter une section">
                <select
                  className="h-11 w-full min-w-[200px] rounded-2xl border border-border bg-[hsl(var(--input))] px-4 text-sm text-card-foreground outline-none transition focus:border-primary/45 focus:ring-4 focus:ring-primary/10"
                  value={sectionTypeToAdd}
                  onChange={(e) =>
                    setSectionTypeToAdd(e.target.value as HomepageSectionType)
                  }
                >
                  {getSectionTypeOptions().map((type) => (
                    <option key={type} value={type}>
                      {getSectionShortType(type)} — {type}
                    </option>
                  ))}
                </select>
              </AdminField>

              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  const nextSection = createSectionByType(
                    sectionTypeToAdd,
                    draft.sections.length + 1,
                  );

                  setDraft((current) => ({
                    ...current,
                    sections: sortHomepageSections([
                      ...current.sections,
                      nextSection,
                    ]),
                  }));

                  setExpandedSectionIds((current) => [...current, nextSection.id]);

                  requestAnimationFrame(() => {
                    sectionRefs.current[nextSection.id]?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  });
                }}
              >
                ＋ Ajouter
              </Button>
            </div>
          </Card>

          {sortedSections.map((section, index) => (
            <div
              key={section.id}
              ref={(node) => {
                sectionRefs.current[section.id] = node;
              }}
            >
              <SectionAccordion
                section={section}
                index={index}
                total={sortedSections.length}
                expanded={isExpanded(section.id)}
                onToggle={() => toggleSection(section.id)}
                onFocusOnly={() => expandOnlySection(section.id)}
              >
                <SectionMetaEditor
                  section={section}
                  onChange={(nextSection) =>
                    updateSection(section.id, () => nextSection)
                  }
                  onMove={(direction) =>
                    setDraft((current) => {
                      const next = sortHomepageSections(current.sections);
                      const currentIndex = next.findIndex(
                        (entry) => entry.id === section.id,
                      );
                      const targetIndex = currentIndex + direction;

                      if (
                        currentIndex < 0 ||
                        targetIndex < 0 ||
                        targetIndex >= next.length
                      ) {
                        return current;
                      }

                      [next[currentIndex], next[targetIndex]] = [
                        next[targetIndex],
                        next[currentIndex],
                      ];

                      return {
                        ...current,
                        sections: sortHomepageSections(next),
                      };
                    })
                  }
                  onDuplicate={() => {
                    const copy = duplicateSection(
                      section,
                      draft.sections.length + 1,
                    );

                    setDraft((current) => ({
                      ...current,
                      sections: sortHomepageSections([
                        ...current.sections,
                        copy,
                      ]),
                    }));

                    setExpandedSectionIds((current) => [...current, copy.id]);
                  }}
                  onDelete={() =>
                    setDraft((current) => ({
                      ...current,
                      sections: sortHomepageSections(
                        current.sections.filter(
                          (entry) => entry.id !== section.id,
                        ),
                      ),
                    }))
                  }
                  isFirst={index === 0}
                  isLast={index === sortedSections.length - 1}
                />

                {(section.type === "hero" || section.type === "carousel") && (
                  <HomepageHeroCarouselEditor
                    section={section}
                    onChange={(nextSection) =>
                      updateSection(section.id, () => nextSection)
                    }
                  />
                )}

                {section.type === "featuredProducts" && (
                  <HomepageFeaturedProductsEditor
                    section={section}
                    articles={availableArticles}
                    onChange={(nextSection) =>
                      updateSection(section.id, () => nextSection)
                    }
                  />
                )}

                {section.type === "contact" && (
                  <HomepageContactEditor
                    section={section}
                    onChange={(nextSection) =>
                      updateSection(section.id, () => nextSection)
                    }
                  />
                )}

                {(section.type === "catalogues" ||
                  section.type === "featuredCategories") && (
                  <HomepageFeaturedCataloguesEditor
                    section={section}
                    catalogues={availableCatalogues}
                    onChange={(nextSection) =>
                      updateSection(section.id, () => nextSection)
                    }
                  />
                )}

                {section.type === "stores" && (
                  <HomepageStoresEditor
                    section={section}
                    depots={availableDepots}
                    onChange={(nextSection) =>
                      updateSection(section.id, () => nextSection)
                    }
                  />
                )}

                {!(
                  [
                    "hero",
                    "carousel",
                    "featuredProducts",
                    "contact",
                    "catalogues",
                    "featuredCategories",
                    "stores",
                  ] as string[]
                ).includes(section.type) && (
                  <LegacySectionEditor
                    section={section}
                    onChange={(nextSection) =>
                      updateSection(section.id, () => nextSection)
                    }
                  />
                )}
              </SectionAccordion>
            </div>
          ))}
        </div>

        {showPreview ? (
          <div className="space-y-6 2xl:sticky 2xl:top-24 2xl:self-start">
            <Card className="space-y-3 p-6">
              <div className="app-kicker">Prévisualisation locale</div>
              <div className="text-2xl font-black text-card-foreground">
                Rendu instantané
              </div>
              <p className="app-description">
                La preview reflète directement tes modifications locales. Tu peux
                la masquer à tout moment pour travailler plus confortablement.
              </p>
            </Card>

            <div className="rounded-[32px] border border-border/70 bg-muted/20 p-3">
              <div className="max-h-[calc(100vh-11rem)] overflow-auto rounded-[28px] border border-border/60 bg-background p-4">
                <HomepageRenderer view={localPreview} preview />
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
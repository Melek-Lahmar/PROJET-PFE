import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { Loader } from "../../../shared/components/Loader";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";
import { getArticles } from "../../catalog/api/articlesApi";
import { getCatalogues } from "../../catalog/api/cataloguesApi";
import { getDepots, type DepotDto } from "../../catalog/api/depotsApi";
import {
  getAdminHomepage,
  publishHomepage,
  saveHomepageDraft,
} from "../api/homepageApi";
import {
  cloneHomepageDocument,
  createLocalHomepageView,
  sortHomepageSections,
  type HomepageDocument,
  type HomepageStoresPayload,
  type HomepageStoreItem,
  createLocalId,
} from "../types/homepage";
import { HomepageTemplatePreviewModal } from "../components/admin/HomepageTemplatePreviewModal";
import { HomepageTemplateApplyConfirmModal } from "../components/admin/HomepageTemplateApplyConfirmModal";
import {
  HOMEPAGE_TEMPLATES,
  type HomepageTemplateDefinition,
} from "../templates/homepageTemplates";
import { getTheme } from "../themes/HomepageThemes";
import { useHomepageTheme } from "../providers/HomepageThemeProvider";

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
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

function TemplateMiniPreview({ theme }: { theme: ReturnType<typeof getTheme> }) {
  return (
    <div className="relative h-36 w-full overflow-hidden" style={{ backgroundColor: theme.colors.background }}>
      {/* Hero block */}
      <div className="absolute left-0 right-0 top-0 h-14 flex items-center px-3 gap-2" style={{ backgroundColor: theme.colors.primary }}>
        <div className="flex-1 space-y-1">
          <div className="h-2 w-16 rounded" style={{ backgroundColor: theme.buttons.primary.text, opacity: 0.9 }} />
          <div className="h-1.5 w-24 rounded" style={{ backgroundColor: theme.buttons.primary.text, opacity: 0.5 }} />
        </div>
        <div className="h-6 w-12 rounded-lg flex items-center justify-center text-[8px] font-black" style={{ backgroundColor: theme.colors.accent, color: theme.colors.text }}>
          CTA
        </div>
      </div>
      {/* Cards row */}
      <div className="absolute left-0 right-0 top-16 flex gap-1.5 px-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex-1 rounded-md p-1.5 space-y-1" style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
            <div className="h-5 rounded-sm" style={{ backgroundColor: theme.colors.accent, opacity: 0.6 }} />
            <div className="h-1.5 w-full rounded" style={{ backgroundColor: theme.colors.textLight, opacity: 0.4 }} />
            <div className="h-1.5 w-3/4 rounded" style={{ backgroundColor: theme.colors.textLight, opacity: 0.3 }} />
          </div>
        ))}
      </div>
      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 h-5 flex items-center justify-center" style={{ backgroundColor: theme.colors.secondary }}>
        <div className="h-1.5 w-20 rounded" style={{ backgroundColor: theme.buttons.primary.text, opacity: 0.6 }} />
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  isActive,
  onPreview,
  onApply,
}: {
  template: HomepageTemplateDefinition;
  isActive: boolean;
  onPreview: (t: HomepageTemplateDefinition) => void;
  onApply: (t: HomepageTemplateDefinition) => void;
}) {
  const theme = getTheme(template.themeId);

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border-2 transition-all duration-200 ${
        isActive
          ? "border-primary shadow-lg shadow-primary/20"
          : "border-border hover:border-primary/40 hover:shadow-md"
      }`}
      style={{ backgroundColor: theme.colors.background }}
    >
      {/* Mini visual preview */}
      <div className="relative overflow-hidden">
        <TemplateMiniPreview theme={theme} />
        {isActive ? (
          <div className="absolute right-2 top-2 rounded-full px-2.5 py-1 text-[11px] font-black shadow-md" style={{ backgroundColor: theme.colors.primary, color: theme.buttons.primary.text }}>
            Actif
          </div>
        ) : null}
        {/* Color dots */}
        <div className="absolute bottom-2 left-2 flex gap-1">
          {[theme.colors.primary, theme.colors.secondary, theme.colors.accent, theme.colors.tertiary].map((color, i) => (
            <span key={i} className="inline-block h-3 w-3 rounded-full border border-white/60 shadow-sm" style={{ backgroundColor: color }} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.colors.primary }}>
            {template.badge}
          </div>
          <h3 className="mt-0.5 text-base font-black" style={{ color: theme.colors.text }}>
            {template.name}
          </h3>
          <p className="mt-1 text-xs leading-5" style={{ color: theme.colors.textLight }}>
            {template.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 flex-1">
          {template.includedSections.slice(0, 4).map((label) => (
            <span
              key={label}
              className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
              style={{ borderColor: theme.colors.border, color: theme.colors.textLight, backgroundColor: theme.colors.surface }}
            >
              {label}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => onPreview(template)}
            className="rounded-xl border py-2 text-xs font-bold transition hover:opacity-80"
            style={{ borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.surface }}
          >
            Prévisualiser
          </button>
          <button
            type="button"
            onClick={() => onApply(template)}
            className="rounded-xl py-2 text-xs font-black transition hover:opacity-90"
            style={{ backgroundColor: theme.colors.primary, color: theme.buttons.primary.text }}
          >
            Appliquer
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminHomepagePage() {
  const queryClient = useQueryClient();
  const { setTheme, activeThemeId } = useHomepageTheme();

  const [draft, setDraft] = useState<HomepageDocument>({ sections: [] });
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [templateToPreview, setTemplateToPreview] = useState<HomepageTemplateDefinition | null>(null);
  const [templateToApply, setTemplateToApply] = useState<HomepageTemplateDefinition | null>(null);
  const pendingPublish = { current: false };

  const adminQuery = useQuery({
    queryKey: ["homepage", "admin"],
    queryFn: getAdminHomepage,
  });

  const articlesQuery = useQuery({
    queryKey: ["homepage", "articles-selection"],
    queryFn: async () =>
      (await getArticles({ take: 120, skip: 0, publishedOnly: false, includeSleeping: true })).items,
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
  }, [adminQuery.data?.draft, adminQuery.data?.updatedAt]);

  const publishMutation = useMutation({
    mutationFn: publishHomepage,
    onSuccess: async () => {
      setMessage({ text: "✓ Page publiée ! Visible par vos visiteurs sur localhost:5173/", type: "success" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["homepage", "admin"] }),
        queryClient.invalidateQueries({ queryKey: ["homepage", "public"] }),
      ]);
    },
    onError: (error: unknown) => {
      setMessage({ text: getApiErrorMessage(error) || "Erreur lors de la publication.", type: "error" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: saveHomepageDraft,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["homepage", "admin"] }),
        queryClient.invalidateQueries({ queryKey: ["homepage", "public"] }),
      ]);
      if (pendingPublish.current) {
        pendingPublish.current = false;
        publishMutation.mutate();
      } else {
        setMessage({ text: "Brouillon enregistré.", type: "success" });
      }
    },
    onError: (error: unknown) => {
      pendingPublish.current = false;
      setMessage({ text: getApiErrorMessage(error) || "Erreur lors de l'enregistrement.", type: "error" });
    },
  });

  const availableArticles = useMemo(() => articlesQuery.data ?? [], [articlesQuery.data]);
  const availableCatalogues = useMemo(() => cataloguesQuery.data ?? [], [cataloguesQuery.data]);
  const availableDepots = useMemo(() => depotsQuery.data ?? [], [depotsQuery.data]);

  const templateContext = useMemo(
    () => ({ articles: availableArticles, catalogues: availableCatalogues }),
    [availableArticles, availableCatalogues],
  );

  const templatePreviewDocument = useMemo(() => {
    try { return templateToPreview?.createDocument(templateContext) ?? null; }
    catch { return null; }
  }, [templateContext, templateToPreview]);

  const templatePreviewView = useMemo(() => {
    if (!templatePreviewDocument) return null;
    try { return buildLocalPreview(templatePreviewDocument, availableArticles, availableCatalogues, availableDepots); }
    catch { return null; }
  }, [templatePreviewDocument, availableArticles, availableCatalogues, availableDepots]);

  const applyTemplateToDraft = (template: HomepageTemplateDefinition) => {
    const nextDraft = template.createDocument(templateContext);
    const sortedDraft = { ...nextDraft, sections: sortHomepageSections(nextDraft.sections) };
    setDraft(sortedDraft);
    setTheme(template.themeId);
    setTemplateToApply(null);
    setTemplateToPreview(null);
    setMessage({ text: "Application en cours...", type: "success" });
    pendingPublish.current = true;
    saveMutation.mutate({ content: sortedDraft });
  };

  if (adminQuery.isLoading || articlesQuery.isLoading || cataloguesQuery.isLoading || depotsQuery.isLoading) {
    return <Loader />;
  }

  if (adminQuery.isError || !adminQuery.data) {
    return (
      <div className="app-surface p-8 text-center">
        <p className="app-description">Impossible de charger la page d'accueil.</p>
      </div>
    );
  }

  const savedAt = formatDate(adminQuery.data.updatedAt);
  const publishedAt = adminQuery.data.hasPublishedVersion ? formatDate(adminQuery.data.publishedAt) : null;

  return (
    <div className="container-app space-y-6 pb-12">

      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Administration</div>
          <h1 className="mt-0.5 text-2xl font-black text-card-foreground">Page d'accueil</h1>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {savedAt ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1 font-semibold text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Brouillon : {savedAt}
              </span>
            ) : null}
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold ${publishedAt ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-muted/60 text-muted-foreground"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${publishedAt ? "bg-emerald-500" : "bg-muted-foreground/50"}`} />
              {publishedAt ? `En ligne : ${publishedAt}` : "Jamais publiée"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            isLoading={saveMutation.isPending && !pendingPublish.current}
            onClick={() => saveMutation.mutate({ content: draft })}
          >
            Enregistrer brouillon
          </Button>
          <Button
            type="button"
            variant="primary"
            isLoading={publishMutation.isPending || (saveMutation.isPending && pendingPublish.current)}
            onClick={() => {
              pendingPublish.current = true;
              saveMutation.mutate({ content: draft });
            }}
            className="shadow-md"
          >
            Publier en ligne
          </Button>
        </div>
      </div>

      {/* Message */}
      {message ? (
        <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
          message.type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300"
            : "border-red-200 bg-red-50 text-red-800 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-300"
        }`}>
          {message.text}
          <button type="button" onClick={() => setMessage(null)} className="ml-3 opacity-60 hover:opacity-100">✕</button>
        </div>
      ) : null}

      {/* Quick customization */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Personnalisation</div>
          <h2 className="mt-0.5 text-lg font-black text-card-foreground">Titre de votre page</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Titre principal</label>
            <Input
              value={draft.pageTitle ?? ""}
              onChange={(e) => setDraft((c) => ({ ...c, pageTitle: e.target.value }))}
              placeholder="Ex. Bienvenue sur notre boutique"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Sous-titre</label>
            <Input
              value={draft.pageSubtitle ?? ""}
              onChange={(e) => setDraft((c) => ({ ...c, pageSubtitle: e.target.value }))}
              placeholder="Ex. Découvrez notre catalogue"
            />
          </div>
        </div>
      </div>

      {/* Template gallery */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Modèles & Thèmes</div>
            <h2 className="mt-0.5 text-lg font-black text-card-foreground">Choisissez le style de votre page</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Chaque modèle change le design et les couleurs. Prévisualisez avant d'appliquer.
            </p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-200">
            Sécurisé — le brouillon seulement
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {HOMEPAGE_TEMPLATES.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isActive={template.themeId === activeThemeId}
              onPreview={setTemplateToPreview}
              onApply={setTemplateToApply}
            />
          ))}
        </div>
      </div>

      {/* Workflow guide */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { step: "1", title: "Choisissez un modèle", desc: "Prévisualisez et appliquez le style qui correspond à votre activité." },
          { step: "2", title: "Personnalisez", desc: "Modifiez le titre et le sous-titre de votre page d'accueil." },
          { step: "3", title: "Publiez", desc: "Cliquez sur « Publier en ligne » pour rendre la page visible aux visiteurs." },
        ].map(({ step, title, desc }) => (
          <div key={step} className="flex gap-3 rounded-xl border border-border bg-card p-4">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-black text-primary">
              {step}
            </span>
            <div className="text-sm">
              <div className="font-bold text-card-foreground">{title}</div>
              <div className="mt-0.5 text-muted-foreground">{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      {templateToPreview ? (
        <HomepageTemplatePreviewModal
          template={templateToPreview}
          view={templatePreviewView ?? { isPublished: false, publishedAt: null, content: templatePreviewDocument ?? { sections: [] } }}
          onClose={() => setTemplateToPreview(null)}
          onApply={(template) => {
            setTemplateToPreview(null);
            setTemplateToApply(template);
          }}
        />
      ) : null}

      {templateToApply ? (
        <HomepageTemplateApplyConfirmModal
          template={templateToApply}
          onCancel={() => setTemplateToApply(null)}
          onConfirm={() => applyTemplateToDraft(templateToApply)}
        />
      ) : null}
    </div>
  );
}

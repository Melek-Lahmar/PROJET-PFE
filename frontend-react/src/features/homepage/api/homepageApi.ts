import { axiosClient } from '../../../core/http/axiosClient';
import { endpoints } from '../../../core/http/endpoints';
import type {
  HomepageAdminDocument,
  HomepageAdvantagesPayload,
  HomepageAudiencesPayload,
  HomepageCarouselPayload,
  HomepageCataloguesPayload,
  HomepageDocument,
  HomepageFeaturedProductsPayload,
  HomepageFinalCtaPayload,
  HomepageHeroPayload,
  HomepageSection,
  HomepageStatsPayload,
  HomepageView,
  ReorderHomepageSectionsRequest,
  SaveHomepageDraftRequest,
} from '../types/homepage';

/* ============================================================================
 * Adaptateurs frontend ↔ backend
 *
 * Le backend (HomepageContentDto) stocke chaque section comme un champ
 * fortement typé d'un même objet (`content.hero`, `content.featuredProducts`,
 * ...). L'ordre est dans `content.sectionOrder: string[]`. Les CTA sont
 * éclatés en `primaryCtaText` + `primaryCtaHref` ; les images en `imageUrl`.
 *
 * Le frontend (HomepageDocument) attend un tableau polymorphe
 * `content.sections: HomepageSection[]` où chaque entrée a un `type`, un
 * `payload` typé, et des CTA imbriqués `{ text, href }`.
 *
 * Sections supportées des DEUX côtés (round-trip safe) :
 *   hero, carousel, featuredProducts, featuredCatalogues (alias "catalogues"),
 *   audiences, advantages, stats, finalCta.
 *
 * Les autres types (brands, contact, stores, promoBanner, featuredCategories)
 * n'ont pas de représentation backend pour l'instant :
 * en lecture ils ne sont jamais retournés, en écriture ils sont silencieusement
 * ignorés (TODO si on ajoute leurs DTO côté backend).
 * ========================================================================= */

const BACKEND_SECTION_TYPES = new Set([
  'hero',
  'carousel',
  'featuredProducts',
  'featuredCatalogues',
  'audiences',
  'advantages',
  'stats',
  'finalCta',
]);

// Le renderer React utilise "catalogues" pour le payload featuredCatalogues.
function frontendTypeToBackendKey(type: string): string {
  if (type === 'catalogues') return 'featuredCatalogues';
  return type;
}

function legacyContentToSections(contentRaw: Record<string, unknown>): HomepageSection[] {
  const order: string[] = Array.isArray(contentRaw.sectionOrder)
    ? (contentRaw.sectionOrder as string[])
    : Array.from(BACKEND_SECTION_TYPES);

  const sections: HomepageSection[] = [];
  order.forEach((type, idx) => {
    const sectionRaw = contentRaw[type] as Record<string, unknown> | undefined;
    const built = buildSectionFromLegacy(type, sectionRaw, idx);
    if (built) sections.push(built);
  });
  return sections;
}

function adaptLegacyHomepage(raw: unknown): HomepageView {
  const r = (raw ?? {}) as Record<string, unknown>;
  const content = (r.content ?? {}) as Record<string, unknown>;

  if (Array.isArray((content as { sections?: unknown }).sections)) {
    return raw as HomepageView;
  }

  return {
    isPublished: Boolean(r.isPublished),
    publishedAt: (r.publishedAt as string | null | undefined) ?? null,
    content: {
      pageTitle: (content.pageTitle as string | null | undefined) ?? null,
      pageSubtitle: (content.pageSubtitle as string | null | undefined) ?? null,
      sections: legacyContentToSections(content),
    },
  };
}

function adaptLegacyContentToDocument(contentRaw: unknown): HomepageDocument {
  const c = (contentRaw ?? {}) as Record<string, unknown>;
  if (Array.isArray((c as { sections?: unknown }).sections)) {
    return contentRaw as HomepageDocument;
  }
  return {
    pageTitle: (c.pageTitle as string | null | undefined) ?? null,
    pageSubtitle: (c.pageSubtitle as string | null | undefined) ?? null,
    sections: legacyContentToSections(c),
  };
}

function adaptLegacyAdminDocument(raw: unknown): HomepageAdminDocument {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    draft: adaptLegacyContentToDocument(r.draft),
    published: r.published ? adaptLegacyContentToDocument(r.published) : null,
    hasPublishedVersion: Boolean(r.hasPublishedVersion),
    updatedAt: (r.updatedAt as string | undefined) ?? new Date().toISOString(),
    publishedAt: (r.publishedAt as string | null | undefined) ?? null,
  };
}

function buildSectionFromLegacy(
  type: string,
  raw: Record<string, unknown> | undefined,
  idx: number,
): HomepageSection | null {
  if (!raw || raw.enabled === false) return null;

  const id = `legacy-${type}-${idx}`;
  const base = {
    id,
    displayOrder: idx + 1,
    isActive: true,
    startAt: null,
    endAt: null,
  };

  const s = (k: string) => (raw[k] as string | null | undefined) ?? null;
  const a = <T,>(k: string) => (Array.isArray(raw[k]) ? (raw[k] as T[]) : []);

  switch (type) {
    case 'hero':
      return {
        ...base,
        type: 'hero',
        payload: {
          badgeText: s('badgeText'),
          title: s('title'),
          subtitle: s('subtitle'),
          description: s('description'),
          primaryCta: { text: s('primaryCtaText'), href: s('primaryCtaHref') },
          secondaryCta: { text: s('secondaryCtaText'), href: s('secondaryCtaHref') },
          image: { sourceType: 'url', url: s('imageUrl') ?? '', alt: null },
          textAlignment: 'left',
          contentPosition: 'left',
          overlayOpacity: 0.28,
          reassuranceText: s('reassuranceText'),
        } satisfies HomepageHeroPayload,
      };

    case 'carousel':
      return {
        ...base,
        type: 'carousel',
        payload: {
          title: s('title'),
          subtitle: s('subtitle'),
          autoplay: raw.autoplay !== false,
          autoplayDelayMs: Number(raw.autoplayDelayMs ?? 5000) || 5000,
          showDots: raw.showDots !== false,
          showArrows: raw.showArrows !== false,
          slides: a<Record<string, unknown>>('slides').map((slide, i) => ({
            id: `legacy-slide-${idx}-${i}`,
            badgeText: (slide.badgeText as string | null) ?? null,
            title: (slide.title as string | null) ?? null,
            subtitle: (slide.subtitle as string | null) ?? null,
            description: (slide.description as string | null) ?? null,
            primaryCta: {
              text: (slide.primaryCtaText as string | null) ?? null,
              href: (slide.primaryCtaHref as string | null) ?? null,
            },
            secondaryCta: {
              text: (slide.secondaryCtaText as string | null) ?? null,
              href: (slide.secondaryCtaHref as string | null) ?? null,
            },
            image: {
              sourceType: 'url',
              url: (slide.imageUrl as string | null) ?? '',
              alt: (slide.title as string | null) ?? null,
            },
            mobileImage: {
              sourceType: 'url',
              url: (slide.mobileImageUrl as string | null) ?? '',
              alt: (slide.title as string | null) ?? null,
            },
            reassuranceText: (slide.reassuranceText as string | null) ?? null,
            textAlignment: ((slide.textAlignment as string | null) ?? 'left') as 'left' | 'center' | 'right',
            contentPosition: ((slide.contentPosition as string | null) ?? 'left') as 'left' | 'center' | 'right',
            overlayOpacity: Number(slide.overlayOpacity ?? 0.28),
            isActive: slide.isActive !== false,
            displayOrder: (slide.displayOrder as number | undefined) ?? i + 1,
            startAt: (slide.startAt as string | null) ?? null,
            endAt: (slide.endAt as string | null) ?? null,
          })),
        } satisfies HomepageCarouselPayload,
      };

    case 'featuredProducts':
      return {
        ...base,
        type: 'featuredProducts',
        payload: {
          title: s('title'),
          subtitle: s('subtitle'),
          description: s('description'),
          selectionMode: 'manual',
          displayMode: 'grid',
          maxItems: 8,
          showPrices: true,
          showBadges: true,
          viewAllCta: { text: 'Voir tout', href: s('viewAllHref') ?? '/articles' },
          articleRefs: a<string>('articleRefs'),
          resolvedProducts: a('resolvedProducts'),
          emptyMessage: s('emptyMessage'),
        } satisfies HomepageFeaturedProductsPayload,
      };

    case 'featuredCatalogues':
      return {
        ...base,
        type: 'catalogues',
        payload: {
          title: s('title'),
          subtitle: s('subtitle'),
          description: s('description'),
          displayMode: 'grid',
          maxItems: 8,
          viewAllCta: { text: 'Voir', href: s('viewAllHref') ?? '/articles' },
          catalogueNos: a<number>('catalogueNos'),
          items: [],
          resolvedCatalogues: a('resolvedCatalogues'),
        } satisfies HomepageCataloguesPayload,
      };

    case 'audiences': {
      const b2b = (raw.b2b ?? raw.b2B ?? {}) as Record<string, unknown>;
      const b2c = (raw.b2c ?? raw.b2C ?? {}) as Record<string, unknown>;
      return {
        ...base,
        type: 'audiences',
        payload: {
          title: s('title'),
          subtitle: s('subtitle'),
          description: s('description'),
          b2B: {
            badgeText: (b2b.badgeText as string | null) ?? null,
            title: (b2b.title as string | null) ?? null,
            description: (b2b.description as string | null) ?? null,
            cta: {
              text: (b2b.ctaText as string | null) ?? null,
              href: (b2b.ctaHref as string | null) ?? null,
            },
          },
          b2C: {
            badgeText: (b2c.badgeText as string | null) ?? null,
            title: (b2c.title as string | null) ?? null,
            description: (b2c.description as string | null) ?? null,
            cta: {
              text: (b2c.ctaText as string | null) ?? null,
              href: (b2c.ctaHref as string | null) ?? null,
            },
          },
        } satisfies HomepageAudiencesPayload,
      };
    }

    case 'advantages':
      return {
        ...base,
        type: 'advantages',
        payload: {
          title: s('title'),
          subtitle: s('subtitle'),
          description: s('description'),
          items: a<Record<string, unknown>>('items').map((it, i) => ({
            id: `legacy-adv-${idx}-${i}`,
            title: (it.title as string | null) ?? null,
            description: (it.description as string | null) ?? null,
            icon: (it.icon as string | null) ?? null,
            displayOrder: (it.displayOrder as number | undefined) ?? i + 1,
            isActive: it.enabled !== false && it.isActive !== false,
          })),
        } satisfies HomepageAdvantagesPayload,
      };

    case 'stats':
      return {
        ...base,
        type: 'stats',
        payload: {
          title: s('title'),
          subtitle: s('subtitle'),
          description: s('description'),
          items: a<Record<string, unknown>>('items').map((it, i) => ({
            id: `legacy-stat-${idx}-${i}`,
            value: (it.value as string | null) ?? null,
            label: (it.label as string | null) ?? null,
            helpText: (it.helpText as string | null) ?? null,
            suffix: (it.suffix as string | null) ?? null,
            displayOrder: (it.displayOrder as number | undefined) ?? i + 1,
            isActive: it.enabled !== false && it.isActive !== false,
          })),
        } satisfies HomepageStatsPayload,
      };

    case 'finalCta':
      return {
        ...base,
        type: 'finalCta',
        payload: {
          title: s('title'),
          subtitle: s('subtitle'),
          description: s('description'),
          primaryCta: { text: s('primaryCtaText'), href: s('primaryCtaHref') },
          secondaryCta: { text: s('secondaryCtaText'), href: s('secondaryCtaHref') },
          backgroundImage: {
            sourceType: 'url',
            url: s('backgroundImageUrl') ?? '',
            alt: null,
          },
        } satisfies HomepageFinalCtaPayload,
      };

    default:
      return null;
  }
}

/* ============================================================================
 * Reverse adapter — sections[] (frontend) → legacy content (backend)
 * ========================================================================= */

function sectionsToLegacyContent(doc: HomepageDocument): Record<string, unknown> {
  const sorted = [...(doc.sections ?? [])].sort(
    (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
  );

  const out: Record<string, unknown> = {
    pageTitle: doc.pageTitle ?? null,
    pageSubtitle: doc.pageSubtitle ?? null,
    sectionOrder: [] as string[],
  };

  for (const section of sorted) {
    const backendKey = frontendTypeToBackendKey(section.type);
    if (!BACKEND_SECTION_TYPES.has(backendKey)) continue;

    const flat = sectionToLegacy(section);
    if (!flat) continue;

    (out.sectionOrder as string[]).push(backendKey);
    out[backendKey] = { ...flat, enabled: section.isActive !== false };
  }

  return out;
}

function sectionToLegacy(section: HomepageSection): Record<string, unknown> | null {
  switch (section.type) {
    case 'hero': {
      const p = section.payload as HomepageHeroPayload;
      return {
        badgeText: p.badgeText ?? null,
        title: p.title ?? null,
        subtitle: p.subtitle ?? null,
        description: p.description ?? null,
        imageUrl: p.image?.url ?? null,
        primaryCtaText: p.primaryCta?.text ?? null,
        primaryCtaHref: p.primaryCta?.href ?? null,
        secondaryCtaText: p.secondaryCta?.text ?? null,
        secondaryCtaHref: p.secondaryCta?.href ?? null,
        reassuranceText: p.reassuranceText ?? null,
      };
    }
    case 'carousel': {
      const p = section.payload as HomepageCarouselPayload;
      return {
        title: p.title ?? null,
        subtitle: p.subtitle ?? null,
        autoplay: p.autoplay !== false,
        autoplayDelayMs: p.autoplayDelayMs ?? 5000,
        showDots: p.showDots !== false,
        showArrows: p.showArrows !== false,
        slides: (p.slides ?? []).map((slide) => ({
          badgeText: slide.badgeText ?? null,
          title: slide.title ?? null,
          subtitle: slide.subtitle ?? null,
          description: slide.description ?? null,
          primaryCtaText: slide.primaryCta?.text ?? null,
          primaryCtaHref: slide.primaryCta?.href ?? null,
          secondaryCtaText: slide.secondaryCta?.text ?? null,
          secondaryCtaHref: slide.secondaryCta?.href ?? null,
          imageUrl: slide.image?.url ?? null,
          mobileImageUrl: slide.mobileImage?.url ?? null,
          reassuranceText: slide.reassuranceText ?? null,
          textAlignment: slide.textAlignment ?? 'left',
          contentPosition: slide.contentPosition ?? 'left',
          overlayOpacity: slide.overlayOpacity ?? 0.28,
          isActive: slide.isActive !== false,
          displayOrder: slide.displayOrder ?? 0,
          startAt: slide.startAt ?? null,
          endAt: slide.endAt ?? null,
        })),
      };
    }
    case 'featuredProducts': {
      const p = section.payload as HomepageFeaturedProductsPayload;
      return {
        title: p.title ?? null,
        subtitle: p.subtitle ?? null,
        description: p.description ?? null,
        articleRefs: p.articleRefs ?? [],
        viewAllHref: p.viewAllCta?.href ?? '/articles',
        emptyMessage: p.emptyMessage ?? null,
      };
    }
    case 'catalogues': {
      const p = section.payload as HomepageCataloguesPayload;
      return {
        title: p.title ?? null,
        subtitle: p.subtitle ?? null,
        description: p.description ?? null,
        catalogueNos: p.catalogueNos ?? [],
        viewAllHref: p.viewAllCta?.href ?? '/articles',
      };
    }
    case 'audiences': {
      const p = section.payload as HomepageAudiencesPayload;
      return {
        title: p.title ?? null,
        subtitle: p.subtitle ?? null,
        description: p.description ?? null,
        b2b: {
          badgeText: p.b2B?.badgeText ?? null,
          title: p.b2B?.title ?? null,
          description: p.b2B?.description ?? null,
          ctaText: p.b2B?.cta?.text ?? null,
          ctaHref: p.b2B?.cta?.href ?? null,
        },
        b2c: {
          badgeText: p.b2C?.badgeText ?? null,
          title: p.b2C?.title ?? null,
          description: p.b2C?.description ?? null,
          ctaText: p.b2C?.cta?.text ?? null,
          ctaHref: p.b2C?.cta?.href ?? null,
        },
      };
    }
    case 'advantages': {
      const p = section.payload as HomepageAdvantagesPayload;
      return {
        title: p.title ?? null,
        subtitle: p.subtitle ?? null,
        description: p.description ?? null,
        items: (p.items ?? []).map((it) => ({
          title: it.title ?? null,
          description: it.description ?? null,
          icon: it.icon ?? null,
        })),
      };
    }
    case 'stats': {
      const p = section.payload as HomepageStatsPayload;
      return {
        title: p.title ?? null,
        subtitle: p.subtitle ?? null,
        description: p.description ?? null,
        items: (p.items ?? []).map((it) => ({
          value: it.value ?? null,
          label: it.label ?? null,
          helpText: it.helpText ?? null,
        })),
      };
    }
    case 'finalCta': {
      const p = section.payload as HomepageFinalCtaPayload;
      return {
        title: p.title ?? null,
        subtitle: p.subtitle ?? null,
        description: p.description ?? null,
        backgroundImageUrl: p.backgroundImage?.url ?? null,
        primaryCtaText: p.primaryCta?.text ?? null,
        primaryCtaHref: p.primaryCta?.href ?? null,
        secondaryCtaText: p.secondaryCta?.text ?? null,
        secondaryCtaHref: p.secondaryCta?.href ?? null,
      };
    }
    default:
      return null;
  }
}

/* ============================================================================
 * API exposée — toutes les routes utilisent axiosClient (JWT auto-injecté)
 * ========================================================================= */

export async function getHomepage() {
  const { data } = await axiosClient.get<unknown>(endpoints.homepage);
  return adaptLegacyHomepage(data);
}

export async function getAdminHomepage() {
  const { data } = await axiosClient.get<unknown>(endpoints.adminHomepage);
  return adaptLegacyAdminDocument(data);
}

export async function getAdminHomepagePreview() {
  const { data } = await axiosClient.get<unknown>(endpoints.adminHomepagePreview);
  return adaptLegacyHomepage(data);
}

export async function saveHomepageDraft(payload: SaveHomepageDraftRequest) {
  const legacyBody = { content: sectionsToLegacyContent(payload.content) };
  const { data } = await axiosClient.put<unknown>(endpoints.adminHomepageDraft, legacyBody);
  return adaptLegacyAdminDocument(data);
}

export async function publishHomepage() {
  const { data } = await axiosClient.post<unknown>(endpoints.adminHomepagePublish);
  return adaptLegacyAdminDocument(data);
}

export async function reorderHomepageSections(payload: ReorderHomepageSectionsRequest) {
  // Le backend actuel n'a pas encore d'endpoint dédié — on log mais on ne casse pas.
  // L'ordre est sauvegardé via saveHomepageDraft (sectionOrder reconstruit côté flat).
  const { data } = await axiosClient.put<unknown>(endpoints.adminHomepageReorderSections, payload);
  return adaptLegacyAdminDocument(data);
}

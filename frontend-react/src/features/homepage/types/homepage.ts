import type { Article } from '../../catalog/types/article';
import type { Catalogue } from '../../catalog/types/catalogue';

export const HOMEPAGE_SECTION_TYPES = [
  'hero',
  'carousel',
  'featuredCategories',
  'featuredProducts',
  'promoBanner',
  'audiences',
  'advantages',
  'catalogues',
  'brands',
  'stats',
  'finalCta',
] as const;

export type HomepageSectionType = (typeof HOMEPAGE_SECTION_TYPES)[number] | 'contact' | 'stores';
export type HomepageImageSourceType = 'url' | 'cloudinary';
export type HomepageDisplayMode = 'grid' | 'slider';

export type HomepageImage = {
  sourceType: HomepageImageSourceType;
  url?: string | null;
  cloudinaryPublicId?: string | null;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
};

export type HomepageCta = {
  text?: string | null;
  href?: string | null;
};

export type HomepageHeroPayload = {
  badgeText?: string | null;
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  primaryCta: HomepageCta;
  secondaryCta: HomepageCta;
  image: HomepageImage;
  mobileImage?: HomepageImage | null;
  textAlignment?: 'left' | 'center' | 'right' | null;
  contentPosition?: 'left' | 'center' | 'right' | null;
  overlayOpacity?: number | null;
  reassuranceText?: string | null;
};

export type HomepageCarouselSlide = {
  id: string;
  badgeText?: string | null;
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  primaryCta: HomepageCta;
  secondaryCta?: HomepageCta | null;
  image: HomepageImage;
  mobileImage?: HomepageImage | null;
  textAlignment?: 'left' | 'center' | 'right' | null;
  contentPosition?: 'left' | 'center' | 'right' | null;
  overlayOpacity?: number | null;
  reassuranceText?: string | null;
  displayOrder: number;
  isActive: boolean;
  startAt?: string | null;
  endAt?: string | null;
};

export type HomepageCarouselPayload = {
  title?: string | null;
  subtitle?: string | null;
  autoplay: boolean;
  autoplayDelayMs: number;
  showDots: boolean;
  showArrows: boolean;
  slides: HomepageCarouselSlide[];
};

export type HomepageResolvedCatalogue = {
  catalogueNo: number;
  code: string;
  title: string;
  level: number;
  parentNo: number;
};

export type HomepageFeaturedCategoryItem = {
  id: string;
  catalogueNo: number;
  label?: string | null;
  description?: string | null;
  image?: HomepageImage | null;
  targetHref?: string | null;
  displayOrder: number;
  isActive: boolean;
  resolvedCatalogue?: HomepageResolvedCatalogue | null;
};

export type HomepageFeaturedCategoriesPayload = {
  title?: string | null;
  subtitle?: string | null;
  displayMode: HomepageDisplayMode;
  maxItems: number;
  items: HomepageFeaturedCategoryItem[];
};

export type HomepageResolvedArticle = {
  articleRef: string;
  designation: string;
  price: number;
  priceTtc: number;
  availableStock: number;
  stockStatus: string;
  imageUrl?: string | null;
  isPublished: number;
  isSleeping: number;
};

export type HomepageFeaturedProductsPayload = {
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  selectionMode: 'manual';
  displayMode: HomepageDisplayMode;
  maxItems: number;
  showPrices: boolean;
  showBadges: boolean;
  viewAllCta?: HomepageCta | null;
  articleRefs: string[];
  resolvedProducts?: HomepageResolvedArticle[];
  emptyMessage?: string | null;
};

export type HomepageAudienceCard = {
  badgeText?: string | null;
  title?: string | null;
  description?: string | null;
  cta: HomepageCta;
};

export type HomepageAudiencesPayload = {
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  b2B: HomepageAudienceCard;
  b2C: HomepageAudienceCard;
};

export type HomepagePromoBannerPayload = {
  badgeText?: string | null;
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  primaryCta: HomepageCta;
  secondaryCta: HomepageCta;
  image: HomepageImage;
  mobileImage?: HomepageImage | null;
};

export type HomepageAdvantageItem = {
  id: string;
  title?: string | null;
  description?: string | null;
  icon?: string | null;
  displayOrder: number;
  isActive: boolean;
};

export type HomepageAdvantagesPayload = {
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  items: HomepageAdvantageItem[];
};

export type HomepageCatalogueSpotlightItem = {
  id: string;
  catalogueNo: number;
  label?: string | null;
  description?: string | null;
  badgeText?: string | null;
  image?: HomepageImage | null;
  targetHref?: string | null;
  displayOrder: number;
  isActive: boolean;
  resolvedCatalogue?: HomepageResolvedCatalogue | null;
};

export type HomepageCataloguesPayload = {
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  displayMode: HomepageDisplayMode;
  maxItems: number;
  viewAllCta?: HomepageCta | null;
  catalogueNos: number[];
  items: HomepageCatalogueSpotlightItem[];
  resolvedCatalogues?: HomepageResolvedCatalogue[];
};

export type HomepageBrandItem = {
  id: string;
  label?: string | null;
  image: HomepageImage;
  targetHref?: string | null;
  displayOrder: number;
  isActive: boolean;
};

export type HomepageBrandsPayload = {
  title?: string | null;
  subtitle?: string | null;
  displayMode: HomepageDisplayMode;
  autoplay: boolean;
  items: HomepageBrandItem[];
};

export type HomepageStatItem = {
  id: string;
  value?: string | null;
  label?: string | null;
  helpText?: string | null;
  suffix?: string | null;
  displayOrder: number;
  isActive: boolean;
};

export type HomepageStatsPayload = {
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  items: HomepageStatItem[];
};

export type HomepageContactPayload = {
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  phoneLabel?: string | null;
  phone?: string | null;
  emailLabel?: string | null;
  email?: string | null;
  addressLabel?: string | null;
  address?: string | null;
  hoursTitle?: string | null;
  hours: string[];
  primaryCta: HomepageCta;
  secondaryCta: HomepageCta;
};

export type HomepageResolvedStore = {
  depotNo: number;
  code: string;
  title: string;
  address?: string | null;
  complement?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
  isPrimary: number;
};

export type HomepageStoreItem = {
  id: string;
  depotNo: number;
  label?: string | null;
  description?: string | null;
  targetHref?: string | null;
  displayOrder: number;
  isActive: boolean;
  resolvedStore?: HomepageResolvedStore | null;
};

export type HomepageStoresPayload = {
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  selectionMode: 'manual';
  displayMode: HomepageDisplayMode;
  maxItems: number;
  viewAllCta?: HomepageCta | null;
  depotNos: number[];
  items: HomepageStoreItem[];
};

export type HomepageFinalCtaPayload = {
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  primaryCta: HomepageCta;
  secondaryCta: HomepageCta;
  backgroundImage: HomepageImage;
  mobileBackgroundImage?: HomepageImage | null;
};

export type HomepageSectionPayload =
  | HomepageHeroPayload
  | HomepageCarouselPayload
  | HomepageFeaturedCategoriesPayload
  | HomepageFeaturedProductsPayload
  | HomepagePromoBannerPayload
  | HomepageAudiencesPayload
  | HomepageAdvantagesPayload
  | HomepageCataloguesPayload
  | HomepageBrandsPayload
  | HomepageContactPayload
  | HomepageStoresPayload
  | HomepageStatsPayload
  | HomepageFinalCtaPayload;

export type HomepageSection = {
  id: string;
  type: HomepageSectionType;
  name?: string | null;
  displayOrder: number;
  isActive: boolean;
  startAt?: string | null;
  endAt?: string | null;
  layoutVariant?: string | null;
  themeVariant?: string | null;
  payload: HomepageSectionPayload;
};

export type HomepageDocument = {
  pageTitle?: string | null;
  pageSubtitle?: string | null;
  sections: HomepageSection[];
};

export type HomepageView = {
  isPublished: boolean;
  publishedAt?: string | null;
  content: HomepageDocument;
};

export type HomepageAdminDocument = {
  draft: HomepageDocument;
  published?: HomepageDocument | null;
  hasPublishedVersion: boolean;
  updatedAt: string;
  publishedAt?: string | null;
};

export type SaveHomepageDraftRequest = {
  content: HomepageDocument;
};

export type ReorderHomepageSectionsRequest = {
  sectionIds: string[];
};

export type HomepageImageAsset = {
  url: string;
  publicId: string;
  format: string;
  width?: number | null;
  height?: number | null;
  bytes?: number | null;
  alt?: string | null;
  sourceType: HomepageImageSourceType;
};

export function cloneHomepageDocument(content: HomepageDocument): HomepageDocument {
  return JSON.parse(JSON.stringify(content)) as HomepageDocument;
}

export function createDefaultHomepageImage(): HomepageImage {
  return {
    sourceType: 'url',
    url: '',
    cloudinaryPublicId: '',
    alt: '',
    width: null,
    height: null,
  };
}

export function createDefaultHomepageDocument(): HomepageDocument {
  return {
    pageTitle: 'Page d’accueil e-commerce administrable',
    pageSubtitle:
      'Pilotez les contenus de la page d’accueil depuis l’administration, avec brouillon séparé et publication maîtrisée.',
    sections: [
      createSectionByType('hero', 1),
      createSectionByType('featuredProducts', 2),
      createSectionByType('advantages', 3),
      createSectionByType('finalCta', 4),
    ],
  };
}

export function createSectionByType(type: HomepageSectionType, order: number): HomepageSection {
  const base = {
    id: createLocalId(type),
    type,
    name: getHomepageSectionLabel(type),
    displayOrder: order,
    isActive: true,
    startAt: null,
    endAt: null,
    layoutVariant: '',
    themeVariant: '',
  };

  switch (type) {
    case 'hero':
      return {
        ...base,
        payload: {
          badgeText: 'Nouveauté',
          title: 'Une homepage pilotée par l’admin',
          subtitle: 'Moderne, administrable et connectée au catalogue.',
          description: 'Gère les sections, les images, les CTA et l’ordre d’affichage depuis le back-office React.',
          primaryCta: { text: 'Voir le catalogue', href: '/articles' },
          secondaryCta: { text: 'Nous contacter', href: '/contact' },
          image: createDefaultHomepageImage(),
          mobileImage: createDefaultHomepageImage(),
          textAlignment: 'left',
          contentPosition: 'left',
          overlayOpacity: 0.2,
          reassuranceText: 'Images flexibles • Brouillon séparé • Sections dynamiques',
        } satisfies HomepageHeroPayload,
      };
    case 'carousel':
      return {
        ...base,
        payload: {
          title: 'Carrousel marketing',
          subtitle: 'Fais tourner plusieurs messages forts.',
          autoplay: true,
          autoplayDelayMs: 5000,
          showDots: true,
          showArrows: true,
          slides: [createCarouselSlide(1)],
        } satisfies HomepageCarouselPayload,
      };
    case 'featuredCategories':
      return {
        ...base,
        payload: {
          title: 'Catégories mises en avant',
          subtitle: 'Guide la navigation vers les catalogues clés.',
          displayMode: 'grid',
          maxItems: 6,
          items: [],
        } satisfies HomepageFeaturedCategoriesPayload,
      };
    case 'featuredProducts':
      return {
        ...base,
        payload: {
          title: 'Produits en vedette',
          subtitle: 'Sélectionnés parmi les références existantes.',
          description: 'Choisis des articles réels depuis la base locale.',
          selectionMode: 'manual',
          displayMode: 'grid',
          maxItems: 8,
          showPrices: true,
          showBadges: true,
          viewAllCta: { text: 'Voir tous les articles', href: '/articles' },
          articleRefs: [],
          resolvedProducts: [],
          emptyMessage: 'Aucun produit mis en avant n’est encore configuré.',
        } satisfies HomepageFeaturedProductsPayload,
      };
    case 'promoBanner':
      return {
        ...base,
        payload: {
          badgeText: 'Promo',
          title: 'Une campagne commerciale bien visible',
          subtitle: 'Ajoute un bandeau marketing entre deux sections.',
          description: 'Cette section permet de pousser une offre, une saisonnalité ou un univers produit.',
          primaryCta: { text: 'Découvrir', href: '/articles' },
          secondaryCta: { text: 'Contact', href: '/contact' },
          image: createDefaultHomepageImage(),
          mobileImage: createDefaultHomepageImage(),
        } satisfies HomepagePromoBannerPayload,
      };
    case 'audiences':
      return {
        ...base,
        payload: {
          title: 'Deux parcours, une plateforme',
          subtitle: 'B2B et B2C sur le même socle.',
          description: 'Adapte les messages selon tes cibles sans dupliquer la logique métier.',
          b2B: {
            badgeText: 'B2B',
            title: 'Professionnels',
            description: 'Mets en avant les parcours vendeurs et les besoins entreprise.',
            cta: { text: 'Voir le catalogue pro', href: '/articles' },
          },
          b2C: {
            badgeText: 'B2C',
            title: 'Particuliers',
            description: 'Présente une expérience simple et rassurante pour la commande en ligne.',
            cta: { text: 'Voir les nouveautés', href: '/articles' },
          },
        } satisfies HomepageAudiencesPayload,
      };
    case 'advantages':
      return {
        ...base,
        payload: {
          title: 'Pourquoi nous choisir ? ',
          subtitle: 'Des avantages éditables côté administration.',
          description: 'Cette zone rassure l’utilisateur et renforce la crédibilité du projet.',
          items: [
            createAdvantageItem(1, 'Catalogue synchronisé', 'Le contenu de la page d’accueil reste aligné avec les données réelles.', '📦'),
            createAdvantageItem(2, 'Images flexibles', 'Chaque visuel peut venir d’un lien direct ou de la médiathèque.', '🖼️'),
            createAdvantageItem(3, 'Processus professionnel', 'Brouillon, prévisualisation et publication maîtrisés.', '🚀'),
          ],
        } satisfies HomepageAdvantagesPayload,
      };
    case 'catalogues':
      return {
        ...base,
        payload: {
          title: 'Catalogues / univers',
          subtitle: 'Met en avant des familles stratégiques.',
          description: 'Les éléments pointent vers les catalogues existants.',
          displayMode: 'grid',
          maxItems: 8,
          viewAllCta: { text: 'Voir tous les catalogues', href: '/articles' },
          catalogueNos: [],
          items: [],
          resolvedCatalogues: [],
        } satisfies HomepageCataloguesPayload,
      };
    case 'brands':
      return {
        ...base,
        payload: {
          title: 'Marques partenaires',
          subtitle: 'Ajoute une zone de réassurance visuelle.',
          displayMode: 'slider',
          autoplay: true,
          items: [createBrandItem(1)],
        } satisfies HomepageBrandsPayload,
      };
    case 'contact':
      return {
        ...base,
        payload: {
          title: 'Contactez-nous',
          subtitle: 'Une équipe disponible pour vous accompagner.',
          description: 'Mettez en avant les coordonnées clés et les canaux de contact les plus utiles.',
          phoneLabel: 'Téléphone',
          phone: '+216 00 000 000',
          emailLabel: 'Email',
          email: 'support@ecommerce.tn',
          addressLabel: 'Adresse',
          address: 'Sfax, Tunisie',
          hoursTitle: 'Horaires',
          hours: ['Lun – Ven : 09:00 – 17:00', 'Sam : 09:00 – 13:00'],
          primaryCta: { text: 'Nous écrire', href: '/contact' },
          secondaryCta: { text: 'Voir le catalogue', href: '/articles' },
        } satisfies HomepageContactPayload,
      };
    case 'stores':
      return {
        ...base,
        payload: {
          title: 'Nos magasins',
          subtitle: 'Retrouvez nos points de présence.',
          description: 'Sélectionnez les dépôts ou magasins à mettre en avant sur la homepage.',
          selectionMode: 'manual',
          displayMode: 'grid',
          maxItems: 6,
          viewAllCta: { text: 'Nous contacter', href: '/contact' },
          depotNos: [],
          items: [],
        } satisfies HomepageStoresPayload,
      };
    case 'stats':
      return {
        ...base,
        payload: {
          title: 'Quelques chiffres',
          subtitle: 'Des indicateurs simples mais parlants.',
          description: 'Ces KPI peuvent être édités depuis l’admin.',
          items: [
            createStatItem(1, '+100', 'Références synchronisées', 'À personnaliser'),
            createStatItem(2, '24/7', 'Consultation catalogue', 'Toujours disponible'),
            createStatItem(3, 'B2B / B2C', 'Parcours gérés', 'Même socle métier'),
          ],
        } satisfies HomepageStatsPayload,
      };
    case 'finalCta':
      return {
        ...base,
        payload: {
          title: 'Prêt à publier votre homepage ?',
          subtitle: 'Finalise la page avec un appel à l’action clair.',
          description: 'Cette section conclut la homepage avec un bouton fort.',
          primaryCta: { text: 'Accéder au catalogue', href: '/articles' },
          secondaryCta: { text: 'Contacter l’équipe', href: '/contact' },
          backgroundImage: createDefaultHomepageImage(),
          mobileBackgroundImage: createDefaultHomepageImage(),
        } satisfies HomepageFinalCtaPayload,
      };
  }
}

export function duplicateSection(section: HomepageSection, order: number): HomepageSection {
  const copy = cloneHomepageDocument({ sections: [section] }).sections[0];
  copy.id = createLocalId(section.type);
  copy.displayOrder = order;
  copy.name = `${section.name ?? getHomepageSectionLabel(section.type)} (copie)`;

  if (section.type === 'carousel') {
    const payload = copy.payload as HomepageCarouselPayload;
    payload.slides = payload.slides.map((slide, index) => ({
      ...slide,
      id: createLocalId('slide'),
      displayOrder: index + 1,
    }));
  }

  if (section.type === 'advantages') {
    const payload = copy.payload as HomepageAdvantagesPayload;
    payload.items = payload.items.map((item, index) => ({ ...item, id: createLocalId('adv'), displayOrder: index + 1 }));
  }

  if (section.type === 'brands') {
    const payload = copy.payload as HomepageBrandsPayload;
    payload.items = payload.items.map((item, index) => ({ ...item, id: createLocalId('brand'), displayOrder: index + 1 }));
  }

  if (section.type === 'stats') {
    const payload = copy.payload as HomepageStatsPayload;
    payload.items = payload.items.map((item, index) => ({ ...item, id: createLocalId('stat'), displayOrder: index + 1 }));
  }

  if (section.type === 'featuredCategories') {
    const payload = copy.payload as HomepageFeaturedCategoriesPayload;
    payload.items = payload.items.map((item, index) => ({ ...item, id: createLocalId('cat'), displayOrder: index + 1 }));
  }

  if (section.type === 'catalogues') {
    const payload = copy.payload as HomepageCataloguesPayload;
    payload.items = payload.items.map((item, index) => ({ ...item, id: createLocalId('catalogue'), displayOrder: index + 1 }));
  }

  if (section.type === 'stores') {
    const payload = copy.payload as HomepageStoresPayload;
    payload.items = payload.items.map((item, index) => ({ ...item, id: createLocalId('store'), displayOrder: index + 1 }));
  }

  return copy;
}

export function sortHomepageSections(sections: HomepageSection[]): HomepageSection[] {
  return [...sections]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((section, index) => ({ ...section, displayOrder: index + 1 }));
}

export function getHomepageSectionLabel(type: HomepageSectionType): string {
  switch (type) {
    case 'hero':
      return 'Bannière principale';
    case 'carousel':
      return 'Carrousel marketing';
    case 'featuredCategories':
      return 'Catégories mises en avant';
    case 'featuredProducts':
      return 'Produits mis en avant';
    case 'promoBanner':
      return 'Bannière promotionnelle';
    case 'audiences':
      return 'Parcours B2B / B2C';
    case 'advantages':
      return 'Bandeau avantages';
    case 'catalogues':
      return 'Catalogues / univers';
    case 'brands':
      return 'Marques partenaires';
    case 'contact':
      return 'Contactez-nous';
    case 'stores':
      return 'Nos magasins';
    case 'stats':
      return 'Statistiques';
    case 'finalCta':
      return 'Appel à l’action final';
  }
}

export function createLocalHomepageView(
  document: HomepageDocument,
  articles: Article[],
  catalogues: Catalogue[],
  publishedAt?: string | null,
): HomepageView {
  const clone = cloneHomepageDocument(document);

  clone.sections = sortHomepageSections(clone.sections).map((section) => {
    if (section.type === 'featuredProducts') {
      const payload = section.payload as Partial<HomepageFeaturedProductsPayload>;
      const articleRefs = payload.articleRefs ?? [];

      return {
        ...section,
        payload: {
          ...payload,
          title: payload.title ?? '',
          subtitle: payload.subtitle ?? '',
          description: payload.description ?? '',
          selectionMode: 'manual',
          displayMode: payload.displayMode ?? 'grid',
          maxItems: typeof payload.maxItems === 'number' ? payload.maxItems : 8,
          showPrices: payload.showPrices ?? true,
          showBadges: payload.showBadges ?? true,
          viewAllCta: payload.viewAllCta ?? { text: 'Voir tout', href: '/articles' },
          articleRefs,
          emptyMessage:
            payload.emptyMessage ?? "Aucun produit mis en avant n’est encore configuré.",
          resolvedProducts: articleRefs
            .map((ref) => articles.find((article) => article.aR_Ref === ref))
            .filter((article): article is Article => Boolean(article))
            .slice(0, typeof payload.maxItems === 'number' ? payload.maxItems : 8)
            .map((article) => ({
              articleRef: article.aR_Ref,
              designation: article.aR_Design,
              price: article.aR_PrixVen,
              priceTtc: article.aR_PrixTTC,
              availableStock: article.availableStock,
              stockStatus: article.stockStatus,
              imageUrl: article.aR_Image,
              isPublished: article.aR_Publie,
              isSleeping: article.aR_Sommeil,
            })),
        } satisfies HomepageFeaturedProductsPayload,
      };
    }

    if (section.type === 'catalogues') {
      const payload = section.payload as Partial<HomepageCataloguesPayload>;
      const catalogueNos = payload.catalogueNos ?? [];
      const items = payload.items ?? [];
      const maxItems = typeof payload.maxItems === 'number' ? payload.maxItems : 8;

      return {
        ...section,
        payload: {
          ...payload,
          title: payload.title ?? '',
          subtitle: payload.subtitle ?? '',
          description: payload.description ?? '',
          displayMode: payload.displayMode ?? 'grid',
          maxItems,
          viewAllCta:
            payload.viewAllCta ?? { text: 'Voir tous les catalogues', href: '/articles' },
          catalogueNos,
          items: items.map((item) => {
            const catalogue = catalogues.find((entry) => entry.cL_No === item.catalogueNo);
            return {
              ...item,
              resolvedCatalogue: catalogue
                ? {
                    catalogueNo: catalogue.cL_No,
                    code: catalogue.cL_Code,
                    title: catalogue.cL_Intitule,
                    level: catalogue.cL_Niveau,
                    parentNo: catalogue.cL_NoParent,
                  }
                : undefined,
            };
          }),
          resolvedCatalogues: catalogueNos
            .map((catalogueNo) =>
              catalogues.find((catalogue) => catalogue.cL_No === catalogueNo),
            )
            .filter((catalogue): catalogue is Catalogue => Boolean(catalogue))
            .slice(0, maxItems)
            .map((catalogue) => ({
              catalogueNo: catalogue.cL_No,
              code: catalogue.cL_Code,
              title: catalogue.cL_Intitule,
              level: catalogue.cL_Niveau,
              parentNo: catalogue.cL_NoParent,
            })),
        } satisfies HomepageCataloguesPayload,
      };
    }

    if (section.type === 'featuredCategories') {
      const payload = section.payload as Partial<HomepageFeaturedCategoriesPayload>;
      const items = payload.items ?? [];

      return {
        ...section,
        payload: {
          ...payload,
          title: payload.title ?? '',
          subtitle: payload.subtitle ?? '',
          displayMode: payload.displayMode ?? 'grid',
          maxItems: typeof payload.maxItems === 'number' ? payload.maxItems : 6,
          items: items.map((item) => {
            const catalogue = catalogues.find((entry) => entry.cL_No === item.catalogueNo);
            return {
              ...item,
              resolvedCatalogue: catalogue
                ? {
                    catalogueNo: catalogue.cL_No,
                    code: catalogue.cL_Code,
                    title: catalogue.cL_Intitule,
                    level: catalogue.cL_Niveau,
                    parentNo: catalogue.cL_NoParent,
                  }
                : undefined,
            };
          }),
        } satisfies HomepageFeaturedCategoriesPayload,
      };
    }

    if (section.type === 'stores') {
      const payload = section.payload as Partial<HomepageStoresPayload>;

      return {
        ...section,
        payload: {
          ...payload,
          title: payload.title ?? '',
          subtitle: payload.subtitle ?? '',
          description: payload.description ?? '',
          selectionMode: 'manual',
          displayMode: payload.displayMode ?? 'grid',
          maxItems: typeof payload.maxItems === 'number' ? payload.maxItems : 6,
          viewAllCta: payload.viewAllCta ?? { text: 'Nous contacter', href: '/contact' },
          depotNos: payload.depotNos ?? [],
          items: payload.items ?? [],
        } satisfies HomepageStoresPayload,
      };
    }

    return section;
  });

  return {
    isPublished: false,
    publishedAt,
    content: clone,
  };
}

export function createLocalId(prefix: string): string {
  const safePrefix = prefix.trim().toLowerCase() || 'section';
  return `${safePrefix}-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function getImagePreviewUrl(image?: HomepageImage | null): string | undefined {
  if (!image) return undefined;
  return image.url?.trim() || undefined;
}

function createCarouselSlide(order: number): HomepageCarouselSlide {
  return {
    id: createLocalId('slide'),
    badgeText: order === 1 ? 'Visuel principal' : '',
    title: `Visuel ${order}`,
    subtitle: 'Titre marketing',
    description: 'Ajoutez ici un message court, un visuel et un bouton.',
    primaryCta: { text: 'Découvrir', href: '/articles' },
    secondaryCta: { text: 'Contact', href: '/contact' },
    image: createDefaultHomepageImage(),
    mobileImage: createDefaultHomepageImage(),
    textAlignment: 'left',
    contentPosition: 'left',
    overlayOpacity: 0.28,
    reassuranceText: '',
    displayOrder: order,
    isActive: true,
    startAt: null,
    endAt: null,
  };
}

function createAdvantageItem(order: number, title: string, description: string, icon: string): HomepageAdvantageItem {
  return {
    id: createLocalId('adv'),
    title,
    description,
    icon,
    displayOrder: order,
    isActive: true,
  };
}

function createBrandItem(order: number): HomepageBrandItem {
  return {
    id: createLocalId('brand'),
    label: `Marque ${order}`,
    image: createDefaultHomepageImage(),
    targetHref: '',
    displayOrder: order,
    isActive: true,
  };
}

function createStatItem(order: number, value: string, label: string, helpText: string): HomepageStatItem {
  return {
    id: createLocalId('stat'),
    value,
    label,
    helpText,
    suffix: '',
    displayOrder: order,
    isActive: true,
  };
}

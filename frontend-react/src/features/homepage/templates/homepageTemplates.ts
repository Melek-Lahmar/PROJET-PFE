import type { Article } from "../../catalog/types/article";
import type { Catalogue } from "../../catalog/types/catalogue";
import type { HomepageThemeId } from "../themes/HomepageThemes";
import {
  createDefaultHomepageImage,
  createLocalId,
  sortHomepageSections,
  type HomepageAdvantageItem,
  type HomepageAdvantagesPayload,
  type HomepageAudiencesPayload,
  type HomepageCataloguesPayload,
  type HomepageCta,
  type HomepageDocument,
  type HomepageFeaturedProductsPayload,
  type HomepageFinalCtaPayload,
  type HomepageHeroPayload,
  type HomepageImage,
  type HomepageSection,
  type HomepageSectionPayload,
  type HomepageSectionType,
  type HomepageStatItem,
  type HomepageStatsPayload,
} from "../types/homepage";

export type HomepageTemplateId =
  | "boutique-moderne"
  | "marketplace-commerciale"
  | "distribution-b2b"
  | "stock-livraison";

export type HomepageTemplateContext = {
  articles?: Article[];
  catalogues?: Catalogue[];
};

export type HomepageTemplateDefinition = {
  id: HomepageTemplateId;
  name: string;
  badge: string;
  description: string;
  objective: string;
  visualStyle: string;
  includedSections: string[];
  themeId: HomepageThemeId;
  createDocument: (context?: HomepageTemplateContext) => HomepageDocument;
};

type PersistedHomepageSectionType =
  | "hero"
  | "featuredProducts"
  | "catalogues"
  | "audiences"
  | "advantages"
  | "stats"
  | "finalCta";

const MAX_PRODUCTS = 8;
const MAX_CATALOGUES = 8;

function image(alt = ""): HomepageImage {
  return { ...createDefaultHomepageImage(), alt };
}

function cta(text: string, href: string): HomepageCta {
  return { text, href };
}

function section(
  type: PersistedHomepageSectionType,
  order: number,
  name: string,
  payload: HomepageSectionPayload,
): HomepageSection {
  return {
    id: createLocalId(type),
    type,
    name,
    displayOrder: order,
    isActive: true,
    startAt: null,
    endAt: null,
    layoutVariant: "",
    themeVariant: "",
    payload,
  };
}

function advantage(order: number, title: string, description: string, icon: string): HomepageAdvantageItem {
  return {
    id: createLocalId("adv"),
    title,
    description,
    icon,
    displayOrder: order,
    isActive: true,
  };
}

function stat(order: number, value: string, label: string, helpText: string): HomepageStatItem {
  return {
    id: createLocalId("stat"),
    value,
    label,
    helpText,
    suffix: "",
    displayOrder: order,
    isActive: true,
  };
}

function selectArticleRefs(context: HomepageTemplateContext | undefined, maxItems = MAX_PRODUCTS) {
  const articles = context?.articles ?? [];
  const publicArticles = articles.filter(
    (article) => Number(article.aR_Publie ?? 1) !== 0 && Number(article.aR_Sommeil ?? 0) === 0,
  );
  const source = publicArticles.length > 0 ? publicArticles : articles;

  return source
    .map((article) => article.aR_Ref?.trim())
    .filter((ref): ref is string => Boolean(ref))
    .slice(0, maxItems);
}

function selectCatalogueNos(context: HomepageTemplateContext | undefined, maxItems = MAX_CATALOGUES) {
  return (context?.catalogues ?? [])
    .map((catalogue) => catalogue.cL_No)
    .filter((catalogueNo) => Number.isFinite(catalogueNo) && catalogueNo > 0)
    .slice(0, maxItems);
}

function hero(payload: HomepageHeroPayload): HomepageSection {
  return section("hero", 1, "Bannière principale", payload);
}

function products(
  order: number,
  payload: Omit<HomepageFeaturedProductsPayload, "selectionMode" | "displayMode" | "showPrices" | "showBadges" | "resolvedProducts">,
): HomepageSection {
  return section("featuredProducts", order, "Produits en vedette", {
    ...payload,
    selectionMode: "manual",
    displayMode: "grid",
    showPrices: true,
    showBadges: true,
    resolvedProducts: [],
  } satisfies HomepageFeaturedProductsPayload);
}

function catalogues(order: number, payload: Omit<HomepageCataloguesPayload, "displayMode" | "items" | "resolvedCatalogues">): HomepageSection {
  return section("catalogues", order, "Catalogues", {
    ...payload,
    displayMode: "grid",
    items: [],
    resolvedCatalogues: [],
  } satisfies HomepageCataloguesPayload);
}

function audiences(order: number, payload: HomepageAudiencesPayload): HomepageSection {
  return section("audiences", order, "Parcours clients", payload);
}

function advantages(order: number, payload: HomepageAdvantagesPayload): HomepageSection {
  return section("advantages", order, "Avantages", payload);
}

function stats(order: number, payload: HomepageStatsPayload): HomepageSection {
  return section("stats", order, "Statistiques", payload);
}

function finalCta(order: number, payload: HomepageFinalCtaPayload): HomepageSection {
  return section("finalCta", order, "Appel à l’action final", payload);
}

function document(pageTitle: string, pageSubtitle: string, sections: HomepageSection[]): HomepageDocument {
  return {
    pageTitle,
    pageSubtitle,
    sections: sortHomepageSections(sections),
  };
}

export function createBoutiqueModerneTemplate(context?: HomepageTemplateContext): HomepageDocument {
  return document(
    "Boutique moderne",
    "Page d’accueil e-commerce premium, claire et commerciale.",
    [
      hero({
        badgeText: "Offres sélectionnées",
        title: "Votre boutique en ligne simple, rapide et organisée",
        subtitle: "Découvrez nos articles, consultez les disponibilités et passez vos commandes avec une expérience fluide et professionnelle.",
        description: "Une plateforme e-commerce connectée au catalogue, au stock et au suivi des commandes pour faciliter l’achat en ligne.",
        primaryCta: cta("Découvrir le catalogue", "/articles"),
        secondaryCta: cta("Nous contacter", "/contact"),
        image: image("Boutique en ligne moderne"),
        mobileImage: image("Boutique en ligne moderne"),
        textAlignment: "left",
        contentPosition: "left",
        overlayOpacity: 0.3,
        reassuranceText: "Service réactif • Paiement sécurisé • Livraison organisée",
      }),
      advantages(2, {
        title: "Pourquoi commander chez nous ?",
        subtitle: "Avantages clients",
        description: "Des repères simples pour rassurer les visiteurs et accélérer la décision d’achat.",
        items: [
          advantage(1, "Service réactif", "Une équipe disponible pour accompagner vos demandes.", "⚡"),
          advantage(2, "Paiement sécurisé", "Une expérience de commande fiable et contrôlée.", "🔒"),
          advantage(3, "Livraison organisée", "Les commandes sont suivies jusqu’à la livraison.", "🚚"),
          advantage(4, "Retour transparent", "Une gestion claire des demandes et réclamations.", "↩"),
        ],
      }),
      products(3, {
        title: "Produits en vedette",
        subtitle: "Sélection commerciale",
        description: "Retrouvez les articles les plus demandés, les nouveautés et les références importantes du moment.",
        maxItems: 8,
        viewAllCta: cta("Voir tous les articles", "/articles"),
        articleRefs: selectArticleRefs(context, 8),
        emptyMessage: "Aucun produit en vedette n’est encore sélectionné.",
      }),
      catalogues(4, {
        title: "Acheter par catégorie",
        subtitle: "Navigation rapide",
        description: "Accédez rapidement aux familles de produits les plus importantes.",
        maxItems: 8,
        viewAllCta: cta("Voir toutes les catégories", "/articles"),
        catalogueNos: selectCatalogueNos(context, 8),
      }),
      finalCta(5, {
        title: "Prêt à commander ?",
        subtitle: "Commande en ligne",
        description: "Parcourez le catalogue, ajoutez vos articles au panier et suivez vos commandes simplement.",
        primaryCta: cta("Accéder au catalogue", "/articles"),
        secondaryCta: cta("Contacter l’équipe", "/contact"),
        backgroundImage: image("Commande e-commerce"),
        mobileBackgroundImage: image("Commande e-commerce"),
      }),
    ],
  );
}

export function createMarketplaceCommercialeTemplate(context?: HomepageTemplateContext): HomepageDocument {
  return document(
    "Marketplace commerciale",
    "Page d’accueil riche pour valoriser un grand catalogue et des offres commerciales.",
    [
      hero({
        badgeText: "Meilleure offre",
        title: "Des produits sélectionnés pour tous vos besoins",
        subtitle: "Découvrez une sélection commerciale mise à jour régulièrement.",
        description: "Explorez les catégories, comparez les articles et commandez simplement depuis votre espace e-commerce.",
        primaryCta: cta("Acheter maintenant", "/articles"),
        secondaryCta: cta("Voir les nouveautés", "/articles"),
        image: image("Marketplace commerciale"),
        mobileImage: image("Marketplace commerciale"),
        textAlignment: "left",
        contentPosition: "left",
        overlayOpacity: 0.32,
        reassuranceText: "Grand catalogue • Catégories claires • Offres sélectionnées",
      }),
      catalogues(2, {
        title: "Acheter par catégories",
        subtitle: "Top catégories",
        description: "Une navigation claire pour accéder rapidement aux familles de produits.",
        maxItems: 8,
        viewAllCta: cta("Explorer les catégories", "/articles"),
        catalogueNos: selectCatalogueNos(context, 8),
      }),
      products(3, {
        title: "Meilleures offres du moment",
        subtitle: "Promotions sélectionnées",
        description: "Mettez en avant les articles à forte valeur commerciale, les remises ou les produits prioritaires.",
        maxItems: 6,
        viewAllCta: cta("Voir les offres", "/articles"),
        articleRefs: selectArticleRefs(context, 6),
        emptyMessage: "Aucune offre n’est encore sélectionnée.",
      }),
      advantages(4, {
        title: "Une expérience d’achat simple et riche",
        subtitle: "Univers commerciaux",
        description: "Présentez les points forts d’une grande boutique en ligne sans dupliquer les blocs techniques.",
        items: [
          advantage(1, "Offres renouvelées", "Les sélections commerciales peuvent être actualisées depuis le brouillon.", "🏷"),
          advantage(2, "Catégories visibles", "Les familles de produits guident rapidement le visiteur.", "🗂"),
          advantage(3, "Commande simple", "Le parcours reste lisible depuis la découverte jusqu’au catalogue.", "🛒"),
          advantage(4, "Support accessible", "Les visiteurs peuvent contacter l’équipe depuis les appels à l’action.", "💬"),
        ],
      }),
      stats(5, {
        title: "Une plateforme pensée pour vos achats",
        subtitle: "Repères commerciaux",
        description: "Des chiffres simples pour renforcer la confiance et la lisibilité du service.",
        items: [
          stat(1, "+100", "Références catalogue", "Large choix de produits disponibles."),
          stat(2, "24/7", "Consultation en ligne", "Le catalogue reste accessible à tout moment."),
          stat(3, "B2B/B2C", "Parcours clients", "Une expérience adaptée aux professionnels et particuliers."),
          stat(4, "Stock suivi", "Disponibilités contrôlées", "Les produits restent reliés à la logique de stock."),
        ],
      }),
      finalCta(6, {
        title: "Trouvez rapidement ce dont vous avez besoin",
        subtitle: "Catalogue en ligne",
        description: "Explorez les catégories, comparez les articles et passez vos commandes en quelques clics.",
        primaryCta: cta("Explorer les offres", "/articles"),
        secondaryCta: cta("Contacter le support", "/contact"),
        backgroundImage: image("Offres commerciales"),
        mobileBackgroundImage: image("Offres commerciales"),
      }),
    ],
  );
}

export function createDistributionB2BTemplate(context?: HomepageTemplateContext): HomepageDocument {
  return document(
    "Distribution B2B",
    "Page d’accueil professionnelle orientée entreprises, commandes et relation commerciale.",
    [
      hero({
        badgeText: "Espace B2B",
        title: "Une plateforme e-commerce adaptée aux professionnels",
        subtitle: "Consultez le catalogue, préparez vos commandes et suivez vos opérations commerciales depuis un espace simple et organisé.",
        description: "Notre solution facilite la relation entre catalogue, clients professionnels, stock et traitement des commandes.",
        primaryCta: cta("Accéder au catalogue pro", "/articles"),
        secondaryCta: cta("Demander un contact commercial", "/contact"),
        image: image("Distribution professionnelle"),
        mobileImage: image("Distribution professionnelle"),
        textAlignment: "left",
        contentPosition: "left",
        overlayOpacity: 0.36,
        reassuranceText: "Catalogue structuré • Suivi commandes • Support commercial",
      }),
      audiences(2, {
        title: "Des parcours adaptés à chaque client",
        subtitle: "B2B et B2C",
        description: "La page guide chaque visiteur vers le bon parcours sans exposer de contenu administratif.",
        b2B: {
          badgeText: "Clients professionnels",
          title: "Clients professionnels",
          description: "Accédez à un catalogue structuré et préparez vos commandes selon vos besoins métier.",
          cta: cta("Voir le catalogue pro", "/articles"),
        },
        b2C: {
          badgeText: "Clients particuliers",
          title: "Clients particuliers",
          description: "Découvrez les produits disponibles et commandez simplement en ligne.",
          cta: cta("Découvrir les produits", "/articles"),
        },
      }),
      catalogues(3, {
        title: "Catalogues organisés par univers métier",
        subtitle: "Navigation professionnelle",
        description: "Les familles de produits sont organisées pour accélérer la recherche, simplifier la commande et améliorer le suivi commercial.",
        maxItems: 8,
        viewAllCta: cta("Voir les catalogues", "/articles"),
        catalogueNos: selectCatalogueNos(context, 8),
      }),
      products(4, {
        title: "Articles recommandés pour les professionnels",
        subtitle: "Sélection B2B",
        description: "Mettez en avant les références stratégiques, les produits fréquemment commandés et les articles à forte rotation.",
        maxItems: 8,
        viewAllCta: cta("Voir toutes les références", "/articles"),
        articleRefs: selectArticleRefs(context, 8),
        emptyMessage: "Aucun article professionnel n’est encore sélectionné.",
      }),
      advantages(5, {
        title: "Une expérience pensée pour la distribution",
        subtitle: "Avantages B2B",
        description: "Des points de confiance adaptés aux clients professionnels et aux opérations commerciales.",
        items: [
          advantage(1, "Catalogue structuré", "Les articles sont organisés pour faciliter la recherche et la prise de commande.", "📚"),
          advantage(2, "Suivi des commandes", "Chaque commande peut être suivie depuis sa création jusqu’à son traitement.", "✅"),
          advantage(3, "Données commerciales centralisées", "Clients, articles et commandes restent cohérents dans le système.", "📊"),
          advantage(4, "Expérience professionnelle", "Une interface claire pour gagner du temps dans les opérations commerciales.", "🤝"),
        ],
      }),
      stats(6, {
        title: "Une solution orientée performance commerciale",
        subtitle: "Indicateurs métier",
        description: "Des repères simples pour valoriser la profondeur fonctionnelle du projet.",
        items: [
          stat(1, "B2B/B2C", "Gestion des deux parcours", "Une même base pour plusieurs typologies de clients."),
          stat(2, "+100", "Références disponibles", "Catalogue extensible selon les données synchronisées."),
          stat(3, "24/7", "Catalogue accessible", "Consultation continue des articles disponibles."),
          stat(4, "Suivi", "Commandes et clients", "Une logique orientée gestion commerciale."),
        ],
      }),
      finalCta(7, {
        title: "Besoin d’un accompagnement professionnel ?",
        subtitle: "Contact commercial",
        description: "Notre équipe vous accompagne pour vos commandes, vos références et vos besoins commerciaux.",
        primaryCta: cta("Contacter un commercial", "/contact"),
        secondaryCta: cta("Voir le catalogue", "/articles"),
        backgroundImage: image("Accompagnement professionnel"),
        mobileBackgroundImage: image("Accompagnement professionnel"),
      }),
    ],
  );
}

export function createStockLivraisonTemplate(context?: HomepageTemplateContext): HomepageDocument {
  return document(
    "Stock & livraison",
    "Page d’accueil orientée disponibilité, dépôts, suivi et confiance opérationnelle.",
    [
      hero({
        badgeText: "Stock & livraison",
        title: "Des commandes mieux suivies, du stock jusqu’à la livraison",
        subtitle: "Consultez les produits, vérifiez les disponibilités et bénéficiez d’une organisation claire entre catalogue, dépôts et livraison.",
        description: "Une plateforme pensée pour relier les articles, les dépôts, les commandes et le suivi logistique dans un seul parcours.",
        primaryCta: cta("Voir les articles disponibles", "/articles"),
        secondaryCta: cta("Contacter l’équipe", "/contact"),
        image: image("Stock et livraison"),
        mobileImage: image("Stock et livraison"),
        textAlignment: "left",
        contentPosition: "left",
        overlayOpacity: 0.34,
        reassuranceText: "Stock suivi • Dépôts organisés • Livraison structurée",
      }),
      stats(2, {
        title: "Une organisation pilotée par les données",
        subtitle: "Indicateurs opérationnels",
        description: "La page d’accueil met en avant la dimension stock, dépôts et livraison du projet.",
        items: [
          stat(1, "Stock suivi", "Disponibilités contrôlées", "Limiter les ruptures et mieux préparer les commandes."),
          stat(2, "Dépôts connectés", "Organisation logistique", "Structurer les opérations autour des dépôts existants."),
          stat(3, "Commandes suivies", "Traitement structuré", "Visualiser un parcours de commande clair."),
          stat(4, "Livraison organisée", "Zones et affectations", "Rassurer les visiteurs sur l’exécution opérationnelle."),
        ],
      }),
      advantages(3, {
        title: "Des opérations plus lisibles",
        subtitle: "Stock, dépôts et livraison",
        description: "Des messages adaptés pour montrer que le site ne se limite pas au catalogue.",
        items: [
          advantage(1, "Disponibilité contrôlée", "Les produits sont suivis pour limiter les ruptures et améliorer la fiabilité des commandes.", "📦"),
          advantage(2, "Dépôts organisés", "La gestion des dépôts facilite la préparation et l’affectation des commandes.", "🏬"),
          advantage(3, "Livraison suivie", "Le parcours de commande est relié à une logique de livraison claire.", "🚚"),
          advantage(4, "Meilleure visibilité", "Les clients peuvent accéder aux articles et suivre leurs commandes plus facilement.", "👁"),
        ],
      }),
      products(4, {
        title: "Articles disponibles à commander",
        subtitle: "Sélection stock",
        description: "Mettez en avant les produits disponibles, les références prioritaires ou les articles à forte demande.",
        maxItems: 8,
        viewAllCta: cta("Consulter le catalogue", "/articles"),
        articleRefs: selectArticleRefs(context, 8),
        emptyMessage: "Aucun article disponible n’est encore sélectionné.",
      }),
      catalogues(5, {
        title: "Une couverture organisée par zones",
        subtitle: "Dépôts & livraison",
        description: "Les commandes peuvent être organisées selon les zones de livraison et les dépôts disponibles.",
        maxItems: 8,
        viewAllCta: cta("Explorer les zones", "/articles"),
        catalogueNos: selectCatalogueNos(context, 8),
      }),
      audiences(6, {
        title: "Suivez vos commandes simplement",
        subtitle: "Parcours de commande",
        description: "Chaque commande passe par un processus clair : création, validation, préparation et livraison.",
        b2B: {
          badgeText: "Préparation",
          title: "Choisir les articles puis valider la commande",
          description: "Le client sélectionne ses articles, valide la commande et suit la préparation.",
          cta: cta("Voir les articles", "/articles"),
        },
        b2C: {
          badgeText: "Livraison",
          title: "Livraison puis suivi ou réclamation",
          description: "Le parcours reste lisible jusqu’à la livraison, avec un contact disponible si nécessaire.",
          cta: cta("Nous contacter", "/contact"),
        },
      }),
      finalCta(7, {
        title: "Besoin d’un produit disponible rapidement ?",
        subtitle: "Disponibilité et contact",
        description: "Consultez le catalogue ou contactez notre équipe pour vérifier les disponibilités et organiser votre commande.",
        primaryCta: cta("Voir les produits", "/articles"),
        secondaryCta: cta("Nous contacter", "/contact"),
        backgroundImage: image("Disponibilité produit"),
        mobileBackgroundImage: image("Disponibilité produit"),
      }),
    ],
  );
}

export const HOMEPAGE_TEMPLATES: HomepageTemplateDefinition[] = [
  {
    id: "boutique-moderne",
    name: "Boutique moderne",
    badge: "E-commerce premium",
    description: "Une page claire, moderne et commerciale pour guider rapidement les visiteurs vers le catalogue.",
    objective: "Valoriser les produits, rassurer les clients et accélérer la commande en ligne.",
    visualStyle: "Blanc, bleu, indigo, touches commerciales sobres.",
    includedSections: ["Bannière principale", "Avantages", "Produits en vedette", "Catalogues", "Appel final"],
    themeId: "minimaliste",
    createDocument: createBoutiqueModerneTemplate,
  },
  {
    id: "marketplace-commerciale",
    name: "Marketplace commerciale",
    badge: "Grand catalogue",
    description: "Une page riche pour organiser les catégories, les offres et les produits essentiels.",
    objective: "Donner l’impression d’un catalogue large, vivant et facile à explorer.",
    visualStyle: "Bleu clair, surfaces blanches, cartes commerciales arrondies.",
    includedSections: ["Bannière principale", "Catalogues", "Offres", "Univers commerciaux", "Statistiques", "Appel final"],
    themeId: "moderne-colore",
    createDocument: createMarketplaceCommercialeTemplate,
  },
  {
    id: "distribution-b2b",
    name: "Distribution B2B",
    badge: "Professionnels",
    description: "Une page sobre et structurée pour clients entreprises, distribution et commandes récurrentes.",
    objective: "Mettre en avant le catalogue professionnel, le suivi commercial et la relation B2B.",
    visualStyle: "Bleu nuit, vert émeraude, ton sérieux et professionnel.",
    includedSections: ["Bannière B2B", "Parcours clients", "Catalogues", "Articles recommandés", "Avantages", "Statistiques", "Appel commercial"],
    themeId: "professionnel",
    createDocument: createDistributionB2BTemplate,
  },
  {
    id: "stock-livraison",
    name: "Stock & livraison",
    badge: "Logistique",
    description: "Une page orientée disponibilité, dépôts, livraison et suivi opérationnel.",
    objective: "Montrer que la plateforme couvre aussi le stock, les dépôts et la livraison.",
    visualStyle: "Bleu, cyan, touches orange légères pour la dimension stock.",
    includedSections: ["Bannière logistique", "Statistiques", "Avantages", "Articles disponibles", "Catalogues", "Suivi commandes", "Appel final"],
    themeId: "startup",
    createDocument: createStockLivraisonTemplate,
  },
];

export const SAFE_HOMEPAGE_TEMPLATE_SECTION_TYPES: HomepageSectionType[] = [
  "hero",
  "featuredProducts",
  "catalogues",
  "audiences",
  "advantages",
  "stats",
  "finalCta",
];

export function getHomepageTemplateById(id: HomepageTemplateId) {
  return HOMEPAGE_TEMPLATES.find((template) => template.id === id);
}

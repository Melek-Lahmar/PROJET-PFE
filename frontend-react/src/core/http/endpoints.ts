export const endpoints = {
  articles: "/api/articles",
  articleFilterMetadata: "/api/articles/filter-metadata",
  catalogues: "/api/catalogues",
  orders: "/api/orders",
  orderTimeline: (piece: string) => `/api/orders/${encodeURIComponent(piece)}/timeline`,
  orderTransitSummary: (piece: string) => `/api/orders/${encodeURIComponent(piece)}/transit-summary`,
  favorites: "/api/client/favorites",
  favoritesCount: "/api/client/favorites/count",
  favoriteExists: (arRef: string) => `/api/client/favorites/${encodeURIComponent(arRef)}/exists`,
  favoriteByRef: (arRef: string) => `/api/client/favorites/${encodeURIComponent(arRef)}`,
  favoriteToggle: (arRef: string) => `/api/client/favorites/${encodeURIComponent(arRef)}/toggle`,

  homepage: "/api/homepage",
  adminHomepage: "/api/admin/homepage",
  adminHomepagePreview: "/api/admin/homepage/preview",
  adminHomepageDraft: "/api/admin/homepage/draft",
  adminHomepagePublish: "/api/admin/homepage/publish",
  adminHomepageReorderSections: "/api/admin/homepage/sections/reorder",
  adminHomepageUploadImage: "/api/admin/homepage/images",
  adminHomepageDeleteImage: "/api/admin/homepage/images",

  geoGouvernorats: "/api/geo/gouvernorats",
  geoDelegations: (id: number) => `/api/geo/gouvernorats/${id}/delegations`,
  geoValidatePoint: "/api/geo/validate-point",
  geoPickupOptions: "/api/geo/pickup-options",
  geoDepotCoverage: (gouvernoratId: number) => `/api/geo/depot-coverage/${gouvernoratId}`,

  adminDepotZones: "/api/admin/depot-zones",
  adminDepotZoneById: (id: string) => `/api/admin/depot-zones/${id}`,

  supervisorLivreurs: "/api/supervisor/livreurs",
  supervisorLivreurById: (id: string) => `/api/supervisor/livreurs/${id}`,
  supervisorLivreurZones: (id: string) => `/api/supervisor/livreurs/${id}/zones`,
  supervisorDashboardStats: "/api/supervisor/dashboard/stats",
  supervisorTransferts: "/api/supervisor/transferts",
  supervisorReassignTransfert: (id: string) => `/api/supervisor/transferts/${id}/reassign`,
  supervisorTransitMissions: "/api/supervisor/transit-missions",
  supervisorTransitMissionById: (id: string) => `/api/supervisor/transit-missions/${id}`,
  supervisorTransitMissionAssign: (id: string) => `/api/supervisor/transit-missions/${id}/assign`,
  supervisorTransitMissionChangeStatus: (id: string) => `/api/supervisor/transit-missions/${id}/change-status`,
  supervisorIssues: "/api/supervisor/issues",
  supervisorIssueResolve: (id: string) => `/api/supervisor/issues/${id}/resolve`,
  supervisorRetryAssignment: (piece: string) => `/api/supervisor/orders/${encodeURIComponent(piece)}/retry-assignment`,
  supervisorAlerts: "/api/supervisor/alerts",
  supervisorAlertAcknowledge: (id: string) => `/api/supervisor/alerts/${id}/acknowledge`,

  transitMyMissions: "/api/transit/my-missions",
  transitMissionById: (id: string) => `/api/transit/my-missions/${id}`,
  transitScan: "/api/transit/scan",
  transitManualStatus: "/api/transit/manual-status",
  transitPending: "/api/transit/pending",
  transitInProgress: "/api/transit/in-progress",
  transitHistory: "/api/transit/history",
  transitStats: "/api/transit/stats/personal",
  transitScanPickup: "/api/transit/scan-pickup",
  transitScanDelivery: "/api/transit/scan-delivery",

  authLogin: "/api/auth/login",
  authRegister: "/api/auth/register",
  authForgotPassword: "/api/auth/forgot-password",
  authResetPassword: "/api/auth/reset-password",
  authMe: "/api/auth/me",
  authMeProfile: "/api/auth/me/profile",

  adminUsers: "/api/admin/users",
  adminUserById: (id: string) => `/api/admin/users/${id}`,
  adminUserRoles: (id: string) => `/api/admin/users/${id}/roles`,
  adminPersonnel: "/api/admin/personnel",
  adminClients: "/api/admin/clients",
  adminClientById: (id: string) => `/api/admin/clients/${id}`,
  adminClientOrders: (id: string) => `/api/admin/clients/${id}/orders`,
  // ⚠️ `/api/admin/orders` (sans legacy) renvoie un AdminOrdersPageDto paginé
  // avec des champs (tiers, clientName, orderStatus, ville…) qui ne matchent
  // pas le type React AdminOrderSummary. L'endpoint correct pour ces écrans
  // est `/api/admin/legacy/orders` (List<AdminOrderSummaryDto>).
  adminOrders: "/api/admin/legacy/orders",
  adminOrderByPiece: (piece: string) => `/api/admin/legacy/orders/${encodeURIComponent(piece)}`,

  // Sage X3 synchronisation
  syncArticles: "/api/sync/articles",
  syncCatalogues: "/api/sync/catalogues",
  syncDepots: "/api/sync/depots",
  syncStocks: "/api/sync/stocks",
  syncAll: "/api/SyncAll",
  syncAllStatus: "/api/SyncAll/status",

  confirmateurOrders_commandes: "/api/confirmateur/commandes",
  confirmateurOrders_bc: "/api/confirmateur/bc",

  confirmateurOrderByPiece_commandes: (piece: string) =>
    `/api/confirmateur/commandes/${encodeURIComponent(piece)}`,
  confirmateurOrderByPiece_bc: (piece: string) =>
    `/api/confirmateur/bc/${encodeURIComponent(piece)}`,

  confirmateurOrderStatus_commandes: (piece: string) =>
    `/api/confirmateur/commandes/${encodeURIComponent(piece)}/status`,
  confirmateurOrderStatus_bc: (piece: string) =>
    `/api/confirmateur/bc/${encodeURIComponent(piece)}/status`,

  dashboardOverview: "/api/dashboard/overview",
  dashboardSales: "/api/dashboard/sales",
  dashboardLogistics: "/api/dashboard/logistics",
  dashboardConfirmateur: "/api/dashboard/confirmateur",
  dashboardAdminSync: "/api/dashboard/admin-sync",
  dashboardStrategicInsights: "/api/dashboard/strategic-insights",

  articleImages: (arRef: string) => `/api/articles/${encodeURIComponent(arRef)}/images`,
  mainImagesForArticles: "/api/articles/images/main",

  adminArticleImages: (arRef: string) =>
    `/api/admin/articles/${encodeURIComponent(arRef)}/images`,
  uploadArticleImage: (arRef: string) =>
    `/api/admin/articles/${encodeURIComponent(arRef)}/images/upload`,
  createArticleImage: (arRef: string) =>
    `/api/articles/${encodeURIComponent(arRef)}/images`,
  updateArticleImage: (id: number) => `/api/articles/images/${id}`,
  deleteArticleImage: (id: number) => `/api/articles/images/${id}`,

  vendeurContext: "/api/vendeur/context",
  vendeurClients: "/api/vendeur/clients",
  vendeurOrders: "/api/vendeur/orders",
  vendeurOrderByPiece: (piece: string) => `/api/vendeur/orders/${encodeURIComponent(piece)}`,

  konnectInitiate: "/api/payments/konnect/initiate",
  konnectInitiateGuest: "/api/payments/konnect/initiate/guest",
  konnectWebhook: "/api/payments/konnect/webhook",
  konnectStatus: "/api/payments/konnect/status",

  virtualInitiate: "/api/payments/virtual/initiate",
  virtualInitiateGuest: "/api/payments/virtual/initiate/guest",
  virtualConfirm: "/api/payments/virtual/confirm",
  virtualCancel: "/api/payments/virtual/cancel",
  virtualStatus: "/api/payments/virtual/status",
  virtualTestCards: "/api/payments/virtual/test-cards",

  // Module 3 — Multi-adresses client
  clientAddresses: "/api/client/addresses",
  clientAddressById: (id: string) => `/api/client/addresses/${id}`,
  clientAddressSetDefault: (id: string) => `/api/client/addresses/${id}/set-default`,
  adminClientAddresses: (clientId: string) => `/api/admin/clients/${clientId}/addresses`,

  // Module 4 — Remise B2B
  adminClientDiscount: (clientId: string) => `/api/admin/clients/${clientId}/discount`,
  adminClientDiscountHistory: (clientId: string) => `/api/admin/clients/${clientId}/discount-history`,

  b2bQuotes: "/api/b2b/devis",
  b2bQuoteByPiece: (piece: string) => `/api/b2b/devis/${encodeURIComponent(piece)}`,
  b2bMyQuotes: "/api/b2b/devis/my",
  b2bQuoteAccept: (piece: string) => `/api/b2b/devis/${encodeURIComponent(piece)}/accept`,
  b2bQuoteRefuse: (piece: string) => `/api/b2b/devis/${encodeURIComponent(piece)}/reject`,
  b2bQuoteCancel: (piece: string) => `/api/b2b/devis/${encodeURIComponent(piece)}/cancel`,
  b2bQuoteComment: (piece: string) => `/api/b2b/devis/${encodeURIComponent(piece)}/comments`,
  b2bQuoteConvert: (piece: string) => `/api/b2b/devis/${encodeURIComponent(piece)}/convert-to-order`,

  // Module 10 — App settings
  adminSettings: "/api/admin/settings",
  adminSettingByKey: (key: string) => `/api/admin/settings/${encodeURIComponent(key)}`,
  adminDeliveryFee: "/api/admin/settings/delivery-fee",
  publicSettings: "/api/settings/public",

  // Module 12 — Chatbot admin (intégration API existante)
  adminChatbotSessions: "/api/admin/chatbot/sessions",
  adminChatbotSessionMessages: (id: string) => `/api/admin/chatbot/sessions/${id}/messages`,
  adminChatbotInsights: "/api/admin/chatbot/insights",
  adminChatbotStats: "/api/admin/chatbot/stats",
  adminChatbotSandbox: "/api/admin/chatbot/sandbox",
};

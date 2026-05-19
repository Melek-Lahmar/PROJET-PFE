import { createBrowserRouter } from "react-router-dom";
import { MainLayout } from "../shared/layouts/MainLayout";
import { RouteErrorPage } from "../shared/pages/RouteErrorPage";

import { ArticlesPage } from "../features/catalog/pages/ArticlesPage";
import { ArticleDetailsPage } from "../features/catalog/pages/ArticleDetailsPage";
import { ComparePage } from "../features/compare/pages/ComparePage";
import { HomepagePage } from "../features/homepage/pages/HomepagePage";

import { CartPage } from "../features/cart/pages/CartPage";
import { CheckoutEntryPage } from "../features/checkout/pages/CheckoutEntryPage";
import { GuestCheckoutPage } from "../features/checkout/pages/GuestCheckoutPage";
import { GuestCheckoutSuccessPage } from "../features/checkout/pages/GuestCheckoutSuccessPage";
import { CheckoutPage } from "../features/checkout/pages/CheckoutPage";
import { KonnectReturnPage } from "../features/payments/pages/KonnectReturnPage";
import { VirtualPaymentPage } from "../features/payments/pages/VirtualPaymentPage";
import { VirtualPaymentReturnPage } from "../features/payments/pages/VirtualPaymentReturnPage";
import { OrdersPage } from "../features/orders/pages/OrdersPage";
import { OrderDetailsPage } from "../features/orders/pages/OrderDetailsPage";

import { LoginPage } from "../features/auth/pages/LoginPage";
import { RegisterPage } from "../features/auth/pages/RegisterPage";
import { ForgotPasswordPage } from "../features/auth/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "../features/auth/pages/ResetPasswordPage";
import { ProfilePage } from "../features/auth/pages/ProfilePage";
import { ProfileAddressesPage } from "../features/addresses/pages/ProfileAddressesPage";

import { AdminB2BClientsPage } from "../features/admin/pages/AdminB2BClientsPage";
import { AdminSettingsPage } from "../features/admin/pages/AdminSettingsPage";
import { ChatbotOverviewPage } from "../features/admin/chatbot/pages/ChatbotOverviewPage";
import { ChatbotSandboxPage } from "../features/admin/chatbot/pages/ChatbotSandboxPage";
import { ChatbotConversationsPage } from "../features/admin/chatbot/pages/ChatbotConversationsPage";
import { ChatbotInsightsPage } from "../features/admin/chatbot/pages/ChatbotInsightsPage";

import { AboutPage } from "../features/static/pages/AboutPage";
import { ContactPage } from "../features/static/pages/ContactPage";
import { PrivacyPage } from "../features/static/pages/PrivacyPage";
import { TermsPage } from "../features/static/pages/TermsPage";

import { ProtectedRoute } from "./guards/ProtectedRoute";
import { RoleRoute } from "./guards/RoleRoute";
import { PublicShopRoute } from "./guards/PublicShopRoute";

import { AdminUsersPage } from "../features/adminUsers/pages/AdminUsersPage";
import { AdminSyncPage } from "../features/admin/pages/AdminSyncPage";
import { AdminDashboardPage } from "../features/admin/pages/AdminDashboardPage";
import { AdminPersonnelPage } from "../features/admin/pages/AdminPersonnelPage";
import { AdminClientsPage } from "../features/admin/pages/AdminClientsPage";
import { AdminOrdersPage } from "../features/admin/pages/AdminOrdersPage";
import { AdminStockPage } from "../features/admin/pages/AdminStockPage";
import { AdminDepotsPage } from "../features/admin/pages/AdminDepotsPage";
import { AdminArticlesPage } from "../features/adminArticles/pages/AdminArticlesPage";
import { AdminArticleImagesPage } from "../features/adminArticles/pages/AdminArticleImagesPage";
import { AdminHomepagePage } from "../features/homepage/pages/AdminHomepagePage";

import { ConfirmateurOrdersPage } from "../features/confirmateur/pages/ConfirmateurOrdersPage";
import { ConfirmateurOrderDetailsPage } from "../features/confirmateur/pages/ConfirmateurOrderDetailsPage";
import { ConfirmateurBlPage } from "../features/confirmateur/pages/ConfirmateurBlPage";
import { ConfirmateurBlDetailsPage } from "../features/confirmateur/pages/ConfirmateurBlDetailsPage";
import { LivreurBlListPage, LivreurBlDetailsPage } from "../features/bl/pages/LivreurBlPages";

import { AdminOverviewDashboardPage } from "../features/dashboard/pages/AdminOverviewDashboardPage";
import { AdminSalesDashboardPage } from "../features/dashboard/pages/AdminSalesDashboardPage";
import { AdminOrdersDashboardPage } from "../features/dashboard/pages/AdminOrdersDashboardPage";
import { AdminProductsDashboardPage } from "../features/dashboard/pages/AdminProductsDashboardPage";
import { AdminStockDashboardPage } from "../features/dashboard/pages/AdminStockDashboardPage";
import { AdminDepotsDashboardPage } from "../features/dashboard/pages/AdminDepotsDashboardPage";
import { AdminLogisticsDashboardPage } from "../features/dashboard/pages/AdminLogisticsDashboardPage";
import { AdminDriversDashboardPage } from "../features/dashboard/pages/AdminDriversDashboardPage";
import { AdminClientsDashboardPage } from "../features/dashboard/pages/AdminClientsDashboardPage";
import { AdminReclamationsDashboardPage } from "../features/dashboard/pages/AdminReclamationsDashboardPage";
import { AdminSyncDashboardPage } from "../features/dashboard/pages/AdminSyncDashboardPage";
import { AdminInsightsDashboardPage } from "../features/dashboard/pages/AdminInsightsDashboardPage";

import { AdminConfirmateurDashboardPage } from "../features/dashboard/pages/AdminConfirmateurDashboardPage";
import { AdminAdminSyncDashboardPage } from "../features/dashboard/pages/AdminAdminSyncDashboardPage";
import { AdminStrategicInsightsDashboardPage } from "../features/dashboard/pages/AdminStrategicInsightsDashboardPage";
import { ConfirmateurDashboardPage } from "../features/dashboard/pages/ConfirmateurDashboardPage";
import { LivreurDashboardPage } from "../features/dashboard/pages/LivreurDashboardPage";

import { VendeurArticlesPage } from "../features/vendeur/pages/VendeurArticlesPage";
import { VendeurCartPage } from "../features/vendeur/pages/VendeurCartPage";
import { VendeurCheckoutPage } from "../features/vendeur/pages/VendeurCheckoutPage";
import { VendeurOrdersPage } from "../features/vendeur/pages/VendeurOrdersPage";
import { VendeurOrderDetailsPage } from "../features/vendeur/pages/VendeurOrderDetailsPage";

import { AdminDepotZonesPage } from "../features/admin/depotZones/pages/AdminDepotZonesPage";
import { AdminCoverageMapPage } from "../features/admin/depotZones/pages/AdminCoverageMapPage";

import { SupervisorDashboardPage } from "../features/supervisor/pages/SupervisorDashboardPage";
import { SupervisorZonesPage } from "../features/supervisor/pages/SupervisorZonesPage";
import { SupervisorAlertsPage } from "../features/supervisor/pages/SupervisorAlertsPage";
import { SupervisorAuditLogPage } from "../features/supervisor/pages/SupervisorAuditLogPage";

import { TransitDashboardPage } from "../features/transit/pages/TransitDashboardPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <PublicShopRoute />,
        children: [
          { index: true, element: <HomepagePage /> },
          { path: "articles", element: <ArticlesPage /> },
          { path: "articles/:arRef", element: <ArticleDetailsPage /> },
          { path: "cart", element: <CartPage /> },
          { path: "compare", element: <ComparePage /> },

          { path: "checkout/start", element: <CheckoutEntryPage /> },
          { path: "checkout/guest", element: <GuestCheckoutPage /> },
          { path: "checkout/guest/success", element: <GuestCheckoutSuccessPage /> },
          { path: "checkout/konnect/return", element: <KonnectReturnPage /> },
        ],
      },

      { path: "checkout/virtual-payment", element: <VirtualPaymentPage /> },
      { path: "checkout/virtual-payment/return", element: <VirtualPaymentReturnPage /> },

      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },
      { path: "forgot-password", element: <ForgotPasswordPage /> },
      { path: "reset-password", element: <ResetPasswordPage /> },

      { path: "about", element: <AboutPage /> },
      { path: "contact", element: <ContactPage /> },
      { path: "privacy", element: <PrivacyPage /> },
      { path: "terms", element: <TermsPage /> },

      {
        element: <ProtectedRoute />,
        children: [
          { path: "checkout", element: <CheckoutPage /> },
          { path: "orders", element: <OrdersPage /> },
          { path: "orders/:piece", element: <OrderDetailsPage /> },
          { path: "profile", element: <ProfilePage /> },
          { path: "profile/addresses", element: <ProfileAddressesPage /> },

          {
            element: <RoleRoute roles={["VENDEUR"]} />,
            children: [
              { path: "vendeur", element: <VendeurArticlesPage /> },
              { path: "vendeur/articles", element: <VendeurArticlesPage /> },
              { path: "vendeur/articles/:arRef", element: <ArticleDetailsPage /> },
              { path: "vendeur/cart", element: <VendeurCartPage /> },
              { path: "vendeur/checkout", element: <VendeurCheckoutPage /> },
              { path: "vendeur/orders", element: <VendeurOrdersPage /> },
              { path: "vendeur/orders/:piece", element: <VendeurOrderDetailsPage /> },
            ],
          },

          {
            element: <RoleRoute roles={["ADMIN"]} />,
            children: [
              /*
                Important :
                /admin doit rester le panneau admin classique.
                Le dashboard BI professionnel commence à /admin/dashboard.
              */
              { path: "admin", element: <AdminDashboardPage /> },

              { path: "admin/dashboard", element: <AdminOverviewDashboardPage /> },
              { path: "admin/dashboard/overview", element: <AdminOverviewDashboardPage /> },
              { path: "admin/dashboard/sales", element: <AdminSalesDashboardPage /> },
              { path: "admin/dashboard/orders", element: <AdminOrdersDashboardPage /> },
              { path: "admin/dashboard/products", element: <AdminProductsDashboardPage /> },
              { path: "admin/dashboard/stock", element: <AdminStockDashboardPage /> },
              { path: "admin/dashboard/depots", element: <AdminDepotsDashboardPage /> },
              { path: "admin/dashboard/logistics", element: <AdminLogisticsDashboardPage /> },
              { path: "admin/dashboard/drivers", element: <AdminDriversDashboardPage /> },
              { path: "admin/dashboard/clients", element: <AdminClientsDashboardPage /> },
              { path: "admin/dashboard/reclamations", element: <AdminReclamationsDashboardPage /> },
              { path: "admin/dashboard/sync", element: <AdminSyncDashboardPage /> },
              { path: "admin/dashboard/insights", element: <AdminInsightsDashboardPage /> },

              /*
                Anciennes routes conservées pour éviter de casser les anciens liens.
              */
              { path: "admin/dashboard/confirmateur", element: <AdminConfirmateurDashboardPage /> },
              { path: "admin/dashboard/admin-sync", element: <AdminAdminSyncDashboardPage /> },
              { path: "admin/dashboard/strategic-insights", element: <AdminStrategicInsightsDashboardPage /> },

              { path: "admin/users", element: <AdminUsersPage /> },
              { path: "admin/personnel", element: <AdminPersonnelPage /> },
              { path: "admin/clients", element: <AdminClientsPage /> },
              { path: "admin/orders", element: <AdminOrdersPage /> },
              { path: "admin/stocks", element: <AdminStockPage /> },
              { path: "admin/depots", element: <AdminDepotsPage /> },
              { path: "admin/depot-zones", element: <AdminDepotZonesPage /> },
              { path: "admin/coverage-map", element: <AdminCoverageMapPage /> },
              { path: "admin/sync", element: <AdminSyncPage /> },
              { path: "admin/articles", element: <AdminArticlesPage /> },
              { path: "admin/articles/:arRef/images", element: <AdminArticleImagesPage /> },
              { path: "admin/homepage", element: <AdminHomepagePage /> },
              { path: "admin/clients/b2b", element: <AdminB2BClientsPage /> },
              { path: "admin/settings", element: <AdminSettingsPage /> },
              { path: "admin/chatbot", element: <ChatbotOverviewPage /> },
              { path: "admin/chatbot/sandbox", element: <ChatbotSandboxPage /> },
              { path: "admin/chatbot/conversations", element: <ChatbotConversationsPage /> },
              { path: "admin/chatbot/insights", element: <ChatbotInsightsPage /> },
            ],
          },

          {
            element: <RoleRoute roles={["CONFIRMATEUR"]} />,
            children: [
              { path: "confirmateur/dashboard", element: <ConfirmateurDashboardPage /> },
              { path: "confirmateur/commandes", element: <ConfirmateurOrdersPage /> },
              { path: "confirmateur/commandes/:piece", element: <ConfirmateurOrderDetailsPage /> },
              { path: "confirmateur/bl", element: <ConfirmateurBlPage /> },
              { path: "confirmateur/bl/:piece", element: <ConfirmateurBlDetailsPage /> },
            ],
          },

          {
            element: <RoleRoute roles={["SUPERVISEUR", "ADMIN"]} />,
            children: [
              { path: "supervisor", element: <SupervisorDashboardPage /> },
              { path: "supervisor/dashboard", element: <SupervisorDashboardPage /> },
              { path: "supervisor/zones", element: <SupervisorZonesPage /> },
              { path: "supervisor/alerts", element: <SupervisorAlertsPage /> },
              { path: "supervisor/audit", element: <SupervisorAuditLogPage /> },
            ],
          },

          {
            element: <RoleRoute roles={["LIVREUR"]} />,
            children: [
              { path: "livreur/dashboard", element: <LivreurDashboardPage /> },
              { path: "livreur/bl", element: <LivreurBlListPage /> },
              { path: "livreur/bl/:piece", element: <LivreurBlDetailsPage /> },
              { path: "transit", element: <TransitDashboardPage /> },
              { path: "transit/dashboard", element: <TransitDashboardPage /> },
            ],
          },
        ],
      },
    ],
  },
]);
